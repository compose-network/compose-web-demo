/* eslint-disable @typescript-eslint/no-explicit-any */
import { createUserOp } from "@/components/swap/utils/core";
import { UserOperationBridgeAbi } from "@/lib/abi/swap/op-bridge";
import { TokenABI } from "@/lib/abi/token";
import { WETHAbi } from "@/lib/abi/weth";
import {
  type BRIDGE_ADDRESSES,
  getBridgeAddress,
  WETH_ADDRESS,
} from "@/wagmi/addresses";
import { config } from "@/wagmi/config";
import { getPublicClient } from "@wagmi/core";
import { signUserOperations } from "@zerodev/multi-chain-ecdsa-validator/actions"; //NOTE (Chris): Do not remove "actions" suffix as it breaks function
import type { CreateKernelAccountReturnType } from "@zerodev/sdk";
import { type Address, encodeFunctionData, type Hex } from "viem";
import { prepareUserOperation } from "viem/account-abstraction";
import { omit } from "lodash-es";

export type GenerateERC20BridgeUserOpsParams = {
  eoaAddress: Address;
  sourceKernelAccount: CreateKernelAccountReturnType<"0.7">;
  destKernelAccount: CreateKernelAccountReturnType<"0.7">;
  tokenAddress: Address;
  amount: bigint;
  sessionId: bigint;
  sourceChainId: keyof typeof BRIDGE_ADDRESSES;
  destChainId: keyof typeof BRIDGE_ADDRESSES;
};

export const createAndSignBridgeERC20UserOps = async ({
  eoaAddress,
  sourceKernelAccount,
  destKernelAccount,
  tokenAddress,
  amount,
  sessionId,
  sourceChainId,
  destChainId,
}: GenerateERC20BridgeUserOpsParams) => {
  const sourcePublicClient = getPublicClient(config, {
    chainId: sourceChainId,
  });
  const destPublicClient = getPublicClient(config, { chainId: destChainId });

  const sourceBridgeContract = getBridgeAddress(sourceChainId);
  const destBridgeContract = getBridgeAddress(destChainId);

  const [sourceUserOp, destUserOp] = await Promise.all([
    createUserOp({
      account: sourceKernelAccount,
      chainId: sourceChainId,
      calls: [
        {
          to: tokenAddress,
          value: 0n,
          data: encodeFunctionData({
            abi: TokenABI,
            functionName: "transferFrom",
            args: [eoaAddress, sourceKernelAccount.address, amount],
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
              tokenAddress,
              sourceKernelAccount.address,
              destKernelAccount.address,
              amount,
              sessionId,
              destBridgeContract,
            ],
          }),
        },
      ],
    }),
    createUserOp({
      account: destKernelAccount,
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
              sourceKernelAccount.address,
              destKernelAccount.address,
              sessionId,
              sourceBridgeContract,
            ],
          }),
        },
        {
          to: tokenAddress,
          value: 0n,
          data: encodeFunctionData({
            abi: TokenABI,
            functionName: "transfer",
            args: [eoaAddress, amount],
          }),
        },
      ],
    }),
  ]);

  const preparedSourceUserOps = omit(
    await prepareUserOperation(sourcePublicClient, sourceUserOp),
    "account",
  );

  const preparedDestUserOps = omit(
    await prepareUserOperation(destPublicClient, destUserOp),
    "account",
  );

  return {
    sign: async () => {
      return signUserOperations(sourcePublicClient as any, {
        userOperations: [preparedSourceUserOps, preparedDestUserOps],
        account: sourceKernelAccount,
      });
    },
    preparedOps: {
      source: preparedSourceUserOps,
      destination: preparedDestUserOps,
    },
  };
};

export type GenerateETHBridgeUserOpsParams = {
  eoaAddress: Address;
  sourceKernelAccount: CreateKernelAccountReturnType<"0.7">;
  destKernelAccount: CreateKernelAccountReturnType<"0.7">;
  amount: bigint;
  sessionId: bigint;
  sourceChainId: keyof typeof BRIDGE_ADDRESSES;
  destChainId: keyof typeof BRIDGE_ADDRESSES;
};

export const createAndSignBridgeETHUserOps = async ({
  eoaAddress,
  sourceKernelAccount,
  destKernelAccount,
  amount,
  sessionId,
  sourceChainId,
  destChainId,
}: GenerateETHBridgeUserOpsParams) => {
  const destPublicClient = getPublicClient(config, { chainId: destChainId });
  const sourcePublicClient = getPublicClient(config, {
    chainId: sourceChainId,
  });

  const sourceBridgeContract = getBridgeAddress(sourceChainId);
  const destBridgeContract = getBridgeAddress(destChainId);

  const [sourceUserOp, destUserOp] = await Promise.all([
    createUserOp({
      account: sourceKernelAccount,
      chainId: sourceChainId,
      calls: [
        {
          to: WETH_ADDRESS,
          value: amount,
          data: encodeFunctionData({
            abi: WETHAbi,
            functionName: "deposit",
            args: [],
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
              WETH_ADDRESS,
              sourceKernelAccount.address,
              destKernelAccount.address,
              amount,
              sessionId,
              destBridgeContract,
            ],
          }),
        },
      ],
    }),
    createUserOp({
      account: destKernelAccount,
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
              sourceKernelAccount.address,
              destKernelAccount.address,
              sessionId,
              sourceBridgeContract,
            ],
          }),
        },
        {
          to: WETH_ADDRESS,
          value: 0n,
          data: encodeFunctionData({
            abi: WETHAbi,
            functionName: "withdraw",
            args: [amount],
          }),
        },
        {
          to: eoaAddress,
          value: amount,
          data: "0x" as Hex,
        },
      ],
    }),
  ]);

  const preparedSourceUserOps = omit(
    await prepareUserOperation(sourcePublicClient, sourceUserOp),
    "account",
  );

  const preparedDestUserOps = omit(
    await prepareUserOperation(destPublicClient, destUserOp),
    "account",
  );

  return {
    sign: async () => {
      return signUserOperations(sourcePublicClient as any, {
        userOperations: [preparedSourceUserOps, preparedDestUserOps],
        account: sourceKernelAccount,
      });
    },
    preparedOps: {
      source: preparedSourceUserOps,
      destination: preparedDestUserOps,
    },
  };
};
