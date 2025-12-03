import { ChainIcon } from "@/components/ui/chain-icon";
import { useTheme } from "@/hooks/app/use-theme";
import { useAsset } from "@/hooks/use-asset";
import { onlyTokens } from "@/lib/utils/tokens.ts";
import { cn } from "@/lib/utils/tw";
import type { Address } from "abitype";
import type { ComponentPropsWithoutRef, FC } from "react";
import { HiOutlineDocumentText } from "react-icons/hi";
import type { AppChainId } from "@/wagmi/config.ts";

export type AssetLogoProps = {
  chainId: AppChainId;
  tokenAddress: Address;
  fallbackAssetSrc?: string;
  isFlashLoan?: boolean;
  size?: "sm" | "default";
};

type AssetLogoFC = FC<
  Omit<ComponentPropsWithoutRef<"img">, keyof AssetLogoProps> & AssetLogoProps
>;

export const AssetLogo: AssetLogoFC = ({
  chainId,
  tokenAddress,
  isFlashLoan,
  fallbackAssetSrc = "/images/networks/light.svg",
  size = "default",
  className,
  ...props
}) => {
  const { dark } = useTheme();

  const asset = useAsset({ tokenAddress, chainId });
  const logoSrc = asset.isEthereum
    ? dark
      ? "/images/networks/light.svg"
      : "/images/networks/dark.svg"
    : onlyTokens[asset.symbol?.toUpperCase() || ""] || fallbackAssetSrc;

  return (
    <div
      className={cn(
        "relative",
        { "size-10": size === "default", "size-7": size === "sm" },
        className,
      )}
    >
      {isFlashLoan ? (
        <HiOutlineDocumentText
          className="size-full"
          style={{
            filter:
              "drop-shadow(0 0 15px #F49E34) drop-shadow(0 0 30px #F49E34)",
            textShadow: "0 0 15px #F49E34, 0 0 30px #F49E34",
          }}
        />
      ) : (
        <img {...props} className={cn("rounded-md size-full")} src={logoSrc} />
      )}

      <ChainIcon
        size={size}
        chainId={chainId}
        className="absolute -bottom-1 -right-1 pointer-events-none"
      />
    </div>
  );
};

AssetLogo.displayName = "AssetLogo";
