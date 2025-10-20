import type { FC, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/tw";

export const ComposeLoader: FC<ComponentPropsWithoutRef<"img">> = ({
  className,
  ...props
}) => {
  return (
    <img className={cn(className)} {...props} src={`/images/compose-loader.svg`} />
  );
};

ComposeLoader.displayName = "ComposeLoader";
