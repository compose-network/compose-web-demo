import { parseAbi } from "viem";

export const FlashAdapterABI = parseAbi([
  "function flash(address pool,uint256 amount0,uint256 amount1,(address target,uint256 value,bytes callData)[] calls) external",
  "function execute((address target,uint256 value,bytes callData)[] calls) external",
]);
