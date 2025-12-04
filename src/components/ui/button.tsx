import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils/tw";
import type { ComponentWithAs, PropsWithAs } from "@/types/component";
import { CgSpinner } from "react-icons/cg";
import { Spinner } from "@/components/ui/spinner";

export const buttonVariants = cva(
  "inline-flex gap-2 items-center justify-center whitespace-nowrap rounded-[100px] text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ",
  {
    variants: {
      variant: {
        white:
          "bg-white text-black [background:linear-gradient(hsl(var(--white)),hsl(var(--white)))_padding-box,linear-gradient(92deg,#14B5C099_8.16%,#2ABEC999_18.67%,#24B97999_51.94%,#F2942299_85.22%,#E6871399_95.72%)_border-box] border-[1px] border-transparent rounded-[100px]",
        gradient:
          "text-primary-500 border border-[#14B5C0] bg-[linear-gradient(92deg,_rgba(20,181,192,0.08)_8.16%,_rgba(36,185,121,0.08)_51.94%,_rgba(230,135,19,0.08)_95.72%)]",
        default:
          "text-white bg-gradient-to-r from-[#14B5C0] via-[#2ABEC9] via-[#24B979] to-[#F29422] to-[#E68713]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border dark:border-white/10 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-primary-50 text-primary-500 hover:bg-primary-100 active:bg-primary-200",
        ghost: "hover:bg-gray-300 ",
        success:
          "bg-success-100 text-success-500  hover:bg-success-300 active:bg-success-500",
        subtle:
          "bg-slate-400/5 hover:bg-slate-400/20 hover:text-accent-foreground ",
        link: "inline-flex text-primary-500 underline-offset-4 hover:underline",
        disabled: "cursor-not-allowed opacity-50 bg-gray-300 text-gray-500",
      },
      colorScheme: {
        wallet: "",
        error: "",
      },
      size: {
        default: "h-10 px-4 py-2 font-medium text-md ",
        sm: "h-9 px-3 font-medium text-sm ",
        lg: "h-12 px-6 font-medium text-md ",
        xl: "h-[60px] px-6 font-medium text-base ",
        icon: "size-7 ",
        network: "h-12 pl-3 pr-4 font-medium text-md ",
        wallet: "h-12 px-4 font-medium text-md ",
        none: "",
      },
      width: {
        full: "w-full",
        default: "",
      },
    },
    compoundVariants: [
      {
        variant: "link",
        class: "p-0 h-auto inline",
      },
      {
        variant: "outline",
        colorScheme: "error",
        class:
          "bg-error-100 text-error-500 hover:text-error-200 hover:bg-error-300 active:bg-error-500 border-error-500",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      width: "default",
    },
  },
);

export interface ButtonProps
  extends PropsWithAs<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  isActionBtn?: boolean;
  icon?: React.ReactNode;
}

export type ButtonFC = ComponentWithAs<"button", ButtonProps>;

// @ts-expect-error - I don't know how to fix this
export const Button: ButtonFC = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(
  (
    {
      className,
      variant,
      size,
      colorScheme,
      width,
      icon,
      isLoading,
      loadingText,
      children,
      isActionBtn,
      disabled,
      type = "button",
      as,
      ...props
    },
    ref,
  ) => {
    const Comp = as ?? "button";
    const _loadingText = loadingText ?? "Waiting for Wallet Confirmation...";
    return (
      <Comp
        className={`text-[14px] ${cn(
          buttonVariants({
            variant: disabled ? "disabled" : variant,
            size,
            colorScheme,
            className,
            width,
          }),
          {
            "opacity-50": isLoading,
          },
        )}`}
        aria-disabled={disabled}
        disabled={disabled}
        type={type}
        ref={ref}
        {...props}
        onClick={
          disabled || isLoading
            ? (ev: React.MouseEvent<HTMLButtonElement>) => ev.preventDefault()
            : props.onClick
        }
      >
        <>
          {isLoading ? <CgSpinner className="animate-spin size-6" /> : icon}
          {isLoading ? (isActionBtn ? _loadingText : children) : children}
        </>
      </Comp>
    );
  },
);

Button.displayName = "Button";

// @ts-expect-error - I don't know how to fix this
export const IconButton: ButtonFC = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(
  (
    {
      className,
      variant,
      colorScheme,
      width,
      isLoading,
      children,
      disabled,
      type = "button",
      as,
      ...props
    },
    ref,
  ) => {
    const Comp = as ?? "button";

    const copiedChildren = React.useMemo(() => {
      if (React.isValidElement(children)) {
        return React.cloneElement(children, {
          ...props,
          className: cn("size-[65%]", children.props.className),
        });
      }
    }, [children, props]);

    return (
      <Comp
        className={cn(
          "size-7",
          buttonVariants({
            variant: disabled ? "disabled" : (variant ?? "subtle"),
            colorScheme,
            className,
            size: "icon",
            width,
          }),

          {
            "opacity-50": isLoading,
          },
        )}
        aria-disabled={disabled}
        disabled={disabled}
        type={type}
        ref={ref}
        {...props}
        onClick={
          disabled || isLoading
            ? (ev: React.MouseEvent<HTMLButtonElement>) => ev.preventDefault()
            : props.onClick
        }
      >
        {isLoading ? <Spinner className="size-[65%]" /> : copiedChildren}
      </Comp>
    );
  },
);
