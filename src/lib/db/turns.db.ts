import { z } from "zod";
import { parseNormalizedEvent } from "@/lib/providers/runtime";
import type { ParsedNormalizedProviderEvent } from "@/lib/providers/schemas";

const PersistedTurnSummarySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  taskId: z.string(),
  providerId: z.union([z.literal("claude-code"), z.literal("codex")]),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  eventCount: z.number().int().nonnegative(),
});

const PersistedTurnEventSchema = z.object({
  id: z.string(),
  turnId: z.string(),
  sequence: z.number().int().nonnegative(),
  eventType: z.string(),
  payload: z.unknown(),
  createdAt: z.string(),
});

export type PersistedTurnSummary = z.infer<typeof PersistedTurnSummarySchema>;
export type PersistedTurnEvent = z.infer<typeof PersistedTurnEventSchema>;

export interface ReplayedTurnEvent {
  persisted: PersistedTurnEvent;
  event: ParsedNormalizedProviderEvent;
}

function getPersistenceApi() {
  return window.api?.persistence;
}

export async function listTaskTurns(args: {
  workspaceId: string;
  taskId: string;
  limit?: number;
}): Promise<PersistedTurnSummary[]> {
  const persistence = getPersistenceApi();
  if (!persistence?.listTaskTurns) {
    return [];
  }

  const response = await persistence.listTaskTurns({
    workspaceId: args.workspaceId,
    taskId: args.taskId,
    limit: args.limit,
  });
  if (!response.ok) {
    throw new Error(`Failed to list task turns for ${args.taskId}`);
  }

  const parsed = z.array(PersistedTurnSummarySchema).safeParse(response.turns);
  if (!parsed.success) {
    throw new Error("Invalid task turn payload returned from persistence bridge.");
  }

  return parsed.data;
}

export async function listPersistedTurnEvents(args: {
  turnId: string;
  afterSequence?: number;
  limit?: number;
}): Promise<PersistedTurnEvent[]> {
  const persistence = getPersistenceApi();
  if (!persistence?.listTurnEvents) {
    return [];
  }

  const response = await persistence.listTurnEvents({
    turnId: args.turnId,
    afterSequence: args.afterSequence,
    limit: args.limit,
  });
  if (!response.ok) {
    throw new Error(`Failed to list turn events for ${args.turnId}`);
  }

  const parsed = z.array(PersistedTurnEventSchema).safeParse(response.events);
  if (!parsed.success) {
    throw new Error("Invalid turn event payload returned from persistence bridge.");
  }

  return parsed.data;
}

export async function loadTurnReplay(args: {
  turnId: string;
  afterSequence?: number;
  limit?: number;
}): Promise<ReplayedTurnEvent[]> {
  const events = await listPersistedTurnEvents(args);
  const replay: ReplayedTurnEvent[] = [];

  for (const persisted of events) {
    const parsed = parseNormalizedEvent({ payload: persisted.payload });
    if (!parsed) {
      continue;
    }
    replay.push({ persisted, event: parsed });
  }

  return replay;
}

export async function* replayPersistedTurn(args: {
  turnId: string;
  afterSequence?: number;
  limit?: number;
  delayMs?: number;
}): AsyncGenerator<ReplayedTurnEvent, void, unknown> {
  const replay = await loadTurnReplay(args);

  for (const item of replay) {
    if ((args.delayMs ?? 0) > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, args.delayMs));
    }
    yield item;
  }
}
