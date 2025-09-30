import { useAccount } from "@/hooks/account/use-account";
import { useEntrypointContract } from "@/lib/abi/entrypoint";
import { ENTRYPOINT_V0_7, ROLLUP_ADDRESSES } from "@/wagmi/addresses";
import { rollupA, rollupB } from "@/wagmi/config";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toMultiChainECDSAValidator } from "@zerodev/multi-chain-ecdsa-validator";
import type { KernelSmartAccountImplementation } from "@zerodev/sdk";
import { createKernelAccount } from "@zerodev/sdk";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { isAddress, type Address, type Client } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";

const entryPoint = getEntryPoint("0.7");
export const useSmartAccount = () => {
  const account = useAccount();
  const walletClient = useWalletClient();
  const publicClientA = usePublicClient({ chainId: rollupA.id });
  const publicClientB = usePublicClient({ chainId: rollupB.id });

  const kernel = useQuery({
    queryKey: ["kernel-accounts", account.address],
    queryFn: async () => {
      const [validatorA, validatorB] = await Promise.all([
        toMultiChainECDSAValidator(publicClientA as Client, {
          entryPoint,
          signer: walletClient.data!,
          kernelVersion: KERNEL_V3_1,
          validatorAddress: ROLLUP_ADDRESSES[rollupA.id].MULTICHAIN_VALIDATOR,
          multiChainIds: [rollupA.id, rollupB.id],
        }),
        toMultiChainECDSAValidator(publicClientB as Client, {
          entryPoint,
          signer: walletClient.data!,
          kernelVersion: KERNEL_V3_1,
          validatorAddress: ROLLUP_ADDRESSES[rollupB.id].MULTICHAIN_VALIDATOR,
          multiChainIds: [rollupA.id, rollupB.id],
        }),
      ]);

      const [accountA, accountB] = await Promise.all([
        createKernelAccount(
          publicClientA as KernelSmartAccountImplementation["client"],
          {
            entryPoint,
            plugins: { sudo: validatorA },
            kernelVersion: KERNEL_V3_1,
            accountImplementationAddress:
              ROLLUP_ADDRESSES[rollupA.id].KERNEL_IMPL,
            factoryAddress: ROLLUP_ADDRESSES[rollupA.id].KERNEL_FACTORY,
            useMetaFactory: false,
          },
        ),
        createKernelAccount(
          publicClientB as KernelSmartAccountImplementation["client"],
          {
            entryPoint,
            plugins: { sudo: validatorB },
            kernelVersion: KERNEL_V3_1,
            accountImplementationAddress:
              ROLLUP_ADDRESSES[rollupB.id].KERNEL_IMPL,
            factoryAddress: ROLLUP_ADDRESSES[rollupB.id].KERNEL_FACTORY,
            useMetaFactory: false,
          },
        ),
      ]);

      return {
        accounts: { A: accountA, B: accountB },
        validators: { A: validatorA, B: validatorB },
      };
    },
    enabled: isAddress(account.address ?? "") && !!walletClient.data,
  });

  const { useBalanceOf, useDepositTo } = useEntrypointContract();

  const depositToA = useDepositTo({
    contract: ENTRYPOINT_V0_7,
    chainId: rollupA.id,
  });

  const depositToB = useDepositTo({
    contract: ENTRYPOINT_V0_7,
    chainId: rollupB.id,
  });

  const balanceA = useBalanceOf(
    { account: kernel.data?.accounts?.A?.address as Address },
    {
      chainId: rollupA.id,
      enabled: !!kernel.data?.accounts?.A?.address,
      contract: ENTRYPOINT_V0_7,
      watch: true,
      placeholderData: keepPreviousData,
    },
  );

  const balanceB = useBalanceOf(
    { account: kernel.data?.accounts?.B?.address as Address },
    {
      chainId: rollupB.id,
      enabled: !!kernel.data?.accounts?.B?.address,
      watch: true,
      contract: ENTRYPOINT_V0_7,
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
    depositToA,
    depositToB,
    kernel,
    getPublicClient,
    getKernelByChainId,
  };
};
