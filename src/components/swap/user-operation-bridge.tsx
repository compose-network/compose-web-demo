/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import type { statusIcons } from "@/components/modals/batch-transaction-modal.tsx";
import { SwapRoute } from "@/components/swap/swap-route";
import { TokenInput } from "@/components/swap/token-picker/token-input";
import { TransactionModal } from "@/components/swap/transaction-bridge/transaction-modal.tsx";
import {
  createAndSignBridgeERC20UserOps,
  createAndSignBridgeETHUserOps,
} from "@/components/swap/utils/generate-bridge-userops";
import { AddressDisplay } from "@/components/ui/address";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { Form } from "@/components/ui/form";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/use-toast";
import { globals } from "@/config";
import { useAccount } from "@/hooks/account/use-account";
import { useAsset } from "@/hooks/use-asset.ts";
import { useAllowance } from "@/lib/contract-interactions/erc-20/read/use-allowance";
import { useBalanceOf } from "@/lib/contract-interactions/erc-20/read/use-balance-of";
import { useApprove } from "@/lib/contract-interactions/erc-20/write/use-approve";
import { useMint } from "@/lib/contract-interactions/erc-20/write/use-mint";
import { withTransactionModal } from "@/lib/contract-interactions/utils/useWaitForTransactionReceipt";
import { useSmartAccount } from "@/lib/smart-account/kernel";
import type { ComposedSignedUserOpsTxReturnType } from "@/lib/smart-account/user-op";
import {
  decodeUserOperationLogs,
  toRpcUserOpCanonical,
} from "@/lib/smart-account/user-op";
import { encodeXtMessage } from "@/lib/smart-account/xt";
import { formatCurrency } from "@/lib/utils/number";
import { isNativeToken } from "@/lib/utils/token";
import { type BRIDGE_ADDRESSES, BRIDGE_TOKEN } from "@/wagmi/addresses";
import { arbitrumChain, baseChain, chainsMap, optimismChain, rollupA, rollupB } from "@/wagmi/config";
import { zodResolver } from "@hookform/resolvers/zod";
import { cloneDeep } from "lodash-es";
import { type ComponentPropsWithoutRef, type FC, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocalStorage } from "react-use";
import type { Address } from "viem";
import {
  createPublicClient,
  type Hex,
  http,
  isAddress,
  parseEther,
  rpcSchema,
  zeroAddress,
} from "viem";
import { useSendTransaction, useSwitchChain } from "wagmi";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { BRIDGE_CONFIG } from "@/wagmi/bridge.ts";

export type SwapProps = {
  // TODO: Add props or remove this type
};

type SwapFC = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof SwapProps> & SwapProps
>;

type ComposeRpcSchema = [
  {
    Method: "eth_sendXTransaction";
    Parameters: [string];
    ReturnType: null;
  },
  {
    Method: "compose_buildSignedUserOpsTx";
    Parameters: [
      ReturnType<typeof toRpcUserOpCanonical>[],
      { chainId: number },
    ];
    ReturnType: ComposedSignedUserOpsTxReturnType;
  },
];

const schema = z.object({
  token: z.string().refine(isAddress),
  from: z.object({
    chainId: z
      .number()
      .default(rollupB.id)
      .refine((id) => id === rollupA.id || id === rollupB.id, {
        message: "Chain ID must be rollupA or rollupB",
      }),
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

export const UserOperationBridge: SwapFC = () => {
  const eoa = useAccount();
  const sendTx = useSendTransaction();
  const [lastSelectedToken, setLastSelectedToken] = useLocalStorage<Address>(
    "lastSelectedToken",
    zeroAddress,
  );

  const queryClient = useQueryClient();

  const [transactionData, setTransactionData] = useState<{
    id: Hex;
    actions: {
      name: string;
      description?: string;
      chainId: number;
      toChainId?: number;
      status: keyof typeof statusIcons;
      hash?: `0x${string}`;
      userOpData?: { chainId: number; data: string }[];
    }[];
  } | null>(null);

  const [advancedMode, setAdvancedMode] = useLocalStorage(
    "advancedMode",
    false,
  );

  // Force false on first load
  if (advancedMode === undefined || advancedMode === null) {
    setAdvancedMode(false);
  }

  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      token: lastSelectedToken,
      from: {
        amount: 0n,
        chainId: rollupA.id,
      },
      to: {
        chainId: rollupB.id,
      },
      slippage: 0.5,
    },
    resolver: zodResolver(schema),
  });

  const values = form.watch();

  const { switchChainAsync } = useSwitchChain();
  const kernel = useSmartAccount();

  const fromToken = useAsset({
    tokenAddress: values.token,
    chainId: values.from.chainId,
  });

  const allowance = useAllowance(
    {
      address: values.token,
      chainId: values.from.chainId,
    },
    {
      owner: eoa.address!,
      spender: kernel.kernel.data?.accounts.A.address || zeroAddress,
    },
    {
      enabled: Boolean(eoa.address),
    },
  );

  const approve = useApprove();

  const submit = form.handleSubmit(async (values) => {
    const id: Hex = `0x${Math.floor(Number(BigInt(Math.floor(Math.random() * 0xffffffff)))).toString(16)}`;

    if (!eoa.address || !kernel.kernel.data)
      return toast({
        title: "Please connect your wallet",
        variant: "destructive",
      });

    toast({
      title: "Token bridge initiated",
      description: "Check your wallet to confirm the transaction",
    });

    await switchChainAsync({ chainId: values.from.chainId });

    const symbol = values.token === zeroAddress ? "ETH" : fromToken.symbol;
    const isNative = isNativeToken(values.token);

    setTransactionData({
      id,
      actions: [
        {
          name: `${isNative ? `Send ${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${fromToken.symbol} to Smart Account` : `Approve ${symbol}`}`,
          chainId: values.from.chainId,
          status: "pending",
          description: `${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${fromToken.symbol}`,
        },
        {
          name: `Bridge ${formatCurrency(values.from.amount, fromToken.decimals || 18)} ${symbol}`,
          chainId: values.from.chainId,
          toChainId: values.to.chainId,
          status: "idle",
        },
      ],
    });

    const sourcePublicClient = createPublicClient({
      chain: chainsMap[values.from.chainId as keyof typeof chainsMap],
      transport: http(
        chainsMap[values.from.chainId as keyof typeof chainsMap].rpcUrls.default
          .http[0],
      ),
      rpcSchema: rpcSchema<ComposeRpcSchema>(),
    });

    const destPublicClient = createPublicClient({
      chain: chainsMap[values.to.chainId as keyof typeof chainsMap],
      transport: http(
        chainsMap[values.to.chainId as keyof typeof chainsMap].rpcUrls.default
          .http[0],
      ),
      rpcSchema: rpcSchema<ComposeRpcSchema>(),
    });

    if (isNative) {
      const hash = await sendTx.sendTransactionAsync({
        to: kernel.getKernelByChainId(values.from.chainId)!.address,
        value: values.from.amount,
        chainId: values.from.chainId,
      });
      setTransactionData((prev) => {
        if (!prev) return null;
        const clone = cloneDeep(prev);
        clone.actions[0].hash = hash;
        return clone;
      });
      await sourcePublicClient.waitForTransactionReceipt({ hash });
      setTransactionData((prev) => {
        if (!prev) return null;
        const clone = cloneDeep(prev);
        clone.actions[0].hash = hash;
        clone.actions[0].name = `${clone.actions[0].name} - ${isNative ? "sent" : "approved"}`;
        return clone;
      });
    } else if ((allowance.data ?? 0n) < values.from.amount) {
      await approve.write(
        {
          address: values.token,
          chainId: values.from.chainId,
        },
        {
          spender: kernel.kernel.data?.accounts.A.address || zeroAddress,
          amount: globals.MAX_WEI_AMOUNT,
        },
        {
          onError: () => {
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[0].status = "failed";
              return clone;
            });
          },
          onConfirmed: (hash) => {
            setTransactionData((prev) => {
              if (!prev) return null;
              const clone = cloneDeep(prev);
              clone.actions[0].hash = hash;
              clone.actions[0].name = `${clone.actions[0].name}`;
              return clone;
            });
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
    } else {
      console.log("Kernel has enough balance of the selected token to bridge");
      console.log("Skipping transfer transaction");
    }

    setTransactionData((prev) => {
      if (!prev) return null;
      const clone = cloneDeep(prev);
      clone.actions[0].status = "success";
      clone.actions[1].status = "pending";
      // clone.actions[2].status = "pending";
      return clone;
    });

    const sourceKernel = kernel.getKernelByChainId(values.from.chainId);

    const destKernel = kernel.getKernelByChainId(values.to.chainId);

    const sessionId = BigInt(Math.floor(Math.random() * 1000000));

    const createOps = isNative
      ? createAndSignBridgeETHUserOps
      : createAndSignBridgeERC20UserOps;

    // Create and sign user operations for bridge
    const [signedA, signedB] = await createOps({
      eoaAddress: eoa.address!,
      sourceKernelAccount: sourceKernel!,
      destKernelAccount: destKernel!,
      tokenAddress: values.token,
      amount: values.from.amount,
      sessionId,
      sourceChainId: values.from.chainId as keyof typeof BRIDGE_ADDRESSES,
      destChainId: values.to.chainId as keyof typeof BRIDGE_ADDRESSES,
    });

    const userOpA = toRpcUserOpCanonical(signedA);
    console.log("userOpA:", userOpA);
    const userOpB = toRpcUserOpCanonical(signedB);
    console.log("userOpB:", userOpB);

    console.log("signedA:", signedA);
    console.log("signedB:", signedB);

    // Update transactionData with userOp data
    setTransactionData((prev) => {
      if (!prev) return null;
      const clone = cloneDeep(prev);
      clone.actions[1].userOpData = [
        { chainId: values.from.chainId, data: JSON.stringify(userOpA) },
        { chainId: values.to.chainId, data: JSON.stringify(userOpB) },
      ];
      return clone;
    });

    const [buildA, buildB] = await Promise.all([
      sourcePublicClient.request({
        method: "compose_buildSignedUserOpsTx",
        params: [[userOpA], { chainId: values.from.chainId }],
      }),
      destPublicClient.request({
        method: "compose_buildSignedUserOpsTx",
        params: [[userOpB], { chainId: values.to.chainId }],
      }),
    ]).catch((errs) => {
      console.log("errors", errs);
      setTransactionData((prev) => {
        if (!prev) return null;
        const clone = cloneDeep(prev);
        clone.actions[1].status = "failed";
        // clone.actions[2].status = "failed";
        return clone;
      });
      throw errs;
    });

    const hashA = buildA.hash;
    const hashB = buildB.hash;

    const explorerAURL = new URL(
      `tx/${hashA}`,
      sourcePublicClient.chain.blockExplorers?.default?.url,
    ).toString();

    const explorerBURL = new URL(
      `tx/${hashB}`,
      destPublicClient.chain.blockExplorers?.default?.url,
    ).toString();

    setTransactionData((prev) => {
      if (!prev) return null;
      const clone = cloneDeep(prev);
      clone.actions[1].hash = hashA;
      // clone.actions[2].hash = hashB;
      return clone;
    });

    console.log("buildA:", buildA, explorerAURL);
    console.log("buildB ", buildB, explorerBURL);

    const payload = encodeXtMessage({
      senderId: "client",
      entries: [
        { chainId: values.from.chainId, rawTx: buildA.raw as `0x${string}` },
        { chainId: values.to.chainId, rawTx: buildB.raw as `0x${string}` },
      ],
    });
    console.log("payload:", payload);

    const res = await sourcePublicClient.request({
      method: "eth_sendXTransaction",
      params: [payload],
    });

    console.log("RAW eth_sendXTransaction res for Rollup A", res);

    // const [hashA, hashB] = await Promise.all([
    //   publicClientFrom.request({
    //     method: "eth_sendRawTransaction",
    //     params: [buildA.raw],
    //   }),
    //   publicClientTo.request({
    //     method: "eth_sendRawTransaction",
    //     params: [buildB.raw],
    //   }),
    // ]);

    const [receiptA, receiptB] = await Promise.all([
      sourcePublicClient.waitForTransactionReceipt({
        hash: hashA,
      }),
      destPublicClient.waitForTransactionReceipt({
        hash: hashB,
      }),
    ]);

    // TODO(kjesien) find a better way to refresh balances
    await queryClient.invalidateQueries();

    setTransactionData((prev) => {
      if (!prev) return null;
      const clone = cloneDeep(prev);
      clone.actions[1].status = "success";
      return clone;
    });

    const decodedA = decodeUserOperationLogs(receiptA.logs);
    console.log("decoded logs for Rollup A:", decodedA);
    const decodedB = decodeUserOperationLogs(receiptB.logs);
    console.log("decoded logs for Rollup B:", decodedB);

    const revertedA = decodedA.find(
      (log) => log?.args && "success" in log.args && !log.args.success,
    );

    const revertedB = decodedB.find(
      (log) => log?.args && "success" in log.args && !log.args.success,
    );

    if (revertedA || revertedB) {
      setTransactionData((prev) => {
        if (!prev) return null;
        const clone = cloneDeep(prev);
        clone.actions[1].status = "failed";
        return clone;
      });

      return toast({
        variant: "destructive",
        title: "User operation failed",
        description: "Check your wallet to confirm the transaction",
      });
    }

    toast({
      title: "Transaction sent",
      description: "Check your wallet to confirm the transaction",
    });
  });

  const mint = useMint();

  const kernelAMTKBalance = useBalanceOf(
    {
      address: "0x88282Bc19cAE4990020BF4cd6E7898E966744eB9",
      chainId: rollupA.id,
    },
    {
      account: kernel.kernel.data?.accounts.A.address || zeroAddress,
    },
  );

  const kernelBMTKBalance = useBalanceOf(
    {
      address: "0x88282Bc19cAE4990020BF4cd6E7898E966744eB9",
      chainId: rollupB.id,
    },
    {
      account: kernel.kernel.data?.accounts.B.address || zeroAddress,
    },
  );

  return (
    <>
      <TransactionModal
        title={"Bridge"}
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
              chains={BRIDGE_CONFIG}
              onChainSelect={(chainId) => {
                 switchChainAsync({ chainId:chainId });
                form.setValue(
                  "from.chainId",
                  chainId as typeof rollupA.id | typeof rollupB.id,
                );
                if (chainId === values.to.chainId) {
                  const newToChainId = chainId === rollupA.id ? rollupB.id : rollupA.id;
                  form.setValue("to.chainId", newToChainId);
                }
              }}
              value={values.from.amount}
              tokenAddress={values.token}
              chainId={values.from.chainId}
              onSelectToken={(token) => {
                form.setValue("token", token);
                setLastSelectedToken(token);
              }}
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
              chains={[
                { chainId: rollupA.id, tokens: [zeroAddress] },
                { chainId: rollupB.id, tokens: [zeroAddress] },
                { chainId: baseChain.id, isNotSupported: true },
                { chainId: arbitrumChain.id, isNotSupported: true },
                { chainId: optimismChain.id, isNotSupported: true },
              ]}
              onChainSelect={(chainId) => {
                form.setValue(
                  "to.chainId",
                  chainId as typeof rollupA.id | typeof rollupB.id,
                );
                if (chainId === values.from.chainId) {
                  const newFromChainId = chainId === rollupA.id ? rollupB.id : rollupA.id;
                  form.setValue("from.chainId", newFromChainId);
                }
              }}
              value={values.from.amount}
              tokenAddress={values.token}
              chainId={values.to.chainId}
              onSelectToken={(token) => {
                form.setValue("token", token);
                setLastSelectedToken(token);
              }}
              onChange={() => {}}
              readOnly
            />
          </div>
          <Divider />
          <SwapRoute
            action="swap"
            fromToken={{
              address: values.token,
              chainId: values.from.chainId,
            }}
            toToken={{
              address: values.token,
              chainId: values.to.chainId,
            }}
          />
          {eoa.isConnected ? (
            <Button
              size="xl"
              className="w-full"
              type="submit"
              disabled={!form.formState.isValid || kernel.isLoading}
              loadingText="Bridging..."
            >
              Bridge
            </Button>
          ) : (
            <ConnectWalletBtn size="xl" />
          )}
        </form>
      </Form>
      {advancedMode && (
        <Card className="m-0 p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kernel A Account */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <Text variant="body-2-semibold" className="text-gray-900">
                  Kernel A Account
                </Text>
                <Text variant="body-3-medium" className="text-gray-500">
                  Rollup A
                </Text>
              </div>

              {kernel.kernel.data?.accounts?.A?.address && (
                <div className="mb-3">
                  <AddressDisplay
                    address={kernel.kernel.data.accounts.A.address}
                    copyable
                    className="text-sm"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Text variant="body-3-medium" className="text-gray-600">
                    Balance
                  </Text>
                  <Text variant="headline4" className="text-gray-900">
                    {formatCurrency(kernel.balanceA.data?.value ?? 0n)}{" "}
                    {kernel.balanceA.data?.symbol}
                  </Text>
                  <Text variant="headline4" className="text-gray-900">
                    {formatCurrency(kernel.gasBalanceA.data ?? 0n)} Gas ETH
                  </Text>
                  <Text variant="headline4" className="text-gray-900">
                    {formatCurrency(kernelAMTKBalance.data ?? 0n)} MTK
                  </Text>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await switchChainAsync({ chainId: rollupA.id });
                    await kernel.depositToA.write({
                      account: kernel.kernel.data!.accounts.A.address,
                      value: parseEther("0.1"),
                    });
                  }}
                  disabled={kernel.depositToA.isPending}
                  isLoading={kernel.depositToA.isPending}
                >
                  Deposit 0.1 GAS ETH
                </Button>
              </div>
            </div>

            {/* Kernel B Account */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <Text variant="body-2-semibold" className="text-gray-900">
                  Kernel B Account
                </Text>
                <Text variant="body-3-medium" className="text-gray-500">
                  Rollup B
                </Text>
              </div>

              {kernel.kernel.data?.accounts?.B?.address && (
                <div className="mb-3">
                  <AddressDisplay
                    address={kernel.kernel.data.accounts.B.address}
                    copyable
                    className="text-sm"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Text variant="body-3-medium" className="text-gray-600">
                    Balance
                  </Text>
                  <Text variant="headline4" className="text-gray-900">
                    {formatCurrency(kernel.balanceB.data?.value ?? 0n)}{" "}
                    {kernel.balanceB.data?.symbol}
                  </Text>
                  <Text variant="headline4" className="text-gray-900">
                    {formatCurrency(kernel.gasBalanceB.data ?? 0n)} Gas ETH
                  </Text>
                  <Text variant="headline4" className="text-gray-900">
                    {formatCurrency(kernelBMTKBalance.data ?? 0n)} MTK
                  </Text>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await switchChainAsync({ chainId: rollupB.id });
                    await kernel.depositToB.write({
                      account: kernel.kernel.data!.accounts.B.address,
                      value: parseEther("0.1"),
                    });
                  }}
                  disabled={kernel.depositToB.isPending}
                  isLoading={kernel.depositToB.isPending}
                >
                  Deposit 0.1 GAS ETH
                </Button>
              </div>
            </div>
          </div>

          <div className="flex">
            <Button
              onClick={async () => {
                await switchChainAsync({ chainId: rollupA.id });
                await mint.write(
                  { address: BRIDGE_TOKEN, chainId: rollupA.id },
                  {
                    to: eoa.address!,
                    amount: parseEther("10"),
                  },
                  withTransactionModal(),
                );
              }}
            >
              Mint 10 MTK Rollup A
            </Button>
            <Button
              onClick={async () => {
                await switchChainAsync({ chainId: rollupB.id });
                await mint.write(
                  { address: BRIDGE_TOKEN, chainId: rollupA.id },
                  {
                    to: eoa.address!,
                    amount: parseEther("10"),
                  },
                  withTransactionModal(),
                );
              }}
            >
              Mint 10 MTK Rollup B
            </Button>
          </div>
        </Card>
      )}
    </>
  );
};

UserOperationBridge.displayName = "Swap";
