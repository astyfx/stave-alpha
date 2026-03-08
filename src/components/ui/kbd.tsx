import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="kbd-group" className={cn("inline-flex items-center gap-1", className)} {...props} />;
}

function KbdSeparator({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-separator"
      aria-hidden="true"
      className={cn("text-xs font-medium text-muted-foreground/80 select-none", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup, KbdSeparator };
