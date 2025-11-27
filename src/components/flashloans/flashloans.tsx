import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import FlahLoansTokens from "@/components/flashloans/flah-loans-tokens.tsx";
import FlashloansRoute from "@/components/flashloans/flashloans-route.tsx";
import { TokenInput } from "@/components/swap/token-picker/token-input.tsx";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider.tsx";
import { Form } from "@/components/ui/form.tsx";
import { Text } from "@/components/ui/text";
import { useAccount } from "@/hooks/account/use-account";
import { usePoolData } from "@/lib/contract-interactions/uniswap-v3/use-pool-data";
import { findOptimalLoan } from "@/lib/utils/arbitrage";
import { formatCurrency } from "@/lib/utils/number";
import { USDC_ADDRESS } from "@/wagmi/addresses";
import {
  rollupA,
  rollupB
} from "@/wagmi/config.ts";
import { UNISWAP_V3 } from "@/wagmi/uniswap";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { isAddress, parseEther, zeroAddress } from "viem";
import { z } from "zod";
import { AssetLogo } from "../ui/asset-logo";

const schema = z.object({
  fromChainId: z
    .number()
    .default(rollupA.id)
    .refine((id) => id === rollupA.id || id === rollupB.id, {
      message: "Chain ID must be rollupA or rollupB",
    }),
  fromToken: z.string().refine(isAddress).default(zeroAddress),
  fromAmount: z.bigint().min(parseEther("0.000001"), {
    message: "Amount must be greater than 0.000001",
  }),
});

export const Flashloans = () => {
  const { isConnected } = useAccount();

  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      fromChainId: rollupA.id,
      fromToken: zeroAddress,
      fromAmount: 0n,
    },
    resolver: zodResolver(schema),
  });

  const isStage = /stage|localhost/.test(location.host);

  const values = form.watch();

  const submit = form.handleSubmit(async (values) => {
    console.log("Flashloan submitted:", values);
  });

  const poolA = usePoolData({
    contract: UNISWAP_V3[rollupA.id]?.WETH_USDC,
    chainId: rollupA.id,
  });

  const poolB = usePoolData({
    contract: UNISWAP_V3[rollupB.id]?.WETH_USDC,
    chainId: rollupB.id,
  });

  const arbitrage = useQuery({
    queryKey: ["arbitrage", poolA.data, poolB.data],
    queryFn: () => {
      if (!poolA.data || !poolB.data) return null;
      return findOptimalLoan(poolA.data, poolB.data);
    },
    enabled: !!poolA.data && !!poolB.data,
  });

  return (
    <>
      <Form {...form}>
        <Text variant={"headline4"} className="font-normal">
          Cross Chain Flashloans
        </Text>
        <form onSubmit={submit} className="flex flex-col gap-8">
          <div className="flex gap-4 flex-col">
            <TokenInput
              showBalance={false}
              chains={[
                {
                  chainId:
                    arbitrage.data?.direction === "AtoB"
                      ? rollupA.id
                      : rollupB.id,
                  tokens: [USDC_ADDRESS],
                },
              ]}
              readOnly
              onChange={() => {}}
              onSelectToken={() => {}}
              onChainSelect={() => {}}
              canPickToken={false}
              value={arbitrage.data?.optimalLoanAmount ?? 0n}
              tokenAddress={USDC_ADDRESS}
              chainId={values.fromChainId}
            />
            {form.formState.errors.fromAmount && (
              <Text variant="body-3-medium" className="text-error-500">
                {form.formState.errors.fromAmount?.message}
              </Text>
            )}
            <Divider className="flex-1" />
            <FlahLoansTokens
              priceA={poolA.data?.formatted.price ?? "0"}
              priceB={poolB.data?.formatted.price ?? "0"}
              tokenAddressA={zeroAddress}
              tokenAddressB={zeroAddress}
              chainIdA={
                arbitrage.data?.direction === "AtoB" ? rollupA.id : rollupB.id
              }
              chainIdB={
                arbitrage.data?.direction === "AtoB" ? rollupB.id : rollupA.id
              }
            />
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => poolA.randomize()}
              variant="subtle"
              size="sm"
              className="flex-1 text-xs"
            >
              <span className="text-xs text-gray-500"> [Stage Only] </span>{" "}
              Randomize Liquidity Pool A
            </Button>
            <Button
              onClick={() => poolB.randomize()}
              variant="subtle"
              size="sm"
              className="flex-1 text-xs"
            >
              <span className="text-xs text-gray-500"> [Stage Only] </span>{" "}
              Randomize Liquidity Pool B
            </Button>
          </div>
          <div className="flex flex-col gap-5">
            <Divider className="flex-1" />
            <div className="flex justify-between items-center px-5">
              <Text variant="body-3-medium" className={"text-gray-600"}>
                Estimated Profit
              </Text>
              <div className="flex gap-3 items-center">
                <AssetLogo
                  tokenAddress={USDC_ADDRESS}
                  chainId={values.fromChainId}
                  size="sm"
                />
                <Text variant="body-2-medium" className={"text-gray-800"}>
                  {formatCurrency(arbitrage.data?.profit ?? 0n, 18)} USDC
                </Text>
              </div>
            </div>
            <Divider />
          </div>
          <FlashloansRoute
            sourceChainId={
              arbitrage.data?.direction === "AtoB" ? rollupA.id : rollupB.id
            }
            destChainId={
              arbitrage.data?.direction === "AtoB" ? rollupB.id : rollupA.id
            }
            loanToken={USDC_ADDRESS}
            swapToken={USDC_ADDRESS}
          />
          {isConnected && isStage ? (
            <Button
              size="xl"
              className="w-full"
              type="submit"
              disabled={!form.formState.isValid || form.formState.isSubmitting}
            >
              Cross Chain Flashloans
            </Button>
          ) : (
            <ConnectWalletBtn size="xl" />
          )}
        </form>
      </Form>
    </>
  );
};

Flashloans.displayName = "Flashloans";
