import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import {
  createRollupPublicClients,
  createUserOp,
} from "@/components/swap/utils/core";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/account/use-account";
import {
  erc20Encoder,
  flashAdapterEncoder,
  rollupBridgeEncoder,
} from "@/lib/contract-interactions/encoders";
import { useSmartAccount } from "@/lib/smart-account/kernel";
import { toRpcUserOpCanonical } from "@/lib/smart-account/user-op";
import { encodeXtMessage } from "@/lib/smart-account/xt";
import { getBridgeAddress, SSV_ADDRESS, UNISWAP_V3 } from "@/wagmi/addresses";
import { rollupA, rollupB } from "@/wagmi/config";
import { prepareAndSignUserOperations } from "@zerodev/multi-chain-ecdsa-validator";

import { type FC } from "react";
import { parseEther } from "viem";
import { useSwitchChain } from "wagmi";

export const Playground: FC = () => {
  const { address: eoa, isConnected } = useAccount();
  const switchChain = useSwitchChain();
  const { kernel } = useSmartAccount();

  const kernelA = kernel.data?.accounts?.A;
  const kernelB = kernel.data?.accounts?.B;

  const runFlash = async () => {
    if (!isConnected || !eoa) return console.error("Not connected");
    if (!kernelA || !kernelB) return console.error("Kernel not found");

    const [publicClientA, publicClientB] = createRollupPublicClients(
      rollupA.id,
      rollupB.id,
    );

    await switchChain.switchChainAsync({ chainId: rollupA.id });

    const bridgeContractA = getBridgeAddress(rollupA.id);
    const bridgeContractB = getBridgeAddress(rollupB.id);

    const sessionId = BigInt(Math.floor(Math.random() * 1000000));
    const sessionId2 = BigInt(Math.floor(Math.random() * 1000000));

    const flashAdapterContract = "0x96c08a7a6d0ae2bec9bb816dbacec39d30c1dfe1";

    const [opA, opB] = await Promise.all([
      createUserOp({
        account: kernelA,
        chainId: rollupA.id,
        calls: [
          {
            to: flashAdapterContract, // Flash Adapter
            value: 0n,
            data: flashAdapterEncoder.flash({
              amount0: parseEther("1"),
              amount1: 0n,
              pool: UNISWAP_V3[77777].SSV_LINK,
              calls: [
                {
                  target: bridgeContractA,
                  value: 0n,
                  callData: rollupBridgeEncoder.send({
                    otherChainId: BigInt(rollupB.id),
                    token: SSV_ADDRESS,
                    sender: flashAdapterContract,
                    receiver: kernelB.address,
                    amount: parseEther("1"),
                    sessionId: sessionId,
                    destBridge: bridgeContractB,
                  }),
                },
                {
                  target: bridgeContractA,
                  value: 0n,
                  callData: rollupBridgeEncoder.receiveTokens({
                    otherChainId: BigInt(rollupB.id),
                    sender: kernelB.address,
                    receiver: flashAdapterContract,
                    sessionId: sessionId2,
                    srcBridge: bridgeContractB,
                  }),
                },
                {
                  target: SSV_ADDRESS,
                  value: 0n,
                  callData: erc20Encoder.transfer({
                    recipient: kernelA.address!,
                    amount: parseEther("2"),
                  }),
                },
              ],
            }),
          },
        ],
      }),
      createUserOp({
        account: kernelB,
        chainId: rollupB.id,
        calls: [
          {
            to: bridgeContractB,
            value: 0n,
            data: rollupBridgeEncoder.receiveTokens({
              otherChainId: BigInt(rollupA.id),
              sender: flashAdapterContract,
              receiver: kernelB.address,
              sessionId: sessionId,
              srcBridge: bridgeContractA,
            }),
          },
          {
            to: bridgeContractB,
            value: 0n,
            data: rollupBridgeEncoder.send({
              otherChainId: BigInt(rollupA.id),
              token: SSV_ADDRESS,
              sender: kernelB.address,
              receiver: flashAdapterContract,
              amount: parseEther("10"),
              sessionId: sessionId2,
              destBridge: bridgeContractA,
            }),
          },
        ],
      }),
    ]);

    const [signedA, signedB] = await prepareAndSignUserOperations(
      [publicClientA, publicClientB],
      [opA, opB],
    );

    const userOpA = toRpcUserOpCanonical(signedA);
    const userOpB = toRpcUserOpCanonical(signedB);

    const [buildA, buildB] = await Promise.all([
      publicClientA.request({
        method: "compose_buildSignedUserOpsTx",
        params: [[userOpA], { chainId: rollupA.id }],
      }),
      publicClientB.request({
        method: "compose_buildSignedUserOpsTx",
        params: [[userOpB], { chainId: rollupB.id }],
      }),
    ]);

    const explorerUrls = [
      new URL(
        `tx/${buildA.hash}`,
        publicClientA.chain.blockExplorers?.default?.url,
      ).toString(),
      new URL(
        `tx/${buildB.hash}`,
        publicClientB.chain.blockExplorers?.default?.url,
      ).toString(),
    ];
    explorerUrls.forEach((url) => console.log(url));

    Promise.all([
      publicClientA.waitForTransactionReceipt({
        hash: buildA.hash,
      }),
      publicClientB.waitForTransactionReceipt({
        hash: buildB.hash,
      }),
    ]).then(([receiptA, receiptB]) => {
      console.log("receiptA:", receiptA);
      console.log("receiptB:", receiptB);
    });

    const payload = encodeXtMessage({
      senderId: "client",
      entries: [
        { chainId: rollupA.id, rawTx: buildA.raw as `0x${string}` },
        { chainId: rollupB.id, rawTx: buildB.raw as `0x${string}` },
      ],
    });

    await publicClientA
      .request({
        method: "eth_sendXTransaction",
        params: [payload],
      })
      .then((res) => {
        console.log("eth_sendXTransaction res:", res);
      });
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center">
      <Button onClick={runFlash} disabled={!isConnected || !eoa}>
        Run Flash
      </Button>
      <ConnectWalletBtn className="max-w-[300px]" />
    </div>
  );
};

Playground.displayName = "Playground";
