/* eslint-disable react-hooks/rules-of-hooks */
import { SwapABI } from "@/lib/abi/swap/swap";
import type { AbiInputsToParams } from "@/lib/contract-interactions/utils";
import {
  extractAbiFunction,
  paramsToArray,
} from "@/lib/contract-interactions/utils";
import { rollupB, swapContract } from "@/wagmi/config";
import type { Abi, AbiFunction, Address, ExtractAbiFunctions } from "abitype";
import { isUndefined } from "lodash-es";
import type { UseReadContractReturnType } from "wagmi";
import { useBlockNumber, useReadContract } from "wagmi";

type Capitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

type QueryOptions = {
  chainId?: number;
  enabled?: boolean;
  watch?: boolean;
};

type ReadHooksObject<T extends AbiFunction[]> = {
  [Fn in T[number] as `use${Capitalize<Fn["name"]>}`]: Fn["inputs"] extends readonly []
    ? //@ts-expect-error - Fn["name"] is not a valid ContractFunctionName
      (options: QueryOptions) => UseReadContractReturnType<T, Fn["name"]>
    : (
        params: AbiInputsToParams<T[number]["inputs"]>,
        options: QueryOptions,
        //@ts-expect-error - Fn["name"] is not a valid ContractFunctionName
      ) => UseReadContractReturnType<T, Fn["name"]>;
};

export function createReadHooks<T extends Abi = Abi>(
  abi: T,
  contractAddressGetter: () => Address,
) {
  const readFunctions = abi.filter(
    (item) =>
      item.type === "function" &&
      (item.stateMutability === "view" || item.stateMutability === "pure"),
  ) as AbiFunction[];

  console.log("readFunctions:", readFunctions);

  const hooks = {} as Record<string, unknown>;

  readFunctions.forEach((fn) => {
    const hookName = `use${fn.name.charAt(0).toUpperCase() + fn.name.slice(1)}`;
    const functionName = fn.name;
    const hasInputs = Boolean(fn.inputs?.length);
    const abiFunction = extractAbiFunction(abi, functionName);

    if (hasInputs) {
      // Create hook function for functions with parameters
      hooks[hookName] = (
        params: AbiInputsToParams<typeof fn.inputs>,
        options: QueryOptions = { enabled: true },
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
        });
      };
    } else {
      // Create hook function for functions without parameters
      hooks[hookName] = (options: QueryOptions = { enabled: true }) => {
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
        });
      };
    }
  });

  return hooks as ReadHooksObject<ExtractAbiFunctions<T>[]>;
}

const swapReader = createReadHooks(SwapABI, () => swapContract[rollupB.id]);
console.log("swapReader:", swapReader);

export const useSwapReader = () => swapReader;
