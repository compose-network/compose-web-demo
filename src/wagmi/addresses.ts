export const ENTRYPOINT_V0_7 =
  "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

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
  77777: { BRIDGE: "0x920e081762018D9a10e3248fC46f23702d1AEF61" as const },
  88888: { BRIDGE: "0x5b0a10821EE37e84714898d5418f650d8d802c71" as const },
} as const;

export const BRIDGE_TOKEN =
  "0x2a72a18AB5293C7D436153EdD3F8c5b8FEBBA4F3" as const;
