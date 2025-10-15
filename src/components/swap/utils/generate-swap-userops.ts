/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBridgeAddress } from "@/wagmi/addresses";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { rollupA, rollupB, rollupBSwapContract } from "@/wagmi/config";
import { UserOperationBridgeAbi } from "@/lib/abi/swap/op-bridge";
import { TokenABI } from "@/lib/abi/token";
import { prepareAndSignUserOperations } from "@zerodev/multi-chain-ecdsa-validator";
import type { CreateKernelAccountReturnType } from "@zerodev/sdk";
import {
  createUserOp,
  createRollupPublicClients,
} from "@/components/swap/utils/core";
import { SwapABI } from "@/lib/abi/swap/swap";
import { getToken } from "@/wagmi/tokens";
import type { ComposedSignedUserOpsTxReturnType } from "@/lib/smart-account/user-op";
import { toRpcUserOpCanonical } from "@/lib/smart-account/user-op";
import type { PrepareUserOperationReturnType } from "viem/account-abstraction";
import { encodeXtMessage } from "@/lib/smart-account/xt";
type UserOpSwapOptions = {
  onSignedUserOps?: (
    userOps: [PrepareUserOperationReturnType, PrepareUserOperationReturnType],
  ) => void;
  onBuildUserOps?: (
    buildUserOps: [
      ComposedSignedUserOpsTxReturnType,
      ComposedSignedUserOpsTxReturnType,
    ],
    explorerUrls: string[],
  ) => void;
  onSendUserOps?: (
    sendUserOps: [
      ReturnType<typeof toRpcUserOpCanonical>,
      ReturnType<typeof toRpcUserOpCanonical>,
    ],
  ) => void;
  onPayloadEncoded?: (payload: Hex) => void;
};
export type GenerateERC20BridgeUserOpsParams = {
  eoaAddress: Address;
  kernelA: CreateKernelAccountReturnType<"0.7">;
  kernelB: CreateKernelAccountReturnType<"0.7">;
  fromToken: Address;
  toToken: Address;
  amountIn: bigint;
  amountOut: bigint;
};
export const createSwapUserOpsFrom_A_to_B = async (
  {
    eoaAddress,
    kernelA,
    kernelB,
    fromToken,
    toToken,
    amountIn,
    amountOut,
  }: GenerateERC20BridgeUserOpsParams,
  options: UserOpSwapOptions = {},
) => {
  const sourceChainId = rollupA.id;
  const destChainId = rollupB.id;

  const [sourcePublicClient, destPublicClient] = createRollupPublicClients(
    sourceChainId,
    destChainId,
  );

  const sourceBridgeContract = getBridgeAddress(sourceChainId);
  const destBridgeContract = getBridgeAddress(destChainId);

  const sessionId = BigInt(Math.floor(Math.random() * 1000000));

  const [sourceUserOp, destUserOp] = await Promise.all([
    createUserOp({
      account: kernelA,
      chainId: sourceChainId,
      calls: [
        {
          to: fromToken,
          value: 0n,
          data: encodeFunctionData({
            abi: TokenABI,
            functionName: "transferFrom",
            args: [eoaAddress, kernelA.address, amountIn],
          }),
        },
        {
          to: sourceBridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "send",
            args: [
              BigInt(destChainId),
              fromToken,
              kernelA.address,
              kernelB.address,
              amountIn,
              sessionId,
              destBridgeContract,
            ],
          }),
        },
      ],
    }),
    createUserOp({
      account: kernelB,
      chainId: destChainId,
      calls: [
        {
          to: destBridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "receiveTokens",
            args: [
              BigInt(sourceChainId),
              kernelA.address,
              kernelB.address,
              sessionId,
              sourceBridgeContract,
            ],
          }),
        },
        {
          to: fromToken,
          value: 0n,
          data: encodeFunctionData({
            abi: TokenABI,
            functionName: "approve",
            args: [rollupBSwapContract, amountIn],
          }),
        },
        {
          to: rollupBSwapContract,
          value: 0n,
          data: encodeFunctionData({
            abi: SwapABI,
            functionName: "swap",
            args: [
              kernelB.address,
              getToken(fromToken)?.id ?? 0,
              getToken(toToken)?.id ?? 0,
              amountIn,
            ],
          }),
        },
        {
          to: toToken,
          value: 0n,
          data: encodeFunctionData({
            abi: TokenABI,
            functionName: "transfer",
            args: [eoaAddress, amountOut],
          }),
        },
      ],
    }),
  ]);

  const [signedA, signedB] = await prepareAndSignUserOperations(
    [sourcePublicClient as any, destPublicClient as any],
    [sourceUserOp, destUserOp],
  );

  options.onSignedUserOps?.([signedA, signedB]);

  const userOpA = toRpcUserOpCanonical(signedA);
  const userOpB = toRpcUserOpCanonical(signedB);

  const [buildA, buildB] = await Promise.all([
    sourcePublicClient.request({
      method: "compose_buildSignedUserOpsTx",
      params: [[userOpA], { chainId: sourceChainId }],
    }),
    destPublicClient.request({
      method: "compose_buildSignedUserOpsTx",
      params: [[userOpB], { chainId: destChainId }],
    }),
  ]);

  const explorerUrls = [
    new URL(
      `tx/${buildA.hash}`,
      sourcePublicClient.chain.blockExplorers?.default?.url,
    ).toString(),
    new URL(
      `tx/${buildB.hash}`,
      destPublicClient.chain.blockExplorers?.default?.url,
    ).toString(),
  ];

  options.onBuildUserOps?.([buildA, buildB], explorerUrls);

  const payload = encodeXtMessage({
    senderId: "client",
    entries: [
      { chainId: sourceChainId, rawTx: buildA.raw as `0x${string}` },
      { chainId: destChainId, rawTx: buildB.raw as `0x${string}` },
    ],
  });

  options.onPayloadEncoded?.(payload);

  return {
    signedUserOps: [signedA, signedB],
    userOps: [userOpA, userOpB],
    build: [buildA, buildB],
    payload,
    explorerUrls,
    sendUserOps: () =>
      sourcePublicClient.request({
        method: "eth_sendXTransaction",
        params: [payload],
      }),
  };
};

export const createSwapUserOpsFrom_B_to_A = async (
  {
    eoaAddress,
    kernelA,
    kernelB,
    fromToken,
    toToken,
    amountIn,
    amountOut,
  }: GenerateERC20BridgeUserOpsParams,
  options: UserOpSwapOptions = {},
) => {
  const sourceChainId = rollupB.id;
  const destChainId = rollupA.id;

  const [sourcePublicClient, destPublicClient] = createRollupPublicClients(
    sourceChainId,
    destChainId,
  );

  const sourceBridgeContract = getBridgeAddress(sourceChainId);
  const destBridgeContract = getBridgeAddress(destChainId);

  const sessionId = BigInt(Math.floor(Math.random() * 1000000));

  const [sourceUserOp, destUserOp] = await Promise.all([
    createUserOp({
      account: kernelB,
      chainId: sourceChainId,
      calls: [
        {
          to: fromToken,
          value: 0n,
          data: encodeFunctionData({
            abi: TokenABI,
            functionName: "transferFrom",
            args: [eoaAddress, kernelA.address, amountIn],
          }),
        },
        {
          to: fromToken,
          value: 0n,
          data: encodeFunctionData({
            abi: TokenABI,
            functionName: "approve",
            args: [rollupBSwapContract, amountIn],
          }),
        },
        {
          to: rollupBSwapContract,
          value: 0n,
          data: encodeFunctionData({
            abi: SwapABI,
            functionName: "swap",
            args: [
              kernelB.address,
              getToken(fromToken)?.id ?? 0,
              getToken(toToken)?.id ?? 0,
              amountIn,
            ],
          }),
        },
        {
          to: sourceBridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "send",
            args: [
              BigInt(destChainId),
              toToken,
              kernelA.address,
              kernelB.address,
              amountOut,
              sessionId,
              destBridgeContract,
            ],
          }),
        },
      ],
    }),
    createUserOp({
      account: kernelA,
      chainId: destChainId,
      calls: [
        {
          to: destBridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "receiveTokens",
            args: [
              BigInt(sourceChainId),
              kernelA.address,
              kernelB.address,
              sessionId,
              sourceBridgeContract,
            ],
          }),
        },

        {
          to: toToken,
          value: 0n,
          data: encodeFunctionData({
            abi: TokenABI,
            functionName: "transfer",
            args: [eoaAddress, amountOut],
          }),
        },
      ],
    }),
  ]);

  const [signedA, signedB] = await prepareAndSignUserOperations(
    [sourcePublicClient as any, destPublicClient as any],
    [sourceUserOp, destUserOp],
  );

  options.onSignedUserOps?.([signedA, signedB]);

  const userOpA = toRpcUserOpCanonical(signedA);
  const userOpB = toRpcUserOpCanonical(signedB);

  const [buildA, buildB] = await Promise.all([
    sourcePublicClient.request({
      method: "compose_buildSignedUserOpsTx",
      params: [[userOpA], { chainId: sourceChainId }],
    }),
    destPublicClient.request({
      method: "compose_buildSignedUserOpsTx",
      params: [[userOpB], { chainId: destChainId }],
    }),
  ]);

  const explorerUrls = [
    new URL(
      `tx/${buildA.hash}`,
      sourcePublicClient.chain.blockExplorers?.default?.url,
    ).toString(),
    new URL(
      `tx/${buildB.hash}`,
      destPublicClient.chain.blockExplorers?.default?.url,
    ).toString(),
  ];

  options.onBuildUserOps?.([buildA, buildB], explorerUrls);

  const payload = encodeXtMessage({
    senderId: "client",
    entries: [
      { chainId: sourceChainId, rawTx: buildA.raw as `0x${string}` },
      { chainId: destChainId, rawTx: buildB.raw as `0x${string}` },
    ],
  });

  options.onPayloadEncoded?.(payload);

  return {
    signedUserOps: [signedA, signedB],
    userOps: [userOpA, userOpB],
    build: [buildA, buildB],
    payload,
    explorerUrls,
    sendUserOps: () =>
      sourcePublicClient.request({
        method: "eth_sendXTransaction",
        params: [payload],
      }),
  };
};
