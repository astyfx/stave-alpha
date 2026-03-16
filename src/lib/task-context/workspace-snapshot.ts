const CURRENT_WORKSPACE_SNAPSHOT_VERSION = 4;

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

  const migrated: Record<string, unknown> = {
    ...args.payload,
    version: CURRENT_WORKSPACE_SNAPSHOT_VERSION,
    providerConversationByTask: migrateProviderConversationByTask(args.payload.providerConversationByTask),
  };

  // v3 → v4: populate attachments from attachedFilePaths
  if (version < 4 && isRecord(migrated.promptDraftByTask)) {
    const nextDrafts: Record<string, unknown> = {};
    for (const [taskId, rawDraft] of Object.entries(migrated.promptDraftByTask as Record<string, unknown>)) {
      if (!isRecord(rawDraft)) {
        nextDrafts[taskId] = rawDraft;
        continue;
      }
      const filePaths = Array.isArray(rawDraft.attachedFilePaths) ? rawDraft.attachedFilePaths : [];
      nextDrafts[taskId] = {
        ...rawDraft,
        attachments: (rawDraft.attachments as unknown[]) ?? filePaths.map((fp: unknown) => ({
          kind: "file",
          filePath: String(fp),
        })),
      };
    }
    migrated.promptDraftByTask = nextDrafts;
  }

  return migrated;
}
