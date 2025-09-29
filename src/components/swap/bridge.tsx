import { TransactionBridge } from "@/components/swap/transaction-bridge";
import { UserOperationBridge } from "@/components/swap/user-operation-bridge";
import { useAccount } from "@/hooks/account/use-account";
import { hoodi } from "viem/chains";

export const Bridge = () => {
  const { chainId } = useAccount();
  if (chainId === hoodi.id) {
    return <TransactionBridge />;
  }
  return <UserOperationBridge />;
};

Bridge.displayName = "Bridge";
