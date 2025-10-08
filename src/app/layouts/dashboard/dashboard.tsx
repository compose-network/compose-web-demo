import { Navbar } from "@/app/layouts/dashboard/navbar";
import { BatchTransactionModal } from "@/components/modals/batch-transaction-modal";
import { SsvLoader } from "@/components/ui/ssv-loader.tsx";
import { TransactionModal } from "@/components/ui/transaction-modal";
import { useAccount } from "@/hooks/account/use-account";
import { useMaintenance } from "@/hooks/app/use-maintenance";
import { useBlockNavigationOnPendingTx } from "@/hooks/use-block-navigation-on-pending-tx";
import { BatchTransactionProvider } from "@/lib/machines/batch-transactions/context";
import { cn } from "@/lib/utils/tw";
import { useIsRestoring } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { ComponentPropsWithRef, FC } from "react";
import { Navigate } from "react-router";

export const DashboardLayout: FC<ComponentPropsWithRef<"div">> = ({
  children,
  className,
}) => {
  useBlockNavigationOnPendingTx();

  const isRestoring = useIsRestoring();
  const account = useAccount();

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
                "text-gray-800 flex flex-col h-screen max-h-screen overflow-hidden",
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
        <BatchTransactionModal />
      </BatchTransactionProvider>
    </>
  );
};

DashboardLayout.displayName = "Layout";
