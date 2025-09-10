import { Text } from "@/components/ui/text.tsx";
import { useAsset } from "@/hooks/use-asset";

import type { ComponentPropsWithoutRef, FC } from "react";
import type { Address } from "abitype";
import { cn } from "@/lib/utils/tw";

export type AssetNameProps = {
  tokenAddress: Address;
  chainId: number;
  symbolOnly?: boolean;
  nameClassName?: string;
  symbolClassName?: string;
};

type AssetNameFC = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof AssetNameProps> & AssetNameProps
>;

const AssetName: AssetNameFC = ({
  tokenAddress,
  symbolOnly,
  chainId,
  className,
  nameClassName,
  symbolClassName,
}) => {
  const asset = useAsset({ tokenAddress, chainId });
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {symbolOnly ? (
        <Text variant="body-2-semibold" className={symbolClassName}>
          {asset.symbol}
        </Text>
      ) : (
        <>
          <Text variant="body-3-semibold" className={nameClassName}>
            {asset.name}
          </Text>
          <Text className={cn("text-gray-500 font-medium", symbolClassName)}>
            {asset.symbol}
          </Text>
        </>
      )}
    </div>
  );
};

export default AssetName;
