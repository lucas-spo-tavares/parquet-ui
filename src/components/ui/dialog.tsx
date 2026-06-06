import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function Dialog({ open, title, description, children, footer, onOpenChange }: DialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className={cn("w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl")}>
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <Button aria-label="Fechar dialog" onClick={() => onOpenChange(false)} size="icon" type="button" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border p-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
