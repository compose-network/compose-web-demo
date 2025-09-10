import type { FC } from "react";
import { type DialogProps } from "@radix-ui/react-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { ERC20Token } from "@/wagmi/tokens";
import { tokens } from "@/wagmi/tokens";
import { TokenPickerItem } from "./token-picker-item";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Address } from "viem";

export type TokenPickerCommandDialogProps = {
  chainId: number;
  onTokenSelect: (token: Address) => void;
} & DialogProps;

export const TokenPickerCommandDialog: FC<TokenPickerCommandDialogProps> = ({
  chainId,
  onTokenSelect,
  onOpenChange,
  ...dialogProps
}) => {
  const availableTokens = tokens[chainId as keyof typeof tokens] || [];

  const handleTokenSelect = (token: Address) => {
    onTokenSelect(token);
    onOpenChange?.(false);
  };

  return (
    <Dialog isOpen={dialogProps.open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput placeholder="Search tokens..." />
          <CommandList>
            <CommandEmpty>No tokens found.</CommandEmpty>
            <CommandGroup heading="Available Tokens">
              {/* <CommandItem
                key={zeroAddress}
                onSelect={() => handleTokenSelect(zeroAddress)}
                className="cursor-pointer"
              >
                <TokenPickerItem token={zeroAddress} chainId={chainId} />
              </CommandItem> */}
              {availableTokens.map((token: ERC20Token) => (
                <CommandItem
                  key={token.address}
                  onSelect={() => handleTokenSelect(token.address)}
                  className="cursor-pointer"
                >
                  <TokenPickerItem token={token.address} chainId={chainId} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

TokenPickerCommandDialog.displayName = "TokenPickerCommandDialog";
