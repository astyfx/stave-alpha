import { createBridgeProviderSource, hasBridgeProviderSource } from "@/lib/providers/bridge.source";
import { createProviderAdapter } from "@/lib/providers/adapter.factory";
import type { NormalizedProviderEvent, ProviderAdapter, ProviderEventSource, ProviderId } from "@/lib/providers/provider.types";

const claudeUnavailableSource: ProviderEventSource<NormalizedProviderEvent> = {
  async *streamTurn() {
    yield { type: "system", content: "Provider bridge unavailable. Use bun run dev:desktop or bun run dev:all." };
    yield { type: "done" };
  },
};

const codexUnavailableSource: ProviderEventSource<NormalizedProviderEvent> = {
  async *streamTurn() {
    yield { type: "system", content: "Provider bridge unavailable. Use bun run dev:desktop or bun run dev:all." };
    yield { type: "done" };
  },
};

function createClaudeSource(): ProviderEventSource<NormalizedProviderEvent> {
  if (hasBridgeProviderSource()) {
    return createBridgeProviderSource<NormalizedProviderEvent>({ providerId: "claude-code" });
  }
  return claudeUnavailableSource;
}

function createCodexSource(): ProviderEventSource<NormalizedProviderEvent> {
  if (hasBridgeProviderSource()) {
    return createBridgeProviderSource<NormalizedProviderEvent>({ providerId: "codex" });
  }
  return codexUnavailableSource;
}

export function getProviderAdapter(args: { providerId: ProviderId }): ProviderAdapter {
  const source = args.providerId === "claude-code" ? createClaudeSource() : createCodexSource();
  return createProviderAdapter({
    id: args.providerId,
    source,
    normalizer: {
      normalize: ({ event }) => event,
    },
  });
}
