import { ipcMain } from "electron";
import type { PersistenceWorkspaceSnapshot } from "../../persistence/types";
import { ensurePersistenceReady, ensurePersistenceReadySync } from "../state";

export function registerPersistenceHandlers() {
  ipcMain.handle("persistence:list-workspaces", async () => {
    const store = await ensurePersistenceReady();
    const rows = store.listWorkspaceSummaries();
    return { ok: true, rows };
  });

  ipcMain.handle("persistence:load-workspace", async (_event, args: { workspaceId: string }) => {
    const store = await ensurePersistenceReady();
    const snapshot = store.loadWorkspaceSnapshot({ workspaceId: args.workspaceId });
    return { ok: true, snapshot };
  });

  ipcMain.handle("persistence:upsert-workspace", async (_event, args: {
    id: string;
    name: string;
    snapshot: PersistenceWorkspaceSnapshot;
  }) => {
    const store = await ensurePersistenceReady();
    store.upsertWorkspace({
      id: args.id,
      name: args.name,
      snapshot: args.snapshot,
    });
    return { ok: true };
  });

  ipcMain.on("persistence:upsert-workspace-sync", (event, args: {
    id: string;
    name: string;
    snapshot: PersistenceWorkspaceSnapshot;
  }) => {
    try {
      const store = ensurePersistenceReadySync();
      store.upsertWorkspace({
        id: args.id,
        name: args.name,
        snapshot: args.snapshot,
      });
      event.returnValue = { ok: true };
    } catch (error) {
      event.returnValue = { ok: false, message: String(error) };
    }
  });

  ipcMain.handle("persistence:delete-workspace", async (_event, args: { workspaceId: string }) => {
    const store = await ensurePersistenceReady();
    store.deleteWorkspace({ workspaceId: args.workspaceId });
    return { ok: true };
  });

  ipcMain.handle("persistence:list-turn-events", async (_event, args: {
    turnId: string;
    afterSequence?: number;
    limit?: number;
  }) => {
    const store = await ensurePersistenceReady();
    const events = store.listTurnEvents({
      turnId: args.turnId,
      afterSequence: args.afterSequence,
      limit: args.limit,
    });
    return { ok: true, events };
  });
}
