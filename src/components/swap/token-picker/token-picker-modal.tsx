import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FC } from 'react';

export type TokenPickerModalProps = {
  
};

export const TokenPickerModal: FC<TokenPickerModalProps> = () => {
  const modal = /* TODO: Add modal hook */
  
  return (
    <Dialog {...modal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogDescription>
          
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button>Secondary Action</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
};

TokenPickerModal.displayName = 'TokenPickerModal';
