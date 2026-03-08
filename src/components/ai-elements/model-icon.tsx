import { useState } from "react";
import type { ProviderId } from "@/lib/providers/provider.types";
import { cn } from "@/lib/utils";

const PROVIDER_ICON_URL: Record<ProviderId, string> = {
  codex: "/codex-color.svg",
  "claude-code": "/claude-color.svg",
};

interface ModelIconProps {
  providerId: ProviderId;
  className?: string;
}

function fallbackLabel(args: { providerId: ProviderId }) {
  if (args.providerId === "claude-code") {
    return "C";
  }
  return "O";
}

export function ModelIcon(args: ModelIconProps) {
  const { providerId, className } = args;
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={cn(
          "inline-flex size-4 items-center justify-center rounded-sm bg-secondary text-[10px] font-semibold text-muted-foreground",
          className
        )}
        aria-hidden
      >
        {fallbackLabel({ providerId })}
      </span>
    );
  }

  return (
    <img
      src={PROVIDER_ICON_URL[providerId]}
      alt=""
      aria-hidden
      className={cn("size-4 shrink-0 object-contain", className)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
