import "@xterm/xterm/css/xterm.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { Plus, SquareTerminal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { useAppStore } from "@/store/app.store";

interface TerminalTab {
  id: string;
  label: string;
}

function resolveTerminalTheme() {
  const styles = getComputedStyle(document.documentElement);

  return {
    background: styles.getPropertyValue("--terminal").trim(),
    foreground: styles.getPropertyValue("--terminal-foreground").trim(),
    cursor: styles.getPropertyValue("--primary").trim(),
  };
}

export function TerminalDock() {
  const layout = useAppStore((state) => state.layout);
  const settings = useAppStore((state) => state.settings);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const setLayout = useAppStore((state) => state.setLayout);
  const activeTaskId = useAppStore((state) => state.activeTaskId);
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const workspacePathById = useAppStore((state) => state.workspacePathById);
  const workspaceCwd = workspacePathById[activeWorkspaceId];
  const terminalDockHeight = layout.terminalDockHeight ?? 210;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const sessionBufferRef = useRef<Record<string, string>>({});
  const writeLockRef = useRef(false);
  const transcriptRef = useRef<Record<string, string>>({});
  const creatingSessionRef = useRef(false);

  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState("");

  const activeSessionId = useMemo(() => activeTabId, [activeTabId]);
  const taskKey = useMemo(() => `${activeWorkspaceId}:${activeTaskId || "no-task"}`, [activeTaskId, activeWorkspaceId]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    if (!containerRef.current || xtermRef.current) {
      return;
    }

    const terminal = new Terminal({
      theme: resolveTerminalTheme(),
      fontFamily: settings.terminalFontFamily || '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      fontSize: settings.terminalFontSize || 13,
      lineHeight: settings.terminalLineHeight || 1.2,
      letterSpacing: 0,
      cursorBlink: true,
      convertEol: true,
      disableStdin: false,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const sendResize = () => {
      fitAddon.fit();
      const sessionId = activeSessionIdRef.current;
      const resizeSession = window.api?.terminal?.resizeSession;
      if (sessionId && resizeSession) {
        void resizeSession({ sessionId, cols: terminal.cols, rows: terminal.rows });
      }
    };

    // ResizeObserver fires after layout is complete and fonts are applied,
    // so it handles both the initial fit and all subsequent size changes.
    const ro = new ResizeObserver(() => sendResize());
    ro.observe(containerRef.current);

    const disposable = terminal.onData((input) => {
      const currentSessionId = activeSessionIdRef.current;
      if (!currentSessionId || writeLockRef.current) {
        return;
      }
      writeLockRef.current = true;
      const writeSession = window.api?.terminal?.writeSession;
      if (!writeSession) {
        terminal.writeln("\r\n[error] terminal bridge unavailable.");
        writeLockRef.current = false;
        return;
      }
      void writeSession({ sessionId: currentSessionId, input }).finally(() => {
        writeLockRef.current = false;
      });
    });

    return () => {
      disposable.dispose();
      ro.disconnect();
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [settings.terminalFontFamily, settings.terminalFontSize, settings.terminalLineHeight]);

  useEffect(() => {
    if (!xtermRef.current) {
      return;
    }
    xtermRef.current.options.theme = resolveTerminalTheme();
  }, [isDarkMode]);


  async function createSessionTab() {
    if (creatingSessionRef.current) return;
    creatingSessionRef.current = true;
    try {
      const createSession = window.api?.terminal?.createSession;
      if (!createSession) {
        const message = "Terminal bridge unavailable. Use bun run dev:desktop.";
        setBridgeError(message);
        xtermRef.current?.writeln(`\r\n[error] ${message}`);
        return;
      }
      const cols = xtermRef.current?.cols ?? 80;
      const rows = xtermRef.current?.rows ?? 24;
      const created = await createSession({ cwd: workspaceCwd, cols, rows });
      if (!created.ok || !created.sessionId) {
        setBridgeError("Failed to create terminal session.");
        xtermRef.current?.writeln("\r\n[error] failed to create terminal session.");
        return;
      }
      setBridgeError("");
      const nextId = created.sessionId;
      sessionBufferRef.current[nextId] = "";
      setTabs((prev) => {
        const index = prev.length + 1;
        return [...prev, { id: nextId, label: `Terminal ${index}` }];
      });
      setActiveTabId(nextId);
    } finally {
      creatingSessionRef.current = false;
    }
  }

  async function closeSession(args: { sessionId: string }) {
    const closeSessionApi = window.api?.terminal?.closeSession;
    if (closeSessionApi) {
      await closeSessionApi({ sessionId: args.sessionId });
    }
    delete sessionBufferRef.current[args.sessionId];
    setTabs((prev) => {
      const next = prev.filter((tab) => tab.id !== args.sessionId);
      if (activeTabId === args.sessionId) {
        setActiveTabId(next.at(-1)?.id ?? null);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!activeTaskId) {
      return;
    }
    const raw = window.localStorage.getItem("stave:terminal-task-transcript:v1");
    try {
      transcriptRef.current = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      transcriptRef.current = {};
    }
    const transcript = transcriptRef.current[taskKey];
    if (transcript && xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write(transcript);
    }
  }, [activeTaskId, taskKey]);

  // Reset sessions only when the workspace directory changes (not on every task switch).
  useEffect(() => {
    setTabs([]);
    setActiveTabId(null);
    sessionBufferRef.current = {};
    xtermRef.current?.clear();

    void createSessionTab();
    return () => {
      const closeSessionApi = window.api?.terminal?.closeSession;
      if (!closeSessionApi) {
        return;
      }
      const ids = Object.keys(sessionBufferRef.current);
      for (const id of ids) {
        void closeSessionApi({ sessionId: id });
      }
      sessionBufferRef.current = {};
    };
  }, [workspaceCwd]);

  // Fallback: ensure a session exists when a task is active but all sessions were cleared.
  useEffect(() => {
    if (!activeTaskId || tabs.length > 0) return;
    void createSessionTab();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTaskId, tabs.length]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const readSession = window.api?.terminal?.readSession;
      if (!readSession) {
        return;
      }

      const ids = tabs.map((tab) => tab.id);
      for (const sessionId of ids) {
        const read = await readSession({ sessionId });
        if (!read.ok || !read.output) {
          continue;
        }

        const currentBuffer = sessionBufferRef.current[sessionId] ?? "";
        const nextBuffer = `${currentBuffer}${read.output}`;
        sessionBufferRef.current[sessionId] = nextBuffer;
        const previousTranscript = transcriptRef.current[taskKey] ?? "";
        transcriptRef.current[taskKey] = `${previousTranscript}${read.output}`;
        window.localStorage.setItem("stave:terminal-task-transcript:v1", JSON.stringify(transcriptRef.current));

        if (activeSessionIdRef.current === sessionId) {
          xtermRef.current?.write(read.output);
        }
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, [tabs, taskKey]);

  useEffect(() => {
    if (!activeSessionId || !xtermRef.current) {
      return;
    }

    xtermRef.current.clear();
    const buffer = sessionBufferRef.current[activeSessionId] ?? "";
    if (buffer.trim()) {
      xtermRef.current.write(buffer);
    }
  }, [activeSessionId]);

  function clearActiveTerminal() {
    const sessionId = activeSessionIdRef.current;
    if (!sessionId) {
      return;
    }
    sessionBufferRef.current[sessionId] = "";
    transcriptRef.current[taskKey] = "";
    window.localStorage.setItem("stave:terminal-task-transcript:v1", JSON.stringify(transcriptRef.current));
    xtermRef.current?.clear();
  }

  return (
    <div data-testid="terminal-dock" className="pb-2 transition-[height] duration-200" style={{ height: `${terminalDockHeight}px` }}>
      <div className="grid h-full min-h-0 grid-cols-[1fr_156px] gap-1 overflow-hidden rounded-lg border border-border/80 bg-card">
        <section className="min-h-0 overflow-hidden">
          <div className="flex h-9 items-center justify-between border-b border-border/80 px-3 text-sm">
            <span className="inline-flex items-center gap-2 font-medium text-foreground">
              <SquareTerminal className="size-4 text-muted-foreground" />
              Terminal
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-md p-0 text-muted-foreground"
                onClick={clearActiveTerminal}
                title="Clear Terminal"
                aria-label="clear-terminal"
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-md p-0 text-muted-foreground"
                onClick={() => setLayout({ patch: { terminalDocked: false } })}
                title="Close Terminal"
                aria-label="close-terminal"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
          <div className="h-[calc(100%-1.75rem)] overflow-hidden bg-terminal">
            <div ref={containerRef} className="h-full w-full" />
          </div>
        </section>

        <aside className="min-h-0 border-l border-border/80 bg-background">
          <div className="flex h-9 items-center justify-between border-b border-border/80 px-3 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-md px-2"
              onClick={() => void createSessionTab()}
            >
              <Plus className="size-3.5" />
            </Button>
            <span className="text-muted-foreground">Sessions</span>
          </div>
          <div className="max-h-[calc(100%-1.75rem)] space-y-1 overflow-auto p-1">
            {bridgeError ? (
              <p className="rounded-sm border border-destructive/30 bg-destructive/10 px-2 py-1 text-sm text-destructive">
                {bridgeError}
              </p>
            ) : null}
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={[
                  "flex items-center justify-between rounded-sm border px-1 py-1 text-sm",
                  activeTabId === tab.id ? "border-primary/70 bg-secondary/80" : "border-border/70 bg-card",
                ].join(" ")}
              >
                <button className="truncate text-left" onClick={() => setActiveTabId(tab.id)}>{tab.label}</button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto rounded p-0.5 text-muted-foreground"
                  onClick={() => void closeSession({ sessionId: tab.id })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
