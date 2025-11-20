import { UniswapV3PoolABI } from "@/lib/abi/uniswapv3/pool";
import { UniswapV3QuoterABI } from "@/lib/abi/uniswapv3/quoter";
import { UniswapV3SwapRouterV2ABI } from "@/lib/abi/uniswapv3/swap-router-v2";
import { createContractHooks } from "@/lib/contract-interactions/core/create-write-hooks";
import { zeroAddress } from "viem";

export const uniswapV3PoolContractHooks = createContractHooks(
  UniswapV3PoolABI,
  () => zeroAddress,
);

export const uniswapV3RouterV2ContractHooks = createContractHooks(
  UniswapV3SwapRouterV2ABI,
  () => zeroAddress,
);

export const useUniswapV3RouterV2ContractHooks = () =>
  uniswapV3RouterV2ContractHooks;

export const useUniswapV3PoolContractHooks = () => uniswapV3PoolContractHooks;

export const uniswapV3QuoterContractHooks = createContractHooks(
  UniswapV3QuoterABI,
  () => zeroAddress,
);

export const useUniswapV3QuoterContractHooks = () =>
  uniswapV3QuoterContractHooks;
