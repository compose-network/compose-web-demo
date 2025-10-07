import type { ComponentProps, FC } from "react";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils/tw";
import { getExplorerHashUrl } from "@/wagmi/config.ts";

export const GoToExplorerBtn: FC<
  Pick<ComponentProps<"div">, "className"> & { hash: string; chainId: number }
> = ({ hash, chainId, className }) => {
  return (
    <Button
      as={Link}
      to={getExplorerHashUrl(chainId, hash)}
      target="_blank"
      size="icon"
      className={cn("size-6", className)}
    >
      <LuExternalLink />
    </Button>
  );
};
