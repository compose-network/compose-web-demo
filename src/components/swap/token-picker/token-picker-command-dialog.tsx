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
import { Text } from "@/components/ui/text";
import { RollupIcon } from "@/components/ui/rollup-icon";
import { rollupA, rollupB } from "@/wagmi/config";
import { Tooltip } from "@/components/ui/tooltip";

export type TokenPickerCommandDialogProps = {
  chainId: number;
  onTokenSelect: (token: Address) => void;
  onChainSelect: (chainId: number) => void;
} & DialogProps;

export const TokenPickerCommandDialog: FC<TokenPickerCommandDialogProps> = ({
  chainId,
  onTokenSelect,
  onOpenChange,
  onChainSelect,
  ...dialogProps
}) => {
  const availableTokens = tokens[chainId as keyof typeof tokens] || [];

  const handleTokenSelect = (token: Address) => {
    onTokenSelect(token);
    onOpenChange?.(false);
  };

  return (
    <Dialog isOpen={dialogProps.open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 rounded-xl">
        <Command className="bg-gray-50">
          <CommandInput
            className="bg-gray-200 border-none flex-1 w-full rounded-xl"
            placeholder="Search tokens..."
          />
          <CommandList>
            <div className="flex flex-col gap-3 py-5 px-2">
              <Text variant="body-2-semibold">Network</Text>
              <div className="flex items-center gap-5 px-1">
                <Tooltip content="This network is not supported yet.">
                  <RollupIcon
                    disabled
                    rollup={1}
                    size="lg"
                    selected={chainId === rollupA.id}
                    onClick={() => onChainSelect(rollupA.id)}
                  />
                </Tooltip>
                <RollupIcon
                  rollup={2}
                  size="lg"
                  selected={chainId === rollupB.id}
                  onClick={() => onChainSelect(rollupB.id)}
                />
              </div>
            </div>
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
