import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import type { Transport } from "@wagmi/core";

import type { Chain } from "viem";
import type { Address } from "viem";
import { defineChain, fallback, http } from "viem";
import {
  mainnet as mainnetChain,
  polygon as polygonChain,
  base,
  arbitrum,
  optimism,
} from "viem/chains";
import { createConfig } from "wagmi";

import {
  parseBlockExplorerUrl,
  parseChainId,
  parseContractAddress,
  resolveRpcUrls,
  type RpcDescriptor,
} from "./rpc-env";

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
  base: {
    envKey: "VITE_BASE_RPC_HTTP",
    defaults: ["https://mainnet.base.org"] as const,
  },
  arbitrum: {
    envKey: "VITE_ARBITRUM_RPC_HTTP",
    defaults: ["https://arb1.arbitrum.io/rpc"] as const,
  },
  optimism: {
    envKey: "VITE_OPTIMISM_RPC_HTTP",
    defaults: ["https://mainnet.optimism.io"] as const,
  },
} as const satisfies Record<string, RpcDescriptor>;

const rpcHttp = resolveRpcUrls(RPC_DESCRIPTORS);
const hoodiChainId = parseChainId("VITE_HOODI_CHAIN_ID", 560048);
const rollupAChainId = parseChainId("VITE_ROLLUP_A_CHAIN_ID", 77777);
const rollupBChainId = parseChainId("VITE_ROLLUP_B_CHAIN_ID", 88888);
const rollupABlockExplorerUrl = parseBlockExplorerUrl(
  "VITE_ROLLUP_A_BLOCK_EXPLORER_URL",
  "https://blockscout-rollup-1.stage.ops.ssvlabsinternal.com/",
);
const rollupBBlockExplorerUrl = parseBlockExplorerUrl(
  "VITE_ROLLUP_B_BLOCK_EXPLORER_URL",
  "https://blockscout-rollup-2.stage.ops.ssvlabsinternal.com/",
);

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
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://hoodi.etherscan.io",
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
    name: "Ethereum",
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
      url: rollupABlockExplorerUrl,
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
    name: "Ethereum",
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
      url: rollupBBlockExplorerUrl,
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

export const baseChain = {
  ...base,
  rpcUrls: {
    default: {
      http: rpcHttp.base,
    },
  },
};

export const arbitrumChain = {
  ...arbitrum,
  rpcUrls: {
    default: {
      http: rpcHttp.arbitrum,
    },
  },
};

export const optimismChain = {
  ...optimism,
  rpcUrls: {
    default: {
      http: rpcHttp.optimism,
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
  [baseChain.id, "base"],
  [arbitrumChain.id, "arbitrum"],
  [optimismChain.id, "optimism"],
]);

// Chains array
export const chains = [
  rollupA,
  rollupB,
  mainnet,
  polygon,
  hoodi,
  baseChain,
  arbitrumChain,
  optimismChain,
] satisfies [Chain, ...Chain[]];
export const chainsMap = {
  [rollupA.id]: rollupA,
  [rollupB.id]: rollupB,
  [mainnet.id]: mainnet,
  [polygon.id]: polygon,
  [hoodi.id]: hoodi,
  [baseChain.id]: baseChain,
  [arbitrumChain.id]: arbitrumChain,
  [optimismChain.id]: optimismChain,
};

export const getChainById = (chainId: number) => {
  return chainsMap[chainId as keyof typeof chainsMap];
};

export const getExplorerHashUrl = (chainId: number, hash: string) => {
  const chain = getChainById(chainId);
  if (!chain) return "";
  return new URL(`tx/${hash}`, chain.blockExplorers?.default?.url).toString();
};

export const rollupIdMap = {
  [rollupA.id]: 1,
  [rollupB.id]: 2,
} as const;

const DEFAULT_HOODI_BRIDGE_ADDRESS =
  "0x119b79f1bd3ef2e9e386bf52ca344d6aa3075c93" as Address;
const DEFAULT_HOODI_TO_ROLLUP_B_BRIDGE_ADDRESS =
  "0xc4e5387bb31dee941db6e7d93d7ffb5b3dfe4627" as Address;

const hoodiBridgeAddress = parseContractAddress(
  "VITE_HOODI_BRIDGE_ADDRESS",
  DEFAULT_HOODI_BRIDGE_ADDRESS,
);
const hoodiToRollupABridgeAddress = parseContractAddress(
  "VITE_BRIDGE_HOODI_TO_ROLLUP_A",
  hoodiBridgeAddress,
);
const hoodiToRollupBBridgeAddress = parseContractAddress(
  "VITE_BRIDGE_HOODI_TO_ROLLUP_B",
  DEFAULT_HOODI_TO_ROLLUP_B_BRIDGE_ADDRESS,
);

export const contracts = {
  [rollupB.id]: {
    swap: "0x70f2e907bf467E28A96A2e314B5200c2B144b76c",
  },
  [hoodi.id]: {
    bridge: hoodiBridgeAddress,
  },
} as const;

export const rollupBSwapContract = "0x70f2e907bf467E28A96A2e314B5200c2B144b76c";

export const bridgeContracts = {
  [hoodi.id]: {
    [rollupA.id]: {
      bridge: hoodiToRollupABridgeAddress,
    },
    [rollupB.id]: {
      bridge: hoodiToRollupBBridgeAddress,
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
