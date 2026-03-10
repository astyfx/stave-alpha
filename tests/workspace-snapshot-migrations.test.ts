import { describe, expect, test } from "bun:test";
import { parseWorkspaceSnapshot } from "@/lib/task-context/schemas";
import { CURRENT_WORKSPACE_SNAPSHOT_VERSION } from "@/lib/task-context/workspace-snapshot";

describe("workspace snapshot migrations", () => {
  test("migrates legacy snapshots without an explicit version", () => {
    const parsed = parseWorkspaceSnapshot({
      payload: {
        activeTaskId: "task-1",
        tasks: [
          {
            id: "task-1",
            title: "Task 1",
            provider: "claude-code",
            updatedAt: "2026-03-09T00:00:00.000Z",
            unread: false,
          },
        ],
        messagesByTask: {
          "task-1": [],
        },
      },
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.version).toBe(CURRENT_WORKSPACE_SNAPSHOT_VERSION);
    expect(parsed?.promptDraftByTask).toEqual({});
  });

  test("rejects snapshots from a future version", () => {
    const parsed = parseWorkspaceSnapshot({
      payload: {
        version: CURRENT_WORKSPACE_SNAPSHOT_VERSION + 1,
        activeTaskId: "task-1",
        tasks: [],
        messagesByTask: {},
      },
    });

    expect(parsed).toBeNull();
  });
});
