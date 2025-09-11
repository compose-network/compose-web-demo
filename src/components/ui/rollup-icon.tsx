import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/tw";

const rollupIconVariants = cva(
  "font-bold aria-[selected=true]:outline-8 aria-[selected=true]:outline-offset-2 aria-[selected=true]:outline disabled:bg-gray-500 disabled:opacity-50",
  {
    variants: {
      colorScheme: {
        blue: "bg-primary-500 text-gray-50 aria-[selected=true]:outline-primary-100",
        purple:
          "bg-violeta-regular text-gray-50 aria-[selected=true]:outline-violeta-pale",
        green:
          "bg-mintage-regular text-gray-50 aria-[selected=true]:outline-mintage-pale",
      },
      size: {
        default:
          "size-6 text-sm rounded-md tracking-[-4px] [&>span]:-ml-[0.27em]",
        lg: "size-10 text-2xl rounded-xl tracking-[-6px] [&>span]:-ml-[0.2em]",
      },
    },

    defaultVariants: {
      colorScheme: "blue",
      size: "default",
    },
  },
);

export type RollupIconProps = {
  rollup: 1 | 2 | 3;
  selected?: boolean;
};

const rollupColorSchemeMap = {
  1: "blue",
  2: "purple",
  3: "green",
} as const;

export type RollupIconVariants = VariantProps<typeof rollupIconVariants>;

type RollupIconFC = React.ForwardRefExoticComponent<
  Omit<React.ComponentPropsWithoutRef<"button">, keyof RollupIconProps> &
    RollupIconProps &
    RollupIconVariants &
    React.RefAttributes<React.ElementRef<"button">>
>;

export const RollupIcon: RollupIconFC = React.forwardRef<
  React.ElementRef<"button">,
  Omit<React.ComponentPropsWithoutRef<"button">, keyof RollupIconProps> &
    RollupIconProps &
    RollupIconVariants
>(({ className, colorScheme, rollup, size, selected, ...props }, ref) => {
  return (
    <button
      aria-selected={selected ? "true" : "false"}
      ref={ref}
      className={rollupIconVariants({
        colorScheme: colorScheme || rollupColorSchemeMap[rollup],
        size,
        className: cn(
          "font-geistMono flex items-center justify-center",
          className,
        ),
      })}
      {...props}
    >
      <span className="text-center">{"I".repeat(rollup)}</span>
    </button>
  );
});

RollupIcon.displayName = "RollupIcon";
