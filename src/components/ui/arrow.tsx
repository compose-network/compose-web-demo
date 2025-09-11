import { cn } from "@/lib/utils/tw";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

const arrowVariants = cva("flex items-center w-full", {
  variants: {
    variant: {
      default: "",
      primary: "",
      secondary: "",
    },
    size: {
      sm: "h-1",
      md: "h-2",
      lg: "h-3",
      xl: "h-4",
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
      default: "from-[#ECFF20]  to-[#E12FC1]",
      primary: "from-primary/40 via-primary/70 to-primary",
      secondary: "from-gray-400 via-gray-500 to-gray-600",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const arrowHeadVariants = cva("", {
  variants: {
    variant: {
      default: "border-l-[#E12FC1]",
      primary: "border-l-primary",
      secondary: "border-l-gray-600",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface ArrowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof arrowVariants> {
  /**
   * Custom gradient colors for the tail
   */
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  /**
   * Custom color for the arrow head
   */
  arrowHeadColor?: string;
}

const Arrow = forwardRef<HTMLDivElement, ArrowProps>(
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

    return (
      <div
        ref={ref}
        className={cn(arrowVariants({ variant, size, className }))}
        {...props}
      >
        {/* Flexible tail with gradient */}
        <div
          className={cn(
            "flex-grow h-[2px]",
            customGradient
              ? ""
              : `bg-gradient-to-r ${gradientVariants({ variant })}`,
          )}
          style={
            customGradient
              ? {
                  background: `linear-gradient(to right, ${gradientFrom}, ${gradientVia}, ${gradientTo})`,
                }
              : undefined
          }
        />

        {/* Arrow head - triangle */}
        <div
          className={cn(
            "w-0 h-0 border-l-[12px] border-t-[6px] border-b-[6px] border-t-transparent border-b-transparent",
            customArrowHead ? "" : arrowHeadVariants({ variant }),
          )}
          style={
            customArrowHead
              ? {
                  borderLeftColor: arrowHeadColor,
                  borderTopColor: "transparent",
                  borderBottomColor: "transparent",
                }
              : undefined
          }
        />
      </div>
    );
  },
);

Arrow.displayName = "Arrow";

export { Arrow, arrowVariants };
