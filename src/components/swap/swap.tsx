import { type FC, type ComponentPropsWithoutRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { rollupB, contracts, rollupA } from "@/wagmi/config";
import { isAddress, parseEther } from "viem";
import { TokenInput } from "@/components/swap/token-picker/token-input";
import { useSwapContract } from "@/lib/contract-interactions/core/create-write-hooks";
import { getToken, tokens } from "@/wagmi/tokens";
import { keepPreviousData } from "@tanstack/react-query";
import { Divider } from "@/components/ui/divider";
import { Button } from "@/components/ui/button";
import { FaArrowDown } from "react-icons/fa6";
import { Text } from "@/components/ui/text";
import { useAccount } from "@/hooks/account/use-account";
import { useSwitchChain, useBlockNumber, useReadContract } from "wagmi";
import { toast } from "@/components/ui/use-toast";
import { Form } from "@/components/ui/form";
import { useAsset } from "@/hooks/use-asset";
import { merge } from "lodash-es";
import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import { SwapRoute } from "@/components/swap/swap-route";
import { useBatchTransactionMachine } from "@/lib/machines/batch-transactions/context";
import { BatchTransactionModal } from "@/components/modals/batch-transaction-modal";
import { useApprove } from "@/lib/contract-interactions/erc-20/write/use-approve";
import { TokenABI } from "@/lib/abi/token";
import { globals } from "@/config";
import { formatCurrency } from "@/lib/utils/number";
import type { Hash } from "viem";

export type SwapProps = {
  // TODO: Add props or remove this type
};

type SwapFC = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof SwapProps> & SwapProps
>;

const schema = z.object({
  chainId: z.number().default(rollupB.id),
  from: z.object({
    token: z.string().refine(isAddress),
    amount: z.bigint().min(parseEther("0.000001"), {
      message: "Amount must be greater than 0.000001",
    }),
  }),
  to: z.object({
    token: z.string().refine(isAddress),
    amount: z.bigint(),
  }),
  slippage: z.number(),
});
export const Swap: SwapFC = () => {
  const { chainId, address, isConnected } = useAccount();
  const isRollupB = chainId === rollupB.id;
  const switchChain = useSwitchChain();
  const [state, send] = useBatchTransactionMachine();
  const block = useBlockNumber({ watch: true, chainId: rollupB.id });

  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      chainId: rollupB.id,
      from: {
        token: tokens[rollupB.id][0].address,
        amount: 0n,
      },
      to: {
        token: tokens[rollupB.id][1].address,
        amount: 0n,
      },
      slippage: 0.5,
    },
    resolver: zodResolver(schema),
  });

  const handleChainSelect = (chainId: number) => {
    form.setValue("chainId", chainId);
  };

  const values = form.watch();
  const { useGetSwapPrice, useSwap } = useSwapContract();

  const swap = useSwap({
    contract: contracts[rollupB.id].swap,
    chainId: rollupB.id,
  });

  const approver = useApprove();

  const allowance = useReadContract({
    abi: TokenABI,
    address: values.from.token,
    functionName: "allowance",
    args: [address!, contracts[rollupB.id].swap],
    blockNumber: block.data,
    chainId: rollupB.id,
    query: {
      placeholderData: keepPreviousData,
      enabled: Boolean(address && block.data),
    },
  });

  const prices = useGetSwapPrice(
    {
      tokenIn: getToken(values.from.token)?.id ?? 0,
      tokenOut: getToken(values.to.token)?.id ?? 0,
      amountIn: values.from.amount,
    },
    {
      placeholderData: values.from.amount ? keepPreviousData : undefined,
      chainId: rollupB.id,
      enabled: !!values.from.token && !!values.to.token,
    },
  );

  const isSameToken = values.from.token === values.to.token;
  const hasAllowance = allowance.isSuccess ? allowance.data >= values.from.amount : false;
  const needsApproval = !hasAllowance && values.from.amount > 0n;

  const fromToken = useAsset({
    tokenAddress: values.from.token,
    chainId: values.chainId,
  });

  const toToken = useAsset({
    tokenAddress: values.to.token,
    chainId: values.chainId,
  });

  const submit = form.handleSubmit(async (values) => {
    await switchChain.switchChainAsync({ chainId: values.chainId });

    const writers = [];

    if (needsApproval) {
      writers.push({
        name: `Approve ${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${fromToken.symbol}`,
        write: async (): Promise<Hash> => {
          return new Promise((resolve, reject) => {
            approver.write(
              {
                address: values.from.token,
                chainId: rollupB.id,
              },
              {
                spender: contracts[rollupB.id].swap,
                amount: globals.MAX_WEI_AMOUNT,
              },
              {
                onConfirmed: (hash) => resolve(hash),
                onError: (error) => reject(error),
              },
            );
          });
        },
      });
    }

    writers.push({
      name: `Swap ${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${fromToken.symbol} for ${formatCurrency(prices.data?.[0] ?? 0n, toToken.decimals || 18)} ${toToken.symbol}`,
      write: async (): Promise<Hash> => {
        return new Promise((resolve, reject) => {
          swap.write(
            {
              amountIn: values.from.amount,
              recipient: address!,
              tokenIn: getToken(values.from.token)?.id ?? 0,
              tokenOut: getToken(values.to.token)?.id ?? 0,
            },
            {
              onConfirmed: (hash) => resolve(hash),
              onError: (error) => {
                reject(error);
              },
            },
          );
        });
      },
      onMined: () => {
        fromToken.refreshBalance();
        toToken.refreshBalance();
        form.reset(
          merge({}, values, {
            from: { amount: 0n },
            to: { amount: 0n },
          }),
          {
            keepIsValid: true,
          },
        );
        form.clearErrors();
      },
    });


    send({
      type: "write",
      writers,
      header: "Swap Tokens",
      onDone: () => {
        toast({
          title: "Swap completed",
          description: "Your tokens have been swapped successfully",
        });
      },
    });
  });

  return (
    <>
      <BatchTransactionModal />
      <Form {...form}>
        <form onSubmit={submit} className="flex flex-col gap-8">
          <div className="flex gap-4 flex-col">
            <TokenInput
              chains={[
                { chainId: rollupA.id, isNotSupported: true },
                {
                  chainId: rollupB.id,
                  tokens: tokens[rollupB.id].map((token) => token.address),
                },
              ]}
              onChainSelect={handleChainSelect}
              value={values.from.amount}
              tokenAddress={values.from.token}
              chainId={values.chainId}
              onSelectToken={(token) => form.setValue("from.token", token)}
              onChange={(amount) => {
                form.setValue("from.amount", amount, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
              }}
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
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  );
                  form.setValue("to", values.from, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                <FaArrowDown className="text-primary-500" />
              </Button>
              <Divider className="flex-1" />
            </div>
            <TokenInput
              chains={[
                { chainId: rollupA.id, isNotSupported: true },
                {
                  chainId: rollupB.id,
                  tokens: tokens[rollupB.id].map((token) => token.address),
                },
              ]}
              onChainSelect={handleChainSelect}
              value={isSameToken ? values.from.amount : prices.data?.[0] ?? 0n}
              tokenAddress={values.to.token}
              chainId={values.chainId}
              isLoading={prices.isPending}
              readOnly
              onSelectToken={(token) => form.setValue("to.token", token)}
              onChange={(amount) => form.setValue("to.amount", amount)}
            />
          </div>
          <Divider />
          <SwapRoute
            action="swap"
            fromToken={{ address: values.from.token, chainId: values.chainId }}
            toToken={{ address: values.to.token, chainId: values.chainId }}
          />
          {isConnected ? (
            <Button
              size="xl"
              className="w-full"
              type="submit"
              isLoading={state.value !== "idle" || switchChain.isPending}
              loadingText={
                switchChain.isPending
                  ? "Switching network..."
                  : state.value !== "idle"
                    ? "Processing..."
                    : undefined
              }
              disabled={!form.formState.isValid || allowance.isLoading}
            >
              {!isRollupB ? "Switch to Rollup B And Swap" : "Swap"}
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
