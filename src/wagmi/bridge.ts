import type { TokenPickerCommandDialogProps } from "@/components/swap/token-picker/token-picker-command-dialog.tsx";
import {
  arbitrumChain,
  baseChain,
  hoodi,
  optimismChain,
  rollupA,
  rollupB,
} from "@/wagmi/config.ts";
import { zeroAddress } from "viem";
import { SSV_ADDRESS, USDC_ADDRESS } from "@/wagmi/addresses.ts";

export const BRIDGE_CONFIG: TokenPickerCommandDialogProps["chains"] = [
  {
    chainId: hoodi.id,
    tokens: [zeroAddress],
  },
  {
    chainId: rollupA.id,
    tokens: [zeroAddress, USDC_ADDRESS, SSV_ADDRESS],
  },
  {
    chainId: rollupB.id,
    tokens: [zeroAddress, USDC_ADDRESS, SSV_ADDRESS],
  },
  { chainId: baseChain.id, isNotSupported: true },
  { chainId: arbitrumChain.id, isNotSupported: true },
  { chainId: optimismChain.id, isNotSupported: true },
] as const;
