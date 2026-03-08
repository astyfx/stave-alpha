import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Bot, Brain, CheckCircle2, ChevronDown, Circle, Info, LoaderCircle, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChainOfThoughtStep {
  id: string;
  label: string;
  detail?: string;
  status: "pending" | "active" | "done";
  kind?: "thinking" | "tool" | "agent" | "system";
}

interface ChainOfThoughtProps extends HTMLAttributes<HTMLDivElement> {
  isStreaming?: boolean;
  defaultOpen?: boolean;
  steps: ChainOfThoughtStep[];
}

interface ChainOfThoughtContextValue {
  isStreaming: boolean;
  open: boolean;
  setOpen: (next: boolean) => void;
}

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(null);

function useChainOfThoughtContext() {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error("ChainOfThought components must be used inside <ChainOfThought />.");
  }
  return context;
}

function StepIcon(args: { step: ChainOfThoughtStep }) {
  if (args.step.status === "active") {
    return <LoaderCircle className="mt-0.5 size-3.5 animate-spin text-primary" />;
  }
  if (args.step.kind === "thinking") {
    return args.step.status === "done"
      ? <CheckCircle2 className="mt-0.5 size-3.5 text-emerald-500" />
      : <Brain className="mt-0.5 size-3.5 text-muted-foreground" />;
  }
  if (args.step.kind === "tool") {
    return args.step.status === "done"
      ? <CheckCircle2 className="mt-0.5 size-3.5 text-emerald-500" />
      : <Wrench className="mt-0.5 size-3.5 text-muted-foreground" />;
  }
  if (args.step.kind === "agent") {
    return args.step.status === "done"
      ? <CheckCircle2 className="mt-0.5 size-3.5 text-emerald-500" />
      : <Bot className="mt-0.5 size-3.5 text-primary" />;
  }
  if (args.step.kind === "system") {
    return <Info className="mt-0.5 size-3.5 text-muted-foreground" />;
  }
  return args.step.status === "done"
    ? <CheckCircle2 className="mt-0.5 size-3.5 text-emerald-500" />
    : <Circle className="mt-0.5 size-3.5 text-muted-foreground" />;
}

export function ChainOfThought({ className, isStreaming = false, defaultOpen = false, steps, ...props }: ChainOfThoughtProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (isStreaming) {
      setOpen(true);
    }
  }, [isStreaming]);

  const contextValue = useMemo(() => ({ isStreaming, open, setOpen }), [isStreaming, open]);

  return (
    <ChainOfThoughtContext.Provider value={contextValue}>
      <section
          className={cn(
          "overflow-hidden rounded-md border border-border/80 bg-card/80 text-sm text-muted-foreground",
          className,
        )}
        {...props}
      >
        <ChainOfThoughtTrigger />
        <ChainOfThoughtContent>
          <ol className="space-y-2">
            {steps.map((step) => (
              <li
                key={step.id}
                className={cn(
                  "flex items-start gap-2 rounded-sm",
                  "motion-safe:animate-cot-step-in",
                )}
              >
                <StepIcon step={step} />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{step.label}</p>
                  {step.detail ? <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{step.detail}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </ChainOfThoughtContent>
      </section>
    </ChainOfThoughtContext.Provider>
  );
}

export function ChainOfThoughtTrigger(args: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { isStreaming, open, setOpen } = useChainOfThoughtContext();
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground",
        args.className,
      )}
      onClick={() => setOpen(!open)}
      {...args}
    >
      <span className="inline-flex items-center gap-1.5">
        {isStreaming ? <LoaderCircle className="size-3 animate-spin text-primary" /> : <Brain className="size-3 text-muted-foreground" />}
        Chain of thought
      </span>
      <ChevronDown className={cn("size-3 transition-transform", open ? "rotate-180" : "rotate-0")} />
    </button>
  );
}

export function ChainOfThoughtContent(args: HTMLAttributes<HTMLDivElement>) {
  const { open } = useChainOfThoughtContext();
  if (!open) {
    return null;
  }
  return <div className={cn("border-t border-border/80 px-3 py-2", args.className)} {...args} />;
}
