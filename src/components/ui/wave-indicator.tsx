import { cn } from "@/lib/utils";

export function WaveIndicator(args: { className?: string; barClassName?: string }) {
  const { className, barClassName } = args;

  return (
    <span className={cn("inline-flex items-end gap-0.5", className)} aria-hidden="true">
      <span className={cn("animate-message-wave h-4 w-1 rounded-sm bg-current", barClassName)} style={{ animationDelay: "-0.24s" }} />
      <span className={cn("animate-message-wave h-4 w-1 rounded-sm bg-current", barClassName)} style={{ animationDelay: "-0.12s" }} />
      <span className={cn("animate-message-wave h-4 w-1 rounded-sm bg-current", barClassName)} />
    </span>
  );
}
