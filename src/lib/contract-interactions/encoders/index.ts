import { TokenABI } from "@/lib/abi/token";
import { WETHAbi } from "@/lib/abi/weth";
import { UniswapV3PoolABI } from "@/lib/abi/uniswapv3/pool";
import { UniswapV3QuoterABI } from "@/lib/abi/uniswapv3/quoter";
import { UniswapV3SwapRouterV2ABI } from "@/lib/abi/uniswapv3/swap-router-v2";
import { createAbiEncoder } from "@/lib/utils/abi";
import { UserOperationBridgeAbi } from "@/lib/abi/swap/op-bridge";

export const uniswapV3QuoterEncoder = createAbiEncoder(UniswapV3QuoterABI);
export const uniswapV3PoolEncoder = createAbiEncoder(UniswapV3PoolABI);
export const uniswapV3RouterV2Encoder = createAbiEncoder(
  UniswapV3SwapRouterV2ABI,
);

export const uniswapEncoders = {
  quoter: uniswapV3QuoterEncoder,
  pool: uniswapV3PoolEncoder,
  routerV2: uniswapV3RouterV2Encoder,
};

export const erc20Encoder = createAbiEncoder(TokenABI);
export const wethEncoder = createAbiEncoder(WETHAbi);

export const rollupBridgeEncoder = createAbiEncoder(UserOperationBridgeAbi);


