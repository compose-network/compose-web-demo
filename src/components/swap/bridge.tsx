import { TransactionBridge } from "@/components/swap/transaction-bridge";
import { UserOperationBridge } from "@/components/swap/user-operation-bridge";
import { useAccount } from "@/hooks/account/use-account";
import { l2CrossDomainMessengerABI, l2StandardBridgeABI } from "@/lib/abi/swap/bridge";
import { decodeEventLog } from "viem";
import { hoodi } from "viem/chains";

window.decodeLog = () => {
  return [
    decodeEventLog({
      abi: l2StandardBridgeABI,
      data: "0x000000000000000000000000012f55b6cc5d57f943f1e79cf00214b652513f88000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000",
      topics: [
        "0xb0444523268717a02698be47d0803aa7468c00acbed2f8bd93a0459cde61dd89",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x000000000000000000000000deaddeaddeaddeaddeaddeaddeaddeaddead0000",
        "0x000000000000000000000000012f55b6cc5d57f943f1e79cf00214b652513f88",
      ],
    }),
    decodeEventLog({
      abi: l2StandardBridgeABI,
      data: "0x000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000",
      topics: [
        "0x31b2166ff604fc5672ea5df08a78081d2bc6d746cadce880747f3643d819e83d",
        "0x000000000000000000000000012f55b6cc5d57f943f1e79cf00214b652513f88",
        "0x000000000000000000000000012f55b6cc5d57f943f1e79cf00214b652513f88",
      ],
    }),
    decodeEventLog({
      abi: l2CrossDomainMessengerABI,
      data: "0x",
      topics: [
        "0x4641df4a962071e12719d8c8c8e5ac7fc4d97b927346a3d7a335b1f7517e133c",
        "0xfd90418a10086894d0884a894246b7e20d2b222ed9ffa573aefe1a77dfcc664e",
      ],
    }),
  ];
};
export const Bridge = () => {
  const { chainId } = useAccount();
  if (chainId === hoodi.id) {
    return <TransactionBridge />;
  }
  return <UserOperationBridge />;
};

Bridge.displayName = "Bridge";
