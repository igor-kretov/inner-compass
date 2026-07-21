"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "./button";
import { CloseIcon } from "./icons";
import { cn } from "./class-names";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = "Schließen",
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    }

    if (!open && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cn("ic-dialog p-0", className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="p-5 sm:p-6">
        <header className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="m-0 font-display text-2xl font-semibold tracking-[-0.025em] text-ink"
            >
              {title}
            </h2>
            {description ? (
              <div id={descriptionId} className="mt-2 text-sm text-muted">
                {description}
              </div>
            ) : null}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="-mt-2 -mr-2"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <CloseIcon className="size-5" />
          </Button>
        </header>

        <div className="mt-6">{children}</div>

        {footer ? (
          <footer className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
