/* eslint-disable @typescript-eslint/no-explicit-any */
import { type FC, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { RollupChainId } from "@/wagmi/config";
import {
  arbitrumChain,
  baseChain,
  bridgeContracts,
  hoodi,
  l2StandardBridgeProxyAddress,
  optimismChain,
  rollupA,
  rollupB,
} from "@/wagmi/config";
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
import type { TransactionModalData } from "@/components/swap/transaction-bridge/transaction-modal";
import { TransactionModal } from "@/components/swap/transaction-bridge/transaction-modal";
import { BRIDGE_CONFIG } from "@/wagmi/bridge.ts";
import { getErrorMessage } from "@/lib/utils/wagmi.ts";

const schema = z.object({
  from: z.object({
    chainId: z.number().default(rollupB.id),
    token: z.string().refine(isAddress),
    amount: z.bigint().min(parseEther("0.000001"), {
      message: "Amount must be greater than 0.000001",
    }),
  }),
  to: z.object({
    chainId: z
      .number()
      .default(rollupB.id)
      .refine((id) => id === rollupA.id || id === rollupB.id, {
        message: "Chain ID must be rollupA or rollupB",
      }),
  }),
  slippage: z.number(),
});

export const TransactionBridge: FC = () => {
  const { chainId, isConnected } = useAccount();
  const isHoodi = chainId === hoodi.id;
  const switchChain = useSwitchChain();

  const [errorMessage, setErrorMessage] = useState<string>();

  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      from: {
        token: zeroAddress,
        amount: 0n,
        chainId: hoodi.id,
      },
      to: {
        chainId: rollupA.id,
      },
      slippage: 0.5,
    },
    resolver: zodResolver(schema),
  });

  const handleChainSelect = async (chainId: number) => {
    await switchChain.switchChainAsync({ chainId });
    form.setValue("from.chainId", chainId);
  };

  const values = form.watch();

  const fromToken = useAsset({
    tokenAddress: values.from.token,
    chainId: values.from.chainId,
  });

  const { useBridgeETH } = useBridgeContract();

  const bridgeETH = useBridgeETH({
    chainId: values.from.chainId,
    contract: bridgeContracts[hoodi.id][values.to.chainId].bridge,
  });

  const [transactionData, setTransactionData] =
    useState<TransactionModalData | null>(null);

  const rollupAClient = usePublicClient({
    chainId: rollupA.id,
  });
  const rollupBClient = usePublicClient({
    chainId: rollupB.id,
  });

  useEffect(() => {
    if (!transactionData?.id || transactionData.actions[1].status === "success")
      return;
    const endTransaction = transactionData.actions.at(-1);
    console.log("endTransaction:", endTransaction);
    const client =
      endTransaction?.chainId === rollupB.id ? rollupBClient : rollupAClient;

    const unwatch = client?.watchContractEvent({
      address: l2StandardBridgeProxyAddress,
      abi: l2StandardBridgeABI,
      eventName: "ETHBridgeFinalized",
      onLogs: (logs) => {
        const log = logs.find((l) => l.args.extraData === transactionData.id);
        if (log) {
          setTransactionData((prev) => {
            if (!prev) return null;
            const clone = cloneDeep(prev);
            clone.actions[1].status = "success";
            clone.actions[1].hash = log.transactionHash;
            return clone;
          });
        }
      },
    });

    console.log("watching eth bridge finalized", client?.chain.name);
    return () => {
      unwatch?.();
      console.log("unwatching eth bridge finalized");
    };
  }, [transactionData, rollupAClient, rollupBClient]);

  const submit = form.handleSubmit(async (values) => {
    await switchChain.switchChainAsync({ chainId: hoodi.id });
    const id: Hex = `0x${Math.floor(Number(BigInt(Math.floor(Math.random() * 0xffffffff)))).toString(16)}`;

    const actionFn = () => {
      bridgeETH.write(
        {
          _minGasLimit: 0,
          value: values.from.amount,
          _extraData: id,
        },
        {
          onInitiated: () => {
            toast({
              title: "Bridge initiated",
              description: "Check your wallet to confirm the transaction",
            });
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[0].status = "pending";
              return clone;
            });
          },
          onConfirmed: (hash) => {
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[0].hash = hash;
              return clone;
            });
          },
          onMined: (receipt) => {
            console.log("receipt:", receipt);
            if (receipt.status !== "success") {
              setTransactionData((prev) => {
                if (!prev) return null;
                const clone = cloneDeep(prev);
                clone.actions[0].status = "failed";
                return clone;
              });

              const errMes = "Transaction was reverted by the contract.";
              setErrorMessage(errMes);
              toast({
                variant: "destructive",
                title: "Bridge failed",
                description: errMes,
              });

              throw new Error("Bridge failed");
            }
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[0].status = "success";
              clone.actions[1].status = "pending";
              clone.actions[1].name = `${clone.actions[1].name} (in ~2 minutes)`;
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
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[0].status = "failed";
              return clone;
            });

            const errMes = getErrorMessage(error);
            setErrorMessage(errMes);
            toast({
              variant: "destructive",
              title: "Bridge failed",
              description: errMes,
            });
          },
        },
      );
    };

    setErrorMessage(undefined);

    setTransactionData({
      id,
      actions: [
        {
          name: `Bridge ${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${fromToken.symbol}`,
          chainId: values.from.chainId,
          status: "idle",
          signAndSend: () => {
            setErrorMessage(undefined);
            actionFn();
          },
        },
        {
          name: `Get ${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${fromToken.symbol}`,
          chainId: values.to.chainId,
          status: "idle",
          signAndSend: undefined,
        },
      ],
    });
  });

  return (
    <>
      <TransactionModal
        title={"Bridge"}
        data={transactionData}
        isOpen={!!transactionData || bridgeETH.isPending}
        errorMessage={errorMessage}
        onOpenChange={(open) => {
          if (open || bridgeETH.isPending) return;
          return setTransactionData(null);
        }}
      />
      <Form {...form}>
        <form onSubmit={submit} className="flex flex-col gap-8">
          <div className="flex gap-4 flex-col">
            <TokenInput
              chains={BRIDGE_CONFIG}
              onChainSelect={handleChainSelect}
              value={values.from.amount}
              tokenAddress={values.from.token}
              chainId={values.from.chainId}
              onSelectToken={(token) => form.setValue("from.token", token)}
              onChange={(amount) => {
                form.setValue("from.amount", amount, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            />
            {form.formState.errors.from?.amount && (
              <Text variant="body-3-medium" className="text-error-500">
                {form.formState.errors.from.amount?.message}
              </Text>
            )}

            <TokenInput
              chains={[
                { chainId: rollupA.id, tokens: [zeroAddress] },
                { chainId: rollupB.id, tokens: [zeroAddress] },
                { chainId: baseChain.id, isNotSupported: true },
                { chainId: arbitrumChain.id, isNotSupported: true },
                { chainId: optimismChain.id, isNotSupported: true },
              ]}
              onChainSelect={(chainId) =>
                form.setValue("to.chainId", chainId as RollupChainId)
              }
              value={values.from.amount}
              tokenAddress={values.from.token}
              chainId={values.to.chainId}
              readOnly
              onSelectToken={() => 0}
              onChange={() => 0}
            />
          </div>
          <Divider />
          <SwapRoute
            action="bridge"
            fromToken={{ address: values.from.token, chainId: hoodi.id }}
            toToken={{ address: values.from.token, chainId: values.to.chainId }}
          />
          {isConnected ? (
            <Button
              size="xl"
              className="w-full"
              type="submit"
              disabled={
                !form.formState.isValid ||
                (fromToken.balance !== undefined &&
                  values.from.amount > fromToken.balance)
              }
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
