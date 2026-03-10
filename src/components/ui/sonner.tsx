import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

import { useAppStore } from "@/store/app.store";

const Toaster = ({ ...props }: ToasterProps) => {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  return (
    <Sonner
      expand
      position="top-right"
      theme={isDarkMode ? "dark" : "light"}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      offset={{ top: 64, right: 16 }}
      style={
        {
          "--normal-bg": "var(--foreground)",
          "--normal-text": "var(--background)",
          "--normal-border": "color-mix(in oklch, var(--background) 12%, transparent)",
          "--border-radius": "calc(var(--radius) + 2px)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "border border-background/12 bg-foreground text-background shadow-lg dark:border-foreground/12",
          title: "text-sm font-medium",
          description: "text-sm !text-background",
          success: "border-emerald-500/25",
          error: "border-destructive/30",
          icon: "text-background/85",
        },
      }}
      {...props}
    />
  );
};

export { toast, Toaster };
