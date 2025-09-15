import type { FC } from "react";
import type { BigNumberInputProps } from "@/components/ui/number-input";
import { BigNumberInput } from "@/components/ui/number-input";
import type { Address } from "abitype";
import { useAsset } from "@/hooks/use-asset";
import { TokenPicker } from "@/components/swap/token-picker/token-picker";
import { Divider } from "@/components/ui/divider";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/tw";
import { formatCurrency } from "@/lib/utils/number";
import type { TokenPickerCommandDialogProps } from "@/components/swap/token-picker/token-picker-command-dialog";
import { useAccount } from "@/hooks/account/use-account";
import { ConnectButton } from "@rainbow-me/rainbowkit";
export type TokenInputProps = {
  chainId: number;
  chains: TokenPickerCommandDialogProps["chains"];
  tokenAddress: Address;
  onSelectToken: (token: Address) => void;
  onChainSelect: (chainId: number) => void;
  readOnly?: boolean;
  isLoading?: boolean;
  canPickToken?: boolean;
};

type TokenInputFC = FC<
  Omit<BigNumberInputProps, keyof TokenInputProps> & TokenInputProps
>;

export const TokenInput: TokenInputFC = ({
  chainId,
  chains,
  tokenAddress,
  readOnly,
  isLoading,
  canPickToken = true,
  onChainSelect,
  ...props
}) => {
  const { isConnected } = useAccount();
  const asset = useAsset({
    tokenAddress: tokenAddress,
    chainId: chainId,
  });

  return (
    <div className="flex flex-col p-3 pl-8 border border-gray-300 rounded-xl gap-3 bg-gray-100">
      <div className="flex items-center">
        <BigNumberInput
          {...props}
          readOnly={readOnly}
          decimals={asset.decimals}
          // max={account.isConnected ? asset.balance : undefined}
          className={cn("border-none text-3xl px-0 h-full", {
            "text-gray-500": readOnly,
            "animate-pulse opacity-50": isLoading,
          })}
        />
        <TokenPicker
          onChainSelect={onChainSelect}
          chains={chains}
          selectedToken={tokenAddress}
          chainId={chainId}
          onSelectToken={props.onSelectToken}
          readOnly={!canPickToken}
        />
      </div>
      {!readOnly && (
        <>
          <Divider />
          <div className="flex justify-between items-center">
            <Text variant="body-3-medium" className="text-gray-500">
              Wallet Balance:{" "}
              {isConnected ? (
                formatCurrency(asset.balance ?? 0n, asset.decimals)
              ) : (
                <ConnectButton.Custom>
                  {({ openConnectModal, mounted }) => {
                    if (!mounted) return null;

                    return (
                      <Button
                        variant="link"
                        as="span"
                        className="cursor-pointer"
                        onClick={openConnectModal}
                      >
                        Connect Wallet to see balance
                      </Button>
                    );
                  }}
                </ConnectButton.Custom>
              )}
            </Text>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-500 font-semibold h-6"
              onClick={() => {
                props.onChange(asset.balance ?? 0n);
              }}
            >
              Max
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

TokenInput.displayName = "TokenInput";
