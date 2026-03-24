import type { WorkspaceDirectoryEntry, WorkspaceFileData, WorkspaceFsAdapter, WorkspaceImageData, WorkspaceRootInfo, WorkspaceWriteResult } from "@/lib/fs/fs.types";

interface WindowWithPicker extends Window {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
}

const IGNORED_BROWSER_DIRECTORY_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  "build",
  ".next",
  ".nuxt",
]);

function buildRevision(args: { size: number; lastModified: number }) {
  return `browser:${args.size}:${args.lastModified}`;
}

function toBase64(args: { bytes: Uint8Array }) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < args.bytes.length; index += chunkSize) {
    const chunk = args.bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export class BrowserFsAdapter implements WorkspaceFsAdapter {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private directoryHandleMap = new Map<string, FileSystemDirectoryHandle>();
  private fileHandleMap = new Map<string, FileSystemFileHandle>();

  isAvailable() {
    return typeof (window as WindowWithPicker).showDirectoryPicker === "function";
  }

  async pickRoot(): Promise<WorkspaceRootInfo | null> {
    const picker = (window as WindowWithPicker).showDirectoryPicker;
    if (!picker) {
      return null;
    }

    this.rootHandle = await picker();
    this.directoryHandleMap.clear();
    this.directoryHandleMap.set("", this.rootHandle);
    this.fileHandleMap.clear();
    await this.walkDirectory({
      handle: this.rootHandle,
      prefix: "",
      depth: 0,
      maxDepth: 32,
      maxFiles: 25_000,
    });

    return {
      rootName: this.rootHandle.name,
      files: this.getKnownFiles(),
    };
  }

  async listFiles(): Promise<string[]> {
    return this.getKnownFiles();
  }

  async listDirectory(args: { directoryPath?: string }): Promise<WorkspaceDirectoryEntry[] | null> {
    const normalizedDirectoryPath = args.directoryPath?.trim() ?? "";
    const directoryHandle = normalizedDirectoryPath.length === 0
      ? this.rootHandle
      : this.directoryHandleMap.get(normalizedDirectoryPath);
    if (!directoryHandle) {
      return null;
    }

    const entries: WorkspaceDirectoryEntry[] = [];
    const iterableHandle = directoryHandle as unknown as {
      entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
      values?: () => AsyncIterableIterator<FileSystemHandle>;
    };

    if (iterableHandle.entries) {
      for await (const [name, handle] of iterableHandle.entries()) {
        if (handle.kind === "directory" && isIgnoredBrowserDirectory(name)) {
          continue;
        }
        entries.push({
          name,
          path: normalizedDirectoryPath ? `${normalizedDirectoryPath}/${name}` : name,
          type: handle.kind === "directory" ? "folder" : "file",
        });
      }
    } else if (iterableHandle.values) {
      for await (const handle of iterableHandle.values()) {
        const name = handle.name;
        if (handle.kind === "directory" && isIgnoredBrowserDirectory(name)) {
          continue;
        }
        entries.push({
          name,
          path: normalizedDirectoryPath ? `${normalizedDirectoryPath}/${name}` : name,
          type: handle.kind === "directory" ? "folder" : "file",
        });
      }
    }

    return entries.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "folder" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
  }

  async readFile(args: { filePath: string }): Promise<WorkspaceFileData | null> {
    const handle = this.fileHandleMap.get(args.filePath);
    if (!handle) {
      return null;
    }

    const file = await handle.getFile();
    return {
      content: await file.text(),
      revision: buildRevision({ size: file.size, lastModified: file.lastModified }),
    };
  }

  async readFileDataUrl(args: { filePath: string }): Promise<WorkspaceImageData | null> {
    const handle = this.fileHandleMap.get(args.filePath);
    if (!handle) {
      return null;
    }

    const file = await handle.getFile();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    return {
      dataUrl: `data:${mimeType};base64,${toBase64({ bytes })}`,
      revision: buildRevision({ size: file.size, lastModified: file.lastModified }),
    };
  }

  async writeFile(args: { filePath: string; content: string; expectedRevision?: string | null }): Promise<WorkspaceWriteResult> {
    const handle = this.fileHandleMap.get(args.filePath);
    if (!handle) {
      return { ok: false };
    }

    const current = await this.readFile({ filePath: args.filePath });
    if (args.expectedRevision && current && current.revision !== args.expectedRevision) {
      return { ok: false, conflict: true, revision: current.revision };
    }

    const writable = await handle.createWritable();
    await writable.write(args.content);
    await writable.close();

    const next = await this.readFile({ filePath: args.filePath });
    return {
      ok: true,
      revision: next?.revision,
    };
  }

  getKnownFiles(): string[] {
    return [...this.fileHandleMap.keys()].sort();
  }

  getRootPath() {
    return null;
  }

  private async walkDirectory(args: {
    handle: FileSystemDirectoryHandle;
    prefix: string;
    depth: number;
    maxDepth: number;
    maxFiles: number;
  }) {
    if (args.depth > args.maxDepth || this.fileHandleMap.size >= args.maxFiles) {
      return;
    }

    const iterableHandle = args.handle as unknown as {
      entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
      values?: () => AsyncIterableIterator<FileSystemHandle>;
    };

    if (iterableHandle.entries) {
      for await (const [name, handle] of iterableHandle.entries()) {
        const nextPath = args.prefix ? `${args.prefix}/${name}` : name;
        if (handle.kind === "file") {
          this.fileHandleMap.set(nextPath, handle as FileSystemFileHandle);
        } else if (!isIgnoredBrowserDirectory(name)) {
          this.directoryHandleMap.set(nextPath, handle as FileSystemDirectoryHandle);
          await this.walkDirectory({
            handle: handle as FileSystemDirectoryHandle,
            prefix: nextPath,
            depth: args.depth + 1,
            maxDepth: args.maxDepth,
            maxFiles: args.maxFiles,
          });
        }
        if (this.fileHandleMap.size >= args.maxFiles) {
          break;
        }
      }
      return;
    }

    if (iterableHandle.values) {
      for await (const handle of iterableHandle.values()) {
        const name = handle.name;
        const nextPath = args.prefix ? `${args.prefix}/${name}` : name;
        if (handle.kind === "file") {
          this.fileHandleMap.set(nextPath, handle as FileSystemFileHandle);
        } else if (!isIgnoredBrowserDirectory(name)) {
          this.directoryHandleMap.set(nextPath, handle as FileSystemDirectoryHandle);
          await this.walkDirectory({
            handle: handle as FileSystemDirectoryHandle,
            prefix: nextPath,
            depth: args.depth + 1,
            maxDepth: args.maxDepth,
            maxFiles: args.maxFiles,
          });
        }
        if (this.fileHandleMap.size >= args.maxFiles) {
          break;
        }
      }
    }
  }
}

function isIgnoredBrowserDirectory(name: string) {
  return IGNORED_BROWSER_DIRECTORY_NAMES.has(name);
}
