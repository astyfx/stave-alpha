import { promises as fs } from "node:fs";
import path from "node:path";
import type { RootFileEntry } from "../types";

export function revisionFromStat(args: { size: number; mtimeMs: number }) {
  return `node:${args.size}:${Math.floor(args.mtimeMs)}`;
}

export function isIgnoredDirectory(args: { name: string }) {
  return args.name.startsWith(".") || args.name === "node_modules" || args.name === "dist" || args.name === "out";
}

export async function listFilesRecursive(args: { rootPath: string; maxDepth?: number; maxFiles?: number }): Promise<string[]> {
  const maxDepth = args.maxDepth ?? 8;
  const maxFiles = args.maxFiles ?? 1000;
  const files: RootFileEntry[] = [];

  async function walk(currentPath: string, prefix: string, depth: number): Promise<void> {
    if (depth > maxDepth || files.length >= maxFiles) {
      return;
    }
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= maxFiles) {
        break;
      }
      if (entry.name.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (isIgnoredDirectory({ name: entry.name })) {
          continue;
        }
        await walk(fullPath, relativePath, depth + 1);
      } else if (entry.isFile()) {
        files.push({ relativePath });
      }
    }
  }

  await walk(args.rootPath, "", 0);
  return files.map((item) => item.relativePath).sort();
}

export function resolveRootFilePath(args: { rootPath: string; filePath: string }) {
  const normalizedRoot = path.resolve(args.rootPath);
  const absolute = path.resolve(normalizedRoot, args.filePath);
  const relative = path.relative(normalizedRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return absolute;
}

export function mimeTypeFromFilePath(args: { filePath: string }) {
  const lower = args.filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".avif")) return "image/avif";
  return "application/octet-stream";
}
