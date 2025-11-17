import { UniswapV3PoolABI } from "@/lib/abi/uniswapv3/pool";
import { UniswapV3QuoterABI } from "@/lib/abi/uniswapv3/quoter";
import { createContractHooks } from "@/lib/contract-interactions/core/create-write-hooks";
import { zeroAddress } from "viem";

export const uniswapV3PoolContractHooks = createContractHooks(
  UniswapV3PoolABI,
  () => zeroAddress,
);
export const useUniswapV3PoolContractHooks = () => uniswapV3PoolContractHooks;

export const uniswapV3QuoterContractHooks = createContractHooks(
  UniswapV3QuoterABI,
  () => zeroAddress,
);
export const useUniswapV3QuoterContractHooks = () =>
  uniswapV3QuoterContractHooks;
