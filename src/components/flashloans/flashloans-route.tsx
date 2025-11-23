import { cn } from "@/lib/utils/tw.ts";
import { Text } from "@/components/ui/text.tsx";
import type { Address } from "viem";
import { zeroAddress } from "viem";
import { AssetLogo } from "@/components/ui/asset-logo.tsx";
import { chainsMap, rollupA } from "@/wagmi/config.ts";
import { DottedArrowLine } from "@/components/ui/dashed-arrow.tsx";
import { SwapArrow } from "@/components/ui/swap-arrow.tsx";
import { Arrow } from "@/components/ui/arrow.tsx";

const Token = ({
  token,
  chainId,
  isFlashLoan,
}: {
  token: Address;
  chainId: number;
  isFlashLoan?: boolean;
}) => (
  <div className="flex flex-col items-center size-20 justify-between">
    <AssetLogo
      isFlashLoan={isFlashLoan}
      tokenAddress={token}
      chainId={chainId}
    />
    <Text variant="body-3-medium" className="text-gray-600">
      {chainsMap[chainId as keyof typeof chainsMap].name}
    </Text>
  </div>
);

const FlashloansRoute = () => {
  return (
    <div className="flex w-full gap-6 flex-col">
      <div className={cn("flex select-none w-full justify-center")}>
        <Token token={zeroAddress} chainId={rollupA.id} />
        <div className="flex flex-col w-[30%] items-center flex-nowrap ">
          <Text variant="caption-medium" className="capitalize text-gray-500">
            Payback
          </Text>
          <DottedArrowLine />
        </div>
        <Token isFlashLoan token={zeroAddress} chainId={rollupA.id} />
        <div className="flex flex-col w-[30%] items-center flex-nowrap ">
          <Text variant="caption-medium" className="capitalize text-gray-500">
            Flash Loan
          </Text>
          <DottedArrowLine />
        </div>
        <Token token={zeroAddress} chainId={rollupA.id} />
      </div>
      <div className={cn("flex select-none w-full justify-between")}>
        <div className="flex flex-col items-center w-20 justify-between">
          <Arrow className="rotate-[-90deg] w-[40px]" />
        </div>
        <div className="flex flex-col items-center w-20 justify-between">
          <SwapArrow className="rotate-90 w-[40px]" />
        </div>
      </div>
      <div className={cn("flex select-none w-full justify-center")}>
        <Token token={zeroAddress} chainId={rollupA.id} />
        <div className="flex flex-col w-[30%] items-center flex-nowrap ">
          <Text variant="caption-medium" className="capitalize text-gray-500">
            Payback
          </Text>
          <SwapArrow className={"rotate-180"} />
        </div>
        <Token token={zeroAddress} chainId={rollupA.id} />
        <div className="flex flex-col w-[30%] items-center flex-nowrap ">
          <Text variant="caption-medium" className="capitalize text-gray-500">
            Flash Loan
          </Text>
          <Arrow className={"rotate-180"} />
        </div>
        <Token token={zeroAddress} chainId={rollupA.id} />
      </div>
    </div>
  );
};

export default FlashloansRoute;
