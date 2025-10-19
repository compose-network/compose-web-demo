import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import type { statusIcons } from "@/components/modals/batch-transaction-modal";
import { SwapRoute } from "@/components/swap/swap-route";
import { TokenInput } from "@/components/swap/token-picker/token-input";
import { TransactionModal } from "@/components/swap/transaction-bridge/transaction-modal";
import { createRollupPublicClients } from "@/components/swap/utils/core";
import {
  createSwapETHForERC20UserOps_A_to_B,
  createSwapETHForERC20UserOps_B_to_A,
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
  getChainById,
  optimismChain,
  rollupA,
  rollupB,
} from "@/wagmi/config";
import { SWAP_CONFIG } from "@/wagmi/swap.ts";
import { getToken, isAddressEqual } from "@/wagmi/tokens";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData } from "@tanstack/react-query";
import { cloneDeep, merge } from "lodash-es";
import {
  type ComponentPropsWithoutRef,
  type FC,
  useEffect,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { FaArrowDown } from "react-icons/fa6";
import { useLocalStorage } from "react-use";
import type { Hex } from "viem";
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
  from: z.object({
    chainId: z
      .number()
      .default(rollupA.id)
      .refine((id) => id === rollupA.id || id === rollupB.id, {
        message: "Chain ID must be rollupA or rollupB",
      }),
    token: z.string().refine(isAddress),
    amount: z.bigint().min(parseEther("0.000001"), {
      message: "Amount must be greater than 0.000001",
    }),
  }),
  to: z.object({
    chainId: z
      .number()
      .default(rollupA.id)
      .refine((id) => id === rollupA.id || id === rollupB.id, {
        message: "Chain ID must be rollupA or rollupB",
      }),
    token: z.string().refine(isAddress),
    amount: z.bigint(),
  }),
  slippage: z.number(),
});
export const Swap: SwapFC = () => {
  const { chainId, address, isConnected } = useAccount();
  const switchChain = useSwitchChain();
  const [transactionData, setTransactionData] = useState<{
    id: Hex;
    actions: {
      name: string;
      description?: string;
      chainId: number;
      toChainId?: number;
      status: keyof typeof statusIcons;
      hash?: `0x${string}` | `0x${string}`[];
      userOpData?: { chainId: number; data: string }[];
    }[];
  } | null>(null);

  const [prevSwapValues, setPrevSwapValues] = useLocalStorage<
    z.infer<typeof schema>
  >(
    "compose/swapvalues",
    {
      from: {
        chainId: rollupB.id,
        token: SWAP_CONFIG.find(({ chainId }) => rollupB.id === chainId)!
          .tokens![0],
        amount: 0n,
      },
      to: {
        chainId: rollupB.id,
        token: SWAP_CONFIG.find(({ chainId }) => rollupB.id === chainId)!
          .tokens![1],
        amount: 0n,
      },
      slippage: 0.5,
    },
    {
      raw: false,
      serializer: (value) => {
        // @ts-expect-error bigint to string
        value.from.amount = value.from.amount.toString();
        // @ts-expect-error bigint to string
        value.to.amount = value.to.amount.toString();
        return JSON.stringify(value);
      },
      deserializer: (value) => {
        const parsed = JSON.parse(value);
        parsed.from.amount = 0n;
        parsed.to.amount = 0n;
        return parsed;
      },
    },
  );

  const form = useForm<z.infer<typeof schema>>({
    defaultValues: prevSwapValues,
    resolver: zodResolver(schema),
  });

  const values = form.watch();

  useEffect(() => {
    setPrevSwapValues(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    values.from.token,
    values.to.token,
    values.from.chainId,
    values.to.chainId,
  ]);

  const { useGetSwapPrice, useSwap } = useSwapContract();

  const swap = useSwap({
    contract: contracts[rollupB.id].swap,
    chainId: rollupB.id,
  });

  const kernel = useSmartAccount();

  const prices = useGetSwapPrice(
    {
      tokenIn: getToken(values.from.token)?.id ?? 0,
      tokenOut: getToken(values.to.token)?.id ?? 0,
      amountIn: values.from.amount,
    },
    {
      placeholderData: values.from.amount ? keepPreviousData : undefined,
      chainId: rollupB.id,
      contract: contracts[rollupB.id].swap,
      enabled: !!values.from.token && !!values.to.token,
    },
  );

  const isSameToken = values.from.token === values.to.token;

  const fromToken = useAsset({
    tokenAddress: values.from.token,
    chainId: values.from.chainId,
  });

  const toToken = useAsset({
    tokenAddress: values.to.token,
    chainId: values.to.chainId,
  });

  const approve = useApprove();
  const sendTx = useSendTransaction();

  const submit = form.handleSubmit(async (values) => {
    const [rollupAPublicClient, rollupBPublicClient] =
      createRollupPublicClients(rollupA.id, rollupB.id);

    const is_eth_to_erc20 = isAddressEqual(values.from.token, zeroAddress);
    const is_erc20_to_eth = isAddressEqual(values.to.token, zeroAddress);
    const is_erc20_to_erc20 = !is_eth_to_erc20 && !is_erc20_to_eth;
    console.log("is_erc20_to_erc20:", is_erc20_to_erc20);

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
          values.from.chainId === rollupA.id
            ? rollupAPublicClient
            : rollupBPublicClient
        ).readContract({
          abi: TokenABI,
          functionName: "allowance",
          args: [address!, kernel.kernel.data?.accounts.A.address],
          address: values.from.token,
        });

    const needsApproval =
      !is_eth_to_erc20 && kernelAllowance < values.from.amount;

    const userOpIndex = needsApproval || is_eth_to_erc20 ? 1 : 0;

    setTransactionData({
      id: `0x${Math.floor(Number(BigInt(Math.floor(Math.random() * 0xffffffff)))).toString(16)}`,
      actions: [
        ...(needsApproval || is_eth_to_erc20
          ? [
              {
                name: `${is_eth_to_erc20 ? `Send ${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${fromToken.symbol} to Smart Account` : `Approve ${fromToken.symbol}`} `,
                chainId: values.from.chainId,
                status: "pending" as const,
              },
            ]
          : []),
        {
          name: `Swap ${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${fromToken.symbol} for ${formatCurrency(prices.data?.[0] ?? 0n, toToken.decimals || 18)} ${toToken.symbol}`,
          chainId: values.from.chainId,
          toChainId: values.to.chainId,
          status: needsApproval || is_eth_to_erc20 ? "idle" : "pending",
        },
      ],
    });

    await switchChain.switchChainAsync({ chainId: values.from.chainId });

    if (needsApproval) {
      await approve.write(
        {
          address: values.from.token,
          chainId: values.from.chainId,
        },
        {
          spender: kernel.kernel.data?.accounts.A.address,
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
          to: kernel.getKernelByChainId(values.from.chainId)!.address,
          value: values.from.amount,
          chainId: values.from.chainId,
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
        values.from.chainId === rollupA.id
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
    //   values.from.chainId === rollupA.id &&
    //   values.to.chainId === rollupA.id
    // ) {
    //   const { sendUserOps } = await createSwapUserOpsFrom_A_to_A(
    //     {
    //       amountIn: values.from.amount,
    //       fromToken: values.from.token,
    //       toToken: values.to.token,
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
    const is_from_A_to_B =
      values.from.chainId === rollupA.id && values.to.chainId === rollupB.id;

    const is_from_B_to_A =
      values.from.chainId === rollupB.id && values.to.chainId === rollupA.id;

    setTransactionData((prev) => {
      if (!prev) return null;
      const clone = cloneDeep(prev);
      clone.actions[userOpIndex].status = "pending";
      return clone;
    });

    // Is Swapping from A -> B
    if (is_from_A_to_B || is_from_B_to_A) {
      const createSwapUserOps = is_from_A_to_B
        ? is_eth_to_erc20
          ? createSwapETHForERC20UserOps_A_to_B
          : createSwapUserOpsFrom_A_to_B
        : is_eth_to_erc20
          ? createSwapETHForERC20UserOps_B_to_A
          : createSwapUserOpsFrom_B_to_A;

      const { sendUserOps } = await createSwapUserOps(
        {
          amountIn: values.from.amount,
          fromToken: values.from.token,
          toToken: values.to.token,
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
                  chainId: values.from.chainId,
                  data: JSON.stringify(stringifyBigints(userOps[0])),
                },
                {
                  chainId: values.to.chainId,
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
              clone.actions[userOpIndex].hash = builds.map((build) => {
                return build.hash;
              });
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
            form.reset(
              merge({}, values, {
                from: { amount: 0n },
                to: { amount: 0n },
              }),
            );
            form.clearErrors();
          },
        },
      );
      return sendUserOps();
    }

    // Execute swap
    await swap.write(
      {
        amountIn: values.from.amount,
        recipient: address!,
        tokenIn: getToken(values.from.token)?.id ?? 0,
        tokenOut: getToken(values.to.token)?.id ?? 0,
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

          form.reset(
            merge({}, values, {
              from: { amount: 0n },
              to: { amount: 0n },
            }),
          );
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
                  isNotSupported: values.to.chainId === rollupA.id,
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
              value={values.from.amount}
              tokenAddress={values.from.token}
              chainId={values.from.chainId}
              onSelectToken={(token) => {
                return form.setValue("from.token", token, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
              }}
              onChainSelect={(chainId) =>
                form.setValue(
                  "from.chainId",
                  chainId as typeof rollupA.id | typeof rollupB.id,
                  {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  },
                )
              }
              onChange={(amount) => {
                form.setValue("from.amount", amount, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
              }}
              disabledTokens={[values.to.token]}
            />
            {form.formState.errors.from?.amount && (
              <Text variant="body-3-medium" className="text-error-500">
                {form.formState.errors.from.amount?.message}
              </Text>
            )}
            <div className="flex items-center gap-3">
              <Divider className="flex-1" />
              <Button
                variant="ghost"
                size="icon"
                className="size-12 rounded-xl"
                style={{
                  boxShadow: "0px 4px 8px -3px rgba(11, 42, 60, 0.08)",
                }}
                onClick={() => {
                  form.setValue(
                    "from",
                    {
                      ...values.to,
                      amount: prices.data?.[0] ?? 0n,
                    },
                    {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    },
                  );
                  form.setValue("to", values.from, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                }}
              >
                <FaArrowDown className="text-primary-500" />
              </Button>
              <Divider className="flex-1" />
            </div>
            <TokenInput
              chains={[
                {
                  chainId: rollupA.id,
                  tokens: [zeroAddress, USDC_ADDRESS, SSV_ADDRESS],
                  isNotSupported: values.from.chainId === rollupA.id,
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
                  "to.chainId",
                  chainId as typeof rollupA.id | typeof rollupB.id,
                  {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  },
                )
              }
              value={
                isSameToken ? values.from.amount : (prices.data?.[0] ?? 0n)
              }
              tokenAddress={values.to.token}
              chainId={values.to.chainId}
              isLoading={prices.isPending}
              readOnly
              onSelectToken={(token) =>
                form.setValue("to.token", token, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                })
              }
              onChange={(amount) =>
                form.setValue("to.amount", amount, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                })
              }
              disabledTokens={[values.from.token]}
            />
          </div>
          <Divider />
          <SwapRoute
            action="swap"
            fromToken={{
              address: values.from.token,
              chainId: values.from.chainId,
            }}
            toToken={{ address: values.to.token, chainId: values.to.chainId }}
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
              {chainId !== values.from.chainId
                ? `Switch to ${getChainById(values.from.chainId).name} And Swap`
                : "Swap"}
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
