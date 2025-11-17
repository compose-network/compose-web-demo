import { ConnectWalletBtn } from "@/components/connect-wallet/connect-wallet-btn";
import { Form } from "@/components/ui/form.tsx";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider.tsx";
import { Text } from "@/components/ui/text";
import { useForm } from "react-hook-form";
import { TokenInput } from "@/components/swap/token-picker/token-input.tsx";
import { useAccount } from "@/hooks/account/use-account";
import { hoodi } from "viem/chains";
import { isAddress, parseEther, zeroAddress } from "viem";
import {
  arbitrumChain,
  baseChain,
  optimismChain,
  rollupA,
  rollupB,
} from "@/wagmi/config.ts";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import KakietoTokeni from "@/components/flashloans/kakieto-tokeni.tsx";
import FlashloansRoute from "@/components/flashloans/flashloans-route.tsx";

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

const Flashloans = () => {
  const { isConnected } = useAccount();

  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      fromChainId: rollupA.id,
      fromToken: zeroAddress,
      fromAmount: 0n,
    },
    resolver: zodResolver(schema),
  });

  const values = form.watch();

  const submit = form.handleSubmit(async (values) => {
    console.log("Flashloan submitted:", values);
  });

  return (
    <>
      {/*<TransactionModal*/}
      {/*  title={"Flashloan"}*/}
      {/*  data={transactionData}*/}
      {/*  errorMessage={errorMessage}*/}
      {/*  isOpen={!!transactionData}*/}
      {/*  onOpenChange={(open) => {*/}
      {/*    if (open) return;*/}
      {/*    return setTransactionData(null);*/}
      {/*  }}*/}
      {/*/>*/}
      <Form {...form}>
        <Text variant={"headline4"} className="font-normal">
          Cross Chain Flashloans
        </Text>
        <form onSubmit={submit} className="flex flex-col gap-8">
          <div className="flex gap-4 flex-col">
            <TokenInput
              chains={[
                {
                  chainId: rollupA.id,
                  tokens: [zeroAddress],
                },
                {
                  chainId: rollupB.id,
                  tokens: [zeroAddress],
                },
                { chainId: hoodi.id, isNotSupported: true },
                { chainId: baseChain.id, isNotSupported: true },
                { chainId: arbitrumChain.id, isNotSupported: true },
                { chainId: optimismChain.id, isNotSupported: true },
              ]}
              value={values.fromAmount}
              tokenAddress={values.fromToken}
              chainId={values.fromChainId}
              onSelectToken={(token) => {
                form.setValue("fromToken", token, {
                  shouldValidate: true,
                });
              }}
              onChainSelect={(chainId) =>
                form.setValue(
                  "fromChainId",
                  chainId as typeof rollupA.id | typeof rollupB.id,
                )
              }
              onChange={(amount) => {
                form.setValue("fromAmount", amount, {
                  shouldValidate: true,
                });
              }}
            />
            {form.formState.errors.fromAmount && (
              <Text variant="body-3-medium" className="text-error-500">
                {form.formState.errors.fromAmount?.message}
              </Text>
            )}
            <Divider className="flex-1" />
            <KakietoTokeni />
            <Divider className="flex-1" />
            <div className="flex justify-between items-center">
              <Text variant="body-3-medium" className={"text-gray-600"}>
                Estimated Profit
              </Text>
              <Text variant="body-3-medium" className={"text-gray-800"}>
                0.02 ETH
              </Text>
            </div>
          </div>
          <Divider />
          <FlashloansRoute />
          {/*<DashedArrow />*/}
          {/*<ActionRoute*/}
          {/*  type={"swap"}*/}
          {/*  from={zeroAddress}*/}
          {/*  fromChainId={rollupB.id}*/}
          {/*  to={zeroAddress}*/}
          {/*  toChainId={rollupB.id}*/}
          {/*/>*/}
          {isConnected ? (
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

export default Flashloans;
