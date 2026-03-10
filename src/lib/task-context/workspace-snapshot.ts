const CURRENT_WORKSPACE_SNAPSHOT_VERSION = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function migrateProviderConversationByTask(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  const next: Record<string, { "claude-code"?: string; codex?: string }> = {};

  for (const [taskId, rawEntry] of Object.entries(value)) {
    if (!isRecord(rawEntry)) {
      continue;
    }

    const legacyProviderId = rawEntry.providerId;
    const legacyNativeConversationId = rawEntry.nativeConversationId;
    if (
      (legacyProviderId === "claude-code" || legacyProviderId === "codex")
      && typeof legacyNativeConversationId === "string"
      && legacyNativeConversationId.trim().length > 0
    ) {
      next[taskId] = { [legacyProviderId]: legacyNativeConversationId };
      continue;
    }

    const modernEntry: { "claude-code"?: string; codex?: string } = {};
    if (typeof rawEntry["claude-code"] === "string" && rawEntry["claude-code"].trim().length > 0) {
      modernEntry["claude-code"] = rawEntry["claude-code"];
    }
    if (typeof rawEntry.codex === "string" && rawEntry.codex.trim().length > 0) {
      modernEntry.codex = rawEntry.codex;
    }
    next[taskId] = modernEntry;
  }

  return next;
}

export { CURRENT_WORKSPACE_SNAPSHOT_VERSION };

export function migrateWorkspaceSnapshotPayload(args: { payload: unknown }): unknown | null {
  if (!isRecord(args.payload)) {
    return null;
  }

  const rawVersion = args.payload.version;
  const version = rawVersion == null
    ? 0
    : typeof rawVersion === "number" && Number.isInteger(rawVersion)
    ? rawVersion
    : null;

  if (version == null) {
    return null;
  }

  if (version > CURRENT_WORKSPACE_SNAPSHOT_VERSION) {
    return null;
  }

  if (version === CURRENT_WORKSPACE_SNAPSHOT_VERSION) {
    return args.payload;
  }

  return {
    ...args.payload,
    version: CURRENT_WORKSPACE_SNAPSHOT_VERSION,
    providerConversationByTask: migrateProviderConversationByTask(args.payload.providerConversationByTask),
  };
}
