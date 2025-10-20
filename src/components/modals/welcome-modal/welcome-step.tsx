import { Text } from "@/components/ui/text";
import type { ComponentPropsWithoutRef, FC } from "react";

export type WelcomeStepProps = {
  onNext: () => void;
};

type FCProps = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof WelcomeStepProps> &
    WelcomeStepProps
>;

export const WelcomeStep: FCProps = ({ onNext }) => {
  return (
    <>
      {/* Welcome Icon */}
      <div
        className="w-[600px] h-[240px] rounded-[20px] bg-cover bg-center bg-no-repeat flex justify-center items-center text"
        style={{ backgroundImage: 'url(/images/welcome-modal/welcome.png)' }}
      ><Text variant={"headline1"} className="text-white">
        Welcome to Compose
      </Text></div>

      <Text className="text-gray-600">
        Compose Network unites Ethereum rollups to enable <span className="font-bold">instant, atomic, and composable transactions</span>.
      </Text>

      <Text className="text-gray-600">
        In this demo, you'll bridge and swap tokens between two demo rollups to experience real cross-rollup composability.
      </Text>

      {/* Next Button */}
      <button
        onClick={onNext}
        className='w-full h-[60px] rounded-[20px] border border-[#14B5C0] bg-gradient-to-r from-[rgba(20,181,192,0.08)] via-[rgba(36,185,121,0.08)] to-[rgba(230,135,19,0.08)] text-[#14B5C0] font-semibold hover:bg-gradient-to-r hover:from-[rgba(20,181,192,0.12)] hover:via-[rgba(36,185,121,0.12)] hover:to-[rgba(230,135,19,0.12)] transition-all duration-200 cursor-pointer'
      >
        Next
      </button>
    </>
  );
};

WelcomeStep.displayName = "WelcomeStep";