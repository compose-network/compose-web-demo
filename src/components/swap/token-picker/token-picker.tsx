import { type ComponentPropsWithoutRef, type FC, useState } from "react";
import { cn } from "@/lib/utils/tw";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TokenPickerCommandDialogProps } from "@/components/swap/token-picker/token-picker-command-dialog";
import { TokenPickerCommandDialog } from "@/components/swap/token-picker/token-picker-command-dialog";
import { AssetLogo } from "@/components/ui/asset-logo";
import AssetName from "@/components/ui/asset-name";
import type { Address } from "abitype";
import type { AppChainId } from "@/wagmi/config.ts";

export type TokenPickerProps = {
  chainId: AppChainId;
  chains: TokenPickerCommandDialogProps["chains"];
  selectedToken: Address;
  onSelectToken: (token: Address) => void;
  onChainSelect: (chainId: AppChainId) => void;
  readOnly?: boolean;
  canPickToken?: boolean;
  disabledTokens?: Address[];
};

type TokenPickerFC = FC<
  Omit<ComponentPropsWithoutRef<"button">, keyof TokenPickerProps> &
    TokenPickerProps
>;

export const TokenPicker: TokenPickerFC = ({
  chainId,
  className,
  chains,
  selectedToken,
  onSelectToken,
  onChainSelect,
  readOnly,
  disabledTokens,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <TokenPickerCommandDialog
        chains={chains}
        open={isOpen}
        onOpenChange={setIsOpen}
        chainId={chainId}
        onTokenSelect={onSelectToken}
        onChainSelect={onChainSelect}
        disabledTokens={disabledTokens}
      />
      <div className="p-[1px] rounded-[12px] bg-gradient-to-r from-[#14B5C0]/60 via-[#2ABEC9]/60 via-[#24B979]/60 to-[#F29422]/60 to-[#E68713]/60">
        <Button
          onClick={() => {
            if (readOnly) return;
            setIsOpen(true);
          }}
          variant="ghost"
          className={cn(
            "p-4 pr-6 pl-4 rounded-[12px] bg-gray-50 flex gap-3 items-center min-w-[188px] h-auto",
            { "pointer-events-none": readOnly },
            className,
          )}
          {...props}
        >
          <div className="flex gap-3 items-center flex-1">
            <AssetLogo
              tokenAddress={selectedToken}
              chainId={chainId}
              className="size-10"
            />
            <AssetName
              symbolOnly
              tokenAddress={selectedToken}
              chainId={chainId}
              className="text-xl font-semibold"
            />
          </div>
          {!readOnly && <ChevronDown className="size-4 justify-end" />}
        </Button>
      </div>
    </>
  );
};

TokenPicker.displayName = "TokenPicker";
