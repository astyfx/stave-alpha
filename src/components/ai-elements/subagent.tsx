import type { HTMLAttributes } from "react";
import { useMemo, useState } from "react";
import { Bot, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ToolInput, ToolOutput, getStatusBadge } from "./tool";

type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

interface ParsedSubagentToolInput {
  subagentType: string | null;
  description: string | null;
  prompt: string | null;
  raw: string;
}

interface SubagentCardProps extends HTMLAttributes<HTMLDivElement> {
  input: string;
  output?: string;
  state?: ToolState;
  defaultOpen?: boolean;
}

export function parseSubagentToolInput(args: { input: string }): ParsedSubagentToolInput {
  const raw = args.input;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const subagentType = typeof parsed.subagent_type === "string" && parsed.subagent_type.trim()
      ? parsed.subagent_type.trim()
      : null;
    const description = typeof parsed.description === "string" && parsed.description.trim()
      ? parsed.description.trim()
      : null;
    const prompt = typeof parsed.prompt === "string" && parsed.prompt.trim()
      ? parsed.prompt.trim()
      : null;
    return { subagentType, description, prompt, raw };
  } catch {
    return {
      subagentType: null,
      description: null,
      prompt: null,
      raw,
    };
  }
}

export function SubagentCard({ className, input, output, state, defaultOpen = false, ...props }: SubagentCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const details = useMemo(() => parseSubagentToolInput({ input }), [input]);
  const title = details.description ?? details.subagentType ?? "Subagent activity";
  const promptText = details.prompt ?? details.raw;

  return (
    <section
      className={cn("overflow-hidden rounded-md border border-primary/25 bg-primary/5", className)}
      {...props}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Bot className="size-3.5 text-primary" />
              Subagent
            </span>
            {details.subagentType ? <Badge variant="secondary">{details.subagentType}</Badge> : null}
          </div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {details.prompt ? (
            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {details.prompt}
            </p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-2">
          {getStatusBadge(state)}
          <ChevronDown className={cn("size-3.5 transition-transform", open ? "rotate-180" : "rotate-0")} />
        </span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-primary/15 bg-background/70 px-3 py-2">
          <ToolInput input={promptText} />
          {state !== "input-streaming" ? (
            <ToolOutput
              output={output ? <pre className="whitespace-pre-wrap text-sm">{output}</pre> : null}
              errorText={state === "output-error" ? (output ?? "Subagent failed.") : undefined}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
