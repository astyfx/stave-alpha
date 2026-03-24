import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  FilesystemDirectoryArgsSchema,
  FilesystemFileArgsSchema,
  FilesystemRootArgsSchema,
  FilesystemWriteFileArgsSchema,
} from "../electron/main/ipc/schemas";
import { listDirectoryEntries, listFilesRecursive, resolveRootFilePath } from "../electron/main/utils/filesystem";

const tempDirs: string[] = [];

function createTempWorkspace() {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "stave-filesystem-utils-"));
  tempDirs.push(workspaceRoot);
  return workspaceRoot;
}

function writeText(filePath: string, value: string) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("filesystem IPC validation", () => {
  test("rejects requests with missing path fields before they reach path utilities", () => {
    expect(FilesystemRootArgsSchema.safeParse({}).success).toBe(false);
    expect(FilesystemFileArgsSchema.safeParse({ rootPath: "/tmp/project" }).success).toBe(false);
    expect(FilesystemDirectoryArgsSchema.safeParse({ rootPath: "/tmp/project", directoryPath: 123 }).success).toBe(false);
    expect(
      FilesystemWriteFileArgsSchema.safeParse({
        rootPath: "/tmp/project",
        filePath: "src/index.ts",
      }).success,
    ).toBe(false);
  });
});

describe("filesystem path helpers", () => {
  test("returns null instead of throwing when a file request omits a path value", () => {
    expect(resolveRootFilePath({ rootPath: undefined, filePath: "src/index.ts" })).toBeNull();
    expect(resolveRootFilePath({ rootPath: "/tmp/project", filePath: undefined })).toBeNull();
  });

  test("throws a descriptive error when listing files without a workspace root", async () => {
    await expect(listFilesRecursive({ rootPath: undefined })).rejects.toThrow("Workspace root path is required.");
  });

  test("keeps hidden files and useful dot-directories while still skipping ignored directories", async () => {
    const workspaceRoot = createTempWorkspace();
    writeText(path.join(workspaceRoot, ".env"), "A=1\n");
    writeText(path.join(workspaceRoot, ".github/workflows/ci.yml"), "name: ci\n");
    writeText(path.join(workspaceRoot, "src/index.ts"), "export {};\n");
    writeText(path.join(workspaceRoot, ".git/config"), "[core]\n");
    writeText(path.join(workspaceRoot, "node_modules/pkg/index.js"), "module.exports = {};\n");

    const files = await listFilesRecursive({ rootPath: workspaceRoot });

    expect(files).toContain(".env");
    expect(files).toContain(".github/workflows/ci.yml");
    expect(files).toContain("src/index.ts");
    expect(files).not.toContain(".git/config");
    expect(files).not.toContain("node_modules/pkg/index.js");
  });

  test("walks folders deeper than the original explorer depth limit", async () => {
    const workspaceRoot = createTempWorkspace();
    writeText(path.join(workspaceRoot, "a/b/c/d/e/f/g/h/i/j/file.txt"), "deep\n");

    const files = await listFilesRecursive({ rootPath: workspaceRoot });

    expect(files).toContain("a/b/c/d/e/f/g/h/i/j/file.txt");
  });

  test("lists visible directories before files and keeps empty folders available for lazy explorer loads", async () => {
    const workspaceRoot = createTempWorkspace();
    mkdirSync(path.join(workspaceRoot, ".github/workflows"), { recursive: true });
    mkdirSync(path.join(workspaceRoot, "empty-folder"), { recursive: true });
    mkdirSync(path.join(workspaceRoot, "src"), { recursive: true });
    mkdirSync(path.join(workspaceRoot, ".git/hooks"), { recursive: true });
    writeText(path.join(workspaceRoot, ".env"), "A=1\n");
    writeText(path.join(workspaceRoot, "src/index.ts"), "export {};\n");

    const rootEntries = await listDirectoryEntries({ rootPath: workspaceRoot });
    const githubEntries = await listDirectoryEntries({ rootPath: workspaceRoot, directoryPath: ".github" });

    expect(rootEntries.map((entry) => `${entry.type}:${entry.name}`)).toEqual([
      "folder:.github",
      "folder:empty-folder",
      "folder:src",
      "file:.env",
    ]);
    expect(rootEntries.some((entry) => entry.path === ".git")).toBe(false);
    expect(githubEntries).toEqual([
      { name: "workflows", path: ".github/workflows", type: "folder" },
    ]);
  });
});
