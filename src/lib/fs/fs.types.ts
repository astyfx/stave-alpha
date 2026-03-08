export interface WorkspaceRootInfo {
  rootName: string;
  rootPath?: string;
  files: string[];
}

export interface WorkspaceFileData {
  content: string;
  revision: string;
}

export interface WorkspaceImageData {
  dataUrl: string;
  revision: string;
}

export interface WorkspaceWriteResult {
  ok: boolean;
  revision?: string;
  conflict?: boolean;
}

export interface WorkspaceFsAdapter {
  isAvailable: () => boolean;
  pickRoot: () => Promise<WorkspaceRootInfo | null>;
  listFiles: () => Promise<string[]>;
  readFile: (args: { filePath: string }) => Promise<WorkspaceFileData | null>;
  readFileDataUrl: (args: { filePath: string }) => Promise<WorkspaceImageData | null>;
  writeFile: (args: { filePath: string; content: string; expectedRevision?: string | null }) => Promise<WorkspaceWriteResult>;
  getKnownFiles: () => string[];
  setRoot?: (args: { rootPath: string; rootName: string; files?: string[] }) => Promise<void> | void;
  getRootPath?: () => string | null;
}
