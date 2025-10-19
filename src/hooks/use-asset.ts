import { useAccount } from "@/hooks/account/use-account";
import { TokenABI } from "@/lib/abi/token";
import { useDecimals } from "@/lib/contract-interactions/erc-20/read/use-decimals";
import { useName } from "@/lib/contract-interactions/erc-20/read/use-name";
import { useSymbol } from "@/lib/contract-interactions/erc-20/read/use-symbol";
import { getNativeCurrency, isNativeToken } from "@/lib/utils/token";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useBalance, useBlockNumber, useReadContract } from "wagmi";

type UseAssetProps = {
  tokenAddress?: `0x${string}`;
  chainId: number;
  watch?: boolean;
};

export const useAsset = ({ tokenAddress, chainId, watch }: UseAssetProps) => {
  const isNative = tokenAddress && isNativeToken(tokenAddress);
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const blockNumber = useBlockNumber({
    chainId,
    watch,
    query: {
      enabled: watch,
    },
  });

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

  const { data: balance = 0n, queryKey } = useReadContract({
    abi: TokenABI,
    address: tokenAddress,
    functionName: "balanceOf",
    chainId,
    args: [address!],
    scopeKey: watch ? blockNumber.data?.toString() : undefined,
    blockNumber: watch ? blockNumber.data : undefined,
    query: {
      enabled: !isNative && !!tokenAddress && !!address,
      placeholderData: keepPreviousData,
    },
  });
  // const { data: balance = 0n, queryKey } = useBalanceOf(
  //   { address: tokenAddress, chainId },
  //   { account: address! },
  //   {
  //     enabled: !isNative && !!tokenAddress && !!address,
  //     staleTime: ms(1, "minutes"),
  //   },
  // );

  const nativeBalance = useBalance({
    address: address!,
    chainId,
    scopeKey: watch ? blockNumber.data?.toString() : undefined,
    blockNumber: watch ? blockNumber.data : undefined,
    query: {
      enabled: isNative,
      placeholderData: keepPreviousData,
    },
  });

  const nativeCurrency = getNativeCurrency(chainId);

  return {
    name: isNative ? nativeCurrency.name : name,
    symbol: isNative ? nativeCurrency.symbol : symbol,
    decimals,
    balance: isNative ? nativeBalance.data?.value : balance,
    isEthereum: isNative,
    refreshBalance: async () => {
      await queryClient.invalidateQueries({
        queryKey: nativeBalance.queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKey,
      });
    },
  };
};
