import { describe, expect, test } from "bun:test";
import packageJson from "../package.json";

describe("package scripts", () => {
  test("contains expected dev/build scripts", () => {
    const scripts = packageJson.scripts as Record<string, string>;
    expect(typeof scripts.dev).toBe("string");
    expect(typeof scripts["dev:all"]).toBe("string");
    expect(typeof scripts["dev:desktop"]).toBe("string");
    expect(typeof scripts["build:desktop"]).toBe("string");
  });
});
