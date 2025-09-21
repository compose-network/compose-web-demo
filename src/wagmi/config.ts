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

export const hoodi = defineChain({
  id: 560048,
  name: "Hoodi",
  network: "hoodi",
  nativeCurrency: {
    name: "Hoodi",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        "https://ethereum-hoodi-rpc.publicnode.com/d8a2cc6e7483872e917d7899f9403d738b001c80e37d66834f4e40e9efb54a27",
      ],
    },
  },
  iconBackground: "none",
  iconUrl: "/images/networks/light.svg",
  testnet: true,
});
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
      // http: ["http://57.129.73.156:31130"],
    },
  },
  // rpcUrls: {
  //   default: { http: ["http://57.129.73.156:31130"] },
  //   public: { http: ["http://57.129.73.156:31130"] },
  // },
  blockExplorers: {
    default: {
      name: "Rollup A",
      url: "https://blockscout-rollup-1.stage.ops.ssvlabsinternal.com/",
    },
  },
  iconBackground: "none",
  iconUrl: "/images/networks/light.svg",
  testnet: true,
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
      // http: ["http://57.129.73.144:31133"],
    },
  },
  // rpcUrls: {
  //   default: { http: ["http://57.129.73.144:31133"] },
  //   public: { http: ["http://57.129.73.144:31133"] },
  // },
  blockExplorers: {
    default: {
      name: "Rollup B",
      url: "https://blockscout-rollup-2.stage.ops.ssvlabsinternal.com/",
    },
  },
  iconBackground: "none",
  iconUrl: "/images/networks/light.svg",
  testnet: true,
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
export const chains = [rollupA, rollupB, mainnet, polygon, hoodi] satisfies [
  Chain,
  ...Chain[],
];
export const chainsMap = {
  [rollupA.id]: rollupA,
  [rollupB.id]: rollupB,
  [mainnet.id]: mainnet,
  [polygon.id]: polygon,
  [hoodi.id]: hoodi,
};

export const getChainById = (chainId: number) => {
  return chainsMap[chainId as keyof typeof chainsMap];
};

export const rollupIdMap = {
  [rollupA.id]: 1,
  [rollupB.id]: 2,
} as const;

export const contracts = {
  [rollupB.id]: {
    swap: "0x52cfc57b976936ba8d6beea547900c4425836bea",
  },
  [hoodi.id]: {
    bridge: "0x9adb5dba4f55d7ea921f34e98dc492b3a2ced734",
  },
} as const;
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
  chains: [rollupA, rollupB, hoodi],
  connectors: connectors,
  transports: chains.reduce(
    (acc, chain) => {
      acc[chain.id] = http(chain.rpcUrls.default.http[0]);
      return acc;
    },
    {} as Record<number, Transport>,
  ),
});
