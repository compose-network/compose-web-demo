import { Navbar } from "@/app/layouts/dashboard/navbar";
// import { BatchTransactionModal } from "@/components/modals/batch-transaction-modal";
import { WelcomeModal } from "@/components/modals/welcome-modal";
import { SsvLoader } from "@/components/ui/ssv-loader.tsx";
import { TransactionModal } from "@/components/ui/transaction-modal";
import { useAccount } from "@/hooks/account/use-account";
import { useMaintenance } from "@/hooks/app/use-maintenance";
import { useBlockNavigationOnPendingTx } from "@/hooks/use-block-navigation-on-pending-tx";
import { useWelcomeModal } from "@/hooks/use-welcome-modal";
import { BatchTransactionProvider } from "@/lib/machines/batch-transactions/context";
import { decodeUserOperationLogs } from "@/lib/smart-account/user-op";
import { cn } from "@/lib/utils/tw";
import { config } from "@/wagmi/config";
import { useIsRestoring } from "@tanstack/react-query";
import { getPublicClient } from "@wagmi/core";
import { AnimatePresence, motion } from "framer-motion";
import type { ComponentPropsWithRef, FC } from "react";
import { Navigate } from "react-router";

// DO NOT REMOVE THIS FUNCTION, it is used for debugging purposes
((w) => {
  w.getLogs = async (hash: `0x${string}`, chainId = 88888) => {
    // @ts-expect-error - chainId is not a valid chainId
    const client = getPublicClient(config, { chainId });
    const receipt = await client.waitForTransactionReceipt({ hash });
    const logs = decodeUserOperationLogs(receipt.logs);
    console.log("logs:", logs);
    return logs;
  };

  w.toggleDebug = (v: boolean = true) => {
    window.localStorage.setItem("advancedMode", v.toString());
  };

  //eslint-disable-next-line
})(window as any);

export const DashboardLayout: FC<ComponentPropsWithRef<"div">> = ({
  children,
  className,
}) => {
  useBlockNavigationOnPendingTx();

  const isRestoring = useIsRestoring();
  const account = useAccount();
  const welcomeModal = useWelcomeModal();

  const { isMaintenancePage } = useMaintenance();
  if (isMaintenancePage) {
    return <Navigate to="/maintenance" replace />;
  }

  return (
    <>
      <BatchTransactionProvider>
        <AnimatePresence>
          {isRestoring || account.isReconnecting ? (
            <motion.div
              className={cn(
                "fixed flex-col gap-1 bg-gray-50 inset-0 flex h-screen items-center justify-center",
              )}
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SsvLoader className={"size-[160px]"} />
            </motion.div>
          ) : (
            <motion.div
              className={cn(
                "text-gray-800 bg-white flex flex-col h-screen max-h-screen overflow-hidden",
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="content"
            >
              <Navbar className="px-5" />
              <main className={cn(className, "flex-1 overflow-auto")}>
                {children}
              </main>
            </motion.div>
          )}
        </AnimatePresence>
        <TransactionModal />
        <WelcomeModal
          isOpen={welcomeModal.isOpen}
          step={welcomeModal.step}
          onClose={welcomeModal.closeModal}
          onNext={welcomeModal.nextStep}
          onBack={welcomeModal.prevStep}
        />
        {/*<BatchTransactionModal />*/}
      </BatchTransactionProvider>
    </>
  );
};

DashboardLayout.displayName = "Layout";
