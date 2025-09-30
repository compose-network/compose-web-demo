/* eslint-disable @typescript-eslint/no-explicit-any */
import { type FC, type ComponentPropsWithoutRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { rollupB, rollupA, chainsMap } from "@/wagmi/config";
import {
  createPublicClient,
  encodeFunctionData,
  http,
  isAddress,
  parseEther,
  zeroAddress,
} from "viem";
import { TokenInput } from "@/components/swap/token-picker/token-input";
import { Divider } from "@/components/ui/divider";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAccount } from "@/hooks/account/use-account";
import {
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { toast } from "@/components/ui/use-toast";
import { Form } from "@/components/ui/form";
import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import { SwapRoute } from "@/components/swap/swap-route";
import { useSmartAccount } from "@/lib/smart-account/kernel";
import {
  BRIDGE_ADDRESSES,
  BRIDGE_TOKEN,
  ENTRYPOINT_V0_7,
} from "@/wagmi/addresses";
import { UserOperationBridgeAbi } from "@/lib/abi/swap/op-bridge";
import { prepareAndSignUserOperations } from "@zerodev/multi-chain-ecdsa-validator";
import { useLocalStorage } from "react-use";
import { formatCurrency } from "@/lib/utils/number";
import { Card } from "@/components/ui/card";
import { AddressDisplay } from "@/components/ui/address";
import type { ComposedSignedUserOpsTxReturnType } from "@/lib/smart-account/user-op";
import {
  decodeUserOperationLogs,
  toRpcUserOpCanonical,
} from "@/lib/smart-account/user-op";
import { useMint } from "@/lib/contract-interactions/erc-20/write/use-mint";
import { withTransactionModal } from "@/lib/contract-interactions/utils/useWaitForTransactionReceipt";
import { useBalanceOf } from "@/lib/contract-interactions/erc-20/read/use-balance-of";
import { encodeXtMessage } from "@/lib/smart-account/xt";
import { EntryPointAbi } from "@/lib/abi/entrypoint";
import { useTransfer } from "@/lib/contract-interactions/erc-20/write/use-transfer";

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
  to: z.object({
    chainId: z.number().default(rollupB.id),
    token: z.string().refine(isAddress),
  }),
  slippage: z.number(),
});

const FALLBACK_CALL_GAS_LIMIT = 900_000n;
const MIN_VERIFICATION_GAS_LIMIT = 1_200_000n;
const PRE_VERIFICATION_GAS = 90_000n;

const withMargin = (value: bigint, marginPct = 25n) =>
  value + (value * marginPct) / 100n;

export const UserOperationBridge: SwapFC = () => {
  const account = useAccount();
  const walletClient = useWalletClient();
  const erc20transfer = useTransfer();

  const [showDeposit] = useLocalStorage("showDeposit", false);

  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      from: {
        token: BRIDGE_TOKEN,
        amount: 0n,
        chainId: rollupA.id,
      },
      to: {
        token: BRIDGE_TOKEN,
        chainId: rollupB.id,
      },
      slippage: 0.5,
    },
    resolver: zodResolver(schema),
  });

  const values = form.watch();

  const { switchChainAsync } = useSwitchChain();
  const kernel = useSmartAccount();

  const publicClient = usePublicClient({
    chainId: rollupB.id,
  });

  // for testing purposes
  window.getLogs = (hash: `0x${string}`) => {
    return publicClient
      ?.getTransactionReceipt({
        hash,
      })
      .then((receipt) => decodeUserOperationLogs(receipt.logs));
  };

  const submit = form.handleSubmit(async (values) => {
    if (!account.address || !kernel.kernel.data)
      return toast({
        title: "Please connect your wallet",
        variant: "destructive",
      });

    await switchChainAsync({ chainId: values.from.chainId });

    const sourcePublicClient = createPublicClient({
      chain: chainsMap[values.from.chainId as keyof typeof chainsMap],
      transport: http(
        chainsMap[values.from.chainId as keyof typeof chainsMap].rpcUrls.default
          .http[0],
      ),
    });

    const destPublicClient = createPublicClient({
      chain: chainsMap[values.to.chainId as keyof typeof chainsMap],
      transport: http(
        chainsMap[values.to.chainId as keyof typeof chainsMap].rpcUrls.default
          .http[0],
      ),
    });

    const sourceKernel = kernel.getKernelByChainId(values.from.chainId);
    const destKernel = kernel.getKernelByChainId(values.to.chainId);

    const [sourceGas, destGas] = await Promise.all([
      sourcePublicClient.estimateFeesPerGas(),
      destPublicClient.estimateFeesPerGas(),
    ]);

    const sessionId = BigInt(Math.floor(Math.random() * 1000000));

    const sourceData = encodeFunctionData({
      abi: UserOperationBridgeAbi,
      functionName: "send",
      args: [
        BigInt(values.to.chainId),
        values.from.token,
        sourceKernel!.address,
        destKernel!.address,
        values.from.amount,
        sessionId,
        BRIDGE_ADDRESSES[values.to.chainId as keyof typeof BRIDGE_ADDRESSES]
          .BRIDGE,
      ],
    });

    const destData = encodeFunctionData({
      abi: UserOperationBridgeAbi,
      functionName: "receiveTokens",
      args: [
        BigInt(values.from.chainId),
        sourceKernel!.address,
        destKernel!.address,
        sessionId,
        BRIDGE_ADDRESSES[values.from.chainId as keyof typeof BRIDGE_ADDRESSES]
          .BRIDGE,
      ],
    });

    const sourceBridgeContract =
      BRIDGE_ADDRESSES[values.from.chainId as keyof typeof BRIDGE_ADDRESSES]
        .BRIDGE;
    const destBridgeContract =
      BRIDGE_ADDRESSES[values.to.chainId as keyof typeof BRIDGE_ADDRESSES]
        .BRIDGE;

    const [callGasLimitA, callGasLimitB] = await Promise.all([
      (async () => {
        try {
          const estimate = await sourcePublicClient.estimateGas({
            account: kernel.kernel.data!.accounts.A.address as `0x${string}`,
            to: sourceBridgeContract,
            data: sourceData,
          });
          return withMargin(estimate);
        } catch (error) {
          console.warn("send() gas estimation failed, falling back", error);
          return FALLBACK_CALL_GAS_LIMIT;
        }
      })(),
      (async () => {
        try {
          const estimate = await destPublicClient.estimateGas({
            account: kernel.kernel.data!.accounts.B.address as `0x${string}`,
            to: destBridgeContract,
            data: destData,
          });
          return withMargin(estimate);
        } catch (error) {
          console.warn(
            "receiveTokens() gas estimation failed, falling back",
            error,
          );
          return FALLBACK_CALL_GAS_LIMIT;
        }
      })(),
    ]);

    const verificationGasLimitA = callGasLimitA + PRE_VERIFICATION_GAS;
    const verificationGasLimitB = callGasLimitB + PRE_VERIFICATION_GAS;

    const [signedA, signedB] = await prepareAndSignUserOperations(
      [sourcePublicClient, destPublicClient],
      [
        {
          account: sourceKernel!,
          chainId: values.from.chainId,
          calls: [
            {
              to: sourceBridgeContract,
              value: 0n,
              data: sourceData,
            },
          ],
          callGasLimit: callGasLimitA,
          verificationGasLimit:
            verificationGasLimitA > MIN_VERIFICATION_GAS_LIMIT
              ? verificationGasLimitA
              : MIN_VERIFICATION_GAS_LIMIT,
          preVerificationGas: PRE_VERIFICATION_GAS,
          maxFeePerGas: sourceGas!.maxFeePerGas!,
          maxPriorityFeePerGas: sourceGas!.maxPriorityFeePerGas!,
        },
        {
          account: destKernel!,
          chainId: values.to.chainId,
          calls: [{ to: destBridgeContract, value: 0n, data: destData }],
          callGasLimit: callGasLimitB,
          verificationGasLimit:
            verificationGasLimitB > MIN_VERIFICATION_GAS_LIMIT
              ? verificationGasLimitB
              : MIN_VERIFICATION_GAS_LIMIT,
          preVerificationGas: PRE_VERIFICATION_GAS,
          maxFeePerGas: destGas!.maxFeePerGas!,
          maxPriorityFeePerGas: destGas!.maxPriorityFeePerGas!,
        },
      ],
    );

    const userOpA = toRpcUserOpCanonical(signedA);
    console.log("userOpA:", userOpA);
    const userOpB = toRpcUserOpCanonical(signedB);
    console.log("userOpB:", userOpB);
    console.log("signedA:", signedA);
    console.log("signedB:", signedB);

    const [buildA, buildB] = await Promise.all([
      sourcePublicClient.request({
        method: "compose_buildSignedUserOpsTx",
        params: [[userOpA], { chainId: values.from.chainId }],
      } as any) as Promise<ComposedSignedUserOpsTxReturnType>,
      destPublicClient.request({
        method: "compose_buildSignedUserOpsTx",
        params: [[userOpB], { chainId: values.to.chainId }],
      } as any) as Promise<ComposedSignedUserOpsTxReturnType>,
    ]);

    const explorerAURL = new URL(
      `tx/${buildA.hash}`,
      sourcePublicClient.chain.blockExplorers?.default?.url,
    ).toString();

    const explorerBURL = new URL(
      `tx/${buildB.hash}`,
      destPublicClient.chain.blockExplorers?.default?.url,
    ).toString();

    console.log("buildA:", buildA, explorerAURL);
    console.warn(
      "buildB INCORRECT TX HAS NEEDS TO BE FIXED by Karol probably:",
      buildB,
      explorerBURL,
    );

    const payload = encodeXtMessage({
      senderId: "client",
      entries: [
        { chainId: values.from.chainId, rawTx: buildA.raw as `0x${string}` },
        { chainId: values.to.chainId, rawTx: buildB.raw as `0x${string}` },
      ],
    });
    console.log("payload:", payload);

    await sourcePublicClient.request({
      method: "eth_sendXTransaction",
      params: [payload],
    });

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

    // const [receiptA, receiptB] = await Promise.all([
    //   publicClientFrom.waitForTransactionReceipt({
    //     hash: hashA,
    //   }),
    //   publicClientTo.waitForTransactionReceipt({
    //     hash: hashB,
    //   }),
    // ]);

    // const decodedA = decodeUserOperationLogs(receiptA.logs);
    // console.log('decodedA:', decodedA)
    // const decodedB = decodeUserOperationLogs(receiptB.logs);
    // console.log('decodedB:', decodedB)

    // const revertedA = decodedA.find(
    //   (log) => log.args && "success" in log.args && log.args.success === false,
    // );

    // const revertedB = decodedB.find(
    //   (log) => log.args && "success" in log.args && log.args.success === false,
    // );

    // if (revertedA || revertedB) {
    //   return toast({
    //     variant: "destructive",
    //     title: "User operation failed",
    //     description: "Check your wallet to confirm the transaction",
    //   });
    // }

    // toast({
    //   title: "Transaction sent",
    //   description: "Check your wallet to confirm the transaction",
    // });
  });

  const mint = useMint();

  const balanceA = useReadContract({
    abi: EntryPointAbi,
    address: ENTRYPOINT_V0_7,
    functionName: "balanceOf",
    args: [kernel.kernel.data?.accounts.A.address as `0x${string}`],
    chainId: rollupA.id,
  });
  console.log("balanceA:", balanceA);
  console.log("balanceA.data:", balanceA.data);

  const balanceB = useReadContract({
    abi: EntryPointAbi,
    address: ENTRYPOINT_V0_7,
    functionName: "balanceOf",
    args: [kernel.kernel.data?.accounts.B.address as `0x${string}`],
    chainId: rollupB.id,
  });
  console.log("balanceB.data:", balanceB.data);

  const kernelAMTKBalance = useBalanceOf(
    {
      address: BRIDGE_TOKEN,
      chainId: rollupA.id,
    },
    {
      account: kernel.kernel.data?.accounts.A.address || zeroAddress,
    },
  );

  const kernelBMTKBalance = useBalanceOf(
    {
      address: BRIDGE_TOKEN,
      chainId: rollupB.id,
    },
    {
      account: kernel.kernel.data?.accounts.B.address || zeroAddress,
    },
  );

  return (
    <>
      <Form {...form}>
        <form onSubmit={submit} className="flex flex-col gap-8">
          <div className="flex gap-4 flex-col">
            <TokenInput
              chains={[
                {
                  chainId: rollupA.id,
                  tokens: [BRIDGE_TOKEN],
                },
                {
                  chainId: rollupB.id,
                  tokens: [BRIDGE_TOKEN],
                },
              ]}
              onChainSelect={(chainId) =>
                form.setValue("from.chainId", chainId)
              }
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
              chains={[
                {
                  chainId: rollupA.id,
                  tokens: [BRIDGE_TOKEN],
                },
                {
                  chainId: rollupB.id,
                  tokens: [BRIDGE_TOKEN],
                },
              ]}
              onChainSelect={(chainId) => form.setValue("to.chainId", chainId)}
              value={values.from.amount}
              tokenAddress={values.to.token}
              chainId={values.to.chainId}
              onSelectToken={(token) => form.setValue("to.token", token)}
              onChange={() => {}}
              readOnly
            />
          </div>
          <Divider />
          <SwapRoute
            action="swap"
            fromToken={{
              address: values.from.token,
              chainId: values.from.chainId,
            }}
            toToken={{
              address: values.to.token,
              chainId: values.to.chainId,
            }}
          />
          {account.isConnected ? (
            // <WithAllowance
            //   size="xl"
            //   spender={
            //     BRIDGE_ADDRESSES[
            //       values.from.chainId as keyof typeof BRIDGE_ADDRESSES
            //     ].BRIDGE
            //   }
            //   token={{
            //     address: values.from.token,
            //     symbol: "MTK",
            //   }}
            //   amount={values.from.amount}
            //   chainId={values.from.chainId}
            // >
            <Button
              size="xl"
              className="w-full"
              type="submit"
              disabled={!form.formState.isValid}
              loadingText="Bridging..."
            >
              Bridge
            </Button>
          ) : (
            // </WithAllowance>
            <ConnectWalletBtn size="xl" />
          )}
        </form>
      </Form>
      {showDeposit && (
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
                    {formatCurrency(kernel.balanceA.data ?? 0n)} ETH
                  </Text>
                  <Text variant="headline4" className="text-gray-900">
                    {formatCurrency(kernelAMTKBalance.data ?? 0n)} MTK
                  </Text>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    kernel.depositToA.write({
                      account: kernel.kernel.data!.accounts.A.address,
                      value: parseEther("1"),
                    });
                  }}
                  disabled={kernel.depositToA.isPending}
                  isLoading={kernel.depositToA.isPending}
                >
                  Deposit 1 ETH
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
                    {formatCurrency(kernel.balanceB.data ?? 0n)} ETH
                  </Text>
                  <Text variant="headline4" className="text-gray-900">
                    {formatCurrency(kernelBMTKBalance.data ?? 0n)} MTK
                  </Text>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    kernel.depositToB.write({
                      account: kernel.kernel.data?.accounts.B.address,
                      value: parseEther("1"),
                    });
                  }}
                  disabled={kernel.depositToB.isPending}
                  isLoading={kernel.depositToB.isPending}
                >
                  Deposit 1 ETH
                </Button>
              </div>
            </div>
          </div>

          <div className="flex">
            <Button
              onClick={() => {
                switchChainAsync({ chainId: rollupA.id });
                mint.write(
                  { address: BRIDGE_TOKEN, chainId: rollupA.id },
                  {
                    to: account.address!,
                    amount: parseEther("10"),
                  },
                  withTransactionModal(),
                );
              }}
            >
              Mint 10 MTK Rollup A
            </Button>
            <Button
              onClick={() => {
                switchChainAsync({ chainId: rollupB.id });
                mint.write(
                  { address: BRIDGE_TOKEN, chainId: rollupA.id },
                  {
                    to: account.address!,
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
