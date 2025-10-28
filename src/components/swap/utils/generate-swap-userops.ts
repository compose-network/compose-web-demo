/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBridgeAddress, WETH_ADDRESS } from "@/wagmi/addresses";
import { encodeFunctionData, zeroAddress, type Address, type Hex } from "viem";
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
import { getToken, isAddressEqual } from "@/wagmi/tokens";
import type { ComposedSignedUserOpsTxReturnType } from "@/lib/smart-account/user-op";
import { toRpcUserOpCanonical } from "@/lib/smart-account/user-op";
import type { PrepareUserOperationReturnType } from "viem/account-abstraction";
import { encodeXtMessage } from "@/lib/smart-account/xt";
import { WETHAbi } from "@/lib/abi/weth";
import {
  addDecodedEventsToReceipt,
  type DecodedReceipt,
} from "@/lib/utils/viem";
import type { AllEvents } from "@/lib/contract-interactions/utils/useWaitForTransactionReceipt";
import { globals } from "@/config";
type UserOpSwapOptions = {
  onSignedUserOps?: (userOps: PrepareUserOperationReturnType[]) => void;
  onBuildUserOps?: (
    buildUserOps: ComposedSignedUserOpsTxReturnType[],
    explorerUrls: string[],
  ) => void;
  onSendUserOps?: (sendUserOps: PrepareUserOperationReturnType[]) => void;
  onPayloadEncoded?: (payload: Hex) => void;
  onUserOpsMined?: (userOps: DecodedReceipt<AllEvents>[]) => void;
};
export type GenerateERC20SwapUserOpsParams = {
  eoaAddress: Address;
  kernelA: CreateKernelAccountReturnType<"0.7">;
  kernelB: CreateKernelAccountReturnType<"0.7">;
  fromToken: Address;
  toToken: Address;
  amountIn: bigint;
  amountOut: bigint;
};

export type GenerateETHSwapUserOpsParams = {
  eoaAddress: Address;
  kernelA: CreateKernelAccountReturnType<"0.7">;
  kernelB: CreateKernelAccountReturnType<"0.7">;
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
  }: GenerateERC20SwapUserOpsParams,
  options: UserOpSwapOptions = {},
) => {
  const sourceChainId = rollupA.id;
  const destChainId = rollupB.id;

  console.log("amountOut:", amountOut);
  const [sourcePublicClient, destPublicClient] = createRollupPublicClients(
    sourceChainId,
    destChainId,
  );

  const isSwappingToETH = isAddressEqual(toToken, zeroAddress);

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
            args: [rollupBSwapContract, globals.MAX_WEI_AMOUNT],
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
              getToken(isSwappingToETH ? WETH_ADDRESS : toToken)?.id ?? 0,
              amountIn,
            ],
          }),
        },
        ...(isSwappingToETH
          ? [
              {
                to: WETH_ADDRESS,
                value: 0n,
                data: encodeFunctionData({
                  abi: WETHAbi,
                  functionName: "withdraw",
                  args: [amountOut],
                }),
              },
              {
                to: eoaAddress,
                value: amountOut,
                data: "0x" as Hex,
              },
            ]
          : [
              {
                to: toToken,
                value: 0n,
                data: encodeFunctionData({
                  abi: TokenABI,
                  functionName: "transfer",
                  args: [eoaAddress, amountOut],
                }),
              },
            ]),
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

  Promise.all([
    sourcePublicClient.waitForTransactionReceipt({
      hash: buildA.hash,
    }),
    destPublicClient.waitForTransactionReceipt({
      hash: buildB.hash,
    }),
  ]).then(([receiptA, receiptB]) => {
    options.onUserOpsMined?.([
      addDecodedEventsToReceipt<AllEvents>(receiptA),
      addDecodedEventsToReceipt<AllEvents>(receiptB),
    ]);
  });

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
  }: GenerateERC20SwapUserOpsParams,
  options: UserOpSwapOptions = {},
) => {
  const sourceChainId = rollupB.id;
  const destChainId = rollupA.id;

  const [sourcePublicClient, destPublicClient] = createRollupPublicClients(
    sourceChainId,
    destChainId,
  );

  const isSwappingToETH = isAddressEqual(toToken, zeroAddress);

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
            args: [eoaAddress, kernelB.address, amountIn],
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
              getToken(isSwappingToETH ? WETH_ADDRESS : toToken)?.id ?? 0,
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
              isSwappingToETH ? WETH_ADDRESS : toToken,
              kernelB.address,
              kernelA.address,
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
              kernelB.address,
              kernelA.address,
              sessionId,
              sourceBridgeContract,
            ],
          }),
        },
        ...(isSwappingToETH
          ? [
              {
                to: WETH_ADDRESS,
                value: 0n,
                data: encodeFunctionData({
                  abi: WETHAbi,
                  functionName: "withdraw",
                  args: [amountOut],
                }),
              },
              {
                to: eoaAddress,
                value: amountOut,
                data: "0x" as Hex,
              },
            ]
          : [
              {
                to: toToken,
                value: 0n,
                data: encodeFunctionData({
                  abi: TokenABI,
                  functionName: "transfer",
                  args: [eoaAddress, amountOut],
                }),
              },
            ]),
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

  Promise.all([
    sourcePublicClient.waitForTransactionReceipt({
      hash: buildA.hash,
    }),
    destPublicClient.waitForTransactionReceipt({
      hash: buildB.hash,
    }),
  ]).then(([receiptA, receiptB]) => {
    options.onUserOpsMined?.([
      addDecodedEventsToReceipt<AllEvents>(receiptA),
      addDecodedEventsToReceipt<AllEvents>(receiptB),
    ]);
  });

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

export const createSwapUserOpsFrom_A_to_A = async (
  {
    eoaAddress,
    kernelA,
    kernelB,
    fromToken,
    toToken,
    amountIn,
    amountOut,
  }: GenerateERC20SwapUserOpsParams,
  options: UserOpSwapOptions = {},
) => {
  const rollupAChainId = rollupA.id;
  const rollupBChainId = rollupB.id;
  const [rollupAPublicClient, rollupBPublicClient] = createRollupPublicClients(
    rollupAChainId,
    rollupBChainId,
  );

  const rollupABridgeContract = getBridgeAddress(rollupAChainId);
  const rollupBBridgeContract = getBridgeAddress(rollupBChainId);

  const firstBridgeSessionId = BigInt(Math.floor(Math.random() * 1000000));
  const secondBridgeSessionId = BigInt(Math.floor(Math.random() * 1000000));

  const [op1, op2, op3] = await Promise.all([
    createUserOp({
      account: kernelA,
      chainId: rollupAChainId,
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
          to: rollupABridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "send",
            args: [
              BigInt(rollupBChainId),
              fromToken,
              kernelA.address,
              kernelB.address,
              amountIn,
              firstBridgeSessionId,
              rollupBBridgeContract,
            ],
          }),
        },
      ],
    }),
    createUserOp({
      account: kernelB,
      chainId: rollupBChainId,
      calls: [
        {
          to: rollupABridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "receiveTokens",
            args: [
              BigInt(rollupAChainId),
              kernelA.address,
              kernelB.address,
              firstBridgeSessionId,
              rollupABridgeContract,
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
          to: rollupBBridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "send",
            args: [
              BigInt(rollupAChainId),
              toToken,
              kernelB.address,
              kernelA.address,
              amountOut,
              secondBridgeSessionId,
              rollupABridgeContract,
            ],
          }),
        },
      ],
    }),
    createUserOp({
      account: kernelA,
      chainId: rollupAChainId,
      calls: [
        {
          to: rollupABridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "receiveTokens",
            args: [
              BigInt(rollupBChainId),
              kernelA.address,
              kernelB.address,
              secondBridgeSessionId,
              rollupBBridgeContract,
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

  const [signedA, signedB, signedC] = await prepareAndSignUserOperations(
    [
      rollupAPublicClient as any,
      rollupBPublicClient as any,
      rollupAPublicClient as any,
    ],
    [op1, op2, op3],
  );

  options.onSignedUserOps?.([signedA, signedB, signedC]);

  const userOpA = toRpcUserOpCanonical(signedA);
  const userOpB = toRpcUserOpCanonical(signedB);
  const userOpC = toRpcUserOpCanonical(signedC);

  const [buildRollupA, buildRollupB, buildRollupC] = await Promise.all([
    rollupAPublicClient.request({
      method: "compose_buildSignedUserOpsTx",
      params: [[userOpA], { chainId: rollupAChainId }],
    }),
    rollupBPublicClient.request({
      method: "compose_buildSignedUserOpsTx",
      params: [[userOpB], { chainId: rollupBChainId }],
    }),

    rollupAPublicClient.request({
      method: "compose_buildSignedUserOpsTx",
      params: [[userOpC], { chainId: rollupAChainId }],
    }),
  ]);

  const explorerUrls = [
    new URL(
      `tx/${buildRollupA.hash}`,
      rollupAPublicClient.chain.blockExplorers?.default?.url,
    ).toString(),
    new URL(
      `tx/${buildRollupB.hash}`,
      rollupBPublicClient.chain.blockExplorers?.default?.url,
    ).toString(),
    new URL(
      `tx/${buildRollupC.hash}`,
      rollupAPublicClient.chain.blockExplorers?.default?.url,
    ).toString(),
  ];

  Promise.all([
    rollupAPublicClient.waitForTransactionReceipt({
      hash: buildRollupA.hash,
    }),
    rollupBPublicClient.waitForTransactionReceipt({
      hash: buildRollupB.hash,
    }),
    rollupAPublicClient.waitForTransactionReceipt({
      hash: buildRollupC.hash,
    }),
  ]).then(([receiptA, receiptB, receiptC]) => {
    options.onUserOpsMined?.([
      addDecodedEventsToReceipt<AllEvents>(receiptA),
      addDecodedEventsToReceipt<AllEvents>(receiptB),
      addDecodedEventsToReceipt<AllEvents>(receiptC),
    ]);
  });

  options.onBuildUserOps?.(
    [buildRollupA, buildRollupB, buildRollupC],
    explorerUrls,
  );

  const payload = encodeXtMessage({
    senderId: "client",
    entries: [
      { chainId: rollupAChainId, rawTx: buildRollupA.raw as `0x${string}` },
      { chainId: rollupBChainId, rawTx: buildRollupB.raw as `0x${string}` },
      { chainId: rollupAChainId, rawTx: buildRollupC.raw as `0x${string}` },
    ],
  });

  options.onPayloadEncoded?.(payload);

  return {
    signedUserOps: [signedA, signedB, signedC],
    userOps: [userOpA, userOpB, userOpC],
    build: [buildRollupA, buildRollupB, buildRollupC],
    payload,
    explorerUrls,
    sendUserOps: () =>
      rollupAPublicClient.request({
        method: "eth_sendXTransaction",
        params: [payload],
      }),
  };
};

// ETH B -> A
export const createSwapETHForERC20UserOps_B_to_A = async (
  {
    eoaAddress,
    kernelA,
    kernelB,
    toToken,
    amountIn,
    amountOut,
  }: GenerateETHSwapUserOpsParams,
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
          to: WETH_ADDRESS,
          value: amountIn,
          data: encodeFunctionData({
            abi: WETHAbi,
            functionName: "deposit",
            args: [],
          }),
        },
        {
          to: WETH_ADDRESS,
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
              getToken(WETH_ADDRESS)?.id ?? 0,
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
              kernelB.address,
              kernelA.address,
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
              kernelB.address,
              kernelA.address,
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

  Promise.all([
    sourcePublicClient.waitForTransactionReceipt({
      hash: buildA.hash,
    }),
    destPublicClient.waitForTransactionReceipt({
      hash: buildB.hash,
    }),
  ]).then(([receiptA, receiptB]) => {
    options.onUserOpsMined?.([
      addDecodedEventsToReceipt<AllEvents>(receiptA),
      addDecodedEventsToReceipt<AllEvents>(receiptB),
    ]);
  });

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

export const createSwapETHForERC20UserOps_A_to_B = async (
  {
    eoaAddress,
    kernelA,
    kernelB,
    toToken,
    amountIn,
    amountOut,
  }: GenerateETHSwapUserOpsParams,
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
          to: WETH_ADDRESS,
          value: amountIn,
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
          to: WETH_ADDRESS,
          value: 0n,
          data: encodeFunctionData({
            abi: TokenABI,
            functionName: "approve",
            args: [rollupBSwapContract, globals.MAX_WEI_AMOUNT],
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
              getToken(WETH_ADDRESS)?.id ?? 0,
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

  Promise.all([
    sourcePublicClient.waitForTransactionReceipt({
      hash: buildA.hash,
    }),
    destPublicClient.waitForTransactionReceipt({
      hash: buildB.hash,
    }),
  ]).then(([receiptA, receiptB]) => {
    options.onUserOpsMined?.([
      addDecodedEventsToReceipt<AllEvents>(receiptA),
      addDecodedEventsToReceipt<AllEvents>(receiptB),
    ]);
  });

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

// 2 user ops 👇

// export const createSwapUserOpsFrom_A_to_A = async (
//   {
//     eoaAddress,
//     kernelA,
//     kernelB,
//     fromToken,
//     toToken,
//     amountIn,
//     amountOut,
//   }: GenerateERC20BridgeUserOpsParams,
//   options: UserOpSwapOptions = {},
// ) => {
//   const rollupAChainId = rollupA.id;
//   const rollupBChainId = rollupB.id;

//   const [rollupAPublicClient, rollupBPublicClient] = createRollupPublicClients(
//     rollupAChainId,
//     rollupBChainId,
//   );

//   const rollupABridgeContract = getBridgeAddress(rollupAChainId);
//   const rollupBBridgeContract = getBridgeAddress(rollupBChainId);

//   const firstBridgeSessionId = BigInt(Math.floor(Math.random() * 1000000));
//   const secondBridgeSessionId = BigInt(Math.floor(Math.random() * 1000000));

//   const [op1, op2] = await Promise.all([
//     createUserOp({
//       account: kernelA,
//       chainId: rollupAChainId,
//       calls: [
//         {
//           to: fromToken,
//           value: 0n,
//           data: encodeFunctionData({
//             abi: TokenABI,
//             functionName: "transferFrom",
//             args: [eoaAddress, kernelA.address, amountIn],
//           }),
//         },
//         {
//           to: rollupABridgeContract,
//           value: 0n,
//           data: encodeFunctionData({
//             abi: UserOperationBridgeAbi,
//             functionName: "send",
//             args: [
//               BigInt(rollupBChainId),
//               toToken,
//               kernelA.address,
//               kernelB.address,
//               amountIn,
//               firstBridgeSessionId,
//               rollupBBridgeContract,
//             ],
//           }),
//         },
//         {
//           to: rollupABridgeContract,
//           value: 0n,
//           data: encodeFunctionData({
//             abi: UserOperationBridgeAbi,
//             functionName: "receiveTokens",
//             args: [
//               BigInt(rollupBChainId),
//               kernelA.address,
//               kernelB.address,
//               secondBridgeSessionId,
//               rollupBBridgeContract,
//             ],
//           }),
//         },
//         {
//           to: fromToken,
//           value: 0n,
//           data: encodeFunctionData({
//             abi: TokenABI,
//             functionName: "transfer",
//             args: [eoaAddress, amountOut],
//           }),
//         },
//       ],
//     }),
//     createUserOp({
//       account: kernelB,
//       chainId: rollupBChainId,
//       calls: [
//         {
//           to: rollupABridgeContract,
//           value: 0n,
//           data: encodeFunctionData({
//             abi: UserOperationBridgeAbi,
//             functionName: "receiveTokens",
//             args: [
//               BigInt(rollupAChainId),
//               kernelA.address,
//               kernelB.address,
//               firstBridgeSessionId,
//               rollupABridgeContract,
//             ],
//           }),
//         },
//         {
//           to: fromToken,
//           value: 0n,
//           data: encodeFunctionData({
//             abi: TokenABI,
//             functionName: "approve",
//             args: [rollupBSwapContract, amountIn],
//           }),
//         },
//         {
//           to: rollupBSwapContract,
//           value: 0n,
//           data: encodeFunctionData({
//             abi: SwapABI,
//             functionName: "swap",
//             args: [
//               kernelB.address,
//               getToken(fromToken)?.id ?? 0,
//               getToken(toToken)?.id ?? 0,
//               amountIn,
//             ],
//           }),
//         },
//         {
//           to: rollupBBridgeContract,
//           value: 0n,
//           data: encodeFunctionData({
//             abi: UserOperationBridgeAbi,
//             functionName: "send",
//             args: [
//               BigInt(rollupAChainId),
//               toToken,
//               kernelB.address,
//               kernelA.address,
//               amountOut,
//               secondBridgeSessionId,
//               rollupABridgeContract,
//             ],
//           }),
//         },
//       ],
//     }),
//   ]);

//   const [signedA, signedB] = await prepareAndSignUserOperations(
//     [rollupAPublicClient as any, rollupBPublicClient as any],
//     [op1, op2],
//   );

//   options.onSignedUserOps?.([signedA, signedB]);

//   const userOpA = toRpcUserOpCanonical(signedA);
//   const userOpB = toRpcUserOpCanonical(signedB);

//   const [buildRollupA, buildRollupB] = await Promise.all([
//     rollupAPublicClient.request({
//       method: "compose_buildSignedUserOpsTx",
//       params: [[userOpA], { chainId: rollupAChainId }],
//     }),
//     rollupBPublicClient.request({
//       method: "compose_buildSignedUserOpsTx",
//       params: [[userOpB], { chainId: rollupBChainId }],
//     }),
//   ]);

//   const explorerUrls = [
//     new URL(
//       `tx/${buildRollupA.hash}`,
//       rollupAPublicClient.chain.blockExplorers?.default?.url,
//     ).toString(),
//     new URL(
//       `tx/${buildRollupB.hash}`,
//       rollupBPublicClient.chain.blockExplorers?.default?.url,
//     ).toString(),
//   ];

//   options.onBuildUserOps?.([buildRollupB, buildRollupA], explorerUrls);

//   const payload = encodeXtMessage({
//     senderId: "client",
//     entries: [
//       { chainId: rollupAChainId, rawTx: buildRollupA.raw as `0x${string}` },
//       { chainId: rollupBChainId, rawTx: buildRollupB.raw as `0x${string}` },
//     ],
//   });

//   options.onPayloadEncoded?.(payload);

//   return {
//     signedUserOps: [signedA, signedB],
//     userOps: [userOpA, userOpB],
//     build: [buildRollupA, buildRollupB],
//     payload,
//     explorerUrls,
//     sendUserOps: () =>
//       rollupAPublicClient.request({
//         method: "eth_sendXTransaction",
//         params: [payload],
//       }),
//   };
// };
