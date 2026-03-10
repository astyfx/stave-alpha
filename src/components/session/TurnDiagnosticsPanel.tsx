import { startTransition, useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown, ChevronRight, Clock3, TriangleAlert } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import type { TaskProviderConversationState } from "@/lib/db/workspaces.db";
import { listTaskTurns, loadTurnReplay, type PersistedTurnSummary, type ReplayedTurnEvent } from "@/lib/db/turns.db";
import { getProviderConversationId, getProviderConversationLabel, listProviderConversations } from "@/lib/providers/provider-conversations";
import { formatTurnDuration, formatTurnEventLabel, summarizeTurnDiagnostics } from "@/lib/providers/turn-diagnostics";
import { formatTaskUpdatedAt } from "@/lib/tasks";
import { cn } from "@/lib/utils";

interface TurnDiagnosticsPanelProps {
  taskId: string;
  workspaceId: string;
  activeTurnId?: string;
  taskProvider: "claude-code" | "codex";
  providerConversations?: TaskProviderConversationState;
}

interface TurnDiagnosticsState {
  loading: boolean;
  error: string | null;
  latestTurn: PersistedTurnSummary | null;
  replay: ReplayedTurnEvent[];
}

function getStatusBadgeVariant(status: "running" | "completed" | "error" | "truncated") {
  switch (status) {
    case "error":
      return "destructive";
    case "truncated":
      return "warning";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: "running" | "completed" | "error" | "truncated") {
  switch (status) {
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "error":
      return "Error";
    case "truncated":
      return "Truncated";
  }
}

export function TurnDiagnosticsPanel(args: TurnDiagnosticsPanelProps) {
  const { taskId, workspaceId, activeTurnId, taskProvider, providerConversations } = args;
  const [state, setState] = useState<TurnDiagnosticsState>({
    loading: true,
    error: null,
    latestTurn: null,
    replay: [],
  });
  const [open, setOpen] = useState(false);
  const [timeAnchor, setTimeAnchor] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeAnchor(Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const latestTurn = (await listTaskTurns({
          workspaceId,
          taskId,
          limit: 1,
        }))[0] ?? null;

        const replay = latestTurn
          ? await loadTurnReplay({ turnId: latestTurn.id, limit: 400 })
          : [];

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setState({
            loading: false,
            error: null,
            latestTurn,
            replay,
          });
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        startTransition(() => {
          setState({
            loading: false,
            error: String(error),
            latestTurn: null,
            replay: [],
          });
        });
      }
    };

    void load();
    const intervalId = activeTurnId
      ? window.setInterval(() => {
          void load();
        }, 1000)
      : null;

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [activeTurnId, taskId, workspaceId]);

  const summary = useMemo(
    () => (state.latestTurn ? summarizeTurnDiagnostics({ turn: state.latestTurn, replay: state.replay }) : null),
    [state.latestTurn, state.replay]
  );
  const timeline = useMemo(() => state.replay.slice(-12), [state.replay]);
  const currentNativeConversationId = useMemo(
    () => getProviderConversationId({ conversations: providerConversations, providerId: taskProvider }),
    [providerConversations, taskProvider]
  );
  const providerConversationRows = useMemo(
    () => listProviderConversations({ conversations: providerConversations }),
    [providerConversations]
  );

  useEffect(() => {
    if (!summary) {
      return;
    }
    if (summary.status === "running" || summary.status === "error") {
      setOpen(true);
    }
  }, [summary]);

  if (!state.loading && !state.error && !state.latestTurn) {
    return null;
  }

  return (
    <div className="border-b border-border/70 px-3 py-2">
      <Card className="overflow-hidden border-border/80 bg-muted/25">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted/30"
          onClick={() => setOpen((current) => !current)}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                {summary?.status === "error" ? <TriangleAlert className="size-4 text-destructive" /> : <Activity className="size-4 text-muted-foreground" />}
                Latest turn
              </span>
              {state.latestTurn ? <Badge variant="outline">{state.latestTurn.providerId}</Badge> : null}
              {summary ? <Badge variant={getStatusBadgeVariant(summary.status)}>{getStatusLabel(summary.status)}</Badge> : null}
              {summary ? <Badge variant="secondary">{summary.totalEvents} events</Badge> : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {state.loading ? <span>Loading diagnostics...</span> : null}
              {state.error ? <span>{state.error}</span> : null}
              {state.latestTurn ? (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3.5" />
                  {formatTurnDuration(summary?.durationMs ?? null)}
                </span>
              ) : null}
              {state.latestTurn ? <span>{formatTaskUpdatedAt({ value: state.latestTurn.createdAt, now: timeAnchor })}</span> : null}
              {summary?.stopReason ? <span>stop: {summary.stopReason}</span> : null}
              {summary?.lastEventType ? <span>last: {summary.lastEventType}</span> : null}
            </div>
          </div>
          {open ? <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
        </button>
        {open ? (
          <div className="border-t border-border/70 bg-card/40 px-3 py-3">
            {summary ? (
              <div className="grid gap-2 sm:grid-cols-4">
                <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Content</p>
                  <p className="mt-1 text-sm text-foreground">
                    text {summary.textEvents} · reasoning {summary.thinkingEvents}
                  </p>
                </div>
                <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Actions</p>
                  <p className="mt-1 text-sm text-foreground">
                    tools {summary.toolEvents} · approvals {summary.approvalEvents} · input {summary.inputEvents}
                  </p>
                </div>
                <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Signals</p>
                  <p className="mt-1 text-sm text-foreground">
                    system {summary.systemEvents} · errors {summary.errorEvents}
                  </p>
                </div>
                <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Native conversation</p>
                  <p className="mt-1 truncate font-mono text-sm text-foreground">
                    {currentNativeConversationId ?? "Not started"}
                  </p>
                </div>
              </div>
            ) : null}
            <div className="mt-3 rounded-md border border-border/70 bg-background/50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Provider sessions</p>
                <Badge variant="secondary">{taskProvider === "claude-code" ? "Current: Claude" : "Current: Codex"}</Badge>
              </div>
              {providerConversationRows.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">No provider-native ids recorded for this task yet.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {providerConversationRows.map((row) => (
                    <div
                      key={row.providerId}
                      className={cn(
                        "rounded-md border px-2.5 py-2",
                        row.providerId === taskProvider
                          ? "border-border bg-card"
                          : "border-border/70 bg-muted/30"
                      )}
                    >
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {getProviderConversationLabel({ providerId: row.providerId })}
                      </p>
                      <p className="mt-1 max-w-[24rem] truncate font-mono text-sm text-foreground">
                        {row.nativeConversationId}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Timeline</p>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border/70 bg-background/50 p-2">
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No persisted events yet.</p>
                ) : (
                  timeline.map((item) => (
                    <div
                      key={item.persisted.id}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-sm px-2 py-1.5 text-sm",
                        item.event.type === "error" && "bg-destructive/10 text-destructive"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{formatTurnEventLabel({ event: item.event })}</p>
                        <p className="text-xs text-muted-foreground">
                          seq {item.persisted.sequence} · {formatTaskUpdatedAt({ value: item.persisted.createdAt, now: timeAnchor })}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {item.event.type}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
