/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import type { UseReadContractReturnType } from "wagmi";
import { useBlockNumber, useReadContract, useWriteContract } from "wagmi";
import type { Abi, AbiFunction, Address, ExtractAbiFunctions } from "abitype";
import type { WriteContractErrorType } from "@wagmi/core";
import { type WaitForTransactionReceiptErrorType, type Hash } from "viem";
import { useWaitForTransactionReceipt } from "@/lib/contract-interactions/utils/useWaitForTransactionReceipt";
import type {
  MutationOptions,
  AllEvents,
} from "@/lib/contract-interactions/utils/useWaitForTransactionReceipt";
import {
  paramsToArray,
  extractAbiFunction,
} from "@/lib/contract-interactions/utils";
import type { AbiInputsToParams } from "@/lib/contract-interactions/utils";
import { useMemo } from "react";
import { wait } from "@/lib/utils/promise";
import { SwapABI } from "@/lib/abi/swap/swap";
import { rollupB, swapContract } from "@/wagmi/config";
import { isUndefined } from "lodash-es";
import type { QueryOptions } from "@tanstack/react-query";

type WriteParams<T extends AbiFunction> = {
  value?: bigint;
} & AbiInputsToParams<T["inputs"]>;

type Capitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;
type WriteHookResult<T extends WriteParams<AbiFunction> | void> = {
  error: Error | null;
  isSuccess: boolean;
  isPending: boolean;
  mutation: ReturnType<typeof useWriteContract>;
  write: (params: T, options?: MutationOptions<AllEvents>) => Promise<unknown>;
  wait: ReturnType<typeof useWaitForTransactionReceipt>;
};

type WriteHooksObject<T extends AbiFunction[]> = {
  [K in T[number]["name"] as `use${Capitalize<K>}`]: () => WriteHookResult<
    WriteParams<Extract<T[number], { name: K }>>
  >;
};
type CustomQueryOptions = {
  chainId?: number;
  enabled?: boolean;
  watch?: boolean;
} & QueryOptions;

type ReadHooksObject<T extends AbiFunction[]> = {
  [Fn in T[number] as `use${Capitalize<Fn["name"]>}`]: Fn["inputs"] extends readonly []
    ? //@ts-expect-error - Fn["name"] is not a valid ContractFunctionName
      (options: CustomQueryOptions) => UseReadContractReturnType<T, Fn["name"]>
    : (
        params: AbiInputsToParams<Fn["inputs"]>,
        options: CustomQueryOptions,
        //@ts-expect-error - Fn["name"] is not a valid ContractFunctionName
      ) => UseReadContractReturnType<T, Fn["name"]>;
};

export function createContractHooks<T extends Abi>(
  abi: T,
  contractAddressGetter: () => Address,
) {
  // Filter write functions from ABI
  const writeFunctions = abi.filter(
    (item) =>
      item.type === "function" &&
      item.stateMutability !== "view" &&
      item.stateMutability !== "pure",
  ) as AbiFunction[];

  const readFunctions = abi.filter(
    (item) =>
      item.type === "function" &&
      (item.stateMutability === "view" || item.stateMutability === "pure"),
  ) as AbiFunction[];

  const hooks = {};

  readFunctions.forEach((fn) => {
    const hookName = `use${fn.name.charAt(0).toUpperCase() + fn.name.slice(1)}`;
    const functionName = fn.name;
    const hasInputs = Boolean(fn.inputs?.length);
    const abiFunction = extractAbiFunction(abi, functionName);

    if (hasInputs) {
      //@ts-expect-error - TODO: fix this
      hooks[hookName] = (
        params: AbiInputsToParams<typeof fn.inputs>,
        options: CustomQueryOptions = { enabled: true },
      ) => {
        const contractAddress = contractAddressGetter();
        const blockNumber = useBlockNumber({ watch: options.watch });
        const args = paramsToArray({ params, abiFunction });

        return useReadContract({
          abi,
          address: contractAddress,
          functionName: functionName as string,
          args: args as readonly unknown[],
          blockNumber: options.watch ? blockNumber.data : undefined,
          query: {
            ...options,
            enabled:
              options?.enabled &&
              !!contractAddress &&
              args?.every((arg) => !isUndefined(arg)),
          },
        } as any);
      };
    } else {
      // Create hook function for functions without parameters
      //@ts-expect-error - TODO: fix this
      hooks[hookName] = (options: CustomQueryOptions = { enabled: true }) => {
        const contractAddress = contractAddressGetter();
        const blockNumber = useBlockNumber({ watch: options.watch });

        return useReadContract({
          abi,
          address: contractAddress,
          functionName: functionName as string,
          blockNumber: options.watch ? blockNumber.data : undefined,
          query: {
            ...options,
            enabled: options?.enabled && !!contractAddress,
          },
        } as any);
      };
    }
  });

  writeFunctions.forEach((fn) => {
    const hookName = "use" + fn.name;
    const hookFn = () => {
      const contractAddress = contractAddressGetter();

      const waitForTx = useWaitForTransactionReceipt([
        hookName,
        contractAddress,
      ]);
      const functionName = fn.name;

      const abiFunction = useMemo(
        () => extractAbiFunction(abi, functionName),
        [functionName],
      );

      const mutation = useWriteContract();

      const write = (
        params: WriteParams<typeof fn>,
        options: MutationOptions<AllEvents> = {},
      ) => {
        options.onInitiated?.();

        return mutation
          .writeContractAsync(
            // @ts-expect-error - TODO: fix this
            {
              abi,
              address: contractAddress,
              functionName,
              ...(params && { args: paramsToArray({ params, abiFunction }) }),
              ...(fn.stateMutability === "payable" &&
                params?.value && { value: params.value }),
            },
            {
              onSuccess: (hash) => options.onConfirmed?.(hash),
              onError: (error) =>
                options.onError?.(error as WriteContractErrorType),
            },
          )
          .then((hash) =>
            waitForTx.mutateAsync(hash as Hash, {
              onSuccess: async (receipt) => {
                await wait(1);
                return options.onMined?.(receipt);
              },
              onError: async (error) => {
                await wait(1);
                return options.onError?.(
                  error as WaitForTransactionReceiptErrorType,
                );
              },
            }),
          );
      };
      return {
        error: mutation.error || waitForTx.error,
        isSuccess: waitForTx.isSuccess,
        isPending: mutation.isPending || waitForTx.isPending,
        mutation,
        write,
        wait: waitForTx,
      };
    };

    //@ts-expect-error - TODO: fix this
    hooks[hookName] = hookFn;
  });
  return hooks as WriteHooksObject<
    //@ts-expect-error - TODO: fix this
    ExtractAbiFunctions<T, "nonpayable" | "payable">[]
  > &
    //@ts-expect-error - TODO: fix this
    ReadHooksObject<ExtractAbiFunctions<T, "view" | "pure">[]>;
}

export const swapContractHooks = createContractHooks(
  SwapABI,
  () => swapContract[rollupB.id] as Address,
);
export const useSwapContract = () => swapContractHooks;
// swapHooks.useGetSwapPrice()
