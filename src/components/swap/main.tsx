import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { textVariants } from "@/components/ui/text";
import { cn } from "@/lib/utils/tw";
import { useLocation, useNavigate } from "react-router";

export const MainPage = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isSwap = pathname === "/";
  const isBridge = pathname === "/bridge";
  return (
    <Card className={cn("max-w-[648px] mx-auto gap-8 mt-8")}>
      <Tabs
        className="w-full"
        defaultValue="swap"
        value={isSwap ? "swap" : isBridge ? "bridge" : "swap"}
        onValueChange={(value) => {
          navigate(`/${value}`);
        }}
      >
        <TabsList className="w-full bg-gray-300">
          <TabsTrigger
            className={textVariants({
              variant: "headline4",
              className:
                "flex-1 h-[52px] font-semibold data-[state=inactive]:text-gray-500",
            })}
            value="bridge"
          >
            Bridge
          </TabsTrigger>
          <TabsTrigger
            className={textVariants({
              variant: "headline4",
              className:
                "flex-1 h-[52px] font-semibold data-[state=inactive]:text-gray-500",
            })}
            value="swap"
          >
            Swap
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {children}
    </Card>
  );
};
