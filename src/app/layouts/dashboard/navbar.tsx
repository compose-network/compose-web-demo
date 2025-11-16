import { cn } from "@/lib/utils/tw";
import type { ComponentPropsWithoutRef, FC } from "react";
import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import HowItWorksBtn from "@/components/ui/how-it-works-btn.tsx";

export type NavbarProps = {
  onHowItWorksClick?: () => void;
};

type FCProps = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof NavbarProps> & NavbarProps
>;

export const Navbar: FCProps = ({ className, onHowItWorksClick, ...props }) => {
  return (
    <div
      className={cn(className, "flex justify-end w-full bg-gray-200 p-4")}
      {...props}
    >
        <div className="flex items-center gap-3">
          <HowItWorksBtn onClick={onHowItWorksClick} />
          <ConnectWalletBtn />
          <ThemeSwitcher />
        </div>
    </div>
  );
};

Navbar.displayName = "Navbar";
