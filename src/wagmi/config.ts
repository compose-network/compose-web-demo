import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  walletConnectWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";
import type { Transport } from "@wagmi/core";

import type { Address, Chain } from "viem";
import { defineChain, http } from "viem";
import { mainnet as mainnetChain, polygon as polygonChain } from "viem/chains";
import { createConfig } from "wagmi";

export const rollupA = defineChain({
  id: 77777,
  name: "Rollup A",
  nativeCurrency: {
    name: "Rollup A",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rollup-rpc-1.stage.ops.ssvlabsinternal.com"],
    },
  },
  iconBackground: "none",
  iconUrl: "/images/networks/light.svg",
});

export const rollupB = defineChain({
  id: 88888,
  name: "Rollup B",
  nativeCurrency: {
    name: "Rollup B",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rollup-rpc-2.stage.ops.ssvlabsinternal.com"],
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
export const chains = [rollupA, rollupB, mainnet, polygon] as [
  Chain,
  ...Chain[],
];
export const chainsMap = {
  [rollupA.id]: rollupA,
  [rollupB.id]: rollupB,
  [mainnet.id]: mainnet,
  [polygon.id]: polygon,
};

export const swapContract = {
  [rollupB.id]: "0x52cfc57b976936ba8d6beea547900c4425836bea",
} as Record<number, Address>;
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
