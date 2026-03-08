import type { WorkspaceFileData, WorkspaceFsAdapter, WorkspaceImageData, WorkspaceRootInfo, WorkspaceWriteResult } from "@/lib/fs/fs.types";

export class ElectronFsAdapter implements WorkspaceFsAdapter {
  private rootPath: string | null = null;
  private knownFiles: string[] = [];

  isAvailable() {
    return Boolean(window.api?.fs?.pickRoot && window.api?.fs?.readFile && window.api?.fs?.writeFile);
  }

  async pickRoot(): Promise<WorkspaceRootInfo | null> {
    const picker = window.api?.fs?.pickRoot;
    if (!picker) {
      return null;
    }

    const result = await picker();
    if (!result.ok || !result.rootPath || !result.rootName) {
      return null;
    }

    this.rootPath = result.rootPath;
    this.knownFiles = result.files;
    return {
      rootName: result.rootName,
      rootPath: result.rootPath,
      files: result.files,
    };
  }

  async listFiles(): Promise<string[]> {
    if (!this.rootPath) {
      return this.knownFiles;
    }
    const listFiles = window.api?.fs?.listFiles;
    if (!listFiles) {
      return this.knownFiles;
    }

    const result = await listFiles({ rootPath: this.rootPath });
    if (!result.ok) {
      return this.knownFiles;
    }
    this.knownFiles = result.files;
    return result.files;
  }

  async readFile(args: { filePath: string }): Promise<WorkspaceFileData | null> {
    if (!this.rootPath) {
      return null;
    }
    const readFile = window.api?.fs?.readFile;
    if (!readFile) {
      return null;
    }

    const result = await readFile({ rootPath: this.rootPath, filePath: args.filePath });
    if (!result.ok) {
      return null;
    }

    return {
      content: result.content,
      revision: result.revision,
    };
  }

  async readFileDataUrl(args: { filePath: string }): Promise<WorkspaceImageData | null> {
    if (!this.rootPath) {
      return null;
    }
    const readFileDataUrl = window.api?.fs?.readFileDataUrl;
    if (!readFileDataUrl) {
      return null;
    }
    const result = await readFileDataUrl({ rootPath: this.rootPath, filePath: args.filePath });
    if (!result.ok) {
      return null;
    }
    return {
      dataUrl: result.dataUrl,
      revision: result.revision,
    };
  }

  async writeFile(args: { filePath: string; content: string; expectedRevision?: string | null }): Promise<WorkspaceWriteResult> {
    if (!this.rootPath) {
      return { ok: false };
    }
    const writeFile = window.api?.fs?.writeFile;
    if (!writeFile) {
      return { ok: false };
    }

    const result = await writeFile({
      rootPath: this.rootPath,
      filePath: args.filePath,
      content: args.content,
      expectedRevision: args.expectedRevision,
    });

    return {
      ok: result.ok,
      revision: result.revision,
      conflict: result.conflict,
    };
  }

  getKnownFiles(): string[] {
    return this.knownFiles;
  }

  setRoot(args: { rootPath: string; rootName: string; files?: string[] }) {
    this.rootPath = args.rootPath;
    this.knownFiles = args.files ?? this.knownFiles;
  }

  getRootPath() {
    return this.rootPath;
  }
}
