import { useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import type { Address } from "viem";
import { readContract } from "@wagmi/core";
import { config } from "@/wagmi/config";
import { erc20Abi } from "viem";
import { getAssetLogoSrc } from "@/lib/utils/token";

export interface AddTokenToWalletParams {
  address: Address;
  chainId: number;
}

export const useAddTokenToWallet = () => {
  const addToken = useCallback(
    async ({ address, chainId }: AddTokenToWalletParams) => {
      try {
        // Check if we have access to the wallet
        if (!window.ethereum) {
          toast({
            title: "Wallet not found",
            description: "Please install a compatible wallet",
            variant: "destructive",
          });
          return false;
        }

        // Get token metadata using wagmi
        let symbol = "Unknown";
        let decimals = 18;
        let name = "Unknown Token";

        try {
          const [symbolResult, decimalsResult, nameResult] = await Promise.all([
            readContract(config, {
              address,
              abi: erc20Abi,
              functionName: "symbol",
              chainId,
            }),
            readContract(config, {
              address,
              abi: erc20Abi,
              functionName: "decimals",
              chainId,
            }),
            readContract(config, {
              address,
              abi: erc20Abi,
              functionName: "name",
              chainId,
            }),
          ]);

          symbol = symbolResult as string;
          decimals = decimalsResult as number;
          name = nameResult as string;
        } catch (error) {
          console.warn("Failed to fetch token metadata from contract:", error);
          toast({
            title: "Token info unavailable",
            description: "Could not fetch token information",
            variant: "destructive",
          });
          return false;
        }

        const image = getAssetLogoSrc(address);

        // Request to add token to wallet
        const wasAdded = await window.ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address,
              symbol,
              decimals,
              image,
            },
          },
        });

        if (wasAdded) {
          toast({
            title: "Token added",
            description: `${symbol} (${name}) has been added to your wallet`,
          });
          return true;
        } else {
          toast({
            title: "Token not added",
            description: "The token was not added to your wallet",
            variant: "destructive",
          });
          return false;
        }
      } catch (error) {
        console.error("Error adding token to wallet:", error);
        toast({
          title: "Error adding token",
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
          variant: "destructive",
        });
        return false;
      }
    },
    [],
  );

  return { addToken };
};

// Extend the Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}
