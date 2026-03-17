import { describe, expect, test } from "bun:test";
import { cyclePermissionMode, getPermissionModeOptions } from "../src/components/ai-elements/permission-mode-selector";

describe("Codex permission mode options", () => {
  test("include the on-failure mode exposed by the upgraded SDK", () => {
    expect(getPermissionModeOptions("codex").map((option) => option.value)).toEqual([
      "never",
      "on-request",
      "on-failure",
      "untrusted",
    ]);
  });

  test("cycles through on-failure before untrusted", () => {
    expect(cyclePermissionMode({ providerId: "codex", current: "on-request" })).toBe("on-failure");
  });
});
