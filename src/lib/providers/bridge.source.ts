import type { ProviderEventSource, ProviderId, ProviderTurnRequest } from "@/lib/providers/provider.types";

function hasAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Symbol.asyncIterator in value;
}

async function* fromArray(args: { items: unknown[] }) {
  for (const item of args.items) {
    yield item;
  }
}

async function* fromPolledStream(args: {
  providerId: ProviderId;
  prompt: string;
  taskId?: string;
  workspaceId?: string;
  cwd?: string;
  runtimeOptions?: {
    chatStreamingEnabled?: boolean;
    debug?: boolean;
    providerTimeoutMs?: number;
    claudePermissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan" | "dontAsk";
    claudeAllowDangerouslySkipPermissions?: boolean;
    claudeSandboxEnabled?: boolean;
    claudeAllowUnsandboxedCommands?: boolean;
    codexSandboxMode?: "read-only" | "workspace-write" | "danger-full-access";
    codexNetworkAccessEnabled?: boolean;
    codexApprovalPolicy?: "never" | "on-request" | "on-failure" | "untrusted";
    codexPathOverride?: string;
    codexModelReasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
  };
}) {
  const startStreamTurn = window.api?.provider?.startStreamTurn;
  const readStreamTurn = window.api?.provider?.readStreamTurn;
  if (!startStreamTurn || !readStreamTurn) {
    return;
  }

  const started = await startStreamTurn({
    providerId: args.providerId,
    prompt: args.prompt,
    taskId: args.taskId,
    workspaceId: args.workspaceId,
    cwd: args.cwd,
    runtimeOptions: args.runtimeOptions,
  });
  if (!started.ok || !started.streamId) {
    return;
  }

  let cursor = 0;
  for (;;) {
    const page = await readStreamTurn({ streamId: started.streamId, cursor });
    if (!page.ok) {
      return;
    }
    for (const event of page.events) {
      yield event;
    }
    cursor = page.cursor;
    if (page.done) {
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
}

async function* fromPushStream(args: {
  providerId: ProviderId;
  prompt: string;
  taskId?: string;
  workspaceId?: string;
  cwd?: string;
  runtimeOptions?: {
    chatStreamingEnabled?: boolean;
    debug?: boolean;
    providerTimeoutMs?: number;
    claudePermissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan" | "dontAsk";
    claudeAllowDangerouslySkipPermissions?: boolean;
    claudeSandboxEnabled?: boolean;
    claudeAllowUnsandboxedCommands?: boolean;
    codexSandboxMode?: "read-only" | "workspace-write" | "danger-full-access";
    codexNetworkAccessEnabled?: boolean;
    codexApprovalPolicy?: "never" | "on-request" | "on-failure" | "untrusted";
    codexPathOverride?: string;
    codexModelReasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
  };
}) {
  const startPushTurn = window.api?.provider?.startPushTurn;
  const subscribeStreamEvents = window.api?.provider?.subscribeStreamEvents;
  if (!startPushTurn || !subscribeStreamEvents) {
    return;
  }

  const queue: unknown[] = [];
  const pending: Array<{ streamId: string; event: unknown; done: boolean }> = [];
  let done = false;
  let targetStreamId: string | null = null;
  let wake: (() => void) | null = null;
  const wakeUp = () => {
    if (!wake) {
      return;
    }
    const resolver = wake;
    wake = null;
    resolver();
  };

  const unsubscribe = subscribeStreamEvents((payload) => {
    if (!targetStreamId) {
      pending.push(payload);
      return;
    }
    if (payload.streamId !== targetStreamId) {
      return;
    }
    queue.push(payload.event);
    if (payload.done) {
      done = true;
    }
    wakeUp();
  });

  try {
    const started = await startPushTurn({
      providerId: args.providerId,
      prompt: args.prompt,
      taskId: args.taskId,
      workspaceId: args.workspaceId,
      cwd: args.cwd,
      runtimeOptions: args.runtimeOptions,
    });
    if (!started.ok || !started.streamId) {
      return;
    }
    targetStreamId = started.streamId;

    for (const item of pending) {
      if (item.streamId !== targetStreamId) {
        continue;
      }
      queue.push(item.event);
      if (item.done) {
        done = true;
      }
    }
    pending.length = 0;
    wakeUp();

    while (!done || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        continue;
      }
      const next = queue.shift();
      if (typeof next !== "undefined") {
        yield next;
      }
    }
  } finally {
    unsubscribe();
  }
}

async function resolveBridgeStream(args: {
  providerId: ProviderId;
  prompt: string;
  taskId?: string;
  workspaceId?: string;
  cwd?: string;
  runtimeOptions?: {
    chatStreamingEnabled?: boolean;
    debug?: boolean;
    providerTimeoutMs?: number;
    claudePermissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan" | "dontAsk";
    claudeAllowDangerouslySkipPermissions?: boolean;
    claudeSandboxEnabled?: boolean;
    claudeAllowUnsandboxedCommands?: boolean;
    codexSandboxMode?: "read-only" | "workspace-write" | "danger-full-access";
    codexNetworkAccessEnabled?: boolean;
    codexApprovalPolicy?: "never" | "on-request" | "on-failure" | "untrusted";
    codexPathOverride?: string;
    codexModelReasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
  };
}): Promise<unknown[] | AsyncIterable<unknown> | null> {
  if (args.runtimeOptions?.chatStreamingEnabled === false) {
    const streamTurn = window.api?.provider?.streamTurn;
    if (!streamTurn) {
      return null;
    }
    const result = await streamTurn({
      providerId: args.providerId,
      prompt: args.prompt,
      taskId: args.taskId,
      workspaceId: args.workspaceId,
      cwd: args.cwd,
      runtimeOptions: args.runtimeOptions,
    });

    if (Array.isArray(result) || hasAsyncIterable(result)) {
      return result;
    }

    return null;
  }

  const startPushTurn = window.api?.provider?.startPushTurn;
  const subscribeStreamEvents = window.api?.provider?.subscribeStreamEvents;
  if (startPushTurn && subscribeStreamEvents) {
    return fromPushStream({
      providerId: args.providerId,
      prompt: args.prompt,
      taskId: args.taskId,
      workspaceId: args.workspaceId,
      cwd: args.cwd,
      runtimeOptions: args.runtimeOptions,
    });
  }

  const startStreamTurn = window.api?.provider?.startStreamTurn;
  const readStreamTurn = window.api?.provider?.readStreamTurn;
  if (startStreamTurn && readStreamTurn) {
    return fromPolledStream({
      providerId: args.providerId,
      prompt: args.prompt,
      taskId: args.taskId,
      workspaceId: args.workspaceId,
      cwd: args.cwd,
      runtimeOptions: args.runtimeOptions,
    });
  }

  const streamTurn = window.api?.provider?.streamTurn;
  if (!streamTurn) {
    return null;
  }

  const result = await streamTurn({
    providerId: args.providerId,
    prompt: args.prompt,
    taskId: args.taskId,
    workspaceId: args.workspaceId,
    cwd: args.cwd,
    runtimeOptions: args.runtimeOptions,
  });

  if (Array.isArray(result)) {
    return result;
  }

  if (hasAsyncIterable(result)) {
    return result;
  }

  return null;
}

export function hasBridgeProviderSource() {
  if (typeof window === "undefined") {
    return false;
  }
  return typeof window.api?.provider?.startPushTurn === "function"
    || typeof window.api?.provider?.startStreamTurn === "function"
    || typeof window.api?.provider?.streamTurn === "function";
}

export function createBridgeProviderSource<TRawEvent>(args: { providerId: ProviderId }): ProviderEventSource<TRawEvent> {
  const { providerId } = args;

  return {
    async *streamTurn(turnArgs: ProviderTurnRequest) {
      const source = await resolveBridgeStream({
        providerId,
        prompt: turnArgs.prompt,
        taskId: turnArgs.taskId,
        workspaceId: turnArgs.workspaceId,
        cwd: turnArgs.cwd,
        runtimeOptions: turnArgs.runtimeOptions,
      });

      if (!source) {
        return;
      }

      if (Array.isArray(source)) {
        for await (const item of fromArray({ items: source })) {
          yield item as TRawEvent;
        }
        return;
      }

      for await (const item of source) {
        yield item as TRawEvent;
      }
    },
  };
}
