import { AssetLogo } from "@/components/ui/asset-logo.tsx";
import { Text } from "@/components/ui/text.tsx";
import type { AppChainId } from "@/wagmi/config.ts";
import { chainsMap, rollupB } from "@/wagmi/config.ts";
import type { Address } from "viem";
import { cn } from "@/lib/utils/tw.ts";
import { SwapArrow } from "@/components/ui/swap-arrow.tsx";
import { Arrow } from "@/components/ui/arrow.tsx";
import type { ComponentPropsWithoutRef, FC } from "react";

// type Action = {
//   type: string,
//   from: Address
//   fromChainId: number;
//   to: Address,
//   toChainId: number;
// }

export type ActionRouteProps = {
  type: string;
  from: Address;
  fromChainId: AppChainId;
  to: Address;
  toChainId: AppChainId;
};
type RouteFC = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof ActionRouteProps> &
    ActionRouteProps
>;

const Token = ({ token, chainId }: { token: Address; chainId: AppChainId }) => (
  <div className="flex flex-col items-center size-20 justify-between">
    <AssetLogo tokenAddress={token} chainId={chainId} />
    <Text variant="body-3-medium" className="text-gray-600">
      {chainsMap[chainId as keyof typeof chainsMap].name}
    </Text>
  </div>
);

const prepareAction = (action: ActionRouteProps) => {
  const actions: { token?: Address; chainId?: AppChainId; type?: string }[] = [
    {
      token: action.from,
      chainId: action.fromChainId,
    },
  ];
  if (action.type === "swap") {
    if (action.fromChainId !== rollupB.id) {
      actions.push({ type: "bridge" });
      actions.push({ token: action.from, chainId: rollupB.id });
      actions.push({ type: "swap" });
      if (action.toChainId !== rollupB.id) {
        actions.push({ token: action.to, chainId: rollupB.id });
        actions.push({ type: "bridge" });
      }
    } else {
      actions.push({ type: "swap" });
      if (action.toChainId !== rollupB.id) {
        actions.push({ token: action.to, chainId: rollupB.id });
        actions.push({ type: "bridge" });
      }
    }
  } else {
    actions.push({ type: "bridge" });
  }
  actions.push({ token: action.to, chainId: action.toChainId });
  return actions;
};

const ActionRoute: RouteFC = ({
  className,
  type,
  from,
  fromChainId,
  to,
  toChainId,
  ...props
}) => {
  const actions = prepareAction({
    type,
    from,
    fromChainId,
    to,
    toChainId,
  });

  return (
    <div
      className={cn("flex select-none w-full justify-center", className)}
      {...props}
    >
      {actions.map((preparedAction) => {
        if (preparedAction.type === "swap") {
          return (
            <div
              className="flex flex-col w-[30%] items-center flex-nowrap "
              key={`${preparedAction.chainId}${preparedAction.type}${preparedAction.token}`}
            >
              <Text
                variant="caption-medium"
                className="capitalize text-gray-500"
              >
                Swap
              </Text>
              <SwapArrow />
            </div>
          );
        }
        if (preparedAction.type === "bridge") {
          return (
            <div
              className={`flex flex-col ${type === "bridge" ? "w-full" : "w-[30%]"} items-center flex-nowrap`}
              key={`${preparedAction.chainId}${preparedAction.type}${preparedAction.token}`}
            >
              <Text
                variant="caption-medium"
                className="capitalize text-gray-500"
              >
                Bridge
              </Text>
              <Arrow />
            </div>
          );
        }
        return (
          <div
            className="flex justify-center items-center"
            key={`${preparedAction.chainId}${preparedAction.type}${preparedAction.token}`}
          >
            <Token
              token={preparedAction?.token || "0x"}
              chainId={preparedAction?.chainId || (-1 as AppChainId)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ActionRoute;
