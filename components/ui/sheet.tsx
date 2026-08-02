"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// A bottom sheet on mobile, centered dialog on md+
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in-up" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface border-border outline-none",
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t",
          "md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:max-h-[85dvh]",
          "data-[state=open]:animate-fade-in-up",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <DialogPrimitive.Title className="text-base font-semibold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-raised hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="overflow-y-auto px-5 pb-5 pb-safe">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent };
