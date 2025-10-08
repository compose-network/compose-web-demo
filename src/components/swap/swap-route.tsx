import type { FC, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/tw";
import { AssetLogo } from "@/components/ui/asset-logo";
import type { Address } from "abitype";
import { Arrow } from "@/components/ui/arrow";
import { Text } from "@/components/ui/text";
import { chainsMap } from "@/wagmi/config";

export type SwapRouteProps = {
  action: "bridge" | "swap";
  fromToken: {
    address: Address;
    chainId: number;
  };
  toToken: {
    address: Address;
    chainId: number;
  };
};

type SwapRouteFC = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof SwapRouteProps> & SwapRouteProps
>;

export const SwapRoute: SwapRouteFC = ({
  className,
  fromToken,
  action,
  toToken,
  ...props
}) => {
  return (
    <div className={cn("flex select-none ", className)} {...props}>
      <div className="flex flex-col items-center size-20 justify-between">
        <AssetLogo
          tokenAddress={fromToken.address}
          chainId={fromToken.chainId}
        />
        <Text variant="body-3-medium" className="text-gray-600">
          {chainsMap[fromToken.chainId as keyof typeof chainsMap].name}
        </Text>
      </div>
      <div className="flex flex-col text-center gap-0.5 flex-1">
        <Text variant="caption-medium" className="capitalize text-gray-500">
          {action}
        </Text>
        <Arrow />
      </div>
      <div className="flex flex-col items-center size-20 justify-between">
        <AssetLogo tokenAddress={toToken.address} chainId={toToken.chainId} />
        <Text variant="body-3-medium" className="text-gray-600">
          {chainsMap[toToken.chainId as keyof typeof chainsMap].name}
        </Text>
      </div>
    </div>
  );
};

SwapRoute.displayName = "SwapRoute";
