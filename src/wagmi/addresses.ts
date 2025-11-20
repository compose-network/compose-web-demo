import { rollupA, rollupB } from "@/wagmi/config";
import { getEntryPoint } from "@zerodev/sdk/constants";
import type { Address } from "viem";
import { parseContractAddress } from "./rpc-env";

export * from "./uniswap";
export const ENTRYPOINT_WITH_VERSION = getEntryPoint("0.7");
export const ENTRYPOINT_ADDRESS = ENTRYPOINT_WITH_VERSION.address;

type RollupContracts = {
  KERNEL_IMPL: Address;
  KERNEL_FACTORY: Address;
  MULTICHAIN_VALIDATOR: Address;
  META_FACTORY: Address;
};

const DEFAULT_ROLLUP_A_CONTRACTS = {
  KERNEL_IMPL: "0x1ff48513f8722113ab840fdfd1866957d08bd5d2",
  KERNEL_FACTORY: "0xcfb519af7e3e4b772c619ed12bcdc7d758ac6ee6",
  MULTICHAIN_VALIDATOR: "0x5e729b0d9d35fa3bd7ace526437151ec9e1d5929",
  META_FACTORY: "0x54db674c515e5fdec3f91345bc2fdafafd8b3b8a",
} as const satisfies RollupContracts;

const DEFAULT_ROLLUP_B_CONTRACTS = {
  KERNEL_IMPL: "0x1ff48513f8722113ab840fdfd1866957d08bd5d2",
  KERNEL_FACTORY: "0xcfb519af7e3e4b772c619ed12bcdc7d758ac6ee6",
  MULTICHAIN_VALIDATOR: "0x5e729b0d9d35fa3bd7ace526437151ec9e1d5929",
  META_FACTORY: "0x54db674c515e5fdec3f91345bc2fdafafd8b3b8a",
} as const satisfies RollupContracts;

const rollupAContracts: RollupContracts = {
  KERNEL_IMPL: parseContractAddress(
    "VITE_ROLLUP_A_KERNEL_IMPL",
    DEFAULT_ROLLUP_A_CONTRACTS.KERNEL_IMPL,
  ),
  KERNEL_FACTORY: parseContractAddress(
    "VITE_ROLLUP_A_KERNEL_FACTORY",
    DEFAULT_ROLLUP_A_CONTRACTS.KERNEL_FACTORY,
  ),
  MULTICHAIN_VALIDATOR: parseContractAddress(
    "VITE_ROLLUP_A_MULTICHAIN_VALIDATOR",
    DEFAULT_ROLLUP_A_CONTRACTS.MULTICHAIN_VALIDATOR,
  ),
  META_FACTORY: parseContractAddress(
    "VITE_ROLLUP_A_META_FACTORY",
    DEFAULT_ROLLUP_A_CONTRACTS.META_FACTORY,
  ),
};

const rollupBContracts: RollupContracts = {
  KERNEL_IMPL: parseContractAddress(
    "VITE_ROLLUP_B_KERNEL_IMPL",
    DEFAULT_ROLLUP_B_CONTRACTS.KERNEL_IMPL,
  ),
  KERNEL_FACTORY: parseContractAddress(
    "VITE_ROLLUP_B_KERNEL_FACTORY",
    DEFAULT_ROLLUP_B_CONTRACTS.KERNEL_FACTORY,
  ),
  MULTICHAIN_VALIDATOR: parseContractAddress(
    "VITE_ROLLUP_B_MULTICHAIN_VALIDATOR",
    DEFAULT_ROLLUP_B_CONTRACTS.MULTICHAIN_VALIDATOR,
  ),
  META_FACTORY: parseContractAddress(
    "VITE_ROLLUP_B_META_FACTORY",
    DEFAULT_ROLLUP_B_CONTRACTS.META_FACTORY,
  ),
};

export const ROLLUP_ADDRESSES = {
  [rollupA.id]: rollupAContracts,
  [rollupB.id]: rollupBContracts,
} as const;

const DEFAULT_ROLLUP_A_BRIDGE_ADDRESS =
  "0x31c57E2910496e46Bb883EDeb1eB2bee8E3Ee82C";
const DEFAULT_ROLLUP_B_BRIDGE_ADDRESS =
  "0x31c57E2910496e46Bb883EDeb1eB2bee8E3Ee82C";

const rollupABridge = parseContractAddress(
  "VITE_ROLLUP_A_BRIDGE_ADDRESS",
  DEFAULT_ROLLUP_A_BRIDGE_ADDRESS,
);
const rollupBBridge = parseContractAddress(
  "VITE_ROLLUP_B_BRIDGE_ADDRESS",
  DEFAULT_ROLLUP_B_BRIDGE_ADDRESS,
);

export const BRIDGE_ADDRESSES = {
  [rollupA.id]: { BRIDGE: rollupABridge },
  [rollupB.id]: { BRIDGE: rollupBBridge },
} as const;

export const getBridgeAddress = (chainId: keyof typeof BRIDGE_ADDRESSES) => {
  return BRIDGE_ADDRESSES[chainId]?.BRIDGE;
};

const DEFAULT_BRIDGE_TOKEN_ADDRESS =
  "0x4c77De11C15d8b5e2584e67e2E6E1Ec7A78B0b5b";
export const BRIDGE_TOKEN = parseContractAddress(
  "VITE_BRIDGE_TOKEN_ADDRESS",
  DEFAULT_BRIDGE_TOKEN_ADDRESS,
);

const DEFAULT_WETH_ADDRESS = "0x356dA0CBA100a69B3FD3F2Ce4871B7e3921E7553";
export const WETH_ADDRESS: Address = parseContractAddress(
  "VITE_WETH_ADDRESS",
  DEFAULT_WETH_ADDRESS,
);

const DEFAULT_USDC_ADDRESS = "0xeA0DB94b4c702d9cA0Fcc65715A035B24dF3452D";
export const USDC_ADDRESS: Address = parseContractAddress(
  "VITE_USDC_ADDRESS",
  DEFAULT_USDC_ADDRESS,
);

const DEFAULT_SSV_ADDRESS = "0x79155fb8d8dE01522bE1Cbd17e538966d78d1565";
export const SSV_ADDRESS: Address = parseContractAddress(
  "VITE_SSV_ADDRESS",
  DEFAULT_SSV_ADDRESS,
);


