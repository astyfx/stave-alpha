import { ElectronFsAdapter } from "@/lib/fs/electron-fs.adapter";
import { BrowserFsAdapter } from "@/lib/fs/browser-fs.adapter";
import { UnavailableFsAdapter } from "@/lib/fs/unavailable-fs.adapter";
import type { WorkspaceFsAdapter } from "@/lib/fs/fs.types";

function createWorkspaceFsAdapter(): WorkspaceFsAdapter {
  const electronAdapter = new ElectronFsAdapter();
  if (electronAdapter.isAvailable()) {
    return electronAdapter;
  }
  const browserAdapter = new BrowserFsAdapter();
  if (browserAdapter.isAvailable()) {
    return browserAdapter;
  }
  return new UnavailableFsAdapter();
}

export const workspaceFsAdapter = createWorkspaceFsAdapter();
