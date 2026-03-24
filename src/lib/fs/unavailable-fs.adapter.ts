import type { WorkspaceDirectoryEntry, WorkspaceFileData, WorkspaceFsAdapter, WorkspaceImageData, WorkspaceRootInfo, WorkspaceWriteResult } from "@/lib/fs/fs.types";

export class UnavailableFsAdapter implements WorkspaceFsAdapter {
  isAvailable() {
    return true;
  }

  async pickRoot(): Promise<WorkspaceRootInfo | null> {
    return null;
  }

  async listFiles(): Promise<string[]> {
    return [];
  }

  async listDirectory(_args: { directoryPath?: string }): Promise<WorkspaceDirectoryEntry[] | null> {
    return null;
  }

  async readFile(_args: { filePath: string }): Promise<WorkspaceFileData | null> {
    return null;
  }

  async readFileDataUrl(_args: { filePath: string }): Promise<WorkspaceImageData | null> {
    return null;
  }

  async writeFile(_args: { filePath: string; content: string; expectedRevision?: string | null }): Promise<WorkspaceWriteResult> {
    return { ok: false };
  }

  getKnownFiles(): string[] {
    return [];
  }

  getRootPath() {
    return null;
  }
}
