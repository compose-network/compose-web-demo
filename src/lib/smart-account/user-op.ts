import { EntryPointAbi } from "@/lib/abi/entrypoint";
import { MailboxABI } from "@/lib/abi/swap/mailbox";
import { UserOperationBridgeAbi } from "@/lib/abi/swap/op-bridge";
import { TokenABI } from "@/lib/abi/token";
import { tryCatch } from "@/lib/utils/tryCatch";
import type { Hex, Address, Log, DecodeEventLogReturnType } from "viem";
import {
  isHex,
  toHex,
  zeroAddress,
  concatHex,
  decodeEventLog,
  decodeErrorResult,
  erc20Abi,
} from "viem";
import type { PrepareUserOperationReturnType } from "viem/account-abstraction";

export function toRpcUserOpCanonical(op: PrepareUserOperationReturnType) {
  const hx = (v: string | bigint) =>
    typeof v === "string" && isHex(v as `0x${string}`)
      ? (v as `0x${string}`)
      : toHex(BigInt(v));
  const initCode: `0x${string}` =
    op.initCode && isHex(op.initCode) && op.initCode !== "0x"
      ? op.initCode
      : op.factory && op.factory !== zeroAddress && op.factoryData
        ? concatHex([
            (op.factory.toLowerCase().startsWith("0x")
              ? op.factory
              : "0x" + op.factory) as `0x${string}`,
            op.factoryData as `0x${string}`,
          ])
        : "0x";

  console.log("initCode:", initCode);

  return {
    sender: op.sender,
    nonce: hx(op.nonce),
    initCode,
    callData: op.callData,
    callGasLimit: hx(op.callGasLimit),
    verificationGasLimit: hx(op.verificationGasLimit),
    preVerificationGas: hx(op.preVerificationGas),
    maxFeePerGas: hx(op.maxFeePerGas),
    maxPriorityFeePerGas: hx(op.maxPriorityFeePerGas),
    paymasterAndData: op.paymasterAndData ?? "0x",
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
          return decodeErrorResult({
            abi,
            // @ts-expect-error revertReason is not always present
            data: decoded.args.revertReason,
          });
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
