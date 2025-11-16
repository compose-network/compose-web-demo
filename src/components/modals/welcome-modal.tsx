import { FaXmark } from "react-icons/fa6";
import type { ComponentPropsWithoutRef, FC } from "react";
import { WelcomeStep } from "./welcome-modal/welcome-step";
import { OnboardingStep } from "./welcome-modal/onboarding-step";
import { BridgeStep } from "./welcome-modal/bridge-step";
import { FinalStep } from "./welcome-modal/final-step";
import HowItWorks from "@/components/modals/welcome-modal/how-it-works.tsx";

export type WelcomeModalProps = {
  isOpen: boolean;
  step: 1 | 2 | 3 | 4 | 5;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
};

type FCProps = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof WelcomeModalProps> &
  WelcomeModalProps
>;

export const WelcomeModal: FCProps = ({ isOpen, step, onClose, onNext, onBack }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-gray-modal backdrop-blur-[10px]"
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

        <div className="flex flex-col items-center gap-6">
          {step === 1 && <WelcomeStep onNext={onNext} />}
          {step === 2 && <OnboardingStep onNext={onNext} onBack={onBack} />}
          {step === 3 && <BridgeStep onComplete={onNext} onBack={onBack} />}
          {step === 4 && <FinalStep onComplete={onNext} onBack={onBack} />}
          {step === 5 && <HowItWorks onlyContent onComplete={onClose} onClose={onClose} onBack={onBack} />}
        </div>
      </div>
    </div>
  );
};

WelcomeModal.displayName = "WelcomeModal";