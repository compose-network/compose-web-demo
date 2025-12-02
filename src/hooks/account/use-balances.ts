import { useAccount } from "@/hooks/account/use-account";
import { fetchBalanceOf } from "@/lib/contract-interactions/erc-20/read/use-balance-of";
import { fetchDecimals } from "@/lib/contract-interactions/erc-20/read/use-decimals";
import { isNativeToken } from "@/lib/utils/token";
import { useQueries } from "@tanstack/react-query";
import type { Address } from "abitype";
import { isAddress, zeroAddress } from "viem";
import { useBalance } from "wagmi";
import type { AppChainId } from "@/wagmi/config.ts";

type Balance = {
  balance: bigint;
  decimals: number;
  token: Address;
};

export const useBalances = (assets: Address[], chainId: AppChainId) => {
  const account = useAccount();
  const ethBalance = useBalance({ address: account.address! });

  const balances = useQueries({
    queries: assets
      .filter(
        (tokenAddress) =>
          isAddress(tokenAddress) && !isNativeToken(tokenAddress),
      )
      .map((tokenAddress) => ({
        queryKey: ["token-balance", tokenAddress, account.address],
        queryFn: async () => {
          return {
            balance: await fetchBalanceOf(
              { address: tokenAddress, chainId },
              {
                account: account.address!,
              },
            ),
            decimals: await fetchDecimals({ address: tokenAddress, chainId }),
            token: tokenAddress,
          };
        },
        enabled: isAddress(tokenAddress),
      })),
    combine: (results) =>
      results.filter((r) => r.data != null).map((r) => r.data),
  });

  return [
    ...balances,
    {
      token: zeroAddress,
      balance: ethBalance.data?.value || 0n,
      decimals: 18,
    },
  ] satisfies Balance[];
};
