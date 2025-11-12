import { Text } from "@/components/ui/text";
import { ComposeLogo } from "@/components/ui/compose-logo.tsx";
import { Link, NavLink } from "react-router-dom";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button.tsx";
// import { FaDiscord } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { TbWorld } from "react-icons/tb";

const ITEMS = [
  {
    label: "Bridge",
    isFlowInProgress: false,
    route: "bridge",
  },
  {
    label: "Swap",
    isFlowInProgress: false,
    route: "swap",
  },
  {
    label: "Cross Chain Flashloans",
    isFlowInProgress: true,
  },
  {
    label: "Atomic Arbitrage",
    isFlowInProgress: true,
  },
  {
    label: "Arbitrary Read/Write",
    isFlowInProgress: true,
  },
  {
    label: "NFT bridging",
    isFlowInProgress: true,
  },
];

const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full justify-between">
      <div className="h-full w-[300px] flex flex-col border-r-[1px] border-r-gray-300 p-2 gap-2">
        <NavLink to={"/"} className="p-4">
          <ComposeLogo className="h-[48px]" />
        </NavLink>
        <div>
          {ITEMS.map((item, index) => (
            <Text
              onClick={() => {
                if (!item.isFlowInProgress) {
                  navigate(`/${item.route}`);
                }
              }}
              variant={"body-3-medium"}
              className={`w-full h-[48px] ${!item.isFlowInProgress && "cursor-pointer"} flex text-nowrap justify-between items-center p-4 rounded-[24px] ${!item.isFlowInProgress && pathname.includes(item.route || "") && "bg-primary-50 text-primary-500"}`}
              key={index}
            >
              {item.label}
              {item.isFlowInProgress && (
                <div className="h-[24px] p-2 flex items-center justify-center cursor-default rounded-[24px] text-nowrap bg-[#F42788] bg-opacity-[24%] ">
                  <Text variant={"caption-medium"} className="text-[#F42788]">
                    {" "}
                    Coming soon
                  </Text>
                </div>
              )}
            </Text>
          ))}
        </div>
      </div>
      <div className="flex flex-col border-r-[1px] border-r-gray-300 p-2 gap-5 pb-5">
        <Button
          as={Link}
          to={"https://docs.compose.network/"}
          target={"_blank"}
          variant={"ghost"}
          className={"justify-start hover:bg-transparent"}
        >
          Docs
        </Button>
        <div className="w-full flex gap-4 ml-4">
          {/*<Link target={"_blank"} to={"https://discord.com/invite/5vT22pRBrf"}>*/}
          {/*  <FaDiscord className="size-6" />*/}
          {/*</Link>*/}
          <Link target={"_blank"} to={"https://x.com/ComposeNetwork"}>
            <FaXTwitter className="size-6" />
          </Link>
          <Link target={"_blank"} to={"https://www.compose.network/"}>
            <TbWorld className="size-6" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
