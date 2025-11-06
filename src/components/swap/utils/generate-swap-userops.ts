/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBridgeAddress, WETH_ADDRESS } from "@/wagmi/addresses";
import { type Address, encodeFunctionData, type Hex, zeroAddress } from "viem";
import { rollupA, rollupB, rollupBSwapContract } from "@/wagmi/config";
import { UserOperationBridgeAbi } from "@/lib/abi/swap/op-bridge";
import { TokenABI } from "@/lib/abi/token";
import type { CreateKernelAccountReturnType } from "@zerodev/sdk";
import {
  createRollupPublicClients,
  createUserOp,
} from "@/components/swap/utils/core";
import { SwapABI } from "@/lib/abi/swap/swap";
import { getToken, isAddressEqual } from "@/wagmi/tokens";
import type { ComposedSignedUserOpsTxReturnType } from "@/lib/smart-account/user-op";
import { toRpcUserOpCanonical } from "@/lib/smart-account/user-op";
import type { PrepareUserOperationReturnType } from "viem/account-abstraction";
import { prepareUserOperation } from "viem/account-abstraction";
import { encodeXtMessage } from "@/lib/smart-account/xt";
import { WETHAbi } from "@/lib/abi/weth";
import {
  addDecodedEventsToReceipt,
  type DecodedReceipt,
} from "@/lib/utils/viem";
import type { AllEvents } from "@/lib/contract-interactions/utils/useWaitForTransactionReceipt";
import { globals } from "@/config";
import { omit } from "lodash-es";
import { signUserOperations } from "@zerodev/multi-chain-ecdsa-validator/actions";

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
      const [signedA, signedB] = await signUserOperations(
        sourcePublicClient as any,
        {
          userOperations: [preparedSourceUserOps, preparedDestUserOps],
          account: kernelA, // it uses it to get the Entrypoint address and version
        },
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

      await sourcePublicClient.request({
        method: "eth_sendXTransaction",
        params: [payload],
      });

      return {
        signedUserOps: [signedA, signedB],
        userOps: [userOpA, userOpB],
        build: [buildA, buildB],
        payload,
        explorerUrls,
      };
    },
    preparedOps: {
      source: preparedSourceUserOps,
      destination: preparedDestUserOps,
    },
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
      const [signedA, signedB] = await signUserOperations(
        sourcePublicClient as any,
        {
          userOperations: [preparedSourceUserOps, preparedDestUserOps],
          account: kernelA, // it uses it to get the Entrypoint address and version
        },
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

      await sourcePublicClient.request({
        method: "eth_sendXTransaction",
        params: [payload],
      });

      return {
        signedUserOps: [signedA, signedB],
        userOps: [userOpA, userOpB],
        build: [buildA, buildB],
        payload,
        explorerUrls,
      };
    },
    preparedOps: {
      source: preparedSourceUserOps,
      destination: preparedDestUserOps,
    },
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
      const [signedA, signedB] = await signUserOperations(
        sourcePublicClient as any,
        {
          userOperations: [preparedSourceUserOps, preparedDestUserOps],
          account: kernelA, // it uses it to get the Entrypoint address and version
        },
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

      await sourcePublicClient.request({
        method: "eth_sendXTransaction",
        params: [payload],
      });

      return {
        signedUserOps: [signedA, signedB],
        userOps: [userOpA, userOpB],
        build: [buildA, buildB],
        payload,
        explorerUrls,
      };
    },
    preparedOps: {
      source: preparedSourceUserOps,
      destination: preparedDestUserOps,
    },
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
      const [signedA, signedB] = await signUserOperations(
        sourcePublicClient as any,
        {
          userOperations: [preparedSourceUserOps, preparedDestUserOps],
          account: kernelA, // it uses it to get the Entrypoint address and version
        },
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

      await sourcePublicClient.request({
        method: "eth_sendXTransaction",
        params: [payload],
      });

      return {
        signedUserOps: [signedA, signedB],
        userOps: [userOpA, userOpB],
        build: [buildA, buildB],
        payload,
        explorerUrls,
      };
    },
    preparedOps: {
      source: preparedSourceUserOps,
      destination: preparedDestUserOps,
    },
  };
};

export const createSwapUserOpsFrom_A_to_A_2ops = async (
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

  const isSwappingToETH = isAddressEqual(toToken, zeroAddress);

  const rollupABridgeContract = getBridgeAddress(rollupAChainId);
  const rollupBBridgeContract = getBridgeAddress(rollupBChainId);

  const firstBridgeSessionId = BigInt(Math.floor(Math.random() * 1000000));
  const secondBridgeSessionId = BigInt(Math.floor(Math.random() * 1000000));

  const [op1, op2] = await Promise.all([
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
        {
          to: rollupABridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "receiveTokens",
            args: [
              BigInt(rollupBChainId),
              kernelB.address,
              kernelA.address,
              secondBridgeSessionId,
              rollupBBridgeContract,
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
    createUserOp({
      account: kernelB,
      chainId: rollupBChainId,
      calls: [
        {
          to: rollupBBridgeContract,
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
              getToken(isSwappingToETH ? WETH_ADDRESS : toToken)?.id ?? 0,
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
              isSwappingToETH ? WETH_ADDRESS : toToken,
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
  ]);

  const preparedUserOps1 = omit(
    await prepareUserOperation(rollupAPublicClient, op1),
    "account",
  );

  const preparedUserOps2 = omit(
    await prepareUserOperation(rollupBPublicClient, op2),
    "account",
  );

  return {
    sign: async () => {
      const [signedA, signedB] = await signUserOperations(
        rollupAPublicClient as any,
        {
          userOperations: [preparedUserOps1, preparedUserOps2],
          account: kernelA, // it uses it to get the Entrypoint address and version
        },
      );
      options.onSignedUserOps?.([signedA, signedB]);

      const userOpA = toRpcUserOpCanonical(signedA);
      const userOpB = toRpcUserOpCanonical(signedB);

      const [buildA, buildB] = await Promise.all([
        rollupAPublicClient.request({
          method: "compose_buildSignedUserOpsTx",
          params: [[userOpA], { chainId: rollupAChainId }],
        }),
        rollupBPublicClient.request({
          method: "compose_buildSignedUserOpsTx",
          params: [[userOpB], { chainId: rollupBChainId }],
        }),
      ]);

      const explorerUrls = [
        new URL(
          `tx/${buildA.hash}`,
          rollupAPublicClient.chain.blockExplorers?.default?.url,
        ).toString(),
        new URL(
          `tx/${buildB.hash}`,
          rollupBPublicClient.chain.blockExplorers?.default?.url,
        ).toString(),
      ];

      Promise.all([
        rollupAPublicClient.waitForTransactionReceipt({
          hash: buildA.hash,
        }),
        rollupBPublicClient.waitForTransactionReceipt({
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
          { chainId: rollupAChainId, rawTx: buildA.raw as `0x${string}` },
          { chainId: rollupBChainId, rawTx: buildB.raw as `0x${string}` },
        ],
      });

      options.onPayloadEncoded?.(payload);

      await rollupAPublicClient.request({
        method: "eth_sendXTransaction",
        params: [payload],
      });

      return {
        signedUserOps: [signedA, signedB],
        userOps: [userOpA, userOpB],
        build: [buildA, buildB],
        payload,
        explorerUrls,
      };
    },
    preparedOps: {
      source: preparedUserOps1,
      destination: preparedUserOps2,
    },
  };
};

export const createSwapETHtoERC20UserOpsFrom_A_to_A_2ops = async (
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

  const [op1, op2] = await Promise.all([
    createUserOp({
      account: kernelA,
      chainId: rollupAChainId,
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
          to: rollupABridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "send",
            args: [
              BigInt(rollupBChainId),
              WETH_ADDRESS,
              kernelA.address,
              kernelB.address,
              amountIn,
              firstBridgeSessionId,
              rollupBBridgeContract,
            ],
          }),
        },

        //
        //
        // {
        //   to: fromToken,
        //   value: 0n,
        //   data: encodeFunctionData({
        //     abi: TokenABI,
        //     functionName: "transferFrom",
        //     args: [eoaAddress, kernelA.address, amountIn],
        //   }),
        // },
        // {
        //   to: rollupABridgeContract,
        //   value: 0n,
        //   data: encodeFunctionData({
        //     abi: UserOperationBridgeAbi,
        //     functionName: "send",
        //     args: [
        //       BigInt(rollupBChainId),
        //       fromToken,
        //       kernelA.address,
        //       kernelB.address,
        //       amountIn,
        //       firstBridgeSessionId,
        //       rollupBBridgeContract,
        //     ],
        //   }),
        // },
        {
          to: rollupABridgeContract,
          value: 0n,
          data: encodeFunctionData({
            abi: UserOperationBridgeAbi,
            functionName: "receiveTokens",
            args: [
              BigInt(rollupBChainId),
              kernelB.address,
              kernelA.address,
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
    createUserOp({
      account: kernelB,
      chainId: rollupBChainId,
      calls: [
        {
          to: rollupBBridgeContract,
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
  ]);

  const preparedUserOps1 = omit(
    await prepareUserOperation(rollupAPublicClient, op1),
    "account",
  );

  const preparedUserOps2 = omit(
    await prepareUserOperation(rollupBPublicClient, op2),
    "account",
  );

  return {
    sign: async () => {
      const [signedA, signedB] = await signUserOperations(
        rollupAPublicClient as any,
        {
          userOperations: [preparedUserOps1, preparedUserOps2],
          account: kernelA, // it uses it to get the Entrypoint address and version
        },
      );
      options.onSignedUserOps?.([signedA, signedB]);

      const userOpA = toRpcUserOpCanonical(signedA);
      const userOpB = toRpcUserOpCanonical(signedB);

      const [buildA, buildB] = await Promise.all([
        rollupAPublicClient.request({
          method: "compose_buildSignedUserOpsTx",
          params: [[userOpA], { chainId: rollupAChainId }],
        }),
        rollupBPublicClient.request({
          method: "compose_buildSignedUserOpsTx",
          params: [[userOpB], { chainId: rollupBChainId }],
        }),
      ]);

      const explorerUrls = [
        new URL(
          `tx/${buildA.hash}`,
          rollupAPublicClient.chain.blockExplorers?.default?.url,
        ).toString(),
        new URL(
          `tx/${buildB.hash}`,
          rollupBPublicClient.chain.blockExplorers?.default?.url,
        ).toString(),
      ];

      Promise.all([
        rollupAPublicClient.waitForTransactionReceipt({
          hash: buildA.hash,
        }),
        rollupBPublicClient.waitForTransactionReceipt({
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
          { chainId: rollupAChainId, rawTx: buildA.raw as `0x${string}` },
          { chainId: rollupBChainId, rawTx: buildB.raw as `0x${string}` },
        ],
      });

      options.onPayloadEncoded?.(payload);

      await rollupAPublicClient.request({
        method: "eth_sendXTransaction",
        params: [payload],
      });

      return {
        signedUserOps: [signedA, signedB],
        userOps: [userOpA, userOpB],
        build: [buildA, buildB],
        payload,
        explorerUrls,
      };
    },
    preparedOps: {
      source: preparedUserOps1,
      destination: preparedUserOps2,
    },
  };
};
