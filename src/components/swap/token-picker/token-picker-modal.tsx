import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ComponentPropsWithoutRef, FC } from "react";

export type TokenPickerModalProps = {
  dialog: ComponentPropsWithoutRef<typeof Dialog>;
};

export const TokenPickerModal: FC<TokenPickerModalProps> = ({ dialog }) => {
  return (
    <Dialog {...dialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogDescription></DialogDescription>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => dialog.onOpenChange?.(false)}
          >
            Close
          </Button>
          <Button>Secondary Action</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

TokenPickerModal.displayName = "TokenPickerModal";
