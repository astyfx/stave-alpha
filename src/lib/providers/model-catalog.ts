import type { ProviderId } from "@/lib/providers/provider.types";

// Source: https://platform.claude.com/docs/en/about-claude/models/overview
// Latest models comparison (as of 2026-03-06)
export const CLAUDE_SDK_MODEL_OPTIONS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
] as const;

// Source:
// - @openai/codex-sdk/dist/index.d.ts (ThreadOptions.model?: string)
// - https://developers.openai.com/api/docs/models/gpt-5.4
// - https://developers.openai.com/api/docs/models/gpt-5.3-codex
export const CODEX_SDK_MODEL_OPTIONS = [
  "gpt-5.4",
  "gpt-5.3-codex",
] as const;

export function getSdkModelOptions(args: { providerId: ProviderId }) {
  if (args.providerId === "claude-code") {
    return CLAUDE_SDK_MODEL_OPTIONS;
  }
  return CODEX_SDK_MODEL_OPTIONS;
}

export function normalizeModelSelection(args: { value: string; fallback: string }) {
  const trimmed = args.value.trim();
  if (trimmed.length === 0) {
    return args.fallback;
  }
  return trimmed;
}

export function toHumanModelName(args: { model: string }) {
  const known: Record<string, string> = {
    "claude-opus-4-6": "Claude Opus 4.6",
    "claude-sonnet-4-6": "Claude Sonnet 4.6",
    "claude-haiku-4-5": "Claude Haiku 4.5",
    "gpt-5.4": "GPT-5.4",
    "gpt-5.3-codex": "GPT-5.3-Codex",
  };
  const exact = known[args.model];
  if (exact) {
    return exact;
  }

  return args.model
    .split("-")
    .map((chunk) => {
      if (/^\d+(\.\d+)?$/.test(chunk)) {
        return chunk;
      }
      if (chunk.length <= 3) {
        return chunk.toUpperCase();
      }
      return `${chunk.slice(0, 1).toUpperCase()}${chunk.slice(1)}`;
    })
    .join(" ");
}
