import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import type { ComponentPropsWithoutRef } from "react";
import { type FC } from "react";
import type { Hex } from "viem";
import { statusIcons } from "@/components/modals/batch-transaction-modal";
import { Span, Text } from "@/components/ui/text";
import { ChainIcon } from "@/components/ui/chain-icon";
import { getChainById } from "@/wagmi/config";

export type TransactionModalProps = {
  data: {
    id: Hex;
    actions: {
      name: string;
      description?: string;
      chainId: number;
      status: keyof typeof statusIcons;
    }[];
  } | null;
};

type FCProps = FC<
  Omit<ComponentPropsWithoutRef<typeof Dialog>, keyof TransactionModalProps> &
    TransactionModalProps
>;

export const TransactionModal: FCProps = ({ data, ...props }) => {
  return (
    <Dialog {...props}>
      <DialogContent className="flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <DialogTitle>Bridge</DialogTitle>
          <DialogClose />
        </div>
        <div className="flex gap-2 flex-col">
          {data?.actions.map((action, i) => (
            <div
              className="flex gap-4 p-5 bg-gray-100 items-center rounded-sm"
              key={action.name}
            >
              {statusIcons[action.status]}
              <div className="flex flex-col gap-1">
                <Text variant="body-2-medium">
                  {action.name}{" "}
                  <Span className="text-gray-500">{action.description}</Span>
                </Text>
                <div className="flex items-center gap-2">
                  <ChainIcon size="sm" chainId={action.chainId} />
                  <Text variant="body-3-medium" className="text-gray-500">
                    {i === 0 ? "Start on" : "On"}{" "}
                    {getChainById(action.chainId).name}
                  </Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

TransactionModal.displayName = "TransactionModal";
