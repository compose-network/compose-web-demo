import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import { SwapRoute } from "@/components/swap/swap-route";
import { TokenInput } from "@/components/swap/token-picker/token-input";
import type { TransactionModalProps } from "@/components/swap/transaction-bridge/transaction-modal";
import { TransactionModal } from "@/components/swap/transaction-bridge/transaction-modal";
import { createRollupPublicClients } from "@/components/swap/utils/core";
import {
  createSwapETHForERC20UserOps_A_to_B,
  createSwapETHForERC20UserOps_B_to_A,
  createSwapUserOpsFrom_A_to_A,
  createSwapUserOpsFrom_A_to_B,
  createSwapUserOpsFrom_B_to_A,
} from "@/components/swap/utils/generate-swap-userops";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Form } from "@/components/ui/form";
import { Span, Text } from "@/components/ui/text";
import { toast } from "@/components/ui/use-toast";
import { globals } from "@/config";
import { useAccount } from "@/hooks/account/use-account";
import { useAsset } from "@/hooks/use-asset";
import { TokenABI } from "@/lib/abi/token";
import { useSwapContract } from "@/lib/contract-interactions/core/create-write-hooks";
import { useApprove } from "@/lib/contract-interactions/erc-20/write/use-approve";
import { useSmartAccount } from "@/lib/smart-account/kernel";
import { stringifyBigints } from "@/lib/utils/bigint";
import { formatCurrency } from "@/lib/utils/number";
import { getErrorMessage } from "@/lib/utils/wagmi";
import { SSV_ADDRESS, USDC_ADDRESS } from "@/wagmi/addresses";
import {
  arbitrumChain,
  baseChain,
  contracts,
  optimismChain,
  rollupA,
  rollupB,
  rollupBSwapContract,
} from "@/wagmi/config";
import { SWAP_CONFIG } from "@/wagmi/swap.ts";
import { getToken, isAddressEqual } from "@/wagmi/tokens";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData } from "@tanstack/react-query";
import { cloneDeep } from "lodash-es";
import {
  type ComponentPropsWithoutRef,
  type FC,
  useEffect,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { FaArrowDown } from "react-icons/fa6";
import { useLocalStorage } from "react-use";
import { isAddress, parseEther, zeroAddress } from "viem";
import { useSendTransaction, useSwitchChain } from "wagmi";
import { z } from "zod";

export type SwapProps = {
  // TODO: Add props or remove this type
};

type SwapFC = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof SwapProps> & SwapProps
>;

const schema = z.object({
  fromChainId: z
    .number()
    .default(rollupA.id)
    .refine((id) => id === rollupA.id || id === rollupB.id, {
      message: "Chain ID must be rollupA or rollupB",
    }),
  fromToken: z.string().refine(isAddress),
  fromAmount: z.bigint().min(parseEther("0.000001"), {
    message: "Amount must be greater than 0.000001",
  }),
  toChainId: z
    .number()
    .default(rollupA.id)
    .refine((id) => id === rollupA.id || id === rollupB.id, {
      message: "Chain ID must be rollupA or rollupB",
    }),
  toToken: z.string().refine(isAddress),
  slippage: z.number(),
});
export const Swap: SwapFC = () => {
  const { address, isConnected } = useAccount();
  const switchChain = useSwitchChain();
  const [transactionData, setTransactionData] = useState<
    TransactionModalProps["data"] | null
  >(null);

  const [prevSwapValues, persistPrevSwapValues] = useLocalStorage<
    z.infer<typeof schema>
  >(
    "compose/swapvalues",
    {
      fromChainId: rollupA.id,
      fromToken: zeroAddress,
      fromAmount: 0n,
      toChainId: rollupB.id,
      toToken: SWAP_CONFIG.find(({ chainId }) => rollupB.id === chainId)!
        .tokens![1],
      slippage: 0.5,
    },
    {
      raw: false,
      serializer: (value) => {
        return JSON.stringify(stringifyBigints(value));
      },
      deserializer: (value) => {
        const parsed = JSON.parse(value);
        parsed.fromAmount = BigInt(parsed.fromAmount);
        const isValidSchema = schema.safeParse({
          ...parsed,
          fromAmount: parseEther("1"),
        });
        if (!isValidSchema.success) {
          return {
            fromChainId: rollupA.id,
            fromToken: zeroAddress,
            fromAmount: 0n,
            toChainId: rollupB.id,
            toToken: SWAP_CONFIG.find(({ chainId }) => rollupB.id === chainId)!
              .tokens![1],
            slippage: 0.5,
          };
        }
        parsed.fromAmount = 0n;
        return parsed;
      },
    },
  );

  const form = useForm<z.infer<typeof schema>>({
    defaultValues: prevSwapValues,
    resolver: zodResolver(schema),
  });

  // console.log("form.formState.isValid:", form.formState.isValid);
  // console.log(
  //   "form.formState.isValid:",
  //   stringifyBigints(form.formState.errors),
  // );

  const values = form.watch();

  useEffect(() => {
    persistPrevSwapValues(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.fromToken, values.toToken, values.fromChainId, values.toChainId]);

  const { useGetSwapPrice, useSwap } = useSwapContract();

  const swap = useSwap({
    contract: contracts[rollupB.id].swap,
    chainId: rollupB.id,
  });

  const kernel = useSmartAccount();

  const prices = useGetSwapPrice(
    {
      tokenIn: getToken(values.fromToken)?.id ?? 0,
      tokenOut: getToken(values.toToken)?.id ?? 0,
      amountIn: values.fromAmount,
    },
    {
      placeholderData: values.fromAmount ? keepPreviousData : undefined,
      chainId: rollupB.id,
      contract: contracts[rollupB.id].swap,
      enabled: !!values.fromToken && !!values.toToken,
    },
  );

  const isSameToken = values.fromToken === values.toToken;

  const fromToken = useAsset({
    tokenAddress: values.fromToken,
    chainId: values.fromChainId,
  });

  const toToken = useAsset({
    tokenAddress: values.toToken,
    chainId: values.toChainId,
  });

  const approve = useApprove();
  const sendTx = useSendTransaction();

  const submit = form.handleSubmit(async (values) => {
    const [rollupAPublicClient, rollupBPublicClient] =
      createRollupPublicClients(rollupA.id, rollupB.id);

    const is_from_A_to_B =
      values.fromChainId === rollupA.id && values.toChainId === rollupB.id;

    const is_from_B_to_A =
      values.fromChainId === rollupB.id && values.toChainId === rollupA.id;

    const is_from_A_to_A =
      values.fromChainId === rollupA.id && values.toChainId === rollupA.id;

    const is_from_B_to_B =
      values.fromChainId === rollupB.id && values.toChainId === rollupB.id;

    const is_eth_to_erc20 = isAddressEqual(values.fromToken, zeroAddress);

    if (prices.data?.[0] === 0n) {
      return toast({
        title: "No price found for the selected tokens",
        variant: "destructive",
      });
    }

    if (!kernel.kernel.data?.accounts) {
      return toast({
        title: "Kernel A account not found",
        variant: "destructive",
      });
    }

    const kernelAllowance = is_eth_to_erc20
      ? globals.MAX_WEI_AMOUNT
      : await (
          values.fromChainId === rollupA.id
            ? rollupAPublicClient
            : rollupBPublicClient
        ).readContract({
          abi: TokenABI,
          functionName: "allowance",
          args: [
            address!,
            is_from_B_to_B
              ? rollupBSwapContract
              : values.fromChainId === rollupA.id
                ? kernel.kernel.data?.accounts.A.address
                : kernel.kernel.data?.accounts.B.address,
          ],
          address: values.fromToken,
        });

    const needsApproval =
      !is_eth_to_erc20 && kernelAllowance < values.fromAmount;

    const userOpIndex = needsApproval || is_eth_to_erc20 ? 1 : 0;

    setTransactionData({
      id: `0x${Math.floor(Number(BigInt(Math.floor(Math.random() * 0xffffffff)))).toString(16)}`,
      actions: [
        ...(needsApproval || is_eth_to_erc20
          ? [
              {
                name: `${is_eth_to_erc20 ? `Send ${formatCurrency(values.fromAmount, fromToken.decimals || 18)} ${fromToken.symbol} to Smart Account` : `Approve ${fromToken.symbol}`} `,
                chainId: values.fromChainId,
                status: "pending" as const,
                tooltip: is_eth_to_erc20
                  ? "ETH must first be transferred to your Smart Account before initiating a cross-chain transaction."
                  : undefined,
              },
            ]
          : []),
        {
          name: `Swap ${formatCurrency(values.fromAmount, fromToken.decimals || 18)} ${fromToken.symbol} for ${formatCurrency(prices.data?.[0] ?? 0n, toToken.decimals || 18)} ${toToken.symbol}`,
          chainId: values.fromChainId,
          toChainId: values.toChainId,
          status: needsApproval || is_eth_to_erc20 ? "idle" : "pending",
        },
      ],
    });

    await switchChain.switchChainAsync({ chainId: values.fromChainId });

    if (needsApproval) {
      await approve.write(
        {
          address: values.fromToken,
          chainId: values.fromChainId,
        },
        {
          spender: is_from_B_to_B
            ? rollupBSwapContract
            : values.fromChainId === rollupA.id
              ? kernel.kernel.data?.accounts.A.address
              : kernel.kernel.data?.accounts.B.address,
          amount: globals.MAX_WEI_AMOUNT,
        },
        {
          onConfirmed: (hash) => {
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[0].hash = hash;
              return clone;
            });
          },
          onError: (error) => {
            toast({
              title: "Transaction failed",
              variant: "destructive",
              description: (
                <Span className="whitespace-pre-wrap">
                  {getErrorMessage(error)}
                </Span>
              ),
            });
            setTransactionData(null);
          },
          onMined: () => {
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[0].status = "success";
              return clone;
            });
          },
        },
      );
    }

    if (is_eth_to_erc20) {
      const hash = await sendTx.sendTransactionAsync(
        {
          to: kernel.getKernelByChainId(values.fromChainId)!.address,
          value: values.fromAmount,
          chainId: values.fromChainId,
        },
        {
          onError: (error) => {
            toast({
              title: "Transaction failed",
              variant: "destructive",
              description: (
                <Span className="whitespace-pre-wrap">
                  {getErrorMessage(error)}
                </Span>
              ),
            });
            setTransactionData(null);
          },
        },
      );
      if (!hash) return;
      setTransactionData((prev) => {
        if (!prev) return null;
        const clone = cloneDeep(prev);
        clone.actions[0].hash = hash;
        return clone;
      });

      await (
        values.fromChainId === rollupA.id
          ? rollupAPublicClient
          : rollupBPublicClient
      ).waitForTransactionReceipt({ hash });
      setTransactionData((prev) => {
        if (!prev) return null;
        const clone = cloneDeep(prev);
        clone.actions[0].status = "success";
        return clone;
      });
    }

    // Is Swapping from A -> A
    // if (
    //   values.fromChainId === rollupA.id &&
    //   values.toChainId === rollupA.id
    // ) {
    //   const { sendUserOps } = await createSwapUserOpsFrom_A_to_A(
    //     {
    //       amountIn: values.fromAmount,
    //       fromToken: values.fromToken,
    //       toToken: values.toToken,
    //       eoaAddress: address!,
    //       kernelA: kernel.kernel.data.accounts.A,
    //       kernelB: kernel.kernel.data.accounts.B,
    //       amountOut: prices.data?.[0] ?? 0n,
    //     },
    //     {
    //       onBuildUserOps(_, explorerUrls) {
    //         explorerUrls.forEach(console.log);
    //       },
    //     },
    //   );
    //   return sendUserOps();
    // }

    setTransactionData((prev) => {
      if (!prev) return null;
      const clone = cloneDeep(prev);
      clone.actions[userOpIndex].status = "pending";
      return clone;
    });

    // Is Swapping from A -> B
    if (
      is_from_A_to_B ||
      is_from_B_to_A ||
      (is_from_A_to_A && !is_eth_to_erc20)
    ) {
      const createSwapUserOps = is_from_A_to_A
        ? createSwapUserOpsFrom_A_to_A
        : is_from_A_to_B
          ? is_eth_to_erc20
            ? createSwapETHForERC20UserOps_A_to_B
            : createSwapUserOpsFrom_A_to_B
          : is_eth_to_erc20
            ? createSwapETHForERC20UserOps_B_to_A
            : createSwapUserOpsFrom_B_to_A;

      const { sendUserOps } = await createSwapUserOps(
        {
          amountIn: values.fromAmount,
          fromToken: values.fromToken,
          toToken: values.toToken,
          eoaAddress: address!,
          kernelA: kernel.kernel.data.accounts.A,
          kernelB: kernel.kernel.data.accounts.B,
          amountOut: prices.data?.[0] ?? 0n,
        },
        {
          onSignedUserOps(userOps) {
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[userOpIndex].userOpData = [
                {
                  chainId: values.fromChainId,
                  data: JSON.stringify(stringifyBigints(userOps[0])),
                },
                {
                  chainId: values.toChainId,
                  data: JSON.stringify(stringifyBigints(userOps[1])),
                },
              ];
              return clone;
            });
          },
          onBuildUserOps(builds) {
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[userOpIndex].hash = builds.map((build) => ({
                chainId: build.chainId,
                hash: build.hash,
              }));
              return clone;
            });
          },
          onUserOpsMined: () => {
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[userOpIndex].status = "success";
              return clone;
            });
            form.reset({
              fromChainId: values.fromChainId,
              fromToken: values.fromToken,
              fromAmount: 0n,
              toChainId: values.toChainId,
              toToken: values.toToken,
              slippage: values.slippage,
            });
            form.clearErrors();
          },
        },
      ).catch((error) => {
        console.log("error:", error);
        toast({
          variant: "destructive",
          title: "Swap failed",
          description: error.message,
        });
        setTransactionData(null);
        throw error;
      });
      return sendUserOps();
    }

    // Execute swap
    await swap.write(
      {
        amountIn: values.fromAmount,
        recipient: address!,
        tokenIn: getToken(values.fromToken)?.id ?? 0,
        tokenOut: getToken(values.toToken)?.id ?? 0,
      },
      {
        onConfirmed: (hash) => {
          setTransactionData((prev) => {
            if (!prev) return null;
            const updated = { ...prev };
            updated.actions[userOpIndex].hash = hash;
            return updated;
          });
        },
        onMined: () => {
          setTransactionData((prev) => {
            if (!prev) return null;
            const updated = { ...prev };
            updated.actions[userOpIndex].status = "success";
            return updated;
          });

          fromToken.refreshBalance();
          toToken.refreshBalance();

          form.reset({
            fromChainId: values.fromChainId,
            fromToken: values.fromToken,
            fromAmount: 0n,
            toChainId: values.toChainId,
            toToken: values.toToken,
            slippage: values.slippage,
          });
          form.clearErrors();

          toast({
            title: "Swap completed",
            description: "Your tokens have been swapped successfully",
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Swap failed",
            description: error.message,
          });
          setTransactionData(null);
        },
      },
    );
  });

  return (
    <>
      <TransactionModal
        title={"Swap"}
        data={transactionData}
        isOpen={!!transactionData}
        onOpenChange={(open) => {
          if (open) return;
          return setTransactionData(null);
        }}
      />
      <Form {...form}>
        <form onSubmit={submit} className="flex flex-col gap-8">
          <div className="flex gap-4 flex-col">
            <TokenInput
              chains={[
                {
                  chainId: rollupA.id,
                  tokens: [zeroAddress, USDC_ADDRESS, SSV_ADDRESS],
                  notSupportedReason:
                    " - Swapping from Rollup A to Rollup A is not supported",
                },
                {
                  chainId: rollupB.id,
                  tokens: [zeroAddress, USDC_ADDRESS, SSV_ADDRESS],
                },
                { chainId: baseChain.id, isNotSupported: true },
                { chainId: arbitrumChain.id, isNotSupported: true },
                { chainId: optimismChain.id, isNotSupported: true },
              ]}
              value={values.fromAmount}
              tokenAddress={values.fromToken}
              chainId={values.fromChainId}
              onSelectToken={(token) => {
                if (isAddressEqual(token, values.toToken)) {
                  form.setValue("toToken", values.fromToken, {
                    shouldValidate: true,
                  });
                }
                return form.setValue("fromToken", token, {
                  shouldValidate: true,
                });
              }}
              onChainSelect={(chainId) =>
                form.setValue(
                  "fromChainId",
                  chainId as typeof rollupA.id | typeof rollupB.id,
                )
              }
              onChange={(amount) => {
                form.setValue("fromAmount", amount, {
                  shouldValidate: true,
                });
              }}
            />
            {form.formState.errors.fromAmount && (
              <Text variant="body-3-medium" className="text-error-500">
                {form.formState.errors.fromAmount?.message}
              </Text>
            )}
            <div className="flex items-center gap-3">
              <Divider className="flex-1" />
              <Button
                variant="white"
                size="icon"
                className="size-12 rounded-xl"
                style={{
                  boxShadow: "0px 4px 8px -3px rgba(11, 42, 60, 0.08)",
                }}
                onClick={() => {
                  form.reset({
                    fromChainId: values.toChainId,
                    fromToken: values.toToken,
                    fromAmount: prices.data?.[0] ?? 0n,
                    toChainId: values.fromChainId,
                    toToken: values.fromToken,
                    slippage: values.slippage,
                  });
                }}
              >
                <FaArrowDown className="text-[#18B5B8]" />
              </Button>
              <Divider className="flex-1" />
            </div>
            <TokenInput
              chains={[
                {
                  chainId: rollupA.id,
                  tokens: [zeroAddress, USDC_ADDRESS, SSV_ADDRESS],
                  // isNotSupported: values.fromChainId === rollupA.id,
                },
                {
                  chainId: rollupB.id,
                  tokens: [zeroAddress, USDC_ADDRESS, SSV_ADDRESS],
                },
                { chainId: baseChain.id, isNotSupported: true },
                { chainId: arbitrumChain.id, isNotSupported: true },
                { chainId: optimismChain.id, isNotSupported: true },
              ]}
              onChainSelect={(chainId) =>
                form.setValue(
                  "toChainId",
                  chainId as typeof rollupA.id | typeof rollupB.id,
                )
              }
              value={isSameToken ? values.fromAmount : (prices.data?.[0] ?? 0n)}
              tokenAddress={values.toToken}
              chainId={values.toChainId}
              isLoading={prices.isPending}
              readOnly
              onSelectToken={(token) => {
                if (isAddressEqual(token, values.fromToken)) {
                  form.setValue("fromToken", values.toToken, {
                    shouldValidate: true,
                  });
                }
                return form.setValue("toToken", token, {
                  shouldValidate: true,
                });
              }}
              onChange={() => {}}
            />
          </div>
          <Divider />
          <SwapRoute
            action="swap"
            fromToken={{
              address: values.fromToken,
              chainId: values.fromChainId,
            }}
            toToken={{ address: values.toToken, chainId: values.toChainId }}
          />
          {isConnected ? (
            <Button
              size="xl"
              className="w-full"
              type="submit"
              isLoading={!!transactionData || switchChain.isPending}
              loadingText={
                switchChain.isPending
                  ? "Switching network..."
                  : transactionData
                    ? "Processing..."
                    : undefined
              }
              disabled={!form.formState.isValid}
            >
              Swap
            </Button>
          ) : (
            <ConnectWalletBtn size="xl" />
          )}
        </form>
      </Form>
    </>
  );
};

Swap.displayName = "Swap";
