import { type FC, type ComponentPropsWithoutRef, useState } from "react";
import { cn } from "@/lib/utils/tw";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TokenPickerCommandDialogProps } from "@/components/swap/token-picker/token-picker-command-dialog";
import { TokenPickerCommandDialog } from "@/components/swap/token-picker/token-picker-command-dialog";
import { AssetLogo } from "@/components/ui/asset-logo";
import AssetName from "@/components/ui/asset-name";
import type { Address } from "abitype";

export type TokenPickerProps = {
  chainId: number;
  chains: TokenPickerCommandDialogProps["chains"];
  selectedToken: Address;
  onSelectToken: (token: Address) => void;
  onChainSelect: (chainId: number) => void;
  readOnly?: boolean;
  canPickToken?: boolean;
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
      />
      <Button
        onClick={() => {
          if (readOnly) return;
          console.log("Button clicked, setting isOpen to true");
          setIsOpen(true);
        }}
        variant="ghost"
        className={cn(
          "p-4 pr-6 pl-4 rounded-[100px] border border-gray-300 bg-gray-50 flex gap-3 items-center min-w-[188px] h-auto",
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
    </>
  );
};

TokenPicker.displayName = "TokenPicker";
