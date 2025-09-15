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
import { WithAllowance } from "@/components/with-allowance/with-allowance";
import { useAccount } from "@/hooks/account/use-account";
import { useSwitchChain } from "wagmi";
import { toast } from "@/components/ui/use-toast";
import { Form } from "@/components/ui/form";
import { withTransactionModal } from "@/lib/contract-interactions/utils/useWaitForTransactionReceipt";
import { useAsset } from "@/hooks/use-asset";
import { merge } from "lodash-es";
import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import { SwapRoute } from "@/components/swap/swap-route";

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

  const swap = useSwap();

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
    swap.write(
      {
        amountIn: values.from.amount,
        recipient: address!,
        tokenIn: getToken(values.from.token)?.id ?? 0,
        tokenOut: getToken(values.to.token)?.id ?? 0,
      },
      withTransactionModal({
        onInitiated: () => {
          toast({
            title: "Swap initiated",
            description: "Check your wallet to confirm the transaction",
          });
        },
        onMined: () => {
          toast({
            title: "Swap mined",
          });
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
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Swap failed",
            description: error.message,
          });
        },
      }),
    );
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex flex-col gap-8">
        <div className="flex gap-4 flex-col">
          <TokenInput
            chains={[
              { chainId: rollupA.id, isSupported: false },
              { chainId: rollupB.id, isSupported: true },
            ]}
            onChainSelect={handleChainSelect}
            value={values.from.amount}
            tokenAddress={values.from.token}
            chainId={values.chainId}
            onSelectToken={(token) => form.setValue("from.token", token)}
            onChange={(amount) =>
              form.setValue("from.amount", amount, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
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
                { chainId: rollupA.id, isSupported: false },
                { chainId: rollupB.id, isSupported: true },
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
          <WithAllowance
            size="xl"
            spender={contracts[rollupB.id].swap}
            token={{
              address: values.from.token,
              symbol: getToken(values.from.token)?.symbol ?? "",
            }}
            amount={values.from.amount}
            chainId={rollupB.id}
          >
            <Button
              size="xl"
              className="w-full"
              type="submit"
              isLoading={swap.isPending || switchChain.isPending}
              loadingText={
                switchChain.isPending
                  ? "Switching network..."
                  : swap.isPending
                    ? "Swapping..."
                    : undefined
              }
              disabled={!form.formState.isValid || !form.formState.isDirty}
            >
              {!isRollupB ? "Switch to Rollup B And Swap" : "Swap"}
            </Button>
          </WithAllowance>
        ) : (
          <ConnectWalletBtn size="xl" />
        )}
      </form>
    </Form>
  );
};

Swap.displayName = "Swap";
