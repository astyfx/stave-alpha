import { ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import * as pty from "node-pty";
import { deleteTerminalSession, getTerminalSession, setTerminalSession } from "../state";
import { resolveCommandCwd, runCommand } from "../utils/command";

function createTerminalSession(args: { shell?: string; cwd?: string; cols?: number; rows?: number }) {
  const shellExe = args.shell?.trim() || process.env.SHELL || "/bin/bash";
  const cols = args.cols ?? 80;
  const rows = args.rows ?? 24;

  const ptyProcess = pty.spawn(shellExe, [], {
    name: "xterm-color",
    cols,
    rows,
    cwd: resolveCommandCwd({ cwd: args.cwd }),
    env: process.env as Record<string, string>,
  });

  const sessionId = randomUUID();
  const session = {
    pty: ptyProcess,
    output: "",
  };
  setTerminalSession(sessionId, session);

  ptyProcess.onData((data) => {
    const current = getTerminalSession(sessionId);
    if (current) {
      current.output += data;
    }
  });
  ptyProcess.onExit(() => {
    deleteTerminalSession(sessionId);
  });

  return sessionId;
}

export function registerTerminalHandlers() {
  ipcMain.handle("terminal:run-command", async (_event, args: { command: string; cwd?: string }) => {
    return runCommand({ command: args.command, cwd: args.cwd });
  });

  ipcMain.handle("terminal:create-session", (_event, args: { cwd?: string; shell?: string; cols?: number; rows?: number }) => {
    const sessionId = createTerminalSession({ cwd: args.cwd, shell: args.shell, cols: args.cols, rows: args.rows });
    return { ok: true, sessionId };
  });

  ipcMain.handle("terminal:write-session", (_event, args: { sessionId: string; input: string }) => {
    const session = getTerminalSession(args.sessionId);
    if (!session) {
      return { ok: false, stderr: "Terminal session not found." };
    }
    session.pty.write(args.input);
    return { ok: true };
  });

  ipcMain.handle("terminal:read-session", (_event, args: { sessionId: string }) => {
    const session = getTerminalSession(args.sessionId);
    if (!session) {
      return { ok: false, output: "", stderr: "Terminal session not found." };
    }
    const output = session.output;
    session.output = "";
    return { ok: true, output, stderr: "" };
  });

  ipcMain.handle("terminal:resize-session", (_event, args: { sessionId: string; cols: number; rows: number }) => {
    const session = getTerminalSession(args.sessionId);
    if (!session) {
      return { ok: false, stderr: "Terminal session not found." };
    }
    session.pty.resize(Math.max(1, args.cols), Math.max(1, args.rows));
    return { ok: true };
  });

  ipcMain.handle("terminal:close-session", (_event, args: { sessionId: string }) => {
    const session = getTerminalSession(args.sessionId);
    if (!session) {
      return { ok: false, stderr: "Terminal session not found." };
    }
    session.pty.kill();
    deleteTerminalSession(args.sessionId);
    return { ok: true, stderr: "" };
  });
}
