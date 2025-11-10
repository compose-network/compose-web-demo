import { type FC } from "react";
import { cn } from "@/lib/utils/tw.ts";
import { Button, type ButtonProps } from "@/components/ui/button.tsx";
import { IoInformationCircle } from "react-icons/io5";
import { Tooltip } from "@/components/ui/tooltip.tsx";

const HowItWorksBtn: FC<ButtonProps> = ({ className, ...props }) => {
  return (
    <Tooltip content={"How It Works?"}>
      {" "}
      <Button
        variant="white"
        className={cn(className, "size-12 rounded-xl p-0")}
        {...props}
        how-
      >
        <IoInformationCircle className="size-6 text-gray-800" />
      </Button>
    </Tooltip>
  );
};

export default HowItWorksBtn;
