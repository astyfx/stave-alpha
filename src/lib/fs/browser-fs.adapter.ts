import type { WorkspaceFileData, WorkspaceFsAdapter, WorkspaceImageData, WorkspaceRootInfo, WorkspaceWriteResult } from "@/lib/fs/fs.types";

interface WindowWithPicker extends Window {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
}

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
    this.fileHandleMap.clear();
    await this.walkDirectory({
      handle: this.rootHandle,
      prefix: "",
      depth: 0,
      maxDepth: 8,
      maxFiles: 500,
    });

    return {
      rootName: this.rootHandle.name,
      files: this.getKnownFiles(),
    };
  }

  async listFiles(): Promise<string[]> {
    return this.getKnownFiles();
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
        if (name.startsWith(".")) {
          continue;
        }
        const nextPath = args.prefix ? `${args.prefix}/${name}` : name;
        if (handle.kind === "file") {
          this.fileHandleMap.set(nextPath, handle as FileSystemFileHandle);
        } else {
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
        if (name.startsWith(".")) {
          continue;
        }
        const nextPath = args.prefix ? `${args.prefix}/${name}` : name;
        if (handle.kind === "file") {
          this.fileHandleMap.set(nextPath, handle as FileSystemFileHandle);
        } else {
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
