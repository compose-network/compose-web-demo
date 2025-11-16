import { Text } from "@/components/ui/text.tsx";
import { AssetLogo } from "@/components/ui/asset-logo.tsx";
import { USDC_ADDRESS } from "@/wagmi/addresses.ts";
import { rollupA, rollupB } from "@/wagmi/config.ts";
import { Button } from "@/components/ui/button.tsx";
import { FaArrowDown } from "react-icons/fa6";

const KakietoTokeni = () => {
  return (
    <div className="flex items-center gap-6">
      {/*<div className="rounded-[20px]">*/}
      <div className="w-full flex flex-col py-5 px-6 rounded-[20px] border border-gray-300 gap-3 bg-gray-100">
        <div className="flex gap-2.5">
          <AssetLogo
            tokenAddress={USDC_ADDRESS}
            chainId={rollupA.id}
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
              3,456.78
            </Text>
          </div>
        </div>
      </div>

      <Button
        variant="white"
        size="icon"
        className="size-12 rounded-xl absolute left-[59.30%] cursor-default"
        style={{
          boxShadow: "0px 4px 8px -3px rgba(11, 42, 60, 0.08)",
        }}
      >
        <FaArrowDown className="text-[#18B5B8]" />
      </Button>

      <div className="w-full flex flex-col py-5 px-6 rounded-[20px] border border-gray-300 gap-3 bg-gray-100">
        <div className="flex gap-2.5">
          <AssetLogo
            tokenAddress={USDC_ADDRESS}
            chainId={rollupB.id}
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
              3,456.78
            </Text>
          </div>
        </div>
      </div>
      {/*</div>*/}
    </div>
  );
};

export default KakietoTokeni;
