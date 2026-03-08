import { describe, expect, test } from "bun:test";
import { CODEX_SDK_MODEL_OPTIONS, toHumanModelName } from "@/lib/providers/model-catalog";

describe("model catalog", () => {
  test("includes the verified Codex model set", () => {
    expect(CODEX_SDK_MODEL_OPTIONS).toEqual([
      "gpt-5.4",
      "gpt-5.3-codex",
    ]);
  });

  test("formats GPT-5.4 with the canonical label", () => {
    expect(toHumanModelName({ model: "gpt-5.4" })).toBe("GPT-5.4");
  });
});
