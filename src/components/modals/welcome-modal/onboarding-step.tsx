import { Text } from "@/components/ui/text";
import type { ComponentPropsWithoutRef, FC } from "react";
import { SwapRoute } from "@/components/swap/swap-route.tsx";
import { hoodi, rollupA } from "@/wagmi/config.ts";
import { zeroAddress } from "viem";
import { ProgressIndicator } from "./progress-indicator";

export type OnboardingStepProps = {
  onNext: () => void;
  onBack: () => void;
};

type FCProps = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof OnboardingStepProps> &
    OnboardingStepProps
>;

export const OnboardingStep: FCProps = ({ onNext, onBack }) => {
  return (
    <>
      {/* Onboarding Icon */}
      <div className="w-[600px] h-[240px] flex items-center justify-center">
        <img
          src="/images/welcome-modal/onboarding.svg"
          alt="Onboarding"
          className="w-full h-full object-contain"
        />
      </div>

      <Text className="text-black w-full">
        <span className="font-bold">Bridge ETH from Hoodi</span>
      </Text>
      <Text className="text-gray-600 w-full">
        Start by bridging some ETH from  <span className="font-bold">Ethereum’s
        Hoodi testnet</span> to one of the Compose demo rollups. Choose how much ETH to bridge and where to receive it — this is your entry point into the Compose ecosystem.
      </Text>

      <div className='w-full'>
        <SwapRoute
          action="bridge"
          fromToken={{
            address: zeroAddress,
            chainId: hoodi.id,
          }}
          toToken={{ address: zeroAddress, chainId: rollupA.id }}
        />
      </div>
      {/* Action Buttons */}
      <div className="w-full flex justify-between">
        <button
          onClick={onBack}
          className='h-[60px] w-[160px] rounded-[20px] border border-[#14B5C0] bg-gradient-to-r from-[rgba(20,181,192,0.08)] via-[rgba(36,185,121,0.08)] to-[rgba(230,135,19,0.08)] text-[#14B5C0] font-semibold hover:bg-gradient-to-r hover:from-[rgba(20,181,192,0.12)] hover:via-[rgba(36,185,121,0.12)] hover:to-[rgba(230,135,19,0.12)] transition-all duration-200 cursor-pointer'
        >
          Back
        </button>
        <ProgressIndicator currentStep={2} />
        <button
          onClick={onNext}
          className='h-[60px] w-[160px] rounded-[20px] border border-[#14B5C0] bg-gradient-to-r from-[rgba(20,181,192,0.08)] via-[rgba(36,185,121,0.08)] to-[rgba(230,135,19,0.08)] text-[#14B5C0] font-semibold hover:bg-gradient-to-r hover:from-[rgba(20,181,192,0.12)] hover:via-[rgba(36,185,121,0.12)] hover:to-[rgba(230,135,19,0.12)] transition-all duration-200 cursor-pointer'
        >
          Next
        </button>
      </div>

    </>
  );
};

OnboardingStep.displayName = "OnboardingStep";