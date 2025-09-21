import { type FC, type ComponentPropsWithoutRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { rollupB, hoodi, contracts } from "@/wagmi/config";
import { isAddress, parseEther, zeroAddress } from "viem";
import { TokenInput } from "@/components/swap/token-picker/token-input";
import { Divider } from "@/components/ui/divider";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAccount } from "@/hooks/account/use-account";
import { useSwitchChain } from "wagmi";
import { toast } from "@/components/ui/use-toast";
import { Form } from "@/components/ui/form";
import { withTransactionModal } from "@/lib/contract-interactions/utils/useWaitForTransactionReceipt";
import { useAsset } from "@/hooks/use-asset";
import { merge } from "lodash-es";
import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import { SwapRoute } from "@/components/swap/swap-route";
import { useBridgeContract } from "@/lib/contract-interactions/core/create-write-hooks";

export type SwapProps = {
  // TODO: Add props or remove this type
};

type SwapFC = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof SwapProps> & SwapProps
>;

const schema = z.object({
  from: z.object({
    chainId: z.number().default(rollupB.id),
    token: z.string().refine(isAddress),
    amount: z.bigint().min(parseEther("0.000001"), {
      message: "Amount must be greater than 0.000001",
    }),
  }),
  slippage: z.number(),
});
export const TransactionBridge: SwapFC = () => {
  const { chainId, isConnected } = useAccount();
  const isHoodi = chainId === hoodi.id;
  const switchChain = useSwitchChain();

  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      from: {
        token: zeroAddress,
        amount: 0n,
        chainId: hoodi.id,
      },
      slippage: 0.5,
    },
    resolver: zodResolver(schema),
  });

  const handleChainSelect = (chainId: number) => {
    form.setValue("from.chainId", chainId);
  };

  console.log("form.formState.isValid:", form.formState.isValid);
  const values = form.watch();

  const fromToken = useAsset({
    tokenAddress: values.from.token,
    chainId: values.from.chainId,
  });

  const { useBridgeETH } = useBridgeContract();
  const bridgeETH = useBridgeETH({
    chainId: hoodi.id,
    contract: contracts[hoodi.id].bridge,
  });

  const submit = form.handleSubmit(async (values) => {
    await switchChain.switchChainAsync({ chainId: hoodi.id });
    bridgeETH.write(
      {
        _extraData: "0x",
        _minGasLimit: 0,
        value: values.from.amount,
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
            chains={[{ chainId: hoodi.id, tokens: [zeroAddress] }]}
            onChainSelect={handleChainSelect}
            value={values.from.amount}
            tokenAddress={values.from.token}
            chainId={values.from.chainId}
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

          <TokenInput
            canPickToken={false}
            chains={[{ chainId: rollupB.id, tokens: [] }]}
            onChainSelect={handleChainSelect}
            value={values.from.amount}
            tokenAddress={values.from.token}
            chainId={rollupB.id}
            readOnly
            onSelectToken={(token) => form.setValue("from.token", token)}
            onChange={(amount) => form.setValue("from.amount", amount)}
          />
        </div>
        <Divider />
        <SwapRoute
          action="swap"
          fromToken={{ address: values.from.token, chainId: hoodi.id }}
          toToken={{ address: values.from.token, chainId: rollupB.id }}
        />
        {isConnected ? (
          <Button
            size="xl"
            className="w-full"
            type="submit"
            disabled={!form.formState.isValid || !form.formState.isDirty}
            isLoading={bridgeETH.isPending}
            loadingText="Bridging..."
          >
            {!isHoodi ? "Switch to Hoodi And Bridge" : "Bridge"}
          </Button>
        ) : (
          <ConnectWalletBtn size="xl" />
        )}
      </form>
    </Form>
  );
};

TransactionBridge.displayName = "TransactionBridge";
