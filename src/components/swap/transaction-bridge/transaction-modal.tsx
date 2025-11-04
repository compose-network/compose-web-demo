import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ComponentPropsWithoutRef } from "react";
import { type FC, useState } from "react";
import type { Hex } from "viem";
import { zeroAddress } from "viem";
import { statusIcons } from "@/components/modals/batch-transaction-modal";
import { Text } from "@/components/ui/text";
import { ChainIcon } from "@/components/ui/chain-icon";
import { getChainById, getExplorerHashUrl } from "@/wagmi/config";
import { shortenAddress } from "@/lib/utils/strings.ts";
import { TbExternalLink } from "react-icons/tb";
import { ChevronDown, ChevronUp, PlusIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Tooltip } from "@/components/ui/tooltip";
import { FaInfoCircle } from "react-icons/fa";
import { useAddTokenToWallet } from "@/hooks/use-add-token-to-wallet.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { CopyBtn } from "@/components/ui/copy-btn.tsx";

export type TransactionModalProps = {
  title: string;
  errorMessage?: string;
  data: {
    id: Hex;
    actions: {
      name: string;
      description?: string;
      tooltip?: string;
      chainId: number;
      toChainId?: number;
      toTokenAddress?: `0x${string}`;
      status: keyof typeof statusIcons;
      hash?: Hex | { chainId: number; hash: Hex }[];
      userOpData?: { chainId: number; data: string }[];
      signAndSend: undefined | (() => void);
    }[];
  } | null;
};

export type TransactionModalData = TransactionModalProps["data"];

type FCProps = FC<
  Omit<ComponentPropsWithoutRef<typeof Dialog>, keyof TransactionModalProps> &
    TransactionModalProps
>;

export const TransactionModal: FCProps = ({
  data,
  title,
  errorMessage,
  ...props
}) => {
  const [openData, setOpenData] = useState(false);

  const { addToken } = useAddTokenToWallet();

  const onOpenDataHandler = () => setOpenData(!openData);

  const toChainId = data?.actions.find(({ toChainId }) => toChainId)?.toChainId;
  const toTokenAddress = data?.actions.find(
    ({ toTokenAddress }) => toTokenAddress,
  )?.toTokenAddress;

  const canAdd = toChainId && toTokenAddress && toTokenAddress !== zeroAddress;

  const handleAddToWallet = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAdd) return;
    await addToken({ address: toTokenAddress, chainId: toChainId });
  };

  return (
    <Dialog {...props}>
      <DialogContent
        className="flex flex-col gap-5 min-w-[646px] max-h-[841px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex justify-between items-center">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose>
            <X className="size-6" />
          </DialogClose>
        </div>
        <div className="flex gap-2 flex-col">
          {data?.actions.map((action, i) => (
            <div
              className="flex flex-col items-center bg-gray-100 gap-2 max-h-[629px] overflow-auto"
              key={action.name}
            >
              <div className="flex w-full h-[90px] justify-between gap-4 p-5 bg-gray-100 items-center rounded-[2px]">
                <div className="flex gap-4 p-5 bg-gray-100 items-center rounded-sm">
                  {statusIcons[action.status]}
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1 items-center">
                      <Text
                        variant="body-2-medium"
                        className="flex items-center gap-1"
                      >
                        {action.name}{" "}
                      </Text>
                      {action.tooltip && (
                        <Tooltip content={action.tooltip}>
                          <FaInfoCircle className="size-4 text-gray-500 cursor-pointer  " />
                        </Tooltip>
                      )}
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
                    </div>
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
                {["idle", "failed"].includes(action.status) &&
                  (!data.actions[i - 1] ||
                    data.actions[i - 1]?.status === "success") &&
                  action.signAndSend && (
                    <div>
                      <Button variant="white" onClick={action.signAndSend}>
                        {errorMessage ? "Try again" : "Sign"}
                      </Button>
                    </div>
                  )}
                {["pending", "success", "failed"].includes(action.status) &&
                  action.hash && (
                    <div className="flex flex-col  rounded-[16px] bg-gray-300 p-0.5">
                      {(Array.isArray(action.hash)
                        ? action.hash
                        : action.hash
                          ? [{ chainId: action.chainId, hash: action.hash }]
                          : []
                      ).map((hashObj, i) => {
                        const { chainId, hash } = hashObj;
                        return (
                          <a
                            key={`${chainId}-${hash}-${i}`}
                            target="_blank"
                            href={
                              hash
                                ? getExplorerHashUrl(chainId, hash)
                                : undefined
                            }
                            className="flex items-center gap-1 text-[12px] text-gray-700 px-2 py-1 cursor-pointer font-mono"
                          >
                            {hash && (
                              <ChainIcon
                                size="xs"
                                chainId={chainId}
                                className="mr-0.5"
                              />
                            )}
                            {hash ? shortenAddress(hash) : "Waiting..."}
                            {hash && <TbExternalLink className="size-3" />}
                          </a>
                        );
                      })}
                    </div>
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
                      <CopyBtn
                        className="flex items-center"
                        text={userOp.data}
                      />
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
        {canAdd &&
          data?.actions.every(({ status }) => status === "success") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddToWallet}
              className="flex items-center gap-1.5 text-xs"
              title="Add token to wallet"
            >
              <PlusIcon className="h-3 w-3" />
              Add to Wallet
            </Button>
          )}
        {data?.actions.every(({ status }) =>
          ["success", "failed"].includes(status),
        ) && (
          <DialogClose>
            <Button width="full" size="xl">
              Close
            </Button>
          </DialogClose>
        )}
        {errorMessage && (
          <Badge className="rounded-lg p-3" variant="errorOutline">
            {errorMessage}
          </Badge>
        )}
      </DialogContent>
    </Dialog>
  );
};

TransactionModal.displayName = "TransactionModal";
