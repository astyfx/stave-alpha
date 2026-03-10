import { afterEach, describe, expect, test } from "bun:test";
import { listTaskTurns, loadTurnReplay, replayPersistedTurn } from "@/lib/db/turns.db";

const originalWindow = globalThis.window;

function setWindowApi(api: unknown) {
  (globalThis as { window: unknown }).window = { api } as unknown;
}

afterEach(() => {
  (globalThis as { window: unknown }).window = originalWindow;
});

describe("turn replay data access", () => {
  test("lists recent task turns and replays normalized turn events", async () => {
    setWindowApi({
      persistence: {
        listTaskTurns: async () => ({
          ok: true,
          turns: [{
            id: "turn-1",
            workspaceId: "ws-1",
            taskId: "task-1",
            providerId: "codex",
            createdAt: "2026-03-09T00:00:00.000Z",
            completedAt: "2026-03-09T00:00:02.000Z",
            eventCount: 2,
          }],
        }),
        listTurnEvents: async () => ({
          ok: true,
          events: [
            {
              id: "event-1",
              turnId: "turn-1",
              sequence: 1,
              eventType: "text",
              payload: { type: "text", text: "hello" },
              createdAt: "2026-03-09T00:00:01.000Z",
            },
            {
              id: "event-2",
              turnId: "turn-1",
              sequence: 2,
              eventType: "done",
              payload: { type: "done" },
              createdAt: "2026-03-09T00:00:02.000Z",
            },
          ],
        }),
      },
    });

    const turns = await listTaskTurns({
      workspaceId: "ws-1",
      taskId: "task-1",
    });
    const replay = await loadTurnReplay({ turnId: "turn-1" });
    const replayedTypes: string[] = [];
    for await (const item of replayPersistedTurn({ turnId: "turn-1" })) {
      replayedTypes.push(item.event.type);
    }

    expect(turns).toHaveLength(1);
    expect(turns[0]?.id).toBe("turn-1");
    expect(replay.map((item) => item.event.type)).toEqual(["text", "done"]);
    expect(replayedTypes).toEqual(["text", "done"]);
  });
});
