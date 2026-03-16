import { desktopCapturer, ipcMain } from "electron";

export function registerScreenshotHandlers() {
  ipcMain.handle("screenshot:capture", async () => {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    const primary = sources[0];
    if (!primary) {
      return { ok: false, dataUrl: "" };
    }
    return { ok: true, dataUrl: primary.thumbnail.toDataURL() };
  });
}
