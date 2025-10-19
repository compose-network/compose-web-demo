import { useAccount } from "@/hooks/account/use-account";
import { useEffect, useState } from "react";
import { useLocalStorage } from "react-use";

const WELCOME_MODAL_SHOWN_KEY = "compose:welcome-modal-shown";

export const useWelcomeModal = () => {
  const { isConnected, address } = useAccount();
  const [wasShown, setWasShown] = useLocalStorage<boolean>(
    WELCOME_MODAL_SHOWN_KEY,
    false
  );
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    // Показываем модальное окно если кошелек подключен и модальное окно еще не показывалось
    if (isConnected && !wasShown && address) {
      setIsOpen(true);
    }
  }, [isConnected, wasShown, address]);

  const closeModal = () => {
    setIsOpen(false);
    setWasShown(true);
    setStep(1); // Reset to first step
  };

  const nextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else {
      closeModal();
    }
  };

  const prevStep = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
    }
  };

  const shouldShow = isOpen && isConnected && !wasShown;

  return {
    isOpen: shouldShow,
    step,
    closeModal,
    nextStep,
    prevStep,
  };
};