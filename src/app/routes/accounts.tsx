import type { FC } from "react";
import { useSmartAccount } from "@/lib/smart-account/kernel";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { AddressDisplay } from "@/components/ui/address";
import { formatCurrency } from "@/lib/utils/number";
import { rollupA, rollupB } from "@/wagmi/config";
import { tokens } from "@/wagmi/tokens";
import type { Address } from "viem";
import { parseEther, zeroAddress } from "viem";
import { Spinner } from "@/components/ui/spinner";
import { useReadContracts, useSwitchChain } from "wagmi";
import { TokenABI } from "@/lib/abi/token";
import { Button } from "@/components/ui/button";

const TokenBalanceRow: FC<{
  label: string;
  balance?: bigint;
  decimals?: number;
}> = ({ label, balance, decimals = 18 }) => (
  <div className="flex justify-between items-center py-2">
    <Text variant="body-3-medium" className="text-gray-600">
      {label}
    </Text>
    <Text variant="body-2-semibold" className="text-gray-900">
      {formatCurrency(balance ?? 0n, decimals)}
    </Text>
  </div>
);

const KernelAccountCard: FC<{
  title: string;
  chainName: string;
  address?: Address;
  ethBalance?: bigint;
  gasBalance?: bigint;
  tokenBalances: Array<{
    symbol: string;
    balance?: bigint;
    decimals: number;
  }>;
  isLoading?: boolean;
  onAddGas?: () => void;
  isAddingGas?: boolean;
}> = ({
  title,
  chainName,
  address,
  ethBalance,
  gasBalance,
  tokenBalances,
  isLoading,
  onAddGas,
  isAddingGas,
}) => (
  <Card className="bg-white border border-gray-300 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <Text variant="headline3" className="text-gray-900">
        {title}
      </Text>
      <Text variant="body-2-medium" className="text-gray-500">
        {chainName}
      </Text>
    </div>

    {isLoading ? (
      <div className="flex justify-center items-center py-8">
        <Spinner size="lg" />
      </div>
    ) : (
      <>
        {address && address !== zeroAddress ? (
          <>
            <div className="mb-4">
              <Text variant="body-3-medium" className="text-gray-600 mb-2">
                Account Address
              </Text>
              <AddressDisplay address={address} copyable className="text-sm" />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <Text variant="body-2-semibold" className="text-gray-900 mb-3">
                Balances
              </Text>

              <TokenBalanceRow
                label="ETH Balance"
                balance={ethBalance}
                decimals={18}
              />

              <div className="flex justify-between items-center py-2">
                <div>
                  <Text variant="body-3-medium" className="text-gray-600">
                    Gas Balance (Entrypoint)
                  </Text>
                  <Text variant="body-2-semibold" className="text-gray-900">
                    {formatCurrency(gasBalance ?? 0n, 18)}
                  </Text>
                </div>
                {onAddGas && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddGas}
                    disabled={isAddingGas}
                    isLoading={isAddingGas}
                  >
                    Add 0.1 Gas
                  </Button>
                )}
              </div>

              <div className="border-t border-gray-200 mt-3 pt-3">
                <Text
                  variant="body-3-medium"
                  className="text-gray-600 mb-2 uppercase tracking-wide"
                >
                  Token Balances
                </Text>
                {tokenBalances.map((token) => (
                  <TokenBalanceRow
                    key={token.symbol}
                    label={token.symbol}
                    balance={token.balance}
                    decimals={token.decimals}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center py-8">
            <Text variant="body-2-medium" className="text-gray-500">
              Connect wallet to view account
            </Text>
          </div>
        )}
      </>
    )}
  </Card>
);

export const Accounts: FC = () => {
  const kernel = useSmartAccount();
  const { switchChainAsync } = useSwitchChain();

  const rollupTokens = tokens || [];

  // Fetch token balances for Kernel A (on RollupA)
  const kernelATokenBalancesQuery = useReadContracts({
    contracts: rollupTokens.map((token) => ({
      address: token.address,
      abi: TokenABI,
      functionName: "balanceOf",
      args: [kernel.kernel.data?.accounts?.A?.address || zeroAddress],
      chainId: rollupA.id,
    })),
    query: {
      enabled: !!kernel.kernel.data?.accounts?.A?.address,
    },
  });

  // Fetch token balances for Kernel B (on RollupB)
  const kernelBTokenBalancesQuery = useReadContracts({
    contracts: rollupTokens.map((token) => ({
      address: token.address,
      abi: TokenABI,
      functionName: "balanceOf",
      args: [kernel.kernel.data?.accounts?.B?.address || zeroAddress],
      chainId: rollupB.id,
    })),
    query: {
      enabled: !!kernel.kernel.data?.accounts?.B?.address,
    },
  });

  // Map the results to the expected format
  const kernelATokenBalances = rollupTokens.map((token, index) => ({
    symbol: token.symbol,
    balance: kernelATokenBalancesQuery.data?.[index]?.result as
      | bigint
      | undefined,
    decimals: token.decimals,
  }));

  const kernelBTokenBalances = rollupTokens.map((token, index) => ({
    symbol: token.symbol,
    balance: kernelBTokenBalancesQuery.data?.[index]?.result as
      | bigint
      | undefined,
    decimals: token.decimals,
  }));

  return (
    <>
      <div className="mb-6">
        <Text variant="headline2" className="text-gray-900 mb-2">
          Kernel Accounts
        </Text>
        <Text variant="body-2-medium" className="text-gray-600">
          View your smart contract accounts and their balances across different
          rollups
        </Text>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KernelAccountCard
          title="Kernel Account A"
          chainName="Rollup A"
          address={kernel.kernel.data?.accounts?.A?.address}
          ethBalance={kernel.balanceA.data?.value}
          gasBalance={kernel.gasBalanceA.data}
          tokenBalances={kernelATokenBalances}
          isLoading={kernel.kernel.isLoading}
          onAddGas={async () => {
            await switchChainAsync({ chainId: rollupA.id });
            await kernel.depositToA.write({
              account: kernel.kernel.data!.accounts.A.address,
              value: parseEther("0.1"),
            });
          }}
          isAddingGas={kernel.depositToA.isPending}
        />

        <KernelAccountCard
          title="Kernel Account B"
          chainName="Rollup B"
          address={kernel.kernel.data?.accounts?.B?.address}
          ethBalance={kernel.balanceB.data?.value}
          gasBalance={kernel.gasBalanceB.data}
          tokenBalances={kernelBTokenBalances}
          isLoading={kernel.kernel.isLoading}
          onAddGas={async () => {
            await switchChainAsync({ chainId: rollupB.id });
            await kernel.depositToB.write({
              account: kernel.kernel.data!.accounts.B.address,
              value: parseEther("0.1"),
            });
          }}
          isAddingGas={kernel.depositToB.isPending}
        />
      </div>
    </>
  );
};

Accounts.displayName = "Accounts";
