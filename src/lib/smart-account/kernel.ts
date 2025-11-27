import { useEntrypointContract } from "@/lib/abi/entrypoint";
import { ENTRYPOINT_ADDRESS } from "@/wagmi/addresses";
import { keepPreviousData } from "@tanstack/react-query";
import { type Address } from "viem";
import { useBalance } from "wagmi";

import { useSmartAccount as useSmartAccountSDK } from "@compose-network/sdk/react";
import { rollupA, rollupB } from "@compose-network/sdk";

export const useSmartAccount = () => {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const kernel: any = { data: undefined };

  const smartAccountAQuery = useSmartAccountSDK({
    chainId: rollupA.id,
    multiChainIds: [rollupA.id, rollupB.id],
  });

  const smartAccountBQuery = useSmartAccountSDK({
    chainId: rollupB.id,
    multiChainIds: [rollupA.id, rollupB.id],
  });

  if (smartAccountAQuery && smartAccountBQuery) {
    kernel.data!.accounts.A = smartAccountAQuery?.data?.account;
    kernel.data!.validators.A = smartAccountAQuery?.data?.validator;

    kernel.data!.accounts.B = smartAccountBQuery?.data?.account;
    kernel.data!.validators.B = smartAccountBQuery?.data?.validator;
  }

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
    address: kernel.data?.accounts?.A?.address as Address,
    chainId: rollupA.id,
  });

  const balanceB = useBalance({
    address: kernel.data?.accounts?.B?.address as Address,
    chainId: rollupB.id,
  });

  const gasBalanceA = useBalanceOf(
    { account: kernel.data?.accounts?.A?.address as Address },
    {
      chainId: rollupA.id,
      enabled: !!kernel.data?.accounts?.A?.address,
      contract: ENTRYPOINT_ADDRESS,
      watch: true,
      placeholderData: keepPreviousData,
    },
  );

  const gasBalanceB = useBalanceOf(
    { account: kernel.data?.accounts?.B?.address as Address },
    {
      chainId: rollupB.id,
      enabled: !!kernel.data?.accounts?.B?.address,
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
    if (chainId === rollupA.id) return kernel.data?.accounts?.A;
    if (chainId === rollupB.id) return kernel.data?.accounts?.B;
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

    kernel,

    smartAccountA: smartAccountAQuery.data,
    smartAccountB: smartAccountBQuery.data,

    getPublicClient,
    getKernelByChainId,
    isLoading: smartAccountAQuery.isLoading || smartAccountBQuery.isLoading,
  };
};
