import { cn } from "@/lib/utils/tw";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

const swapArrowVariants = cva("flex flex-col justify-center w-full", {
  variants: {
    variant: {
      default: "",
      primary: "",
      secondary: "",
    },
    size: {
      sm: "h-3 gap-1",
      md: "h-4 gap-1",
      lg: "h-5 gap-1",
      xl: "h-6 gap-1",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

const gradientVariants = cva("", {
  variants: {
    variant: {
      default: "from-[#7ED90B] to-[#E12FC1]",
      primary: "from-primary/40 via-primary/70 to-primary",
      secondary: "from-gray-400 via-gray-500 to-gray-600",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const arrowHeadColors = {
  default: "#E12FC1",
  primary: "hsl(var(--primary))",
  secondary: "#6b7280",
};

const leftArrowHeadColors = {
  default: "#7ED90B",
  primary: "hsl(var(--primary))",
  secondary: "#6b7280",
};

export interface SwapArrowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof swapArrowVariants> {
  /**
   * Custom gradient colors
   */
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  /**
   * Custom color for the arrow heads
   */
  arrowHeadColor?: string;
}

const SwapArrow = forwardRef<HTMLDivElement, SwapArrowProps>(
  (
    {
      className,
      variant,
      size,
      gradientFrom,
      gradientVia,
      gradientTo,
      arrowHeadColor,
      ...props
    },
    ref,
  ) => {
    const customGradient = gradientFrom && gradientVia && gradientTo;
    const customArrowHead = arrowHeadColor;

    const lineStyle = customGradient
      ? {
          background: `linear-gradient(to right, ${gradientFrom}, ${gradientVia}, ${gradientTo})`,
        }
      : undefined;

    const reverseLineStyle = customGradient
      ? {
          background: `linear-gradient(to right, ${gradientFrom}, ${gradientVia}, ${gradientTo})`,
        }
      : undefined;

    return (
      <div
        ref={ref}
        className={cn(swapArrowVariants({ variant, size, className }))}
        {...props}
      >
        {/* Top arrow - pointing up and out */}
        <div className="flex items-end w-full relative">
          {/* Left arrow head with 90° angle at bottom-right, pointing up-left */}
          <div
            className="w-0 h-0 border-t-[10px] border-r-[10px] border-t-transparent relative"
            style={{
              borderRightColor: customArrowHead
                ? arrowHeadColor
                : leftArrowHeadColors[
                    variant as keyof typeof leftArrowHeadColors
                  ] || leftArrowHeadColors.default,
              borderTopColor: "transparent",
            }}
          />

          {/* Top line with gradient left to right */}
          <div
            className={cn(
              "flex-grow h-[2px]",
              customGradient
                ? ""
                : `bg-gradient-to-r ${gradientVariants({ variant })}`,
            )}
            style={lineStyle}
          />
        </div>

        {/* Bottom arrow - pointing down and out */}
        <div className="flex items-start w-full relative">
          {/* Bottom line with gradient right to left */}
          <div
            className={cn(
              "flex-grow h-[2px]",
              customGradient
                ? ""
                : `bg-gradient-to-r ${gradientVariants({ variant })}`,
            )}
            style={reverseLineStyle}
          />

          {/* Right arrow head with 90° angle at top-left, pointing down-right */}
          <div
            className="w-0 h-0 border-b-[10px] border-l-[10px] border-b-transparent relative"
            style={{
              borderLeftColor: customArrowHead
                ? arrowHeadColor
                : arrowHeadColors[variant as keyof typeof arrowHeadColors] ||
                  arrowHeadColors.default,
              borderBottomColor: "transparent",
            }}
          />
        </div>
      </div>
    );
  },
);

SwapArrow.displayName = "SwapArrow";

export { SwapArrow, swapArrowVariants };
