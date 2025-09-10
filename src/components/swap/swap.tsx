import { type FC, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/tw";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { rollupB } from "@/wagmi/config";
import { isAddress } from "viem";
import { TokenInput } from "@/components/swap/token-picker/token-input";
import { Card } from "@/components/ui/card";
import { useSwapContract } from "@/lib/contract-interactions/core/create-write-hooks";
import { getToken, tokens } from "@/wagmi/tokens";
import { keepPreviousData } from "@tanstack/react-query";
import { Divider } from "@/components/ui/divider";
import { Button } from "@/components/ui/button";
import { FaArrowDown } from "react-icons/fa6";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { textVariants } from "@/components/ui/text";

export type SwapProps = {
  // TODO: Add props or remove this type
};

type SwapFC = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof SwapProps> & SwapProps
>;

const schema = z.object({
  from: z.object({
    token: z.string().refine(isAddress),
    amount: z.bigint(),
    chainId: z.number(),
  }),
  to: z.object({
    token: z.string().refine(isAddress),
    amount: z.bigint(),
    chainId: z.number(),
  }),
  slippage: z.number(),
});
export const Swap: SwapFC = ({ className, ...props }) => {
  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      from: {
        token: tokens[rollupB.id][0].address,
        amount: 0n,
        chainId: rollupB.id,
      },
      to: {
        token: tokens[rollupB.id][1].address,
        amount: 0n,
        chainId: rollupB.id,
      },
      slippage: 0.5,
    },
    resolver: zodResolver(schema),
  });

  const values = form.watch();
  const { useGetSwapPrice } = useSwapContract();
  const prices = useGetSwapPrice(
    {
      tokenIn: getToken(values.from.token)?.id ?? 0,
      tokenOut: getToken(values.to.token)?.id ?? 0,
      amountIn: values.from.amount,
    },
    {
      placeholderData: values.from.amount ? keepPreviousData : undefined,
      chainId: rollupB.id,
      enabled: !!values.from.token && !!values.to.token,
    },
  );

  const isSameToken = values.from.token === values.to.token;

  return (
    <Card className={cn("max-w-[648px] mx-auto gap-8", className)} {...props}>
      <Tabs className="w-full" defaultValue="swap">
        <TabsList className="w-full bg-gray-200">
          <TabsTrigger
            disabled
            className={textVariants({
              variant: "headline4",
              className:
                "flex-1 h-[52px] font-semibold data-[state=inactive]:text-gray-500",
            })}
            value="from"
          >
            Bridge
          </TabsTrigger>
          <TabsTrigger
            className={textVariants({
              variant: "headline4",
              className:
                "flex-1 h-[52px] font-semibold data-[state=inactive]:text-gray-500",
            })}
            value="swap"
          >
            Swap
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex gap-4 flex-col">
        <TokenInput
          value={values.from.amount}
          tokenAddress={values.from.token}
          chainId={values.from.chainId}
          onSelectToken={(token) =>
            form.setValue("from.token", token, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          onChange={(amount) =>
            form.setValue("from.amount", amount, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
        <div className="flex items-center gap-3">
          <Divider className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="size-12 rounded-xl"
            style={{
              boxShadow: "0px 4px 8px -3px rgba(11, 42, 60, 0.08)",
            }}
            onClick={() => {
              form.setValue(
                "from",
                {
                  ...values.to,
                  amount: prices.data?.[0] ?? 0n,
                },
                {
                  shouldValidate: true,
                  shouldDirty: true,
                },
              );
              form.setValue("to", values.from, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
          >
            <FaArrowDown className="text-primary-500" />
          </Button>
          <Divider className="flex-1" />
        </div>
        <TokenInput
          value={isSameToken ? values.from.amount : prices.data?.[0] ?? 0n}
          tokenAddress={values.to.token}
          chainId={values.to.chainId}
          isLoading={prices.isPending}
          readOnly
          onSelectToken={(token) =>
            form.setValue("to.token", token, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          onChange={(amount) =>
            form.setValue("to.amount", amount, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
      </div>
      <Divider />
      <Button size="xl" className="w-full">
        Swap
      </Button>
    </Card>
  );
};

Swap.displayName = "Swap";
