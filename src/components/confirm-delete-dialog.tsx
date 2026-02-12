"use client";

import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "~/components/ui/dialog";

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  examDate,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  examDate?: Date;
  isDeleting?: boolean;
}) {
  const dateStr = examDate
    ? new Date(examDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <div className="flex flex-col items-center gap-4">
          {/* Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-5 w-5 text-[var(--destructive)]" />
          </div>

          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Delete exam entry?
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            This will permanently remove the {dateStr} exam scores. This action
            cannot be undone.
          </p>

          {/* Actions */}
          <div className="flex w-full flex-col gap-2">
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="w-full rounded-full bg-[var(--destructive)] py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Delete Score
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="w-full rounded-full bg-[var(--secondary)] py-3 text-sm font-medium text-[var(--foreground)]"
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
