import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  walletConnectWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";
import type { Transport } from "@wagmi/core";

import type { Chain } from "viem";
import { defineChain, fallback, http } from "viem";
import { mainnet as mainnetChain, polygon as polygonChain } from "viem/chains";
import { createConfig } from "wagmi";

import { parseChainId, resolveRpcUrls, type RpcDescriptor } from "./rpc-env";

const RPC_DESCRIPTORS = {
  hoodi: {
    envKey: "VITE_HOODI_RPC_HTTP",
    defaults: [
      "https://ethereum-hoodi-rpc.publicnode.com/d8a2cc6e7483872e917d7899f9403d738b001c80e37d66834f4e40e9efb54a27",
    ] as const,
  },
  rollupA: {
    envKey: "VITE_ROLLUP_A_RPC_HTTP",
    defaults: ["https://rollup-rpc-1.stage.ops.ssvlabsinternal.com"] as const,
  },
  rollupB: {
    envKey: "VITE_ROLLUP_B_RPC_HTTP",
    defaults: ["https://rollup-rpc-2.stage.ops.ssvlabsinternal.com"] as const,
  },
  polygon: {
    envKey: "VITE_POLYGON_RPC_HTTP",
    defaults: ["https://polygon-rpc.com"] as const,
  },
  mainnet: {
    envKey: "VITE_MAINNET_RPC_HTTP",
    defaults: ["https://eth.llamarpc.com"] as const,
  },
} as const satisfies Record<string, RpcDescriptor>;

const rpcHttp = resolveRpcUrls(RPC_DESCRIPTORS);
const hoodiChainId = parseChainId("VITE_HOODI_CHAIN_ID", 560048);
const rollupAChainId = parseChainId("VITE_ROLLUP_A_CHAIN_ID", 77777);
const rollupBChainId = parseChainId("VITE_ROLLUP_B_CHAIN_ID", 88888);

const createTransportForUrls = (urls: string[]): Transport => {
  const uniqueUrls = Array.from(new Set(urls));
  if (!uniqueUrls.length) {
    throw new Error("[wagmi-config] Missing RPC URLs for transport creation.");
  }

  return uniqueUrls.length === 1
    ? http(uniqueUrls[0])
    : fallback(uniqueUrls.map((url) => http(url)));
};

export const hoodi = defineChain({
  id: hoodiChainId,
  name: "Hoodi",
  network: "hoodi",
  nativeCurrency: {
    name: "Hoodi",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: rpcHttp.hoodi,
    },
  },
  iconBackground: "none",
  iconUrl: "/images/networks/light.svg",
  testnet: true,
});
export const rollupA = defineChain({
  id: rollupAChainId,
  name: "Rollup A",
  nativeCurrency: {
    name: "Rollup A",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: rpcHttp.rollupA,
    },
  },
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
  id: rollupBChainId,
  name: "Rollup B",
  nativeCurrency: {
    name: "Rollup B",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: rpcHttp.rollupB,
    },
  },
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
      http: rpcHttp.polygon,
    },
  },
};

export const mainnet = {
  ...mainnetChain,
  rpcUrls: {
    default: {
      http: rpcHttp.mainnet,
    },
  },
};

type ChainRpcKey = keyof typeof RPC_DESCRIPTORS;
const chainRpcKeyById = new Map<number, ChainRpcKey>([
  [hoodi.id, "hoodi"],
  [rollupA.id, "rollupA"],
  [rollupB.id, "rollupB"],
  [polygon.id, "polygon"],
  [mainnet.id, "mainnet"],
]);

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

export const bridgeContracts = {
  [hoodi.id]: {
    [rollupA.id]: {
      bridge: "0xe6456c49bae7ff20bee0d01948d6d0f82dd821e9",
    },
    [rollupB.id]: {
      bridge: "0x9adb5dba4f55d7ea921f34e98dc492b3a2ced734",
    },
  },
} as const;

export type RollupChainId = typeof rollupA.id | typeof rollupB.id;
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
      const rpcKey = chainRpcKeyById.get(chain.id);
      if (!rpcKey) {
        throw new Error(
          `[wagmi-config] Missing RPC descriptor mapping for chain ${chain.id}`,
        );
      }

      acc[chain.id] = createTransportForUrls(rpcHttp[rpcKey]);
      return acc;
    },
    {} as Record<number, Transport>,
  ),
});
