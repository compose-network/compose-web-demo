import { useCallback, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useUniswapV3PoolContractHooks } from "./hooks";
import { keepPreviousData } from "@tanstack/react-query";
import { isUndefined } from "lodash-es";

export type PoolDataFormatted = {
  price: string;
  token0Reserve: string;
  token1Reserve: string;
  fee: string;
};
export type PoolData = NonNullable<ReturnType<typeof usePoolData>['data']>;

type UsePoolDataParams = {
  contract?: `0x${string}`;
  chainId: number;
  enabled?: boolean;
};

export const usePoolData = ({
  contract,
  chainId,
  enabled = true,
}: UsePoolDataParams) => {
  const { useSlot0, useToken0, useToken1, useLiquidity, useFee } = useUniswapV3PoolContractHooks();

  const [random, setRandom] = useState(1n);
  const randomize = () => {
    setRandom(() => BigInt(100 + Math.floor(Math.random() * 20)));
  };

  const randomizeLiquidity = useCallback(
    (liquidity: bigint) => {
      if (random === 1n) return liquidity;
      return (liquidity * random) / 100n;
    },
    [random],
  );

  const slot0 = useSlot0({
    chainId,
    contract,
    enabled: enabled && !!contract,
    placeholderData: keepPreviousData,
  });

  const token0 = useToken0({
    chainId,
    contract,
    enabled: enabled && !!contract,
    placeholderData: keepPreviousData,
  });
  const token1 = useToken1({
    chainId,
    contract,
    enabled: enabled && !!contract,
    placeholderData: keepPreviousData,
  });

  const liquidity = useLiquidity({
    chainId,
    contract,
    enabled: enabled && !!contract,
    placeholderData: keepPreviousData,
  });

  const fee = useFee({
    chainId,
    contract,
    enabled: enabled && !!contract,
    placeholderData: keepPreviousData,
  });

  //   console.log(chainId, "slot0.status", slot0.status, slot0.error);
  //   console.log(chainId, "liquidity.status", liquidity.status, liquidity.error);
  //   console.log(chainId, "fee.status", fee.status, fee.error);

  const data = useMemo(() => {
    const sqrtPriceX96 = slot0.data?.[0];
    const liquidityData = liquidity.data;
    const feeData = fee.data;

    if (isUndefined(sqrtPriceX96) || isUndefined(liquidityData)) return null;

    const Q96 = 2n ** 96n;

    // Virtual reserves in Uniswap V3:
    // token0Reserve = liquidity * 2^96 / sqrtPriceX96
    // token1Reserve = liquidity * sqrtPriceX96 / 2^96
    const token0Reserve = (liquidityData * Q96) / sqrtPriceX96;
    const token1Reserve = randomizeLiquidity(
      (liquidityData * sqrtPriceX96) / Q96,
    );

    // Price = token1 / token0 (raw bigint)
    // To avoid losing precision, we multiply by 10^18 before dividing
    const price =
      token0Reserve > 0n ? (token1Reserve * 10n ** 18n) / token0Reserve : 0n;

    const feeValue = feeData !== undefined ? feeData : 0;

    // Formatted values (human readable, assuming 18 decimals for tokens)
    const token0Human = Number(formatUnits(token0Reserve, 18));
    const token1Human = Number(formatUnits(token1Reserve, 18));
    const priceHuman = token0Human > 0 ? token1Human / token0Human : 0;

    return {
      price,
      token0Reserve,
      token1Reserve,
      fee: feeValue,
      chainId,
      formatted: {
        price: priceHuman.toFixed(6),
        token0Reserve: formatUnits(token0Reserve, 18),
        token1Reserve: formatUnits(token1Reserve, 18),
        fee: `${feeValue / 10000}%`,
      },
    };
  }, [slot0.data, liquidity.data, fee.data, randomizeLiquidity, chainId]);

  return {
    chainId,
    data,
    isLoading: slot0.isLoading || liquidity.isLoading || fee.isLoading,
    isError: slot0.isError || liquidity.isError || fee.isError,
    randomize,
    liquidity,
    fee,
    slot0,
    token0,
    token1,
  };
};
