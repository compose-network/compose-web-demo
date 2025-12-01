import type {
  ComposedSignedUserOpsTxReturnType,
  toRpcUserOpCanonical,
} from "@/lib/smart-account/user-op";
import { chainsMap, config, rollupA, rollupB } from "@/wagmi/config";
import type { Transport } from "@wagmi/core";
import { getPublicClient, http } from "@wagmi/core";
import type { CreateKernelAccountReturnType } from "@zerodev/sdk";
import type { Chain, PublicClient } from "viem";
import { type Address, createPublicClient, type Hex, rpcSchema } from "viem";

import type {
  GetPaymasterDataParameters,
  PaymasterActions,
  SmartAccount,
} from "viem/account-abstraction";
import { getPaymasterDataForChain } from "@/api/paymaster.ts";

const FALLBACK_CALL_GAS_LIMIT = 900_000n;
const MIN_VERIFICATION_GAS_LIMIT = 1_200_000n;
const PRE_VERIFICATION_GAS = 90_000n;

const withMargin = (value: bigint, marginPct = 25n) =>
  value + (value * marginPct) / 100n;

type Call = {
  to: Address;
  value: bigint;
  data: Hex;
};

type CreateUserOpParams = {
  account: CreateKernelAccountReturnType<"0.7">;
  chainId: (typeof config.chains)[number]["id"];
  calls: Call[];
};

export const createUserOp = async ({
  account,
  chainId,
  calls,
}: CreateUserOpParams) => {
  const publicClient = getPublicClient(config, { chainId });

  // Estimate gas for each call
  const callGasEstimates = await Promise.all(
    calls.map((call) =>
      publicClient
        .estimateGas({
          account,
          to: call.to,
          data: call.data,
          value: call.value,
        })
        .then(withMargin)
        .catch((error) => {
          console.warn(
            `Gas estimation failed for call to ${call.to}, falling back`,
            error,
          );
          return FALLBACK_CALL_GAS_LIMIT;
        }),
    ),
  );

  // Sum all call gas limits
  const callGasLimit = callGasEstimates.reduce((acc, gas) => acc + gas, 0n);

  // Calculate verification gas limit
  const verificationGasLimit =
    callGasLimit + PRE_VERIFICATION_GAS > MIN_VERIFICATION_GAS_LIMIT
      ? callGasLimit + PRE_VERIFICATION_GAS
      : MIN_VERIFICATION_GAS_LIMIT;

  // Estimate fees per gas
  const gasEstimate = await publicClient.estimateFeesPerGas();

  const paymaster: PaymasterActions = {
    getPaymasterData: (parameters: GetPaymasterDataParameters) => {
      return getPaymasterDataForChain(parameters, "pm_sponsorUserOperation");
    },
    getPaymasterStubData: (parameters: GetPaymasterDataParameters) => {
      return getPaymasterDataForChain(parameters, "pm_getPaymasterStubData");
    },
  };

  const callData = await account.encodeCalls(calls);

  return {
    account,
    chainId,
    callData,
    callGasLimit,
    verificationGasLimit,
    preVerificationGas: PRE_VERIFICATION_GAS,
    maxFeePerGas: gasEstimate.maxFeePerGas!,
    maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas!,
    paymaster,
  };
};

export type ComposeRpcSchema = [
  {
    Method: "eth_sendXTransaction";
    Parameters: [string];
    ReturnType: null;
  },
  {
    Method: "compose_buildSignedUserOpsTx";
    Parameters: [
      ReturnType<typeof toRpcUserOpCanonical>[],
      { chainId: number },
    ];
    ReturnType: ComposedSignedUserOpsTxReturnType;
  },
];

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
