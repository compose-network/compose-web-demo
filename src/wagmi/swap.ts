import type { TokenPickerCommandDialogProps } from "@/components/swap/token-picker/token-picker-command-dialog.tsx";
import { BRIDGE_CONFIG } from "@/wagmi/bridge.ts";

export const SWAP_CONFIG: TokenPickerCommandDialogProps["chains"] =
  BRIDGE_CONFIG;
