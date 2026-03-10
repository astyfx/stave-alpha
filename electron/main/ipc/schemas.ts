import { z } from "zod";

export const ProviderIdSchema = z.union([z.literal("claude-code"), z.literal("codex")]);

const RuntimeOptionsSchema = z.object({
  model: z.string().max(200).optional(),
  chatStreamingEnabled: z.boolean().optional(),
  debug: z.boolean().optional(),
  providerTimeoutMs: z.number().int().min(1).max(3_600_000).optional(),
  claudePermissionMode: z.union([
    z.literal("default"),
    z.literal("acceptEdits"),
    z.literal("bypassPermissions"),
    z.literal("plan"),
    z.literal("dontAsk"),
  ]).optional(),
  claudeAllowDangerouslySkipPermissions: z.boolean().optional(),
  claudeSandboxEnabled: z.boolean().optional(),
  claudeAllowUnsandboxedCommands: z.boolean().optional(),
  claudeSystemPrompt: z.string().max(20_000).optional(),
  claudeMaxTurns: z.number().int().min(1).max(200).optional(),
  claudeMaxBudgetUsd: z.number().min(0).max(10_000).optional(),
  claudeEffort: z.union([z.literal("low"), z.literal("medium"), z.literal("high"), z.literal("max")]).optional(),
  claudeThinkingMode: z.union([z.literal("adaptive"), z.literal("enabled"), z.literal("disabled")]).optional(),
  claudeAllowedTools: z.array(z.string().max(200)).max(200).optional(),
  claudeDisallowedTools: z.array(z.string().max(200)).max(200).optional(),
  claudeResumeSessionId: z.string().max(200).optional(),
  codexSandboxMode: z.union([z.literal("read-only"), z.literal("workspace-write"), z.literal("danger-full-access")]).optional(),
  codexNetworkAccessEnabled: z.boolean().optional(),
  codexApprovalPolicy: z.union([z.literal("never"), z.literal("on-request"), z.literal("on-failure"), z.literal("untrusted")]).optional(),
  codexPathOverride: z.string().max(4096).optional(),
  codexModelReasoningEffort: z.union([z.literal("minimal"), z.literal("low"), z.literal("medium"), z.literal("high"), z.literal("xhigh")]).optional(),
  codexWebSearchMode: z.union([z.literal("disabled"), z.literal("cached"), z.literal("live")]).optional(),
  codexPlanMode: z.boolean().optional(),
  codexResumeThreadId: z.string().max(200).optional(),
}).strict().optional();

export const StreamTurnArgsSchema = z.object({
  providerId: ProviderIdSchema,
  prompt: z.string().max(500_000),
  taskId: z.string().max(200).optional(),
  workspaceId: z.string().max(200).optional(),
  cwd: z.string().max(4096).optional(),
  runtimeOptions: RuntimeOptionsSchema,
}).strict();

export const ProviderCommandCatalogArgsSchema = z.object({
  providerId: ProviderIdSchema,
  cwd: z.string().max(4096).optional(),
  runtimeOptions: RuntimeOptionsSchema,
}).strict();

export const StreamReadArgsSchema = z.object({
  streamId: z.string().min(1).max(200),
  cursor: z.number().int().min(0),
}).strict();

export const CleanupTaskArgsSchema = z.object({
  taskId: z.string().min(1).max(200),
}).strict();

export const ApprovalResponseArgsSchema = z.object({
  providerId: ProviderIdSchema,
  requestId: z.string().min(1).max(200),
  approved: z.boolean(),
}).strict();

export const UserInputResponseArgsSchema = z.object({
  providerId: ProviderIdSchema,
  requestId: z.string().min(1).max(200),
  answers: z.record(z.string(), z.string()).optional(),
  denied: z.boolean().optional(),
}).strict();

export const WorkspaceIdArgsSchema = z.object({
  workspaceId: z.string().min(1).max(200),
}).strict();

export const PersistenceUpsertArgsSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  snapshot: z.record(z.string(), z.unknown()),
}).strict();

export const ListTurnEventsArgsSchema = z.object({
  turnId: z.string().min(1).max(200),
  afterSequence: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(5000).optional(),
}).strict();

export const ListTaskTurnsArgsSchema = z.object({
  workspaceId: z.string().min(1).max(200),
  taskId: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(20).optional(),
}).strict();

export const OpenExternalArgsSchema = z.object({
  url: z.string().min(1).max(2048),
}).strict();
