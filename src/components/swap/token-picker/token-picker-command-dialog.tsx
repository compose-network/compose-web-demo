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
import { ChainIcon } from "@/components/ui/chain-icon";
import { Tooltip } from "@/components/ui/tooltip";
import { getChainById } from "@/wagmi/config";

export type TokenPickerCommandDialogProps = {
  chainId: number;
  chains: { chainId: number; isSupported: boolean }[];
  onTokenSelect: (token: Address) => void;
  onChainSelect: (chainId: number) => void;
} & DialogProps;

export const TokenPickerCommandDialog: FC<TokenPickerCommandDialogProps> = ({
  chainId,
  chains,
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

  console.log("chains:", chains);

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
                {chains.map((chain) => (
                  <Tooltip
                    content={`${getChainById(chain.chainId).name}${chain.isSupported ? "" : " - This network is not supported yet."}`}
                  >
                    <ChainIcon
                      disabled={!chain.isSupported}
                      chainId={chain.chainId}
                      size="lg"
                      selected={chainId === chain.chainId}
                      onClick={() => onChainSelect(chain.chainId)}
                    />
                  </Tooltip>
                ))}
                {/* <ChainIcon
                  chainId={hoodi.id}
                  size="lg"
                  className="cursor-pointer"
                  selected={chainId === hoodi.id}
                  onClick={() => onChainSelect(hoodi.id)}
                /> */}
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
