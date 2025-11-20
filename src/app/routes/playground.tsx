import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import ActionRoute from "@/components/swap/actionRoute.tsx";
import { TokenInput } from "@/components/swap/token-picker/token-input";
import type { TransactionModalData } from "@/components/swap/transaction-bridge/transaction-modal";
import { TransactionModal } from "@/components/swap/transaction-bridge/transaction-modal";
import { createRollupPublicClient } from "@/components/swap/utils/core";

import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Form } from "@/components/ui/form";
import { Text } from "@/components/ui/text";
import { useAccount } from "@/hooks/account/use-account";
import { useAsset } from "@/hooks/use-asset";
import { useApprove } from "@/lib/contract-interactions/erc-20/write/use-approve";
import { fetchAllowance } from "@/lib/contract-interactions/erc-20/read/use-allowance";

import { stringifyBigints } from "@/lib/utils/bigint";
import { isNativeToken } from "@/lib/utils/token";
import {
  SSV_ADDRESS,
  UNISWAP_V3,
  USDC_ADDRESS,
  WETH_ADDRESS,
} from "@/wagmi/addresses";
import {
  arbitrumChain,
  baseChain,
  optimismChain,
  rollupA,
  rollupB,
} from "@/wagmi/config";
import { SWAP_CONFIG } from "@/wagmi/swap.ts";
import { isAddressEqual } from "@/wagmi/tokens";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData } from "@tanstack/react-query";
import { type FC, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FaArrowDown } from "react-icons/fa6";
import { useLocalStorage } from "react-use";
import { isAddress, parseEther, zeroAddress } from "viem";
import { useSwitchChain } from "wagmi";
import { z } from "zod";
import { useUniswapV3QuoterContractHooks, useUniswapV3RouterV2ContractHooks } from "@/lib/contract-interactions/uniswap-v3/hooks";

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
export const Playground: FC = () => {
  const { address, isConnected } = useAccount();
  const switchChain = useSwitchChain();
  const [transactionData, setTransactionData] =
    useState<TransactionModalData | null>(null);
  const [errorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  const values = form.watch();

  const { useQuoteExactInputSingle } = useUniswapV3QuoterContractHooks();
  const { useExactInputSingle } = useUniswapV3RouterV2ContractHooks();

  const quoteExactInputSingle = useQuoteExactInputSingle(
    {
      params: {
        amountIn: values.fromAmount,
        fee: values.fromChainId === rollupA.id ? 500 : 100, // I don't know what is this, please ask Taylor
        sqrtPriceLimitX96: 0n,
        tokenIn: isNativeToken(values.fromToken)
          ? WETH_ADDRESS
          : values.fromToken,
        tokenOut: isNativeToken(values.toToken) ? WETH_ADDRESS : values.toToken,
      },
    },
    {
      contract:
        UNISWAP_V3[values.fromChainId as keyof typeof UNISWAP_V3]
          ?.QUOTER_V2_ADDRESS,
      chainId: values.fromChainId as number,
      enabled: isConnected && !!values.fromChainId,
      placeholderData: keepPreviousData,
    },
  );

  const exactInputSingle = useExactInputSingle({
    contract:
      UNISWAP_V3[values.fromChainId as keyof typeof UNISWAP_V3].SWAP_ROUTER02,
    chainId: values.fromChainId as number,
  });

  useEffect(() => {
    persistPrevSwapValues(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.fromToken, values.toToken, values.fromChainId, values.toChainId]);

  const isSameToken = values.fromToken === values.toToken;

  const fromToken = useAsset({
    tokenAddress: values.fromToken,
    chainId: values.fromChainId,
  });

  const approve = useApprove();

  const submit = form.handleSubmit(async (values) => {
    await switchChain.switchChainAsync({ chainId: values.fromChainId });

    if (!isNativeToken(values.fromToken)) {
      const spender =
        UNISWAP_V3[values.fromChainId as keyof typeof UNISWAP_V3].SWAP_ROUTER02;

      const currentAllowance = await fetchAllowance(
        {
          address: values.fromToken,
          chainId: values.fromChainId,
        },
        {
          owner: address!,
          spender,
        },
      );

      if (currentAllowance < values.fromAmount) {
        await approve.write(
          {
            address: values.fromToken,
            chainId: values.fromChainId,
          },
          {
            spender,
            amount: values.fromAmount,
          },
        );
      }
    }

    const hash = await exactInputSingle.send({
      params: {
        amountIn: values.fromAmount,
        amountOutMinimum: quoteExactInputSingle.data?.[0] ?? 0n,
        tokenIn: isNativeToken(values.fromToken)
          ? WETH_ADDRESS
          : values.fromToken,
        tokenOut: isNativeToken(values.toToken) ? WETH_ADDRESS : values.toToken,
        fee: values.fromChainId === rollupA.id ? 500 : 100,
        sqrtPriceLimitX96: 0n,
        recipient: address!,
      },
      value: isNativeToken(values.fromToken) ? values.fromAmount : 0n,
    });

    const clientB = createRollupPublicClient(values.toChainId);
    const receipt = await clientB.waitForTransactionReceipt({ hash });
    console.log("receipt:", receipt);
  });

  return (
    <>
      <TransactionModal
        title={"Swap"}
        data={transactionData}
        errorMessage={errorMessage}
        isOpen={!!transactionData}
        onClose={() => setIsLoading(false)}
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
                    fromAmount: quoteExactInputSingle.data?.[0] ?? 0n,
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
              value={
                !values.fromAmount
                  ? 0n
                  : isSameToken
                    ? values.fromAmount
                    : (quoteExactInputSingle.data?.[0] ?? 0n)
              }
              tokenAddress={values.toToken}
              chainId={values.toChainId}
              isLoading={
                !!values.fromAmount &&
                (quoteExactInputSingle.isPending ||
                  quoteExactInputSingle.isFetching)
              }
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

          <ActionRoute
            type="swap"
            from={values.fromToken}
            fromChainId={values.fromChainId}
            to={values.toToken}
            toChainId={values.toChainId}
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
              disabled={
                !form.formState.isValid ||
                isLoading ||
                (fromToken.balance !== undefined &&
                  values.fromAmount > fromToken.balance)
              }
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

Playground.displayName = "Playground";
