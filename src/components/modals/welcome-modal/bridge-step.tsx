import { Text } from "@/components/ui/text";
import type { ComponentPropsWithoutRef, FC } from "react";
import { SwapRoute } from "@/components/swap/swap-route.tsx";
import { zeroAddress } from "viem";
import { rollupA, rollupB } from "@/wagmi/config.ts";
import { ProgressIndicator } from "./progress-indicator";

export type BridgeStepProps = {
  onComplete: () => void;
  onBack: () => void;
};

type FCProps = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof BridgeStepProps> &
    BridgeStepProps
>;

export const BridgeStep: FCProps = ({ onComplete, onBack }) => {
  return (
    <>
      {/* Bridge Step Icon */}
      <div className="w-[600px] h-[240px] flex items-center justify-center">
        <img
          src="/images/welcome-modal/bridge.svg"
          alt="Bridge Step"
          className="w-full h-full object-contain"
        />
      </div>

      <Text className="text-black w-full font-bold">
        Bridge Tokens Instantly
      </Text>
      <Text className="text-gray-600 w-full">
        Finally, bridge your new token between rollups — instantly and atomically.
      </Text>
      <Text className="text-gray-600 w-full">
        Pick the token and destination rollup, then approve and sign to execute the full bridge in one synchronized
        transaction.
      </Text>

      <div className='w-full'>
        <SwapRoute
          action="bridge"
          fromToken={{
            address: zeroAddress,
            chainId: rollupB.id,
          }}
          toToken={{ address: zeroAddress, chainId: rollupA.id }}
        />
      </div>
      {/* Action Buttons */}
      <div className="w-full flex justify-between">
        <button
          onClick={onBack}
          className="h-[60px] w-[160px] rounded-[20px] border border-[#14B5C0] bg-gradient-to-r from-[rgba(20,181,192,0.08)] via-[rgba(36,185,121,0.08)] to-[rgba(230,135,19,0.08)] text-[#14B5C0] font-semibold hover:bg-gradient-to-r hover:from-[rgba(20,181,192,0.12)] hover:via-[rgba(36,185,121,0.12)] hover:to-[rgba(230,135,19,0.12)] transition-all duration-200 cursor-pointer"
        >
          Back
        </button>
        <ProgressIndicator currentStep={3} />
        <button
          onClick={onComplete}
          className="h-[60px] w-[160px] rounded-[20px] border border-[#14B5C0] bg-gradient-to-r from-[rgba(20,181,192,0.08)] via-[rgba(36,185,121,0.08)] to-[rgba(230,135,19,0.08)] text-[#14B5C0] font-semibold hover:bg-gradient-to-r hover:from-[rgba(20,181,192,0.12)] hover:via-[rgba(36,185,121,0.12)] hover:to-[rgba(230,135,19,0.12)] transition-all duration-200 cursor-pointer"
        >
         Next
        </button>
      </div>
    </>
  );
};

BridgeStep.displayName = "BridgeStep";