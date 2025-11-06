import { Text } from "@/components/ui/text.tsx";
import { FaXmark } from "react-icons/fa6";
import { ProgressIndicator } from "@/components/modals/welcome-modal/progress-indicator.tsx";

interface HowItWorksProps {
  onlyContent?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
  onBack?: () => void;
}

// import { SwapRoute } from "@/components/swap/swap-route.tsx";
// import { zeroAddress } from "viem";
// import { rollupA, rollupB } from "@/wagmi/config.ts";
// import { USDC_ADDRESS } from "@/wagmi/addresses.ts";
// import { ProgressIndicator } from "@/components/modals/welcome-modal/progress-indicator.tsx";

const HowItWorksContent = ({
                             onlyContent, onComplete, onBack
                           }: {
  onlyContent?: boolean;
  onComplete?: () => void;
  onBack?: () => void;
}) => <>
  <div className="flex flex-col items-center gap-6">
    {/* Final Step Icon */}
    <div
      className="w-[600px] h-[160px] rounded-[20px] bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center gap-4 text"
      style={{ backgroundImage: "url(/images/welcome-modal/how-it-works.svg)" }}
    >
      <Text variant={"body-1-semibold"} className="text-white">
        How It Works
      </Text>
      <Text variant={"headline1"} className="text-white">
        Behind the Scenes
      </Text>
    </div>
    <Text className="text-gray-600 w-full">
      This demo runs on two OP Stack + Succinct rollups, each with its own independent sequencer. They’re
      connected
      through Compose’s Shared Publisher, which leads the synchronous composability protocol — enabling these
      rollups
      to operate together as one coordinated system.
    </Text>
    <Text className="text-gray-600 w-full">
      That’s how synchronous composability achieves atomicity: transactions across rollups either happen together
      or
      not at all, finalizing instantly once both sides confirm.
    </Text>
    <Text className="text-gray-600 w-full">
      Powered by account abstraction, Compose lets you sign once while multiple operations — swaps, bridges, and
      transfers — execute synchronously across rollups in the background.
    </Text>
    <Text className="text-gray-600 w-full">
      What normally takes multiple steps, chains, and confirmations happens here in one seamless atomic flow.
    </Text>
    {/*<div className="w-full">*/}
    {/*  <SwapRoute*/}
    {/*    action="swap"*/}
    {/*    fromToken={{*/}
    {/*      address: zeroAddress,*/}
    {/*      chainId: rollupA.id*/}
    {/*    }}*/}
    {/*    toToken={{ address: USDC_ADDRESS, chainId: rollupB.id }}*/}
    {/*  />*/}
    {/*</div>*/}
    {/* Action Buttons */}
    {!onlyContent && <div className="w-full flex justify-between">
      <button
        onClick={onBack}
        className="h-[60px] w-[160px] rounded-[20px] border border-[#14B5C0] bg-gradient-to-r from-[rgba(20,181,192,0.08)] via-[rgba(36,185,121,0.08)] to-[rgba(230,135,19,0.08)] text-[#14B5C0] font-semibold hover:bg-gradient-to-r hover:from-[rgba(20,181,192,0.12)] hover:via-[rgba(36,185,121,0.12)] hover:to-[rgba(230,135,19,0.12)] transition-all duration-200 cursor-pointer"
      >
        Back
      </button>
      <ProgressIndicator currentStep={5} />
      <button
        onClick={onComplete}
        className="h-[60px] w-[160px] rounded-[20px] border border-[#14B5C0] bg-gradient-to-r from-[rgba(20,181,192,0.08)] via-[rgba(36,185,121,0.08)] to-[rgba(230,135,19,0.08)] text-[#14B5C0] font-semibold hover:bg-gradient-to-r hover:from-[rgba(20,181,192,0.12)] hover:via-[rgba(36,185,121,0.12)] hover:to-[rgba(230,135,19,0.12)] transition-all duration-200 cursor-pointer"
      >
        Close
      </button>
    </div>}
  </div>
</>;

const HowItWorks = ({ onlyContent, onClose, onBack, onComplete }: HowItWorksProps) => {
  if (onlyContent) {
    return  <HowItWorksContent onBack={onBack} onComplete={onComplete} />
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-gray-modal backdrop-blur-[10px]"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative z-[10000] bg-white rounded-[40px] shadow-2xl p-8 max-w-[648px] mx-4 border border-gray-200">
        <button
          onClick={onClose}
          className="absolute right-[-12px] top-[-5px] rounded-[100px] border border-[#14B5C0] transition-opacity hover:opacity-100 focus:outline-none bg-gray-100 hover:bg-gray-200 p-2"
        >
          <FaXmark className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <HowItWorksContent onlyContent onBack={onBack} onComplete={onComplete} />
      </div>
    </div>
  );
};

export default HowItWorks;