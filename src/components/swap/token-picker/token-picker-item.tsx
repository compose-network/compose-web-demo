import type { FC, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/tw";
import { AssetLogo } from "@/components/ui/asset-logo";
import AssetName from "@/components/ui/asset-name";
import type { Address } from "abitype";
import { Spacer } from "@/components/ui/spacer";
import { Button } from "@/components/ui/button";
import { useAddTokenToWallet } from "@/hooks/use-add-token-to-wallet";
import { PlusIcon } from "lucide-react";
import { isNativeToken } from "@/lib/utils/token";
import { useMint } from "@/lib/contract-interactions/erc-20/write/use-mint";
import { parseEther } from "viem";
import { useAccount } from "@/hooks/account/use-account";

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
  const { addToken } = useAddTokenToWallet();

  const handleAddToWallet = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToken({ address: token, chainId });
  };

  const account = useAccount();

  const mint = useMint();

  return (
    <div className={cn("flex gap-4 items-center w-full", className)} {...props}>
      <AssetLogo tokenAddress={token} chainId={chainId} />
      <AssetName tokenAddress={token} chainId={chainId} />
      <Spacer />

      {!isNativeToken(token) && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddToWallet}
            className="flex items-center gap-1.5 text-xs"
            title="Add token to wallet"
          >
            <PlusIcon className="h-3 w-3" />
            Add to Wallet
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              mint.write(
                { address: token, chainId },
                { to: account.address!, amount: parseEther("10") },
              )
            }
            isLoading={mint.isPending}
            className="flex items-center gap-1.5 text-xs"
            title="Mint token"
          >
            Mint
          </Button>
        </>
      )}
    </div>
  );
};

TokenPickerItem.displayName = "TokenPickerItem";
