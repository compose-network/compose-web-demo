import type { FC, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/tw";
import { AssetLogo } from "@/components/ui/asset-logo";
import AssetName from "@/components/ui/asset-name";
import type { Address } from "abitype";
import { useMint } from "@/lib/contract-interactions/erc-20/write/use-mint";
import { Button } from "@/components/ui/button";
import { parseUnits } from "viem";
import { useAccount } from "@/hooks/account/use-account";
import { Spacer } from "@/components/ui/spacer";
import { withTransactionModal } from "@/lib/contract-interactions/utils/useWaitForTransactionReceipt";

export type TokenPickerItemProps = {
  token: Address;
  chainId: number;
};

type TokenPickerItemFC = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof TokenPickerItemProps> &
    TokenPickerItemProps
>;

export const TokenPickerItem: TokenPickerItemFC = ({
  className,
  token,
  chainId,
  ...props
}) => {
  const mint = useMint();
  const account = useAccount();
  return (
    <div className={cn("flex gap-4 items-center w-full", className)} {...props}>
      <AssetLogo tokenAddress={token} chainId={chainId} />
      <AssetName tokenAddress={token} chainId={chainId} />
      <Spacer />
      <Button
        variant="ghost"
        className="justify-end"
        size="sm"
        disabled={!account.address}
        onClick={() =>
          mint.write(
            { address: token, chainId },
            {
              amount: parseUnits("50", 18),
              to: account.address!,
            },
            withTransactionModal(),
          )
        }
      >
        Mint
      </Button>
    </div>
  );
};

TokenPickerItem.displayName = "TokenPickerItem";
