import { buildLegacyPromptFromCanonicalRequest } from "./canonical-request";
import type { CanonicalConversationRequest, ProviderId } from "./provider.types";

function getSelectedSkillCommands(conversation: CanonicalConversationRequest) {
  return conversation.contextParts
    .filter((part): part is Extract<typeof part, { type: "skill_context" }> => part.type === "skill_context")
    .flatMap((part) => part.skills.map((skill) => `/${skill.slug}`));
}

function getResumeConversationId(conversation?: CanonicalConversationRequest) {
  const value = conversation?.resume?.nativeConversationId?.trim();
  return value ? value : undefined;
}

function shouldIncludeHistory(conversation: CanonicalConversationRequest) {
  return !getResumeConversationId(conversation);
}

export function buildClaudePromptFromConversation(args: {
  conversation: CanonicalConversationRequest;
  fallbackPrompt: string;
}) {
  const basePrompt = buildLegacyPromptFromCanonicalRequest({
    request: args.conversation,
    includeHistory: shouldIncludeHistory(args.conversation),
    includeSkillContext: false,
  }) || args.fallbackPrompt;
  const skillCommands = getSelectedSkillCommands(args.conversation);

  if (skillCommands.length === 0) {
    return basePrompt;
  }

  return `${skillCommands.join("\n")}\n\n${basePrompt}`.trim();
}

export function buildCodexPromptFromConversation(args: {
  conversation: CanonicalConversationRequest;
  fallbackPrompt: string;
}) {
  return buildLegacyPromptFromCanonicalRequest({
    request: args.conversation,
    includeHistory: shouldIncludeHistory(args.conversation),
  }) || args.fallbackPrompt;
}

export function buildProviderTurnPrompt(args: {
  providerId: ProviderId;
  prompt: string;
  conversation?: CanonicalConversationRequest;
}) {
  if (!args.conversation) {
    return args.prompt;
  }

  if (args.providerId === "claude-code") {
    return buildClaudePromptFromConversation({
      conversation: args.conversation,
      fallbackPrompt: args.prompt,
    });
  }

  return buildCodexPromptFromConversation({
    conversation: args.conversation,
    fallbackPrompt: args.prompt,
  });
}

export function resolveProviderResumeConversationId(args: {
  conversation?: CanonicalConversationRequest;
  fallbackResumeId?: string;
}) {
  const fallback = args.fallbackResumeId?.trim();
  if (fallback) {
    return fallback;
  }
  return getResumeConversationId(args.conversation);
}
