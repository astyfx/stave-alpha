import { app, Menu } from "electron";
import { registerHandlers } from "./main/ipc";
import { resetMainProcessState } from "./main/state";
import { createMainWindow } from "./main/window";

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerHandlers();
  createMainWindow();
});

app.on("before-quit", () => {
  resetMainProcessState();
});
