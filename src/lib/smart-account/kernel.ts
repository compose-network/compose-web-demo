import { useEntrypointContract } from "@/lib/abi/entrypoint";
import { ENTRYPOINT_ADDRESS } from "@/wagmi/addresses";
import { keepPreviousData } from "@tanstack/react-query";
import { type Address } from "viem";
import { useBalance } from "wagmi";

import { useSmartAccount as useSmartAccountSDK } from "@compose-network/sdk/react";
import { rollupA, rollupB } from "@/wagmi/config.ts";

export const useSmartAccount = () => {
  const smartAccountAQuery = useSmartAccountSDK({
    chainId: rollupA.id,
    multiChainIds: [rollupA.id, rollupB.id],
  });

  const smartAccountBQuery = useSmartAccountSDK({
    chainId: rollupB.id,
    multiChainIds: [rollupA.id, rollupB.id],
  });

  const publicClientA = smartAccountAQuery?.data?.publicClient;

  const publicClientB = smartAccountBQuery?.data?.publicClient;

  const { useBalanceOf, useDepositTo } = useEntrypointContract();

  const depositToA = useDepositTo({
    contract: ENTRYPOINT_ADDRESS,
    chainId: rollupA.id,
  });

  const depositToB = useDepositTo({
    contract: ENTRYPOINT_ADDRESS,
    chainId: rollupB.id,
  });

  const balanceA = useBalance({
    address: smartAccountAQuery.data?.account.address as Address,
    chainId: rollupA.id,
  });

  const balanceB = useBalance({
    address: smartAccountBQuery.data?.account.address as Address,
    chainId: rollupB.id,
  });

  const gasBalanceA = useBalanceOf(
    { account: smartAccountAQuery.data?.account.address as Address },
    {
      chainId: rollupA.id,
      enabled: !!smartAccountAQuery.data?.account.address,
      contract: ENTRYPOINT_ADDRESS,
      watch: true,
      placeholderData: keepPreviousData,
    },
  );

  const gasBalanceB = useBalanceOf(
    { account: smartAccountBQuery.data?.account.address as Address },
    {
      chainId: rollupB.id,
      enabled: !!smartAccountBQuery.data?.account.address,
      watch: true,
      contract: ENTRYPOINT_ADDRESS,
      placeholderData: keepPreviousData,
    },
  );

  const getPublicClient = (chainId: number) => {
    if (chainId === rollupA.id) return publicClientA;
    if (chainId === rollupB.id) return publicClientB;
  };

  const getKernelByChainId = (chainId: number) => {
    if (chainId === rollupA.id) return smartAccountAQuery.data?.account;
    if (chainId === rollupB.id) return smartAccountBQuery.data?.account;
  };

  return {
    publicClientA,
    publicClientB,
    balanceA,
    balanceB,
    gasBalanceA,
    gasBalanceB,
    depositToA,
    depositToB,

    smartAccountA: smartAccountAQuery.data,
    smartAccountB: smartAccountBQuery.data,

    getPublicClient,
    getKernelByChainId,
    isLoading: smartAccountAQuery.isLoading || smartAccountBQuery.isLoading,
  };
};
