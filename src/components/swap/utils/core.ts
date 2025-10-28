import type { ComposedSignedUserOpsTxReturnType, toRpcUserOpCanonical } from "@/lib/smart-account/user-op";
import { chainsMap, config, rollupA, rollupB } from "@/wagmi/config";
import { getPublicClient, http } from "@wagmi/core";
import type { CreateKernelAccountReturnType } from "@zerodev/sdk";
import { type Address, createPublicClient, type Hex, rpcSchema } from "viem";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

  // TODO: TEMP DISABLED PAYMASTER
  // const paymaster: PaymasterActions = {
  //   getPaymasterData: (parameters: GetPaymasterDataParameters) => {
  //     return getPaymasterDataForChain(parameters, "pm_sponsorUserOperation");
  //   },
  //   getPaymasterStubData: (parameters: GetPaymasterDataParameters) => {
  //     return getPaymasterDataForChain(parameters, "pm_getPaymasterStubData");
  //   },
  // };

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
    // paymaster,
  };
};

type ComposeRpcSchema = [
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
  const rollupAPublicClient = createPublicClient({
    chain: chainsMap[sourceChainId],
    transport: http(chainsMap[sourceChainId].rpcUrls.default.http[0]),
    rpcSchema: rpcSchema<ComposeRpcSchema>(),
  });

  const rollupBPublicClient = createPublicClient({
    chain: chainsMap[destChainId],
    transport: http(chainsMap[destChainId].rpcUrls.default.http[0]),
    rpcSchema: rpcSchema<ComposeRpcSchema>(),
  });

  return [rollupAPublicClient, rollupBPublicClient];
};
