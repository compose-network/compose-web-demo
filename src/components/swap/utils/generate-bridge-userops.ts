/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBridgeAddress, type BRIDGE_ADDRESSES } from "@/wagmi/addresses";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { config } from "@/wagmi/config";
import { getPublicClient } from "@wagmi/core";
import { UserOperationBridgeAbi } from "@/lib/abi/swap/op-bridge";
import { TokenABI } from "@/lib/abi/token";
import { WETHAbi } from "@/lib/abi/weth";
import { prepareAndSignUserOperations } from "@zerodev/multi-chain-ecdsa-validator";
import type { CreateKernelAccountReturnType } from "@zerodev/sdk";
import type { EntryPointVersion } from "viem/account-abstraction";

const FALLBACK_CALL_GAS_LIMIT = 900_000n;
const MIN_VERIFICATION_GAS_LIMIT = 1_200_000n;
const PRE_VERIFICATION_GAS = 90_000n;

const withMargin = (value: bigint, marginPct = 25n) =>
  value + (value * marginPct) / 100n;

type Call = {
  to: Address;
  value: bigint;
  data: Hex;
};

type CreateUserOpParams = {
  account: CreateKernelAccountReturnType<"0.7">;
  chainId: (typeof config.chains)[number]["id"];
  calls: Call[];
};

export const createUserOp = async ({
  account,
  chainId,
  calls,
}: CreateUserOpParams) => {
  const publicClient = getPublicClient(config, { chainId });

  // Estimate gas for each call
  const callGasEstimates = await Promise.all(
    calls.map((call) =>
      publicClient
        .estimateGas({
          to: call.to,
          data: call.data,
          value: call.value,
        })
        .then(withMargin)
        .catch((error) => {
          console.warn(
            `Gas estimation failed for call to ${call.to}, falling back`,
            error,
          );
          return FALLBACK_CALL_GAS_LIMIT;
        }),
    ),
  );

  // Sum all call gas limits
  const callGasLimit = callGasEstimates.reduce((acc, gas) => acc + gas, 0n);

  // Calculate verification gas limit
  const verificationGasLimit =
    callGasLimit + PRE_VERIFICATION_GAS > MIN_VERIFICATION_GAS_LIMIT
      ? callGasLimit + PRE_VERIFICATION_GAS
      : MIN_VERIFICATION_GAS_LIMIT;

  // Estimate fees per gas
  const gasEstimate = await publicClient.estimateFeesPerGas();

  return {
    account,
    chainId,
    calls,
    callGasLimit,
    verificationGasLimit,
    preVerificationGas: PRE_VERIFICATION_GAS,
    maxFeePerGas: gasEstimate.maxFeePerGas!,
    maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas!,
  };
};

export type GenerateERC20BridgeUserOpsParams = {
  eoaAddress: Address;
  sourceKernelAccount: CreateKernelAccountReturnType<EntryPointVersion>;
  destKernelAccount: CreateKernelAccountReturnType<EntryPointVersion>;
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

  return prepareAndSignUserOperations(
    [sourcePublicClient as any, destPublicClient as any],
    [sourceUserOp, destUserOp],
  );
};

export type GenerateETHBridgeUserOpsParams = {
  eoaAddress: Address;
  sourceKernelAccount:  CreateKernelAccountReturnType<EntryPointVersion>;
  destKernelAccount: CreateKernelAccountReturnType<EntryPointVersion>;
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

  const wethAddress = "0x356dA0CBA100a69B3FD3F2Ce4871B7e3921E7553";

  const [sourceUserOp, destUserOp] = await Promise.all([
    createUserOp({
      account: sourceKernelAccount,
      chainId: sourceChainId,
      calls: [
        {
          to: wethAddress,
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
              wethAddress,
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
          to: wethAddress,
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

  return prepareAndSignUserOperations(
    [sourcePublicClient as any, destPublicClient as any],
    [sourceUserOp, destUserOp],
  );
};
