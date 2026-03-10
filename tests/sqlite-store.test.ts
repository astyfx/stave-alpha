import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import type { PersistenceWorkspaceSnapshot } from "../electron/persistence/types";

const canRunNativeSqlite = typeof Bun === "undefined";
const nativeSqliteTest = canRunNativeSqlite ? test : test.skip;

async function loadSqliteStore() {
  const mod = await import("../electron/persistence/sqlite-store");
  return mod.SqliteStore;
}

function createSnapshot(): PersistenceWorkspaceSnapshot {
  return {
    version: 1,
    activeTaskId: "task-1",
    tasks: [
      {
        id: "task-1",
        title: "Task One",
        provider: "claude-code",
        updatedAt: "2026-03-06T00:00:00.000Z",
        unread: false,
        archivedAt: null,
      },
      {
        id: "task-2",
        title: "Task Two",
        provider: "codex",
        updatedAt: "2026-03-06T00:10:00.000Z",
        unread: false,
        archivedAt: "2026-03-06T00:11:00.000Z",
      },
    ],
    messagesByTask: {
      "task-1": [
        {
          id: "m-1",
          role: "user",
          model: "user",
          providerId: "user",
          content: "hello",
          isStreaming: false,
          parts: [{ type: "text", text: "hello" }],
        },
      ],
      "task-2": [],
    },
  };
}

describe("SqliteStore", () => {
  let rootDir = "";
  let dbPath = "";

  beforeEach(() => {
    rootDir = path.join(tmpdir(), `stave-sqlite-store-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(rootDir, { recursive: true });
    dbPath = path.join(rootDir, "app.sqlite");
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  nativeSqliteTest("recovers workspace snapshot and turn journal across restart", async () => {
    const SqliteStore = await loadSqliteStore();
    const snapshot = createSnapshot();
    const turnId = "turn-restart-1";

    {
      const store = new SqliteStore({ dbPath });
      store.upsertWorkspace({
        id: "ws-1",
        name: "Workspace One",
        snapshot,
      });
      store.beginTurn({
        id: turnId,
        workspaceId: "ws-1",
        taskId: "task-1",
        providerId: "codex",
        createdAt: "2026-03-06T01:00:00.000Z",
      });
      store.appendTurnEvent({
        id: "event-1",
        turnId,
        sequence: 1,
        eventType: "text",
        payload: { text: "start" },
        createdAt: "2026-03-06T01:00:01.000Z",
      });
      store.appendTurnEvent({
        id: "event-2",
        turnId,
        sequence: 2,
        eventType: "done",
        payload: {},
        createdAt: "2026-03-06T01:00:02.000Z",
      });
      store.completeTurn({ id: turnId, completedAt: "2026-03-06T01:00:03.000Z" });
      store.close();
    }

    const reopened = new SqliteStore({ dbPath });
    const summaries = reopened.listWorkspaceSummaries();
    const loaded = reopened.loadWorkspaceSnapshot({ workspaceId: "ws-1" });
    const replay = reopened.listTurnEvents({ turnId });
    const replayFromTwo = reopened.listTurnEvents({ turnId, afterSequence: 2 });
    reopened.close();

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.id).toBe("ws-1");
    expect(loaded).toEqual(snapshot);
    expect(replay.map((item) => item.sequence)).toEqual([1, 2]);
    expect(replayFromTwo.map((item) => item.sequence)).toEqual([2]);
    expect(replay.at(-1)?.eventType).toBe("done");
    expect(reopened.listTurns({ workspaceId: "ws-1", taskId: "task-1" })[0]).toMatchObject({
      id: turnId,
      eventCount: 2,
    });
  });

  nativeSqliteTest("enforces unique (turn_id, sequence) idempotency constraint", async () => {
    const SqliteStore = await loadSqliteStore();
    const store = new SqliteStore({ dbPath });
    store.beginTurn({
      id: "turn-dup",
      workspaceId: "ws-1",
      taskId: "task-1",
      providerId: "claude-code",
    });
    store.appendTurnEvent({
      id: "event-a",
      turnId: "turn-dup",
      sequence: 1,
      eventType: "system",
      payload: { ok: true },
    });

    expect(() =>
      store.appendTurnEvent({
        id: "event-b",
        turnId: "turn-dup",
        sequence: 1,
        eventType: "system",
        payload: { ok: false },
      })
    ).toThrow();
    store.close();
  });
});
