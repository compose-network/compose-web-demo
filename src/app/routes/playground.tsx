// import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
// import FlahLoansTokens from "@/components/flashloans/flah-loans-tokens.tsx";
// import FlashloansRoute from "@/components/flashloans/flashloans-route.tsx";
// import { TokenInput } from "@/components/swap/token-picker/token-input.tsx";
// import { Button } from "@/components/ui/button";
// import { Divider } from "@/components/ui/divider.tsx";
// import { Text } from "@/components/ui/text";
// import { useAccount } from "@/hooks/account/use-account";
// import {
//   erc20Encoder,
//   flashAdapterEncoder,
//   rollupBridgeEncoder,
//   uniswapEncoders,
// } from "@/lib/contract-interactions/encoders";
// import { usePoolData } from "@/lib/contract-interactions/uniswap-v3/use-pool-data";
// import { useSmartAccount } from "@/lib/smart-account/kernel";
// import { findOptimalLoan } from "@/lib/utils/arbitrage";
// import { formatCurrency } from "@/lib/utils/number";
// import { SSV_ADDRESS, USDC_ADDRESS, WETH_ADDRESS } from "@/wagmi/addresses";
// import { getBridgeAddress, rollupA, rollupB } from "@/wagmi/config.ts";
// import { UNISWAP_V3 } from "@/wagmi/uniswap";
// import { keepPreviousData, useQuery } from "@tanstack/react-query";
// import {
//   Address,
//   encodeFunctionData,
//   formatEther,
//   parseEther,
//   zeroAddress,
// } from "viem";
// import {
//   useBalance,
//   useReadContract,
//   useReadContracts,
//   useSimulateContract,
//   useSwitchChain,
//   useWriteContract,
// } from "wagmi";
// import { AssetLogo } from "../ui/asset-logo";
// import { toast } from "../ui/use-toast";
// import { useUniswapV3QuoterContractHooks } from "@/lib/contract-interactions/uniswap-v3/hooks";
// import { prepareUserOperation } from "viem/account-abstraction";
// import { omit } from "lodash-es";
// import {
//   composePreparedUserOps,
//   composeUnpreparedUserOps,
// } from "@ssv-labs/compose-sdk";
// import { useBalanceOf } from "@/lib/contract-interactions/erc-20/read/use-balance-of";
// import { globals } from "@/config";
// import { FlashAdapterABI } from "@/lib/abi/flashloan/flash-adapter";
// import { UserOperationBridgeAbi } from "@/lib/abi/swap/op-bridge";
// import { TokenABI } from "@/lib/abi/token";

// function mulDivRoundingUp(a: bigint, b: bigint, denominator: bigint): bigint {
//   const result = (a * b) / denominator;
//   if ((a * b) % denominator === 0n) {
//     return result;
//   }
//   return result + 1n;
// }

// type Call = { to: Address; value: bigint; data: `0x${string}` };
// type FlashAdapterCall = {
//   target: Address;
//   value: bigint;
//   callData: `0x${string}`;
// };

// const toFlashAdapterCall = ({ to, value, data }: Call): FlashAdapterCall => ({
//   target: to,
//   value,
//   callData: data,
// });

// type BridgeProps = {
//   sender: Address;
//   receiver: Address;
//   token: Address;
//   amount: bigint;
//   sessionId: bigint;
// } & (
//   | { from: typeof rollupA.id | typeof rollupB.id; to?: never }
//   | { to: typeof rollupA.id | typeof rollupB.id; from?: never }
// );

// const createBridgeCalldata = ({
//   from,
//   to,
//   sender,
//   receiver,
//   token,
//   amount,
//   sessionId,
// }: BridgeProps) => {
//   const sourceChainId = from ?? (to === rollupA.id ? rollupB.id : rollupA.id);
//   const destChainId = to ?? (from === rollupA.id ? rollupB.id : rollupA.id);

//   const sourceBridgeContract = getBridgeAddress(sourceChainId);
//   const destBridgeContract = getBridgeAddress(destChainId);

//   const sendCallData = {
//     to: sourceBridgeContract,
//     value: 0n,
//     data: encodeFunctionData({
//       abi: UserOperationBridgeAbi,
//       functionName: "send",
//       args: [
//         BigInt(destChainId),
//         token,
//         sender,
//         receiver,
//         amount,
//         sessionId,
//         destBridgeContract,
//       ],
//     }),
//   };

//   const receiveCallData = {
//     to: destBridgeContract,
//     value: 0n,
//     data: encodeFunctionData({
//       abi: UserOperationBridgeAbi,
//       functionName: "receiveTokens",
//       args: [
//         BigInt(sourceChainId),
//         sender,
//         receiver,
//         sessionId,
//         sourceBridgeContract,
//       ],
//     }),
//   };

//   return [sendCallData, receiveCallData];
// };
// export const Flashloans = () => {
//   const { isConnected, address: eoa } = useAccount();
//   const { smartAccountA, smartAccountB, getKernelByChainId } =
//     useSmartAccount();
//   const switchChain = useSwitchChain();

//   const isStage = /stage|localhost|127.0.0.1/.test(location.host);

//   const poolA = usePoolData({
//     contract: UNISWAP_V3[rollupA.id]?.WETH_USDC,
//     chainId: rollupA.id,
//   });

//   const poolB = usePoolData({
//     contract: UNISWAP_V3[rollupB.id]?.WETH_USDC,
//     chainId: rollupB.id,
//   });

//   const arbitrage = useQuery({
//     queryKey: ["arbitrage", poolA.data, poolB.data],
//     queryFn: () => {
//       if (!poolA.data || !poolB.data) return null;
//       return findOptimalLoan(poolA.data, poolB.data);
//     },
//     enabled: !!poolA.data && !!poolB.data,
//   });

//   const [sourceChainId, destChainId] = [
//     arbitrage.data?.from || rollupA.id,
//     arbitrage.data?.to || rollupB.id,
//   ] as (typeof rollupA.id | typeof rollupB.id)[];

//   const sourceSmartAccount = getKernelByChainId(sourceChainId);
//   const destSmartAccount = getKernelByChainId(destChainId);

//   const { useQuoteExactInputSingle } = useUniswapV3QuoterContractHooks();

//   const quoteSourceChain = useQuoteExactInputSingle(
//     {
//       params: {
//         amountIn: arbitrage.data?.optimalLoanAmount ?? 0n,
//         fee: sourceChainId === rollupA.id ? 500 : 100,
//         sqrtPriceLimitX96: 0n,
//         tokenIn: USDC_ADDRESS,
//         tokenOut: WETH_ADDRESS,
//       },
//     },
//     {
//       contract: UNISWAP_V3[sourceChainId]?.QUOTER_V2_ADDRESS,
//       chainId: sourceChainId as number,
//       enabled: isConnected && !!sourceChainId,
//       placeholderData: keepPreviousData,
//     },
//   );

//   const quoteDestChain = useQuoteExactInputSingle(
//     {
//       params: {
//         amountIn: quoteSourceChain.data?.[0] ?? 0n,
//         fee: destChainId === rollupA.id ? 500 : 100,
//         sqrtPriceLimitX96: 0n,
//         tokenIn: WETH_ADDRESS,
//         tokenOut: USDC_ADDRESS,
//       },
//     },
//     {
//       contract: UNISWAP_V3[destChainId]?.QUOTER_V2_ADDRESS,
//       chainId: destChainId as number,
//       enabled: isConnected && !!destChainId,
//       placeholderData: keepPreviousData,
//     },
//   );

//   console.log(
//     "Source 1: USDC -> WETH",
//     quoteSourceChain.data?.[0] ? formatEther(quoteSourceChain.data[0]) : null,
//   );
//   console.log(
//     "Dest 2: WETH -> USDC",
//     quoteDestChain.data?.[0] ? formatEther(quoteDestChain.data[0]) : null,
//   );

//   const submit = async (ev: React.FormEvent<HTMLFormElement>) => {
//     ev.preventDefault();

//     // await switchChain.switchChainAsync({ chainId: rollupB.id });

//     // await writeContract.writeContractAsync({
//     //   address: "0xd8ebf5a1550bf282f17ecfd5f6780baf695c4e02",
//     //   abi: FlashAdapterABI,
//     //   functionName: "flash",
//     //   chainId:  rollupB.id ,
//     //   args: [UNISWAP_V3[rollupB.id]?.WETH_USDC, 0n, parseEther("1"), []],
//     // }).then(console.log)

//     // if (1 == 1) return;
//     if (
//       !arbitrage.data?.optimalLoanAmount ||
//       !quoteSourceChain.data?.[0] ||
//       !quoteDestChain.data?.[0]
//     )
//       return toast({
//         title: "No quote found",
//         variant: "destructive",
//       });
//     if (
//       !sourceSmartAccount ||
//       !destSmartAccount ||
//       !smartAccountB ||
//       !smartAccountA
//     )
//       return toast({
//         title: "Kernel not found",
//         variant: "destructive",
//       });

//     await switchChain.switchChainAsync({ chainId: sourceChainId });

//     const flashAdapterContract =
//       sourceChainId === rollupA.id
//         ? "0xbc28d433542d183cdba8fe9f164beca0b9f4404c"
//         : "0xd8ebf5a1550bf282f17ecfd5f6780baf695c4e02";

//     const sourceBridgeContract = getBridgeAddress(sourceChainId);
//     const destBridgeContract = getBridgeAddress(destChainId);

//     const sourceRouterV2Contract = UNISWAP_V3[sourceChainId].SWAP_ROUTER02;
//     const destRouterV2Contract = UNISWAP_V3[destChainId].SWAP_ROUTER02;

//     const sourcePool = UNISWAP_V3[sourceChainId]?.WETH_USDC;
//     const destPool = UNISWAP_V3[destChainId]?.WETH_USDC;

//     // const repay =
//     //   mulDivRoundingUp(
//     //     arbitrage.data?.optimalLoanAmount ?? 0n,
//     //     BigInt(sourceChainId === rollupA.id ? 500 : 100),
//     //     BigInt(1e6),
//     //   ) + arbitrage.data?.optimalLoanAmount;

//     // const profit = quoteDestChain.data[0] - repay;

//     // const ROUTER_V2_A = UNISWAP_V3[rollupA.id].SWAP_ROUTER02;
//     // const ROUTER_V2_B = UNISWAP_V3[rollupB.id].SWAP_ROUTER02;

//     // const BRIDGE_A = getBridgeAddress(rollupA.id);
//     // const BRIDGE_B = getBridgeAddress(rollupB.id);

//     // const ADAPTER_A = "0xbc28d433542d183cdba8fe9f164beca0b9f4404c";
//     // const ADAPTER_B = "0xd8ebf5a1550bf282f17ecfd5f6780baf695c4e02";

//     // const WETH_USDC_A = UNISWAP_V3[rollupA.id]?.WETH_USDC;
//     // const WETH_USDC_B = UNISWAP_V3[rollupB.id]?.WETH_USDC;
//    console.log(' quoteSourceChain.data[0]:',  quoteSourceChain.data[0])

//     const [sendWETH_from_source, receiveWETH_on_dest] = createBridgeCalldata({
//       from: sourceChainId,
//       receiver: destSmartAccount.address,
//       sender: flashAdapterContract,
//       token: WETH_ADDRESS,
//       amount: quoteSourceChain.data[0],
//       sessionId: BigInt(Math.floor(Math.random() * 1000000)),
//     });

//     const [sendUSDC_from_dest, receiveUSDC_on_source] = createBridgeCalldata({
//       from: destChainId,
//       receiver: flashAdapterContract,
//       sender: destSmartAccount.address,
//       token: USDC_ADDRESS,
//       amount: parseEther("1.01"),
//       sessionId: BigInt(Math.floor(Math.random() * 1000000)),
//     });

//     const repay =
//       mulDivRoundingUp(
//         arbitrage.data?.optimalLoanAmount ?? 0n,
//         BigInt(sourceChainId === rollupA.id ? 500 : 100),
//         BigInt(1e6),
//       ) + arbitrage.data?.optimalLoanAmount;

//     const clearEOA = "0x5b601de979c4d658632e5b528c6af42f05e2d296";

//     /*
//      *  Flash loan constraint: The pool you borrow from cannot be the same pool you swap in.
//      */
//     const { send, explorerUrls } = await composeUnpreparedUserOps(
//       await Promise.all([
//         sourceSmartAccount.createUserOp([
//           {
//             to: flashAdapterContract, // Flash Adapter
//             value: 0n,
//             data: flashAdapterEncoder.flash({
//               amount0: 0n,
//               amount1: arbitrage.data?.optimalLoanAmount ?? 0n,
//               pool: UNISWAP_V3[sourceChainId]?.SSV_USDC, // We use SSV_USDC for the flash but swap in the WETH_USDC pool
//               calls: [
//                 {
//                   target: USDC_ADDRESS,
//                   value: 0n,
//                   callData: erc20Encoder.approve({
//                     spender: sourceRouterV2Contract,
//                     amount: globals.MAX_WEI_AMOUNT,
//                   }),
//                 },
//                 {
//                   target: sourceRouterV2Contract,
//                   value: 0n,
//                   callData: uniswapEncoders.routerV2.exactInputSingle({
//                     params: {
//                       tokenIn: USDC_ADDRESS,
//                       tokenOut: WETH_ADDRESS,
//                       amountIn: arbitrage.data?.optimalLoanAmount ?? 0n,
//                       amountOutMinimum: quoteSourceChain.data?.[0] ?? 0n,
//                       sqrtPriceLimitX96: 0n,
//                       fee: sourceChainId === rollupA.id ? 500 : 100,
//                       recipient: flashAdapterContract,
//                     },
//                   }),
//                 },
//                 toFlashAdapterCall(sendWETH_from_source),
//                 toFlashAdapterCall(receiveUSDC_on_source),
//               ],
//             }),
//           },
//         ]),
//         destSmartAccount.createUserOp([
//           receiveWETH_on_dest,
//           // {
//           //   to: WETH_ADDRESS,
//           //   value: 0n,
//           //   data: erc20Encoder.approve({
//           //     spender: sourceRouterV2Contract,
//           //     amount: globals.MAX_WEI_AMOUNT,
//           //   }),
//           // },
//           // {
//           //   to: destRouterV2Contract,
//           //   value: 0n,
//           //   data: uniswapEncoders.routerV2.exactInputSingle({
//           //     params: {
//           //       tokenIn: WETH_ADDRESS,
//           //       tokenOut: USDC_ADDRESS,
//           //       amountIn: quoteSourceChain.data?.[0] ?? 0n,
//           //       amountOutMinimum: quoteDestChain.data?.[0] ?? 0n,
//           //       sqrtPriceLimitX96: 0n,
//           //       fee: destChainId === rollupA.id ? 500 : 100,
//           //       recipient: destSmartAccount.address,
//           //     },
//           //   }),
//           // },
//           sendUSDC_from_dest,
//         ]),
//       ]),
//     );
//     // const { send, explorerUrls } = await composeUnpreparedUserOps(
//     //   await Promise.all([
//     //     smartAccountA.account.createUserOp([
//     //       {
//     //         to: WETH_ADDRESS, // Flash Adapter
//     //         value: 0n,
//     //         data: erc20Encoder.transfer({
//     //           recipient: eoa!,
//     //           amount: parseEther("1.728"),
//     //         }),
//     //       },
//     //     ]),
//     //     smartAccountB.account.createUserOp([
//     //       {
//     //         to: WETH_ADDRESS, // Flash Adapter
//     //         value: 0n,
//     //         data: erc20Encoder.transfer({
//     //           recipient: eoa!,
//     //           amount: parseEther("0.3"),
//     //         }),
//     //       },
//     //     ]),
//     //   ]),
//     // );

//     explorerUrls.forEach((url) => console.log(url));
//     await send().catch(console.error);
//   };

//   const usdc = useBalanceOf(
//     {
//       address: USDC_ADDRESS,
//       chainId: sourceChainId,
//     },
//     {
//       account: eoa! as `0x${string}`,
//     },
//   );

//   return (
//     <>
//       <div>
//         <Text variant={"headline4"} className="font-normal">
//           Cross Chain Flashloans
//         </Text>
//         <Text variant={"headline4"} className="font-normal">
//           EOA USDC Balance: {formatCurrency(usdc.data ?? 0n, 18)} USDC
//         </Text>
//         <form onSubmit={submit} className="flex flex-col gap-8">
//           <div className="flex gap-4 flex-col">
//             <TokenInput
//               showBalance={false}
//               chains={[
//                 {
//                   chainId: sourceChainId,
//                   tokens: [USDC_ADDRESS],
//                 },
//               ]}
//               readOnly
//               onChange={() => {}}
//               onSelectToken={() => {}}
//               onChainSelect={() => {}}
//               canPickToken={false}
//               value={arbitrage.data?.optimalLoanAmount ?? 0n}
//               tokenAddress={USDC_ADDRESS}
//               chainId={sourceChainId}
//             />
//             <Divider className="flex-1" />
//             <FlahLoansTokens
//               priceA={
//                 arbitrage.data?.direction === "AtoB"
//                   ? (poolA.data?.formatted.price ?? "0")
//                   : (poolB.data?.formatted.price ?? "0")
//               }
//               priceB={
//                 arbitrage.data?.direction === "AtoB"
//                   ? (poolB.data?.formatted.price ?? "0")
//                   : (poolA.data?.formatted.price ?? "0")
//               }
//               tokenAddressA={SSV_ADDRESS}
//               tokenAddressB={SSV_ADDRESS}
//               chainIdA={sourceChainId}
//               chainIdB={destChainId}
//             />
//           </div>

//           <div className="flex flex-col gap-5">
//             <Divider className="flex-1" />
//             <div className="flex justify-between items-center px-5">
//               <Text variant="body-3-medium" className={"text-gray-600"}>
//                 Estimated Profit
//               </Text>
//               <div className="flex gap-3 items-center">
//                 <AssetLogo
//                   tokenAddress={USDC_ADDRESS}
//                   chainId={sourceChainId}
//                   size="sm"
//                 />
//                 <Text variant="body-2-medium" className={"text-gray-800"}>
//                   {formatCurrency(arbitrage.data?.profit ?? 0n, 18)} USDC
//                 </Text>
//               </div>
//             </div>
//             <Divider />
//           </div>
//           <FlashloansRoute
//             sourceChainId={
//               arbitrage.data?.direction === "AtoB" ? rollupA.id : rollupB.id
//             }
//             destChainId={
//               arbitrage.data?.direction === "AtoB" ? rollupB.id : rollupA.id
//             }
//             loanToken={USDC_ADDRESS}
//             swapToken={zeroAddress}
//           />
//           {isConnected && isStage ? (
//             <Button
//               size="xl"
//               className="w-full"
//               type="submit"
//               disabled={!arbitrage.data?.optimalLoanAmount}
//             >
//               Cross Chain Flashloans
//             </Button>
//           ) : (
//             <ConnectWalletBtn size="xl" />
//           )}
//         </form>
//       </div>
//     </>
//   );
// };

// Flashloans.displayName = "Flashloans";
