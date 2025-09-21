/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type FC,
  type ComponentPropsWithoutRef,
  useState,
  useEffect,
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { rollupB, hoodi, contracts } from "@/wagmi/config";
import type { Hex } from "viem";
import { isAddress, parseEther, zeroAddress } from "viem";
import { TokenInput } from "@/components/swap/token-picker/token-input";
import { Divider } from "@/components/ui/divider";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAccount } from "@/hooks/account/use-account";
import { usePublicClient, useSwitchChain } from "wagmi";
import { toast } from "@/components/ui/use-toast";
import { Form } from "@/components/ui/form";
import { useAsset } from "@/hooks/use-asset";
import { cloneDeep, merge } from "lodash-es";
import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import { SwapRoute } from "@/components/swap/swap-route";
import { useBridgeContract } from "@/lib/contract-interactions/core/create-write-hooks";
import { l2StandardBridgeABI } from "@/lib/abi/swap/bridge";
import { formatCurrency } from "@/lib/utils/number";
import { TransactionModal } from "@/components/swap/transaction-bridge/transaction-modal";
import type { statusIcons } from "@/components/modals/batch-transaction-modal";

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

  const [transactionData, setTransactionData] = useState<{
    id: Hex;
    actions: {
      name: string;
      description?: string;
      chainId: number;
      status: keyof typeof statusIcons;
    }[];
  } | null>(null);

  console.log("transactionData:", transactionData);

  const publicClient = usePublicClient({
    chainId: rollupB.id,
  });

  useEffect(() => {
    if (!transactionData?.id) return;
    const unwatch = publicClient?.watchContractEvent({
      address: "0x4200000000000000000000000000000000000010",
      abi: l2StandardBridgeABI,
      eventName: "ETHBridgeFinalized",
      onLogs: (logs) => {
        console.log("logs:", logs);
        if (logs.find((l) => l.args.extraData === transactionData.id)) {
          setTransactionData((prev) => {
            if (!prev) return null;
            const clone = cloneDeep(prev);
            clone.actions[1].status = "success";
            return clone;
          });
        }
      },
    });

    console.log("watching eth bridge finalized", publicClient?.chain.name);
    return () => {
      unwatch?.();
      console.log("unwatching eth bridge finalized");
    };
  }, [transactionData?.id, publicClient]);

  const submit = form.handleSubmit(async (values) => {
    await switchChain.switchChainAsync({ chainId: hoodi.id });
    const id: Hex = `0x${Math.floor(Number(BigInt(Math.floor(Math.random() * 0xffffffff)))).toString(16)}`;

    bridgeETH.write(
      {
        _minGasLimit: 0,
        value: values.from.amount,
        _extraData: id,
      },
      {
        onInitiated: () => {
          toast({
            title: "Swap initiated",
            description: "Check your wallet to confirm the transaction",
          });

          setTransactionData({
            id,
            actions: [
              {
                name: `Bridge ${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${fromToken.symbol}`,
                chainId: hoodi.id,
                status: "pending",
              },
              {
                name: `Get ${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${fromToken.symbol}`,
                chainId: rollupB.id,
                description: "(in ~2 minutes)",
                status: "idle",
              },
            ],
          });
        },
        onMined: () => {
          toast({
            title: "Swap mined",
          });
          setTransactionData((prev) => {
            if (!prev) return null;
            const clone = cloneDeep(prev);
            clone.actions[0].status = "success";
            clone.actions[1].status = "pending";
            return clone;
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

          setTransactionData(null);
        },
      },
    );
  });

  return (
    <>
      <TransactionModal
        data={transactionData}
        isOpen={!!transactionData || bridgeETH.isPending}
        onOpenChange={(open) => {
          if (open || bridgeETH.isPending) return;
          return setTransactionData(null);
        }}
      />
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
              disabled={!form.formState.isValid}
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
    </>
  );
};

TransactionBridge.displayName = "TransactionBridge";
