/* eslint-disable @typescript-eslint/no-explicit-any */
import { WETH_ADDRESS } from "@/wagmi/addresses";
import { type Address, type Hex, zeroAddress } from "viem";
import { getBridgeAddress, rollupA, rollupB } from "@/wagmi/config";
import {
  createRollupPublicClient,
  createRollupPublicClients,
} from "@/components/swap/utils/core";
import { isAddressEqual } from "@/wagmi/tokens";
import { UNISWAP_V3 } from "@/wagmi/uniswap.ts";
import { prepareUserOperation } from "viem/account-abstraction";
import {
  addDecodedEventsToReceipt,
  type DecodedReceipt,
} from "@/lib/utils/viem";
import type { AllEvents } from "@/lib/contract-interactions/utils/useWaitForTransactionReceipt";
import { globals } from "@/config";
import { omit } from "lodash-es";
import { safeStringify } from "@/lib/utils/bigint.ts";
import {
  erc20Encoder,
  rollupBridgeEncoder,
  uniswapEncoders,
  wethEncoder,
} from "@/lib/contract-interactions/encoders";
import type {
  ComposeSmartAccount,
  ComposeUserOpsOptions,
} from "@compose-network/sdk";
import { composePreparedUserOps } from "@compose-network/sdk";

const routerV2RollupBContract = UNISWAP_V3[rollupB.id].SWAP_ROUTER02;

type UserOpSwapOptions = ComposeUserOpsOptions & {
  onUserOpsMined?: (userOps: DecodedReceipt<AllEvents>[]) => void;
};

export type GenerateERC20SwapUserOpsParams = {
  eoaAddress: Address;
  kernelA: ComposeSmartAccount;
  kernelB: ComposeSmartAccount;
  fromToken: Address;
  toToken: Address;
  amountIn: bigint;
  amountOut: bigint;
};

export type GenerateETHSwapUserOpsParams = {
  eoaAddress: Address;
  kernelA: ComposeSmartAccount;
  kernelB: ComposeSmartAccount;
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

  const [sourcePublicClient, destPublicClient] = createRollupPublicClients(
    sourceChainId,
    destChainId,
  );

  const isSwappingToETH = isAddressEqual(toToken, zeroAddress);

  const sourceBridgeContract = getBridgeAddress(sourceChainId);
  const destBridgeContract = getBridgeAddress(destChainId);

  const sessionId = BigInt(Math.floor(Math.random() * 1000000));

  const { userOp: sourceUserOp } = await kernelA.createUserOp([
    {
      to: fromToken,
      value: 0n,
      data: erc20Encoder.transferFrom({
        sender: eoaAddress,
        recipient: kernelA.address,
        amount: amountIn,
      }),
    },
    {
      to: sourceBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.send({
        otherChainId: BigInt(destChainId),
        token: fromToken,
        sender: kernelA.address,
        receiver: kernelB.address,
        amount: amountIn,
        sessionId: sessionId,
        destBridge: destBridgeContract,
      }),
    },
  ]);

  const { userOp: destUserOp } = await kernelB.createUserOp([
    {
      to: destBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.receiveTokens({
        otherChainId: BigInt(sourceChainId),
        sender: kernelA.address,
        receiver: kernelB.address,
        sessionId: sessionId,
        srcBridge: sourceBridgeContract,
      }),
    },
    {
      to: fromToken,
      value: 0n,
      data: erc20Encoder.approve({
        spender: routerV2RollupBContract,
        amount: globals.MAX_WEI_AMOUNT,
      }),
    },
    {
      to: routerV2RollupBContract,
      value: 0n,
      data: uniswapEncoders.routerV2.exactInputSingle({
        params: {
          tokenIn: fromToken,
          tokenOut: isSwappingToETH ? WETH_ADDRESS : toToken,
          amountIn: amountIn,
          amountOutMinimum: amountOut,
          sqrtPriceLimitX96: 0n,
          fee: 100,
          recipient: kernelB.address,
        },
      }),
    },
    ...(isSwappingToETH
      ? [
          {
            to: WETH_ADDRESS,
            value: 0n,
            data: wethEncoder.withdraw({ wad: amountOut }),
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
            data: erc20Encoder.transfer({
              recipient: eoaAddress,
              amount: amountOut,
            }),
          },
        ]),
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
      const { builds, explorerUrls, payload, send } =
        await composePreparedUserOps(
          [
            {
              account: kernelA,
              publicClient: sourcePublicClient,
              userOp: preparedSourceUserOps,
            },
            {
              account: kernelB,
              publicClient: destPublicClient,
              userOp: preparedDestUserOps,
            },
          ],
          options,
        );

      const { wait } = await send();

      await wait().then(([receiptA, receiptB]) => {
        options.onUserOpsMined?.([
          addDecodedEventsToReceipt<AllEvents>(receiptA),
          addDecodedEventsToReceipt<AllEvents>(receiptB),
        ]);
      });

      return {
        build: builds,
        payload,
        explorerUrls,
      };
    },

    preparedOps: [
      { chainId: sourceChainId, data: safeStringify(preparedSourceUserOps) },
      { chainId: destChainId, data: safeStringify(preparedDestUserOps) },
    ],
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

  const { userOp: sourceUserOp } = await kernelA.createUserOp([
    {
      to: fromToken,
      value: 0n,
      data: erc20Encoder.transferFrom({
        sender: eoaAddress,
        recipient: kernelB.address,
        amount: amountIn,
      }),
    },
    {
      to: fromToken,
      value: 0n,
      data: erc20Encoder.approve({
        spender: routerV2RollupBContract,
        amount: amountIn,
      }),
    },
    {
      to: routerV2RollupBContract,
      value: 0n,
      data: uniswapEncoders.routerV2.exactInputSingle({
        params: {
          tokenIn: fromToken,
          tokenOut: isSwappingToETH ? WETH_ADDRESS : toToken,
          amountIn: amountIn,
          amountOutMinimum: amountOut,
          sqrtPriceLimitX96: 0n,
          fee: 100,
          recipient: kernelB.address,
        },
      }),
    },
    {
      to: sourceBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.send({
        otherChainId: BigInt(destChainId),
        token: isSwappingToETH ? WETH_ADDRESS : toToken,
        sender: kernelB.address,
        receiver: kernelA.address,
        amount: amountOut,
        sessionId: sessionId,
        destBridge: destBridgeContract,
      }),
    },
  ]);

  const { userOp: destUserOp } = await kernelB.createUserOp([
    {
      to: destBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.receiveTokens({
        otherChainId: BigInt(sourceChainId),
        sender: kernelB.address,
        receiver: kernelA.address,
        sessionId: sessionId,
        srcBridge: sourceBridgeContract,
      }),
    },
    ...(isSwappingToETH
      ? [
          {
            to: WETH_ADDRESS,
            value: 0n,
            data: wethEncoder.withdraw({ wad: amountOut }),
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
            data: erc20Encoder.transfer({
              recipient: eoaAddress,
              amount: amountOut,
            }),
          },
        ]),
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
      const { builds, explorerUrls, payload, send } =
        await composePreparedUserOps(
          [
            {
              account: kernelA,
              publicClient: sourcePublicClient,
              userOp: preparedSourceUserOps,
            },
            {
              account: kernelB,
              publicClient: destPublicClient,
              userOp: preparedDestUserOps,
            },
          ],
          options,
        );

      const { wait } = await send();

      await wait().then(([receiptA, receiptB]) => {
        options.onUserOpsMined?.([
          addDecodedEventsToReceipt<AllEvents>(receiptA),
          addDecodedEventsToReceipt<AllEvents>(receiptB),
        ]);
      });

      return {
        build: builds,
        payload,
        explorerUrls,
      };
    },

    preparedOps: [
      { chainId: sourceChainId, data: safeStringify(preparedSourceUserOps) },
      { chainId: destChainId, data: safeStringify(preparedDestUserOps) },
    ],
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

  const { userOp: sourceUserOp } = await kernelA.createUserOp([
    {
      to: WETH_ADDRESS,
      value: amountIn,
      data: wethEncoder.deposit(),
    },
    {
      to: WETH_ADDRESS,
      value: 0n,
      data: erc20Encoder.approve({
        spender: routerV2RollupBContract,
        amount: amountIn,
      }),
    },
    {
      to: routerV2RollupBContract,
      value: 0n,
      data: uniswapEncoders.routerV2.exactInputSingle({
        params: {
          tokenIn: WETH_ADDRESS,
          tokenOut: toToken,
          amountIn: amountIn,
          amountOutMinimum: amountOut,
          sqrtPriceLimitX96: 0n,
          fee: 100,
          recipient: kernelB.address,
        },
      }),
    },
    {
      to: sourceBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.send({
        otherChainId: BigInt(destChainId),
        token: toToken,
        sender: kernelB.address,
        receiver: kernelA.address,
        amount: amountOut,
        sessionId: sessionId,
        destBridge: destBridgeContract,
      }),
    },
  ]);
  const { userOp: destUserOp } = await kernelB.createUserOp([
    {
      to: destBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.receiveTokens({
        otherChainId: BigInt(sourceChainId),
        sender: kernelB.address,
        receiver: kernelA.address,
        sessionId: sessionId,
        srcBridge: sourceBridgeContract,
      }),
    },
    {
      to: toToken,
      value: 0n,
      data: erc20Encoder.transfer({
        recipient: eoaAddress,
        amount: amountOut,
      }),
    },
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
      const { builds, explorerUrls, payload, send } =
        await composePreparedUserOps(
          [
            {
              account: kernelA,
              publicClient: sourcePublicClient,
              userOp: preparedSourceUserOps,
            },
            {
              account: kernelB,
              publicClient: destPublicClient,
              userOp: preparedDestUserOps,
            },
          ],
          options,
        );

      const { wait } = await send();

      await wait().then(([receiptA, receiptB]) => {
        options.onUserOpsMined?.([
          addDecodedEventsToReceipt<AllEvents>(receiptA),
          addDecodedEventsToReceipt<AllEvents>(receiptB),
        ]);
      });

      return {
        build: builds,
        payload,
        explorerUrls,
      };
    },

    preparedOps: [
      { chainId: sourceChainId, data: safeStringify(preparedSourceUserOps) },
      { chainId: destChainId, data: safeStringify(preparedDestUserOps) },
    ],
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

  const { userOp: sourceUserOp } = await kernelA.createUserOp([
    {
      to: WETH_ADDRESS,
      value: amountIn,
      data: wethEncoder.deposit(),
    },
    {
      to: sourceBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.send({
        otherChainId: BigInt(destChainId),
        token: WETH_ADDRESS,
        sender: kernelA.address,
        receiver: kernelB.address,
        amount: amountIn,
        sessionId: sessionId,
        destBridge: destBridgeContract,
      }),
    },
  ]);
  const { userOp: destUserOp } = await kernelB.createUserOp([
    {
      to: destBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.receiveTokens({
        otherChainId: BigInt(sourceChainId),
        sender: kernelA.address,
        receiver: kernelB.address,
        sessionId: sessionId,
        srcBridge: sourceBridgeContract,
      }),
    },
    {
      to: WETH_ADDRESS,
      value: 0n,
      data: erc20Encoder.approve({
        spender: routerV2RollupBContract,
        amount: globals.MAX_WEI_AMOUNT,
      }),
    },
    {
      to: routerV2RollupBContract,
      value: 0n,
      data: uniswapEncoders.routerV2.exactInputSingle({
        params: {
          tokenIn: WETH_ADDRESS,
          tokenOut: toToken,
          amountIn: amountIn,
          amountOutMinimum: amountOut,
          sqrtPriceLimitX96: 0n,
          fee: 100,
          recipient: eoaAddress,
        },
      }),
    },
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
      const { builds, explorerUrls, payload, send } =
        await composePreparedUserOps(
          [
            {
              account: kernelA,
              publicClient: sourcePublicClient,
              userOp: preparedSourceUserOps,
            },
            {
              account: kernelB,
              publicClient: destPublicClient,
              userOp: preparedDestUserOps,
            },
          ],
          options,
        );

      const { wait } = await send();

      await wait().then(([receiptA, receiptB]) => {
        options.onUserOpsMined?.([
          addDecodedEventsToReceipt<AllEvents>(receiptA),
          addDecodedEventsToReceipt<AllEvents>(receiptB),
        ]);
      });

      return {
        build: builds,
        payload,
        explorerUrls,
      };
    },

    preparedOps: [
      { chainId: sourceChainId, data: safeStringify(preparedSourceUserOps) },
      { chainId: destChainId, data: safeStringify(preparedDestUserOps) },
    ],
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

  const isSwappingToETH = isAddressEqual(toToken, zeroAddress);

  const rollupABridgeContract = getBridgeAddress(rollupAChainId);
  const rollupBBridgeContract = getBridgeAddress(rollupBChainId);

  const firstBridgeSessionId = BigInt(Math.floor(Math.random() * 1000000));
  const secondBridgeSessionId = BigInt(Math.floor(Math.random() * 1000000));

  const { userOp: op1 } = await kernelA.createUserOp([
    {
      to: fromToken,
      value: 0n,
      data: erc20Encoder.transferFrom({
        sender: eoaAddress,
        recipient: kernelA.address,
        amount: amountIn,
      }),
    },
    {
      to: rollupABridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.send({
        otherChainId: BigInt(rollupBChainId),
        token: fromToken,
        sender: kernelA.address,
        receiver: kernelB.address,
        amount: amountIn,
        sessionId: firstBridgeSessionId,
        destBridge: rollupBBridgeContract,
      }),
    },
    {
      to: rollupABridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.receiveTokens({
        otherChainId: BigInt(rollupBChainId),
        sender: kernelB.address,
        receiver: kernelA.address,
        sessionId: secondBridgeSessionId,
        srcBridge: rollupBBridgeContract,
      }),
    },
    ...(isSwappingToETH
      ? [
          {
            to: WETH_ADDRESS,
            value: 0n,
            data: wethEncoder.withdraw({ wad: amountOut }),
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
            data: erc20Encoder.transfer({
              recipient: eoaAddress,
              amount: amountOut,
            }),
          },
        ]),
  ]);
  const { userOp: op2 } = await kernelB.createUserOp([
    {
      to: rollupBBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.receiveTokens({
        otherChainId: BigInt(rollupAChainId),
        sender: kernelA.address,
        receiver: kernelB.address,
        sessionId: firstBridgeSessionId,
        srcBridge: rollupABridgeContract,
      }),
    },
    {
      to: fromToken,
      value: 0n,
      data: erc20Encoder.approve({
        spender: routerV2RollupBContract,
        amount: amountIn,
      }),
    },
    {
      to: routerV2RollupBContract,
      value: 0n,
      data: uniswapEncoders.routerV2.exactInputSingle({
        params: {
          tokenIn: fromToken,
          tokenOut: isSwappingToETH ? WETH_ADDRESS : toToken,
          amountIn: amountIn,
          amountOutMinimum: amountOut,
          sqrtPriceLimitX96: 0n,
          fee: 100,
          recipient: kernelB.address,
        },
      }),
    },
    {
      to: rollupBBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.send({
        otherChainId: BigInt(rollupAChainId),
        token: isSwappingToETH ? WETH_ADDRESS : toToken,
        sender: kernelB.address,
        receiver: kernelA.address,
        amount: amountOut,
        sessionId: secondBridgeSessionId,
        destBridge: rollupABridgeContract,
      }),
    },
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
      const { builds, explorerUrls, payload, send } =
        await composePreparedUserOps(
          [
            {
              account: kernelA,
              publicClient: rollupAPublicClient,
              userOp: preparedUserOps1,
            },
            {
              account: kernelB,
              publicClient: rollupBPublicClient,
              userOp: preparedUserOps2,
            },
          ],
          options,
        );

      const { wait } = await send();

      await wait().then(([receiptA, receiptB]) => {
        options.onUserOpsMined?.([
          addDecodedEventsToReceipt<AllEvents>(receiptA),
          addDecodedEventsToReceipt<AllEvents>(receiptB),
        ]);
      });

      return {
        build: builds,
        payload,
        explorerUrls,
      };
    },

    preparedOps: [
      { chainId: rollupAChainId, data: safeStringify(preparedUserOps1) },
      { chainId: rollupBChainId, data: safeStringify(preparedUserOps2) },
    ],
  };
};

export const createSwapETHtoERC20UserOpsFrom_A_to_A = async (
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

  const { userOp: op1 } = await kernelA.createUserOp([
    {
      to: WETH_ADDRESS,
      value: amountIn,
      data: wethEncoder.deposit(),
    },
    {
      // Bridge to B to do the swap
      to: rollupABridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.send({
        otherChainId: BigInt(rollupBChainId),
        token: WETH_ADDRESS,
        sender: kernelA.address,
        receiver: kernelB.address,
        amount: amountIn,
        sessionId: firstBridgeSessionId,
        destBridge: rollupBBridgeContract,
      }),
    },
    {
      // [Bridge Back] Receive Tokens from B after the swap is completed on rollup B.
      to: rollupABridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.receiveTokens({
        otherChainId: BigInt(rollupBChainId),
        sender: kernelB.address,
        receiver: kernelA.address,
        sessionId: secondBridgeSessionId,
        srcBridge: rollupABridgeContract,
      }),
    },
    {
      to: toToken,
      value: 0n,
      data: erc20Encoder.transfer({
        recipient: eoaAddress,
        amount: amountOut,
      }),
    },
  ]);
  const { userOp: op2 } = await kernelB.createUserOp([
    {
      to: rollupBBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.receiveTokens({
        otherChainId: BigInt(rollupAChainId),
        sender: kernelA.address,
        receiver: kernelB.address,
        sessionId: firstBridgeSessionId,
        srcBridge: rollupABridgeContract,
      }),
    },
    {
      to: WETH_ADDRESS,
      value: 0n,
      data: erc20Encoder.approve({
        spender: routerV2RollupBContract,
        amount: amountIn,
      }),
    },
    {
      to: routerV2RollupBContract,
      value: 0n,
      data: uniswapEncoders.routerV2.exactInputSingle({
        params: {
          tokenIn: WETH_ADDRESS,
          amountIn,
          amountOutMinimum: amountOut,
          tokenOut: toToken,
          recipient: kernelB.address,
          fee: 100,
          sqrtPriceLimitX96: 0n,
        },
      }),
    },
    {
      to: rollupBBridgeContract,
      value: 0n,
      data: rollupBridgeEncoder.send({
        otherChainId: BigInt(rollupAChainId),
        token: toToken,
        sender: kernelB.address,
        receiver: kernelA.address,
        amount: amountOut,
        sessionId: secondBridgeSessionId,
        destBridge: rollupABridgeContract,
      }),
    },
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
      const { builds, explorerUrls, payload, send } =
        await composePreparedUserOps(
          [
            {
              account: kernelA,
              publicClient: rollupAPublicClient,
              userOp: preparedUserOps1,
            },
            {
              account: kernelB,
              publicClient: rollupBPublicClient,
              userOp: preparedUserOps2,
            },
          ],
          options,
        );

      const { wait } = await send();

      await wait().then(([receiptA, receiptB]) => {
        options.onUserOpsMined?.([
          addDecodedEventsToReceipt<AllEvents>(receiptA),
          addDecodedEventsToReceipt<AllEvents>(receiptB),
        ]);
      });

      return {
        build: builds,
        payload,
        explorerUrls,
      };
    },

    preparedOps: [
      { chainId: rollupAChainId, data: safeStringify(preparedUserOps1) },
      { chainId: rollupBChainId, data: safeStringify(preparedUserOps2) },
    ],
  };
};

export const createSwapUserOpsFrom_B_to_B = async (
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
  const rollupBChainId = rollupB.id;

  const rollupBPublicClient = createRollupPublicClient(rollupBChainId);

  const isSwappingToETH = isAddressEqual(toToken, zeroAddress);
  const isSwappingFromETH = isAddressEqual(fromToken, zeroAddress);

  const routerV2Contract =
    UNISWAP_V3[rollupBChainId as keyof typeof UNISWAP_V3]?.SWAP_ROUTER02;

  const { userOp: op } = await kernelA.createUserOp([
    ...(isSwappingFromETH
      ? [
          {
            to: WETH_ADDRESS,
            value: amountIn,
            data: wethEncoder.deposit(),
          },
        ]
      : [
          {
            to: fromToken,
            value: 0n,
            data: erc20Encoder.transferFrom({
              sender: eoaAddress,
              recipient: kernelA.address,
              amount: amountIn,
            }),
          },
        ]),

    {
      to: isSwappingFromETH ? WETH_ADDRESS : fromToken,
      value: 0n,
      data: erc20Encoder.approve({
        spender: routerV2Contract,
        amount: globals.MAX_WEI_AMOUNT,
      }),
    },
    {
      to: routerV2Contract,
      value: isSwappingFromETH ? amountIn : 0n,
      data: uniswapEncoders.routerV2.exactInputSingle({
        params: {
          tokenIn: isSwappingFromETH ? WETH_ADDRESS : fromToken,
          tokenOut: isSwappingToETH ? WETH_ADDRESS : toToken,
          fee: 100, // Rollup A is 500, Rollup B is 100
          recipient: isSwappingToETH ? kernelB.address : eoaAddress,
          amountIn,
          amountOutMinimum: amountOut,
          sqrtPriceLimitX96: 0n,
        },
      }),
    },
    ...(isSwappingToETH
      ? [
          {
            to: WETH_ADDRESS,
            value: 0n,
            data: wethEncoder.withdraw({ wad: amountOut }),
          },
          {
            to: eoaAddress,
            value: amountOut,
            data: "0x" as Hex,
          },
        ]
      : []),
  ]);

  const preparedUserOps = omit(
    await prepareUserOperation(rollupBPublicClient, op),
    "account",
  );

  return {
    sign: async () => {
      const { builds, explorerUrls, payload, send } =
        await composePreparedUserOps(
          [
            {
              account: kernelB,
              publicClient: rollupBPublicClient,
              userOp: preparedUserOps,
            },
          ],
          options,
        );

      const { wait } = await send();

      await wait().then(([receipt]) => {
        options.onUserOpsMined?.([
          addDecodedEventsToReceipt<AllEvents>(receipt),
        ]);
      });

      return {
        build: builds,
        payload,
        explorerUrls,
      };
    },

    preparedOps: [
      { chainId: rollupBChainId, data: safeStringify(preparedUserOps) },
    ],
  };
};
