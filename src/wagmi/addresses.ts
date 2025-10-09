// export const ENTRYPOINT_V0_8 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
export const ENTRYPOINT_V0_8 = "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108";

// Latest block from zerodev-examples/.env (authoritative)
export const ROLLUP_ADDRESSES = {
  77777: {
    KERNEL_IMPL: "0x1ff48513f8722113ab840fdfd1866957d08bd5d2" as const,
    KERNEL_FACTORY: "0xcfb519af7e3e4b772c619ed12bcdc7d758ac6ee6" as const,
    MULTICHAIN_VALIDATOR: "0x5e729b0d9d35fa3bd7ace526437151ec9e1d5929" as const,
    META_FACTORY: "0x54db674c515e5fdec3f91345bc2fdafafd8b3b8a" as const,
  },
  88888: {
    KERNEL_IMPL: "0x1ff48513f8722113ab840fdfd1866957d08bd5d2" as const,
    KERNEL_FACTORY: "0xcfb519af7e3e4b772c619ed12bcdc7d758ac6ee6" as const,
    MULTICHAIN_VALIDATOR: "0x5e729b0d9d35fa3bd7ace526437151ec9e1d5929" as const,
    META_FACTORY: "0x54db674c515e5fdec3f91345bc2fdafafd8b3b8a" as const,
  },
} as const;

// Bridge contracts (from prototype)
export const BRIDGE_ADDRESSES = {
  77777: { BRIDGE: "0x31c57E2910496e46Bb883EDeb1eB2bee8E3Ee82C" as const },
  88888: { BRIDGE: "0x31c57E2910496e46Bb883EDeb1eB2bee8E3Ee82C" as const },
} as const;

export const getBridgeAddress = (chainId: keyof typeof BRIDGE_ADDRESSES) => {
  return BRIDGE_ADDRESSES[chainId]?.BRIDGE;
};

export const BRIDGE_TOKEN =
  "0x4c77De11C15d8b5e2584e67e2E6E1Ec7A78B0b5b" as const;
