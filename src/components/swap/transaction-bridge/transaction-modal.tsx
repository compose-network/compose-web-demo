import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ComponentPropsWithoutRef } from "react";
import { type FC, useState } from "react";
import type { Hex } from "viem";
import { statusIcons } from "@/components/modals/batch-transaction-modal";
import { Text } from "@/components/ui/text";
import { ChainIcon } from "@/components/ui/chain-icon";
import { getChainById, getExplorerHashUrl } from "@/wagmi/config";
import { shortenAddress } from "@/lib/utils/strings.ts";
import { TbExternalLink } from "react-icons/tb";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

export type TransactionModalProps = {
  title: string;
  data: {
    id: Hex;
    actions: {
      name: string;
      description?: string;
      chainId: number;
      toChainId?: number;
      status: keyof typeof statusIcons;
      hash?: `0x${string}`;
      userOpData?: { chainId: number; data: string }[];
    }[];
  } | null;
};
const finalizedStatuses: (keyof typeof statusIcons)[] = ["success", "failed"];

type FCProps = FC<
  Omit<ComponentPropsWithoutRef<typeof Dialog>, keyof TransactionModalProps> &
    TransactionModalProps
>;

export const TransactionModal: FCProps = ({ data, title, ...props }) => {
  const [openData, setOpenData] = useState(false);
  const onOpenDataHandler = () => setOpenData(!openData);
  return (
    <Dialog {...props}>
      <DialogContent className="flex flex-col gap-5 min-w-[646px] max-h-[841px]">
        <div className="flex justify-between items-center">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose />
        </div>
        <div className="flex gap-2 flex-col">
          {data?.actions.map((action, i) => (
            <div className="flex flex-col items-center bg-gray-100 gap-2 max-h-[629px] overflow-auto">
              <div
                className="flex w-full h-[90px] justify-between gap-4 p-5 bg-gray-100 items-center rounded-[2px]"
                key={action.name}
              >
                <div className="flex gap-4 p-5 bg-gray-100 items-center rounded-sm">
                  {statusIcons[action.status]}
                  <div className="flex flex-col gap-1">
                    <Text
                      variant="body-2-medium"
                      className="flex items-center gap-1"
                    >
                      {action.name}{" "}
                      {action.userOpData &&
                        (openData ? (
                          <ChevronUp
                            onClick={onOpenDataHandler}
                            className="h-4 w-4"
                          />
                        ) : (
                          <ChevronDown
                            onClick={onOpenDataHandler}
                            className="h-4 w-4"
                          />
                        ))}
                    </Text>
                    <div className="flex items-center gap-2">
                      <ChainIcon size="sm" chainId={action.chainId} />
                      <Text
                        variant="body-3-medium"
                        className="flex text-gray-500"
                      >
                        {i === 0
                          ? "Start on"
                          : action.toChainId
                            ? "From"
                            : "On"}
                        &nbsp;
                        {getChainById(action.chainId).name}&nbsp;
                        {action.toChainId && (
                          <Text className="flex flex-nowrap gap-1">
                            &nbsp;to&nbsp;
                            <ChainIcon size="sm" chainId={action.toChainId} />
                            &nbsp;{getChainById(action.toChainId).name}
                          </Text>
                        )}
                      </Text>
                    </div>
                  </div>
                </div>
                {(action.status === "pending" ||
                  action.status === "success") && (
                  <a
                    target="_blank"
                    href={
                      action.hash
                        ? getExplorerHashUrl(
                            action.chainId,
                            action.hash || "0x",
                          )
                        : undefined
                    }
                    className="flex items-center gap-1 text-[12px] text-gray-700 rounded-[100px] bg-gray-300 px-2 py-1 cursor-pointer font-mono"
                  >
                    {action.hash
                      ? shortenAddress(action.hash || "0x")
                      : "Waiting..."}
                    {action.hash && <TbExternalLink className="size-3" />}
                  </a>
                )}
              </div>
              {openData &&
                action.userOpData?.map((userOp, i) => (
                  <div className="w-[498px] bg-white border border-gray-300 rounded-[8px] flex flex-col p-4 text-gray-600 gap-4 overflow-x-auto">
                    <div
                      className={`flex gap-1 items-center text-gray-600 ${i === action.userOpData?.length && "mb-5"}`}
                    >
                      <ChainIcon size="sm" chainId={userOp.chainId} />{" "}
                      <Text
                        className={"text-gray-600"}
                        variant={"body-3-medium"}
                      >
                        {getChainById(userOp.chainId).name}
                      </Text>
                    </div>
                    <div>
                      <Text
                        variant="body-3-medium"
                        className="whitespace-pre-wrap font-mono text-xs"
                      >
                        {JSON.stringify(JSON.parse(userOp.data), null, 2)}
                      </Text>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
        {data?.actions.every((a) => finalizedStatuses.includes(a.status)) && (
          <DialogClose>
            <Button width="full" size="xl">
              Close
            </Button>
          </DialogClose>
        )}
      </DialogContent>
    </Dialog>
  );
};

TransactionModal.displayName = "TransactionModal";
