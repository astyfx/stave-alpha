import { afterEach, describe, expect, test } from "bun:test";
import { BrowserFsAdapter } from "../src/lib/fs/browser-fs.adapter";

type FakeFileHandle = {
  kind: "file";
  name: string;
};

type FakeDirectoryHandle = {
  kind: "directory";
  name: string;
  children: Array<[string, FakeHandle]>;
};

type FakeHandle = FakeFileHandle | FakeDirectoryHandle;

function createFile(name: string): FakeFileHandle {
  return {
    kind: "file",
    name,
  };
}

function createDirectory(name: string, children: Array<[string, FakeHandle]>): FakeDirectoryHandle {
  return {
    kind: "directory",
    name,
    children,
    async *entries() {
      for (const child of children) {
        yield child;
      }
    },
  };
}

const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.window = originalWindow;
});

describe("BrowserFsAdapter", () => {
  test("keeps hidden files while skipping ignored directories during root discovery", async () => {
    const rootHandle = createDirectory("fixture", [
      [".env", createFile(".env")],
      ["src", createDirectory("src", [["index.ts", createFile("index.ts")]])],
      [".git", createDirectory(".git", [["config", createFile("config")]])],
      ["node_modules", createDirectory("node_modules", [["pkg.js", createFile("pkg.js")]])],
    ]);

    globalThis.window = {
      showDirectoryPicker: async () => rootHandle,
    } as Window & { showDirectoryPicker: () => Promise<FakeDirectoryHandle> };

    const adapter = new BrowserFsAdapter();
    const root = await adapter.pickRoot();

    expect(root?.files).toEqual([
      ".env",
      "src/index.ts",
    ]);
  });
});
