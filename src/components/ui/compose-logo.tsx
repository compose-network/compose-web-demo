import type { FC, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/tw";
import { useTheme } from "@/hooks/app/use-theme";

export const ComposeLogo: FC<ComponentPropsWithoutRef<"img">> = ({
  className,
  ...props
}) => {
  const theme = useTheme();
  return (
    <img
      alt={"Compose"}
      className={cn("w-[130px] h-[48px]", className)}
      {...props}
      src={`/images/logo/${theme.dark ? "light" : "dark"}.svg`}
    />
  );
};

ComposeLogo.displayName = "ComposeLogo";
