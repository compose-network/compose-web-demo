import type { FC } from "react";
import { useTheme } from "@/hooks/app/use-theme";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/tw";
import { MdWbSunny } from "react-icons/md";
import { HiMiniMoon } from "react-icons/hi2";

export const ThemeSwitcher: FC<ButtonProps> = ({ className, ...props }) => {
  const theme = useTheme();
  return (
    <Button
      variant="white"
      className={cn(className, "size-12 rounded-xl p-0")}
      {...props}
      onClick={() => {
        useTheme.state.dark = !useTheme.state.dark;
      }}
    >
      {theme.dark ? (
        <HiMiniMoon className="size-6 text-gray-800" />
      ) : (
        <MdWbSunny className="size-6 text-gray-800" />
      )}
    </Button>
  );
};

ThemeSwitcher.displayName = "ThemeSwitcher";
