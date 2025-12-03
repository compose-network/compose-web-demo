import { chainsMap, rollupA, rollupB } from "@/wagmi/config";
import type { Transport } from "@wagmi/core";
import { http } from "@wagmi/core";
import type { Chain, PublicClient } from "viem";
import { createPublicClient, rpcSchema } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import type { ComposeRpcSchema } from "@compose-network/sdk";

export const createRollupPublicClient = (
  sourceChainId: keyof typeof chainsMap,
): PublicClient<Transport, Chain, SmartAccount, ComposeRpcSchema> => {
  return createPublicClient({
    chain: chainsMap[sourceChainId],
    transport: http(chainsMap[sourceChainId].rpcUrls.default.http[0]),
    rpcSchema: rpcSchema<ComposeRpcSchema>(),
  });
};

/**
 * Creates public clients for both rollup A and rollup B chains with Compose RPC schema support.
 *
 * @returns {[PublicClient, PublicClient]} A tuple where the first element is the rollupA public client
 * and the second element is the rollupB public client. Both clients are configured with
 * custom RPC methods for cross-chain user operation handling.
 */
export const createRollupPublicClients = (
  sourceChainId: keyof typeof chainsMap = rollupA.id,
  destChainId: keyof typeof chainsMap = rollupB.id,
) => {
  const rollupAPublicClient = createRollupPublicClient(sourceChainId);

  const rollupBPublicClient = createRollupPublicClient(destChainId);

  return [rollupAPublicClient, rollupBPublicClient];
};
