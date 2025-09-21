import { parseAbi } from "viem";

export const UserOperationBridgeAbi = parseAbi([
  "function send(uint256 chainSrc,uint256 chainDest,address token,address sender,address receiver,uint256 amount,uint256 sessionId)",
  "function receiveTokens(uint256 chainSrc,uint256 chainDest,address sender,address receiver,uint256 sessionId) returns (address token,uint256 amount)",
]);
