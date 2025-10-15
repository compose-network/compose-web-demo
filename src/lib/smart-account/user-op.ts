import { EntryPointAbi } from "@/lib/abi/entrypoint";
import { MailboxABI } from "@/lib/abi/swap/mailbox";
import { UserOperationBridgeAbi } from "@/lib/abi/swap/op-bridge";
import { TokenABI } from "@/lib/abi/token";
import { tryCatch } from "@/lib/utils/tryCatch";
import type { Address, DecodeEventLogReturnType, Hex, Log } from "viem";
import {
  decodeErrorResult,
  decodeEventLog,
  erc20Abi,
  isHex,
  toHex,
} from "viem";
import type { PrepareUserOperationReturnType } from "viem/account-abstraction";
import { WETHAbi } from "../abi/weth";

export function toRpcUserOpCanonical(op: PrepareUserOperationReturnType) {
  const hx = (v: string | bigint) =>
    typeof v === "string" && isHex(v as `0x${string}`)
      ? (v as `0x${string}`)
      : toHex(BigInt(v));

  // const initCode: `0x${string}` =
  //   op.initCode && isHex(op.initCode) && op.initCode !== "0x"
  //     ? op.initCode
  //     : op.factory && op.factory !== zeroAddress && op.factoryData
  //       ? concatHex([
  //           (op.factory.toLowerCase().startsWith("0x")
  //             ? op.factory
  //             : "0x" + op.factory) as `0x${string}`,
  //           op.factoryData as `0x${string}`,
  //         ])
  //       : "0x";
  //
  // console.log("initCode:", initCode);

  return {
    sender: op.sender,
    nonce: hx(op.nonce),
    initCode: op.initCode,
    callData: op.callData,
    callGasLimit: hx(op.callGasLimit),
    verificationGasLimit: hx(op.verificationGasLimit),
    preVerificationGas: hx(op.preVerificationGas),
    maxFeePerGas: hx(op.maxFeePerGas),
    maxPriorityFeePerGas: hx(op.maxPriorityFeePerGas),
    paymaster: op.paymaster,
    paymasterData: op.paymasterData,
    paymasterVerificationGasLimit: hx(op.paymasterVerificationGasLimit!),
    paymasterPostOpGasLimit: hx(op.paymasterPostOpGasLimit!),
    signature: op.signature ?? "0x",
  };
}

export interface ComposedSignedUserOpsTxReturnType {
  raw: Hex;
  hash: Hex;
  to: Address;
  chainId: number;
  gas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  userOpHashes: Hex[];
}

const abis = [
  EntryPointAbi,
  UserOperationBridgeAbi,
  TokenABI,
  erc20Abi,
  MailboxABI,
  WETHAbi,
];
export const decodeUserOperationLogs = (logs: Log[]) => {
  console.log("abis:", abis);
  return logs.map((log) => {
    const decoded = abis
      .map((abi) =>
        tryCatch(
          () =>
            decodeEventLog({
              abi,
              data: log.data,
              topics: log.topics,
            }),
          undefined,
        ),
      )
      .find(Boolean);
    if (!decoded) return undefined;

    if (decoded.args && "revertReason" in decoded.args) {
      console.log("decoded.args.revertReason:", decoded.args.revertReason);
      const reason = abis.map((abi) => {
        try {
          const data = decodeErrorResult({
            abi,
            // @ts-expect-error revertReason is not always present
            data: decoded.args.revertReason,
          });
          data.abi = abi;
          return data;
        } catch (error) {
          console.log("error:", error instanceof Error ? error.message : error);
          return undefined;
        }
      });
      console.log("reason:", reason);

      return {
        ...decoded,
        args: {
          ...decoded.args,
          revertReason: reason.find(Boolean),
        },
      };
    }
    return decoded;
  }) as DecodeEventLogReturnType<
    | typeof EntryPointAbi
    | typeof UserOperationBridgeAbi
    | typeof TokenABI
    | typeof erc20Abi
  >[];
};
