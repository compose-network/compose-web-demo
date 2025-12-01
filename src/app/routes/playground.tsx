import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/account/use-account";
import { usePoolData } from "@/lib/contract-interactions/uniswap-v3/hooks";
import { findOptimalLoan } from "@/lib/utils/arbitrage";
import { UNISWAP_V3 } from "@/wagmi/uniswap.ts";
import { rollupA, rollupB } from "@/wagmi/config";
import { useQuery } from "@tanstack/react-query";

import { type FC } from "react";
import { formatUnits } from "viem";

export const Playground: FC = () => {
  const { address: eoa, isConnected } = useAccount();

  const poolA = usePoolData({
    contract: UNISWAP_V3[rollupA.id]?.WETH_USDC,
    chainId: rollupA.id,
  });

  const poolB = usePoolData({
    contract: UNISWAP_V3[rollupB.id]?.WETH_USDC,
    chainId: rollupB.id,
  });

  const arbitrage = useQuery({
    queryKey: ["arbitrage", poolA.data, poolB.data],
    queryFn: () => {
      if (!poolA.data || !poolB.data) return null;
      return findOptimalLoan(poolA.data, poolB.data);
    },
    enabled: !!poolA.data && !!poolB.data,
  });

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-4">
      <div className="flex flex-col gap-4 items-center">
        <div className="text-lg font-semibold">Pool Reserves</div>
        <div className="flex gap-6">
          <div className="p-4 border rounded-lg min-w-[280px]">
            <div className="text-sm font-semibold text-gray-700 mb-3">
              Chain A (Rollup A)
            </div>
            {poolA.data ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Token0:</span>
                  <span className="font-mono font-semibold">
                    {poolA.data.formatted.token0Reserve}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Token1:</span>
                  <span className="font-mono font-semibold">
                    {poolA.data.formatted.token1Reserve}
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-mono font-bold text-blue-600">
                      {poolA.data.formatted.price}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Fee:</span>
                    <span className="font-mono font-semibold">
                      {poolA.data.formatted.fee}
                    </span>
                  </div>
                </div>
                <Button onClick={poolA.randomize}>Randomize Liquidity</Button>
              </div>
            ) : (
              <div className="text-gray-400">
                {poolA.isLoading
                  ? "Loading..."
                  : poolA.isError
                    ? "Error loading pool data"
                    : "No data"}
              </div>
            )}
          </div>
          <div className="p-4 border rounded-lg min-w-[280px]">
            <div className="text-sm font-semibold text-gray-700 mb-3">
              Chain B (Rollup B)
            </div>
            {poolB.data ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Token0:</span>
                  <span className="font-mono font-semibold">
                    {poolB.data.formatted.token0Reserve}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Token1:</span>
                  <span className="font-mono font-semibold">
                    {poolB.data.formatted.token1Reserve}
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-mono font-bold text-green-600">
                      {poolB.data.formatted.price}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Fee:</span>
                    <span className="font-mono font-semibold">
                      {poolB.data.formatted.fee}
                    </span>
                  </div>
                </div>
                <Button onClick={poolB.randomize}>Randomize Liquidity</Button>
              </div>
            ) : (
              <div className="text-gray-400">
                {poolB.isLoading
                  ? "Loading..."
                  : poolB.isError
                    ? "Error loading pool data"
                    : "No data"}
              </div>
            )}
          </div>
        </div>
      </div>
      {arbitrage.data && (
        <div className="p-4 border rounded-lg min-w-[400px] bg-gradient-to-r from-blue-50 to-green-50">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Arbitrage Opportunity
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Direction:</span>
              <span className="font-mono font-semibold">
                {arbitrage.data.direction === "AtoB" ? "A → B" : "B → A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Optimal Loan:</span>
              <span className="font-mono font-bold text-blue-600">
                {formatUnits(arbitrage.data.optimalLoanAmount, 18)} USDC
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Expected Profit:</span>
              <span
                className={`font-mono font-bold ${
                  arbitrage.data.profit > 0n ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatUnits(arbitrage.data.profit, 18)} USDC
              </span>
            </div>
          </div>
        </div>
      )}
      <Button disabled={!isConnected || !eoa}>Run Flash</Button>
      <ConnectWalletBtn className="max-w-[300px]" />
    </div>
  );
};

Playground.displayName = "Playground";
