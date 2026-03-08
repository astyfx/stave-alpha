import { describe, expect, test } from "bun:test";
import { getRenderableMessageParts, isPendingDiffStatus } from "@/components/session/chat-panel.utils";

describe("isPendingDiffStatus", () => {
  test("returns true only for pending diffs", () => {
    expect(isPendingDiffStatus("pending")).toBe(true);
    expect(isPendingDiffStatus("accepted")).toBe(false);
    expect(isPendingDiffStatus("rejected")).toBe(false);
  });
});

describe("getRenderableMessageParts", () => {
  test("falls back to content when assistant parts are empty", () => {
    expect(getRenderableMessageParts({
      content: "Non-streamed response",
      parts: [],
    })).toEqual([{ type: "text", text: "Non-streamed response" }]);
  });

  test("preserves existing parts when present", () => {
    expect(getRenderableMessageParts({
      content: "Ignored content",
      parts: [{ type: "text", text: "Structured part" }],
    })).toEqual([{ type: "text", text: "Structured part" }]);
  });
});
