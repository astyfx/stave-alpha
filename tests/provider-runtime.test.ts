import { describe, expect, test } from "bun:test";
import { parseNormalizedEvent } from "@/lib/providers/runtime";

describe("parseNormalizedEvent", () => {
  test("accepts valid tool event", () => {
    const parsed = parseNormalizedEvent({
      payload: {
        type: "tool",
        toolName: "bash",
        input: "ls",
        state: "input-available",
      },
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("tool");
  });

  test("accepts valid plan_ready event", () => {
    const parsed = parseNormalizedEvent({
      payload: {
        type: "plan_ready",
        planText: "Ship it.",
      },
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("plan_ready");
  });

  test("rejects invalid event", () => {
    const parsed = parseNormalizedEvent({ payload: { type: "tool", state: "bad" } });
    expect(parsed).toBeNull();
  });
});
