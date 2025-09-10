import type { FC, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/tw";
import type { ERC20Token } from "@/wagmi/tokens";
import { Text } from "@/components/ui/text";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TokenPickerProps = {
  chainId: number;
  tokens: ERC20Token[];
  selectedToken: ERC20Token;
  onSelectToken?: (token: ERC20Token) => void;
};

type TokenPickerFC = FC<
  Omit<ComponentPropsWithoutRef<"button">, keyof TokenPickerProps> &
    TokenPickerProps
>;

export const TokenPicker: TokenPickerFC = ({
  className,
  selectedToken,
  tokens,
  onSelectToken,
  ...props
}) => {
  return (
    <Button
      variant="ghost"
      className={cn(
        "p-4 pr-6 pl-4 rounded-xl border border-gray-300 bg-gray-50 flex gap-3 items-center w-[188px] h-auto",
        className,
      )}
      {...props}
    >
      <div className="flex gap-3 items-center flex-1">
        <img
          className="size-10"
          src={selectedToken.logoUrl}
          alt={selectedToken.name}
        />
        <Text variant="body-2-medium" className="font-semibold">
          {selectedToken.symbol}
        </Text>
      </div>
      <ChevronDown className="size-4 justify-end" />
    </Button>
  );
};

TokenPicker.displayName = "TokenPicker";
