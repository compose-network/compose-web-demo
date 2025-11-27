import { cn } from "@/lib/utils/tw.ts";
import { Text } from "@/components/ui/text.tsx";
import type { Address } from "viem";
import { AssetLogo } from "@/components/ui/asset-logo.tsx";
import { chainsMap } from "@/wagmi/config.ts";
import { DottedArrowLine } from "@/components/ui/dashed-arrow.tsx";
import { SwapArrow } from "@/components/ui/swap-arrow.tsx";
import { Arrow } from "@/components/ui/arrow.tsx";

type FlashloansRouteProps = {
  sourceChainId: number;
  destChainId: number;
  loanToken: Address;
  swapToken: Address;
};

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

const FlashloansRoute = ({
  sourceChainId,
  destChainId,
  loanToken,
  swapToken,
}: FlashloansRouteProps) => {
  return (
    <div className="flex w-full gap-6 flex-col">
      {/* Row 1 (Source Chain): loanToken <- loanToken (flash loan) <- swapToken */}
      <div className={cn("flex select-none w-full justify-center")}>
        <Token token={loanToken} chainId={sourceChainId} />
        <div className="flex flex-col w-[30%] items-center flex-nowrap ">
          <Text variant="caption-medium" className="capitalize text-gray-500">
            Payback
          </Text>
          <DottedArrowLine />
        </div>
        <Token isFlashLoan token={loanToken} chainId={sourceChainId} />
        <div className="flex flex-col w-[30%] items-center flex-nowrap ">
          <Text variant="caption-medium" className="capitalize text-gray-500">
            Flash Loan
          </Text>
          <DottedArrowLine />
        </div>
        <Token token={loanToken} chainId={sourceChainId} />
      </div>
      <div className={cn("flex select-none w-full justify-between")}>
        <div className="flex flex-col items-center w-20 justify-between">
          <Arrow className="rotate-[-90deg] w-[40px]" />
        </div>
        <div className="relative flex flex-col items-center w-20 justify-between">
          <SwapArrow className="rotate-90 w-[40px]" />
        </div>
      </div>
      {/* Row 2 (Dest Chain): swapToken -> loanToken -> loanToken */}
      <div className={cn("flex select-none w-full justify-center")}>
        <Token token={loanToken} chainId={destChainId} />
        <div className="flex flex-col w-[30%] items-center flex-nowrap ">
          <Text variant="caption-medium" className="capitalize text-gray-500">
            Swap
          </Text>
          <SwapArrow className={"rotate-180"} />
        </div>
        <Token token={swapToken} chainId={destChainId} />
        <div className="flex flex-col w-[30%] items-center flex-nowrap ">
          <Text variant="caption-medium" className="capitalize text-gray-500">
            Bridge
          </Text>
          <Arrow className={"rotate-180"} />
        </div>
        <Token token={swapToken} chainId={destChainId} />
      </div>
    </div>
  );
};

export default FlashloansRoute;
