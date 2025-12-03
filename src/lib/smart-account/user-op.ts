import { EntryPointAbi } from "@/lib/abi/entrypoint";
import { MailboxABI } from "@/lib/abi/swap/mailbox";
import { UserOperationBridgeAbi } from "@/lib/abi/swap/op-bridge";
import { TokenABI } from "@/lib/abi/token";
import { tryCatch } from "@/lib/utils/tryCatch";
import type { DecodeEventLogReturnType, Log } from "viem";
import { decodeErrorResult, decodeEventLog, erc20Abi } from "viem";
import { WETHAbi } from "../abi/weth";
import { UniswapV3SwapRouterV2ABI } from "@/lib/abi/uniswapv3/swap-router-v2";

const abis = [
  EntryPointAbi,
  UserOperationBridgeAbi,
  TokenABI,
  erc20Abi,
  MailboxABI,
  WETHAbi,
  UniswapV3SwapRouterV2ABI,
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
          const data = {
            ...decodeErrorResult({
              abi,
              // @ts-expect-error revertReason is not always present
              data: decoded.args.revertReason,
            }),
            abi,
          };
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
