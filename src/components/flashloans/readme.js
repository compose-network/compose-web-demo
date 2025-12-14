/* eslint-disable */
/* @ts-nocheck */


// DOESNT WORK: Loan USDC (token1), adapter waits to receive USDC from the other chain 
const [{ userOp: sourceUserOp }, { userOp: destUserOp }] =
      await Promise.all([
        sourceSmartAccount.account.createUserOp([
          {
            to: flashAdapterContract, // Flash Adapter
            value: 0n,
            data: flashAdapterEncoder.flash({
              amount0: 0n,
              amount1: arbitrage.data?.optimalLoanAmount ?? 0n,
              pool: UNISWAP_V3[sourceChainId]?.SSV_USDC,
              calls: [
                {
                  target: sourceBridgeContract,
                  value: 0n,
                  callData: rollupBridgeEncoder.receiveTokens({
                    otherChainId: BigInt(destChainId),
                    sender: destSmartAccount.account.address!,
                    receiver: flashAdapterContract,
                    sessionId: sessionId2,
                    srcBridge: destBridgeContract,
                  }),
                },
              ],
            }),
          },
        ]),
        destSmartAccount.account.createUserOp([
          {
            to: destBridgeContract,
            value: 0n,
            data: rollupBridgeEncoder.send({
              otherChainId: BigInt(sourceChainId),
              token: USDC_ADDRESS,
              sender: destSmartAccount.account.address!,
              receiver: flashAdapterContract,
              amount: parseEther("1") /* quoteDestChain.data[0] */,
              sessionId: sessionId2,
              destBridge: sourceBridgeContract,
            }),
          },
        ]),
      ]);