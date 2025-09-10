import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  walletConnectWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";
import type { Transport } from "@wagmi/core";

import type { Chain } from "viem";
import { defineChain, http } from "viem";
import { mainnet as mainnetChain, polygon as polygonChain } from "viem/chains";
import { createConfig } from "wagmi";

// Chain IDs
export const ROLLUP_B_CHAIN_ID = 88888;
export const ETHEREUM_MAINNET_CHAIN_ID = 1;
export const POLYGON_CHAIN_ID = 137;

// Individual chain definitions
export const rollupB = defineChain({
  id: ROLLUP_B_CHAIN_ID,
  name: "Rollup B",
  nativeCurrency: {
    name: "Rollup B",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://57.129.73.144:31133/"],
    },
  },
  iconBackground: "none",
  iconUrl: "/images/networks/light.svg",
});

export const polygon = {
  ...polygonChain,
  rpcUrls: {
    default: {
      http: ["https://polygon-rpc.com"],
    },
  },
};

export const mainnet = {
  ...mainnetChain,
  rpcUrls: {
    default: {
      http: ["https://eth.llamarpc.com"],
    },
  },
};

// Chains array
export const chains = [rollupB, mainnet, polygon] as [Chain, ...Chain[]];
export const isChainSupported = (chainId: number) => {
  return chains.some((chain) => chain.id === chainId);
};

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [walletConnectWallet, coinbaseWallet],
    },
  ],
  {
    appName: "SSV Web App",
    projectId: "c93804911b583e5cacf856eee58655e6",
  },
);

export const config = createConfig({
  chains,
  connectors: connectors,
  transports: chains.reduce(
    (acc, chain) => {
      acc[chain.id] = http(chain.rpcUrls.default.http[0]);
      return acc;
    },
    {} as Record<number, Transport>,
  ),
});
