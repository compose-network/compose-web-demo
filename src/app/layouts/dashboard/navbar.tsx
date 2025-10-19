import { cn } from "@/lib/utils/tw";
import type { ComponentPropsWithoutRef, FC } from "react";

import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
// import { NetworkSwitchBtn } from "@/components/connect-wallet/network-switch-btn";

import { ComposeLogo } from "@/components/ui/compose-logo.tsx";
// import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { NavLink } from "react-router-dom";

export type NavbarProps = {
  // TODO: Add props or remove this type
};

type FCProps = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof NavbarProps> & NavbarProps
>;

export const Navbar: FCProps = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        className,
        "flex justify-center w-full",
      )}
      {...props}
    >
      <div className="w-[1320px] flex items-center gap-3 h-20 whitespace-nowrap ">
        <div className="flex-1">
          <NavLink to={"/"} className="w-fit">
            <ComposeLogo className="h-[48px]" />
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          {/*<NetworkSwitchBtn />*/}
          <ConnectWalletBtn />
        </div>
        {/*<ThemeSwitcher className="ml-3" />*/}
      </div>
    </div>
  );
};

Navbar.displayName = "Navbar";
