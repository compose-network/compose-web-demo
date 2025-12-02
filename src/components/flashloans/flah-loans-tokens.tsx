import { Text } from "@/components/ui/text.tsx";
import { AssetLogo } from "@/components/ui/asset-logo.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FaArrowDown } from "react-icons/fa6";
import type { AppChainId } from "@/wagmi/config.ts";

type FlahLoansTokensProps = {
  priceA: string;
  priceB: string;
  tokenAddressA: `0x${string}`;
  tokenAddressB: `0x${string}`;
  chainIdA: AppChainId;
  chainIdB: AppChainId;
};

const FlahLoansTokens = ({
  priceA,
  priceB,
  tokenAddressA,
  tokenAddressB,
  chainIdA,
  chainIdB,
}: FlahLoansTokensProps) => {
  return (
    <div className="flex relative items-center gap-6">
      <div className="w-full relative flex flex-col py-5 px-6 rounded-[20px] border border-gray-300 gap-3 bg-gray-100">
        <div className="flex gap-2.5">
          <AssetLogo
            tokenAddress={tokenAddressA}
            chainId={chainIdA}
            className="size-10"
          />
          <div className={"flex flex-col gap-1"}>
            <Text
              variant="caption-semibold"
              className="font-medium text-gray-500"
            >
              Price
            </Text>
            <Text variant="headline4" className="font-medium">
              ${priceA}
            </Text>
          </div>
        </div>
      </div>

      <Button
        variant="white"
        size="icon"
        className="size-12 rounded-xl absolute left-[46%] cursor-default"
        style={{
          boxShadow: "0px 4px 8px -3px rgba(11, 42, 60, 0.08)",
        }}
      >
        <FaArrowDown className="text-[#18B5B8]" />
      </Button>

      <div className="w-full flex flex-col py-5 px-6 rounded-[20px] border border-gray-300 gap-3 bg-gray-100">
        <div className="flex gap-2.5">
          <AssetLogo
            tokenAddress={tokenAddressB}
            chainId={chainIdB}
            className="size-10"
          />
          <div className={"flex flex-col gap-1"}>
            <Text
              variant="caption-semibold"
              className="font-medium text-gray-500"
            >
              Price
            </Text>
            <Text variant="headline4" className="font-medium">
              {priceB}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlahLoansTokens;
