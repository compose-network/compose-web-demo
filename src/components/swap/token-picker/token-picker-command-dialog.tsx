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
import { TokenPickerItem } from "./token-picker-item";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Address } from "viem";
import { Text } from "@/components/ui/text";
import { ChainIcon } from "@/components/ui/chain-icon";
import { Tooltip } from "@/components/ui/tooltip";
import type { AppChainId } from "@/wagmi/config";
import { getChainById } from "@/wagmi/config";

export type TokenPickerCommandDialogProps = {
  chainId: AppChainId;
  chains: {
    chainId: AppChainId;
    isNotSupported?: boolean;
    notSupportedReason?: string;
    tokens?: Address[];
  }[];
  onTokenSelect: (token: Address) => void;
  onChainSelect: (chainId: AppChainId) => void;
  disabledTokens?: Address[];
} & DialogProps;

export const TokenPickerCommandDialog: FC<TokenPickerCommandDialogProps> = ({
  chainId,
  chains,
  onTokenSelect,
  onOpenChange,
  onChainSelect,
  disabledTokens = [],
  ...dialogProps
}) => {
  const availableTokens =
    chains.find((chain) => chain.chainId === chainId)?.tokens || [];

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
          <CommandList className="max-h-max">
            <div className="flex flex-col gap-3 py-5 px-2">
              <Text variant="body-2-semibold">Network</Text>
              <div className="flex items-center gap-5 px-1">
                {chains.map((chain) => (
                  <Tooltip
                    key={chain.chainId}
                    content={
                      <div className="flex flex-col">
                        <Text>{getChainById(chain.chainId).name}</Text>
                        {chain.isNotSupported && (
                          <Text className="text-gray-400 text-sm">
                            {chain.notSupportedReason ??
                              "This network is not supported yet."}
                          </Text>
                        )}
                      </div>
                    }
                  >
                    <ChainIcon
                      disabled={chain.isNotSupported}
                      chainId={chain.chainId}
                      size="lg"
                      selected={chainId === chain.chainId}
                      onClick={() => onChainSelect(chain.chainId)}
                    />
                  </Tooltip>
                ))}
              </div>
            </div>
            <CommandEmpty>No tokens found.</CommandEmpty>
            <CommandGroup heading="Available Tokens">
              {availableTokens.map((token, i) => {
                const isDisabled = disabledTokens.includes(token);
                return (
                  <CommandItem
                    key={`${token}-${i}`}
                    onSelect={() => !isDisabled && handleTokenSelect(token)}
                    className={`cursor-pointer ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={isDisabled}
                  >
                    <TokenPickerItem token={token} chainId={chainId} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

TokenPickerCommandDialog.displayName = "TokenPickerCommandDialog";
