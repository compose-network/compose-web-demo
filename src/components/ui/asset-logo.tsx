import { RollupIcon } from "@/components/ui/rollup-icon";
import { useTheme } from "@/hooks/app/use-theme";
import { useAsset } from "@/hooks/use-asset";
import { onlyTokens } from "@/lib/utils/tokens.ts";
import { cn } from "@/lib/utils/tw";
import { rollupIdMap } from "@/wagmi/config";
import type { Address } from "abitype";
import type { ComponentPropsWithoutRef, FC } from "react";

export type AssetLogoProps = {
  chainId: number;
  tokenAddress: Address;
  fallbackAssetSrc?: string;
};

type AssetLogoFC = FC<
  Omit<ComponentPropsWithoutRef<"img">, keyof AssetLogoProps> & AssetLogoProps
>;

export const AssetLogo: AssetLogoFC = ({
  chainId,
  tokenAddress,
  fallbackAssetSrc = "/images/networks/light.svg",
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
    <div className={cn("relative size-10", className)}>
      <img {...props} className={cn("rounded-md size-full")} src={logoSrc} />
      <RollupIcon 
        rollup={rollupIdMap[chainId as keyof typeof rollupIdMap]} 
        className="absolute -bottom-1 -right-1"
      />
    </div>
  );
};

AssetLogo.displayName = "AssetLogo";
