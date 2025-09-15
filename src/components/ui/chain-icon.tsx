import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/tw";
import { getChainById, rollupA, rollupB } from "@/wagmi/config";
import { Tooltip } from "@/components/ui/tooltip";

const chainIconVariants = cva(
  "font-bold aria-[selected=true]:outline-8 aria-[selected=true]:outline-offset-2 aria-[selected=true]:outline disabled:bg-gray-500 disabled:opacity-50",
  {
    variants: {
      colorScheme: {
        blue: "bg-primary-500 text-gray-50 aria-[selected=true]:outline-primary-100",
        purple:
          "bg-violeta-regular text-gray-50 aria-[selected=true]:outline-violeta-pale",
        green:
          "bg-mintage-regular text-gray-50 aria-[selected=true]:outline-mintage-pale",
        default:
          "bg-gray-500 text-gray-50 aria-[selected=true]:outline-gray-300",
      },
      size: {
        default:
          "size-6 text-sm rounded-md tracking-[-4px] [&>span]:-ml-[0.27em]",
        lg: "size-10 text-2xl rounded-xl tracking-[-6px] [&>span]:-ml-[0.2em]",
      },
    },
    defaultVariants: {
      colorScheme: "default",
      size: "default",
    },
  },
);

const chainIconMap = {
  [rollupA.id]: "/images/chain-icons/I.svg",
  [rollupB.id]: "/images/chain-icons/II.svg",
};

const getChainIcon = (chainId: number) => {
  return (
    chainIconMap[chainId as keyof typeof chainIconMap] ||
    "/images/networks/light.svg"
  );
};

export type ChainIconProps = {
  chainId: number;
  selected?: boolean;
};

const chainColorSchemeMap = {
  [rollupA.id]: "blue",
  [rollupB.id]: "purple",
} as const;

const getChainColorScheme = (chainId: number) => {
  return (
    chainColorSchemeMap[chainId as keyof typeof chainColorSchemeMap] ||
    "default"
  );
};

export type ChainIconVariants = VariantProps<typeof chainIconVariants>;

type ChainIconFC = React.ForwardRefExoticComponent<
  Omit<React.ComponentPropsWithoutRef<"button">, keyof ChainIconProps> &
    ChainIconProps &
    ChainIconVariants &
    React.RefAttributes<React.ElementRef<"button">>
>;

export const ChainIcon: ChainIconFC = React.forwardRef<
  React.ElementRef<"button">,
  Omit<React.ComponentPropsWithoutRef<"button">, keyof ChainIconProps> &
    ChainIconProps &
    ChainIconVariants
>(({ className, colorScheme, chainId, size, selected, ...props }, ref) => {
  return (
    <Tooltip content={getChainById(chainId).name} asChild>
      <button
        type="button"
        aria-selected={selected ? "true" : "false"}
        ref={ref}
        className={chainIconVariants({
          colorScheme: colorScheme || getChainColorScheme(chainId),
          size,
          className: cn(
            "font-geistMono flex items-center justify-center cursor-default",
            className,
          ),
        })}
        {...props}
      >
        <img
          src={getChainIcon(chainId)}
          alt={chainId.toString()}
          className="size-[1.1em]"
        />
      </button>
    </Tooltip>
  );
});

ChainIcon.displayName = "ChainIcon";
