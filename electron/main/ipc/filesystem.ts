import { dialog, ipcMain, shell } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { listFilesRecursive, mimeTypeFromFilePath, resolveRootFilePath, revisionFromStat } from "../utils/filesystem";

export function registerFilesystemHandlers() {
  ipcMain.handle("fs:pick-root", async () => {
    const selected = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (selected.canceled || selected.filePaths.length === 0) {
      return { ok: false, files: [], stderr: "No folder selected." };
    }
    const rootPath = selected.filePaths[0];
    if (!rootPath) {
      return { ok: false, files: [], stderr: "No folder selected." };
    }
    try {
      const files = await listFilesRecursive({ rootPath });
      return { ok: true, rootPath, rootName: path.basename(rootPath), files };
    } catch (error) {
      return { ok: false, files: [], stderr: String(error) };
    }
  });

  ipcMain.handle("shell:open-external", async (_event, { url }: { url: string }) => {
    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle("fs:list-files", async (_event, args: { rootPath: string }) => {
    try {
      const files = await listFilesRecursive({ rootPath: args.rootPath });
      return { ok: true, files };
    } catch (error) {
      return { ok: false, files: [], stderr: String(error) };
    }
  });

  ipcMain.handle("fs:read-file", async (_event, args: { rootPath: string; filePath: string }) => {
    const absolutePath = resolveRootFilePath({ rootPath: args.rootPath, filePath: args.filePath });
    if (!absolutePath) {
      return { ok: false, content: "", revision: "", stderr: "Invalid file path." };
    }
    try {
      const [content, stat] = await Promise.all([fs.readFile(absolutePath, "utf8"), fs.stat(absolutePath)]);
      return {
        ok: true,
        content,
        revision: revisionFromStat({ size: stat.size, mtimeMs: stat.mtimeMs }),
      };
    } catch (error) {
      return { ok: false, content: "", revision: "", stderr: String(error) };
    }
  });

  ipcMain.handle("fs:read-file-data-url", async (_event, args: { rootPath: string; filePath: string }) => {
    const absolutePath = resolveRootFilePath({ rootPath: args.rootPath, filePath: args.filePath });
    if (!absolutePath) {
      return { ok: false, dataUrl: "", revision: "", stderr: "Invalid file path." };
    }
    try {
      const [buffer, stat] = await Promise.all([fs.readFile(absolutePath), fs.stat(absolutePath)]);
      const mimeType = mimeTypeFromFilePath({ filePath: args.filePath });
      return {
        ok: true,
        dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
        revision: revisionFromStat({ size: stat.size, mtimeMs: stat.mtimeMs }),
      };
    } catch (error) {
      return { ok: false, dataUrl: "", revision: "", stderr: String(error) };
    }
  });

  ipcMain.handle("fs:write-file", async (_event, args: {
    rootPath: string;
    filePath: string;
    content: string;
    expectedRevision?: string | null;
  }) => {
    const absolutePath = resolveRootFilePath({ rootPath: args.rootPath, filePath: args.filePath });
    if (!absolutePath) {
      return { ok: false, stderr: "Invalid file path." };
    }
    try {
      const beforeStat = await fs.stat(absolutePath);
      const currentRevision = revisionFromStat({ size: beforeStat.size, mtimeMs: beforeStat.mtimeMs });
      if (args.expectedRevision && args.expectedRevision !== currentRevision) {
        return { ok: false, conflict: true, revision: currentRevision };
      }
      await fs.writeFile(absolutePath, args.content, "utf8");
      const nextStat = await fs.stat(absolutePath);
      return {
        ok: true,
        revision: revisionFromStat({ size: nextStat.size, mtimeMs: nextStat.mtimeMs }),
      };
    } catch (error) {
      return { ok: false, stderr: String(error) };
    }
  });

  ipcMain.handle("fs:read-type-defs", async (_event, args: { rootPath: string }) => {
    const libs: Array<{ content: string; filePath: string }> = [];
    const MAX_TOTAL = 400;
    const MAX_DEPTH = 3;

    async function collectDts(dir: string, virtualBase: string, depth: number): Promise<void> {
      if (depth > MAX_DEPTH || libs.length >= MAX_TOTAL) {
        return;
      }
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (libs.length >= MAX_TOTAL) {
          break;
        }
        if (entry.isFile() && entry.name.endsWith(".d.ts")) {
          try {
            const content = await fs.readFile(path.join(dir, entry.name), "utf-8");
            libs.push({ content, filePath: `${virtualBase}/${entry.name}` });
          } catch {
            // Skip unreadable files.
          }
        } else if (entry.isDirectory() && entry.name !== "node_modules") {
          await collectDts(path.join(dir, entry.name), `${virtualBase}/${entry.name}`, depth + 1);
        }
      }
    }

    try {
      const pkgJsonRaw = await fs.readFile(path.join(args.rootPath, "package.json"), "utf-8");
      const pkgJson = JSON.parse(pkgJsonRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = Object.keys({ ...(pkgJson.dependencies ?? {}), ...(pkgJson.devDependencies ?? {}) });

      for (const dep of deps) {
        if (libs.length >= MAX_TOTAL) {
          break;
        }

        if (!dep.startsWith("@")) {
          await collectDts(
            path.join(args.rootPath, "node_modules", "@types", dep),
            `file:///node_modules/@types/${dep}`,
            0,
          );
        }

        const depDir = path.join(args.rootPath, "node_modules", dep);
        let typesEntry: string | undefined;
        try {
          const depPkg = JSON.parse(await fs.readFile(path.join(depDir, "package.json"), "utf-8")) as {
            types?: string;
            typings?: string;
          };
          typesEntry = depPkg.types ?? depPkg.typings;
        } catch {
          // Ignore packages without package.json or types metadata.
        }

        if (typesEntry) {
          const typesDir = path.dirname(path.join(depDir, typesEntry));
          await collectDts(typesDir, `file:///node_modules/${dep}`, 0);
        } else {
          try {
            const content = await fs.readFile(path.join(depDir, "index.d.ts"), "utf-8");
            libs.push({ content, filePath: `file:///node_modules/${dep}/index.d.ts` });
          } catch {
            // Ignore packages without a root index.d.ts.
          }
        }
      }
    } catch (error) {
      return { ok: false, libs: [], stderr: String(error) };
    }

    return { ok: true, libs };
  });

  ipcMain.handle("fs:read-source-files", async (_event, args: { rootPath: string }) => {
    const files: Array<{ content: string; filePath: string }> = [];
    const MAX_TOTAL = 800;
    const EXCLUDED_DIRS = new Set(["node_modules", ".git", "dist", "out", "build", ".next", ".nuxt"]);

    async function collectSrc(dir: string, virtualBase: string): Promise<void> {
      if (files.length >= MAX_TOTAL) {
        return;
      }
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (files.length >= MAX_TOTAL) {
          break;
        }
        if (entry.isFile() && /\.(tsx?|d\.ts)$/.test(entry.name)) {
          try {
            const content = await fs.readFile(path.join(dir, entry.name), "utf-8");
            files.push({ content, filePath: `${virtualBase}/${entry.name}` });
          } catch {
            // Skip unreadable files.
          }
        } else if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name)) {
          await collectSrc(path.join(dir, entry.name), `${virtualBase}/${entry.name}`);
        }
      }
    }

    try {
      await collectSrc(args.rootPath, "file://");
      return { ok: true, files };
    } catch (error) {
      return { ok: false, files: [], stderr: String(error) };
    }
  });
}
