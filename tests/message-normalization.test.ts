import { describe, expect, test } from "bun:test";
import { normalizeMessagesForSnapshot } from "@/lib/task-context/message-normalization";

describe("normalizeMessagesForSnapshot", () => {
  test("marks legacy codex diffs as accepted", () => {
    const normalized = normalizeMessagesForSnapshot({
      messagesByTask: {
        "task-1": [
          {
            id: "m-1",
            role: "assistant",
            model: "gpt-5",
            providerId: "codex",
            content: "",
            parts: [
              {
                type: "code_diff",
                filePath: "src/app.ts",
                oldContent: "a",
                newContent: "b",
                status: "pending",
              },
            ],
          },
        ],
      },
    });

    expect(normalized["task-1"]?.[0]?.parts[0]).toMatchObject({
      type: "code_diff",
      status: "accepted",
    });
  });

  test("keeps non-codex pending diffs unchanged", () => {
    const normalized = normalizeMessagesForSnapshot({
      messagesByTask: {
        "task-1": [
          {
            id: "m-1",
            role: "assistant",
            model: "claude-sonnet",
            providerId: "claude-code",
            content: "",
            parts: [
              {
                type: "code_diff",
                filePath: "src/app.ts",
                oldContent: "a",
                newContent: "b",
                status: "pending",
              },
            ],
          },
        ],
      },
    });

    expect(normalized["task-1"]?.[0]?.parts[0]).toMatchObject({
      type: "code_diff",
      status: "pending",
    });
  });
});
