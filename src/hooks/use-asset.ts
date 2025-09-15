import { useAccount } from "@/hooks/account/use-account";
import { useBalanceOf } from "@/lib/contract-interactions/erc-20/read/use-balance-of";
import { useDecimals } from "@/lib/contract-interactions/erc-20/read/use-decimals";
import { useName } from "@/lib/contract-interactions/erc-20/read/use-name";
import { useSymbol } from "@/lib/contract-interactions/erc-20/read/use-symbol";
import { ms } from "@/lib/utils/number";
import { getNativeCurrency, isNativeToken } from "@/lib/utils/token";
import { useQueryClient } from "@tanstack/react-query";
import { useBalance } from "wagmi";

type UseAssetProps = {
  tokenAddress?: `0x${string}`;
  chainId: number;
};

export const useAsset = ({ tokenAddress, chainId }: UseAssetProps) => {
  const isNative = tokenAddress && isNativeToken(tokenAddress);
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const queryOptions = {
    staleTime: Infinity,
    enabled: !isNative && !!tokenAddress,
  };

  const { data: name = "Unknown" } = useName(
    { address: tokenAddress, chainId },
    queryOptions,
  );

  const { data: symbol = "" } = useSymbol(
    { address: tokenAddress, chainId },
    queryOptions,
  );

  const { data: decimals } = useDecimals(
    { address: tokenAddress, chainId },
    queryOptions,
  );

  const { data: balance = 0n, queryKey } = useBalanceOf(
    { address: tokenAddress, chainId },
    { account: address! },
    {
      enabled: !isNative && !!tokenAddress && !!address,
      staleTime: ms(1, "minutes"),
    },
  );

  const nativeBalance = useBalance({
    address: address!,
    chainId,
    query: {
      enabled: isNative,
    },
  });

  const nativeCurrency = getNativeCurrency(chainId);

  return {
    name: isNative ? nativeCurrency.name : name,
    symbol: isNative ? nativeCurrency.symbol : symbol,
    decimals,
    balance: isNative ? nativeBalance.data?.value : balance,
    isEthereum: isNative,
    refreshBalance: () => {
      queryClient.invalidateQueries({
        queryKey: nativeBalance.queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: queryKey,
      });
    },
  };
};
