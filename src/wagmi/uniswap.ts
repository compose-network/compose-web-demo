import { rollupA, rollupB } from "@/wagmi/config";
import type { Address } from "viem";

export const UNISWAP_V3 = {
  [rollupA.id]: {
    // Pool addresses
    SSV_USDC: import.meta.env.VITE_ROLLUP_A_UNISWAP_SSV_USDC as Address,
    WETH_SSV: import.meta.env.VITE_ROLLUP_A_UNISWAP_WETH_SSV as Address,
    WETH_USDC: import.meta.env.VITE_ROLLUP_A_UNISWAP_WETH_USDC as Address,
    WETH_LINK: import.meta.env.VITE_ROLLUP_A_UNISWAP_WETH_LINK as Address,
    LINK_USDC: import.meta.env.VITE_ROLLUP_A_UNISWAP_LINK_USDC as Address,
    SSV_LINK: import.meta.env.VITE_ROLLUP_A_UNISWAP_SSV_LINK as Address,
    // V3 Contract addresses
    V3_CORE_FACTORY_ADDRESS: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_V3_CORE_FACTORY_ADDRESS as Address,
    MULTICALL2_ADDRESS: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_MULTICALL2_ADDRESS as Address,
    PROXY_ADMIN_ADDRESS: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_PROXY_ADMIN_ADDRESS as Address,
    TICK_LENS_ADDRESS: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_TICK_LENS_ADDRESS as Address,
    NFT_DESCRIPTOR_LIBRARY_ADDRESS_V1_3_0: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_NFT_DESCRIPTOR_LIBRARY_ADDRESS_V1_3_0 as Address,
    NONFUNGIBLE_TOKEN_POSITION_DESCRIPTOR_ADDRESS_V1_3_0: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_NONFUNGIBLE_TOKEN_POSITION_DESCRIPTOR_ADDRESS_V1_3_0 as Address,
    DESCRIPTOR_PROXY_ADDRESS: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_DESCRIPTOR_PROXY_ADDRESS as Address,
    NONFUNGIBLE_TOKEN_POSITION_MANAGER_ADDRESS: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_NONFUNGIBLE_TOKEN_POSITION_MANAGER_ADDRESS as Address,
    V3_MIGRATOR_ADDRESS: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_V3_MIGRATOR_ADDRESS as Address,
    V3_STAKER_ADDRESS: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_V3_STAKER_ADDRESS as Address,
    QUOTER_V2_ADDRESS: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_QUOTER_V2_ADDRESS as Address,
    SWAP_ROUTER02: import.meta.env
      .VITE_ROLLUP_A_UNISWAP_SWAP_ROUTER02 as Address,
  },
  [rollupB.id]: {
    // Pool addresses
    SSV_USDC: import.meta.env.VITE_ROLLUP_B_UNISWAP_SSV_USDC as Address,
    WETH_SSV: import.meta.env.VITE_ROLLUP_B_UNISWAP_WETH_SSV as Address,
    WETH_USDC: import.meta.env.VITE_ROLLUP_B_UNISWAP_WETH_USDC as Address,
    DAI_WETH: import.meta.env.VITE_ROLLUP_B_UNISWAP_DAI_WETH as Address,
    DAI_USDC: import.meta.env.VITE_ROLLUP_B_UNISWAP_DAI_USDC as Address,
    DAI_SSV: import.meta.env.VITE_ROLLUP_B_UNISWAP_DAI_SSV as Address,
    // V3 Contract addresses
    V3_CORE_FACTORY_ADDRESS: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_V3_CORE_FACTORY_ADDRESS as Address,
    MULTICALL2_ADDRESS: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_MULTICALL2_ADDRESS as Address,
    PROXY_ADMIN_ADDRESS: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_PROXY_ADMIN_ADDRESS as Address,
    TICK_LENS_ADDRESS: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_TICK_LENS_ADDRESS as Address,
    NFT_DESCRIPTOR_LIBRARY_ADDRESS_V1_3_0: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_NFT_DESCRIPTOR_LIBRARY_ADDRESS_V1_3_0 as Address,
    NONFUNGIBLE_TOKEN_POSITION_DESCRIPTOR_ADDRESS_V1_3_0: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_NONFUNGIBLE_TOKEN_POSITION_DESCRIPTOR_ADDRESS_V1_3_0 as Address,
    DESCRIPTOR_PROXY_ADDRESS: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_DESCRIPTOR_PROXY_ADDRESS as Address,
    NONFUNGIBLE_TOKEN_POSITION_MANAGER_ADDRESS: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_NONFUNGIBLE_TOKEN_POSITION_MANAGER_ADDRESS as Address,
    V3_MIGRATOR_ADDRESS: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_V3_MIGRATOR_ADDRESS as Address,
    V3_STAKER_ADDRESS: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_V3_STAKER_ADDRESS as Address,
    QUOTER_V2_ADDRESS: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_QUOTER_V2_ADDRESS as Address,
    SWAP_ROUTER02: import.meta.env
      .VITE_ROLLUP_B_UNISWAP_SWAP_ROUTER02 as Address,
  },
} as const;
