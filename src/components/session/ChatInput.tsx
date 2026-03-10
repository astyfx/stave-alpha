import { PromptInput, PromptSuggestion, PromptSuggestions } from "@/components/ai-elements";
import { useEffect, useMemo, useState } from "react";
import type { ModelSelectorOption } from "@/components/ai-elements/model-selector";
import type { PermissionModeValue } from "@/components/ai-elements/permission-mode-selector";
import { buildCommandPaletteItems } from "@/lib/commands";
import {
  getCachedProviderCommandCatalog,
  getInitialProviderCommandCatalog,
  setCachedProviderCommandCatalog,
  toProviderCommandCatalogState,
  type ProviderCommandCatalogState,
} from "@/lib/providers/provider-command-catalog";
import { CLAUDE_SDK_MODEL_OPTIONS, CODEX_SDK_MODEL_OPTIONS, normalizeModelSelection, toHumanModelName } from "@/lib/providers/model-catalog";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import { getLatestPromptSuggestions, mergePromptSuggestionWithDraft } from "./chat-input.utils";

interface ChatInputProps {
  compact?: boolean;
}

export function ChatInput(args: ChatInputProps = {}) {
  const [focusNonce, setFocusNonce] = useState(0);
  const [providerCommandCatalog, setProviderCommandCatalog] = useState(() => getCachedProviderCommandCatalog({
    providerId: "claude-code",
  }));
  const activeTaskId = useAppStore((state) => state.activeTaskId);
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const tasks = useAppStore((state) => state.tasks);
  const messagesByTask = useAppStore((state) => state.messagesByTask);
  const promptDraftByTask = useAppStore((state) => state.promptDraftByTask);
  const setTaskProvider = useAppStore((state) => state.setTaskProvider);
  const updatePromptDraft = useAppStore((state) => state.updatePromptDraft);
  const clearPromptDraft = useAppStore((state) => state.clearPromptDraft);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const sendUserMessage = useAppStore((state) => state.sendUserMessage);
  const openFileFromTree = useAppStore((state) => state.openFileFromTree);
  const settings = useAppStore((state) => state.settings);
  const projectFiles = useAppStore((state) => state.projectFiles);
  const workspacePathById = useAppStore((state) => state.workspacePathById);
  const projectPath = useAppStore((state) => state.projectPath);
  const activeTurnIdsByTask = useAppStore((state) => state.activeTurnIdsByTask);
  const providerAvailability = useAppStore((state) => state.providerAvailability);
  const draftProvider = useAppStore((state) => state.draftProvider);
  const abortTaskTurn = useAppStore((state) => state.abortTaskTurn);
  const activeTask = tasks.find((task) => task.id === activeTaskId);
  const activeProvider = activeTask?.provider ?? draftProvider;
  const workspaceCwd = workspacePathById[activeWorkspaceId] ?? projectPath ?? undefined;
  const permissionMode: PermissionModeValue =
    activeProvider === "claude-code" ? settings.claudePermissionMode : settings.codexApprovalPolicy;
  const providerSelectionTarget = activeTaskId || "draft:session";
  const promptDraft = promptDraftByTask[providerSelectionTarget] ?? { text: "", attachedFilePath: "" };
  const activeMessages = messagesByTask[activeTaskId] ?? [];
  const lastMessage = activeMessages.at(-1);
  const isEmpty = activeMessages.length === 0;
  const isTurnActive = Boolean(activeTurnIdsByTask[activeTaskId]);
  const activeModel = activeProvider === "claude-code" ? settings.modelClaude : settings.modelCodex;
  const promptSuggestions = getLatestPromptSuggestions(activeMessages);
  const selectedModelOption: ModelSelectorOption = {
    key: `${activeProvider}:${activeModel}`,
    providerId: activeProvider,
    model: activeModel,
    label: toHumanModelName({ model: activeModel }),
    available: providerAvailability[activeProvider],
  };
  const modelOptions: ModelSelectorOption[] = [
    ...CLAUDE_SDK_MODEL_OPTIONS.map((model) => ({
      key: `claude-code:${model}`,
      providerId: "claude-code" as const,
      model,
      label: toHumanModelName({ model }),
      available: providerAvailability["claude-code"],
    })),
    ...CODEX_SDK_MODEL_OPTIONS.map((model) => ({
      key: `codex:${model}`,
      providerId: "codex" as const,
      model,
      label: toHumanModelName({ model }),
      available: providerAvailability.codex,
    })),
  ];

  useEffect(() => {
    let cancelled = false;

    if (activeProvider !== "claude-code") {
      const nextCatalog = getInitialProviderCommandCatalog({ providerId: activeProvider });
      setProviderCommandCatalog(nextCatalog);
      setCachedProviderCommandCatalog({
        providerId: activeProvider,
        cwd: workspaceCwd,
        catalog: nextCatalog,
      });
      return () => {
        cancelled = true;
      };
    }

    const getCommandCatalog = window.api?.provider?.getCommandCatalog;
    if (!getCommandCatalog) {
      const nextCatalog: ProviderCommandCatalogState = {
        providerId: activeProvider,
        status: "error",
        commands: [],
        detail: "Provider command catalog API is unavailable in this build.",
      };
      setProviderCommandCatalog(nextCatalog);
      setCachedProviderCommandCatalog({
        providerId: activeProvider,
        cwd: workspaceCwd,
        catalog: nextCatalog,
      });
      return () => {
        cancelled = true;
      };
    }

    const loadingCatalog: ProviderCommandCatalogState = {
      providerId: activeProvider,
      status: "loading",
      commands: [],
      detail: "Loading Claude native slash commands...",
    };
    setProviderCommandCatalog(loadingCatalog);
    setCachedProviderCommandCatalog({
      providerId: activeProvider,
      cwd: workspaceCwd,
      catalog: loadingCatalog,
    });

    void getCommandCatalog({
      providerId: activeProvider,
      cwd: workspaceCwd,
      runtimeOptions: {
        model: settings.modelClaude,
        claudePermissionMode: settings.claudePermissionMode,
        claudeAllowDangerouslySkipPermissions: settings.claudeAllowDangerouslySkipPermissions,
        claudeSandboxEnabled: settings.claudeSandboxEnabled,
        claudeAllowUnsandboxedCommands: settings.claudeAllowUnsandboxedCommands,
        claudeEffort: settings.claudeEffort,
        claudeThinkingMode: settings.claudeThinkingMode,
      },
    }).then((response) => {
      if (cancelled) {
        return;
      }
      const nextCatalog = toProviderCommandCatalogState({
        providerId: activeProvider,
        response,
      });
      setProviderCommandCatalog(nextCatalog);
      setCachedProviderCommandCatalog({
        providerId: activeProvider,
        cwd: workspaceCwd,
        catalog: nextCatalog,
      });
    }).catch((error) => {
      if (cancelled) {
        return;
      }
      const nextCatalog = toProviderCommandCatalogState({
        providerId: activeProvider,
        error,
      });
      setProviderCommandCatalog(nextCatalog);
      setCachedProviderCommandCatalog({
        providerId: activeProvider,
        cwd: workspaceCwd,
        catalog: nextCatalog,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeProvider,
    settings.claudeAllowDangerouslySkipPermissions,
    settings.claudeAllowUnsandboxedCommands,
    settings.claudeEffort,
    settings.claudePermissionMode,
    settings.claudeSandboxEnabled,
    settings.claudeThinkingMode,
    settings.modelClaude,
    workspaceCwd,
  ]);

  const commandPalette = useMemo(() => buildCommandPaletteItems({
    provider: activeProvider,
    settings: {
      customCommands: settings.customCommands,
    },
    providerCommandCatalog,
  }), [activeProvider, providerCommandCatalog, settings.customCommands]);

  return (
    <div
      className={cn(
        args.compact ? "bg-transparent px-0 py-0" : "border-t border-border/80 bg-card px-3 py-2.5 sm:px-4",
        isEmpty && !args.compact && "pb-6",
      )}
    >
      <div className={cn("mx-auto", args.compact || isEmpty ? "max-w-xl" : "max-w-4xl")}>
        {!isTurnActive && promptSuggestions.length > 0 ? (
          <PromptSuggestions>
            {promptSuggestions.map((suggestion) => (
              <PromptSuggestion
                key={suggestion}
                disabled={isTurnActive}
                onClick={() => {
                  updatePromptDraft({
                    taskId: providerSelectionTarget,
                    patch: {
                      text: mergePromptSuggestionWithDraft({
                        currentDraft: promptDraft.text,
                        suggestion,
                      }),
                    },
                  });
                  setFocusNonce((current) => current + 1);
                }}
                title={suggestion}
              >
                {suggestion}
              </PromptSuggestion>
            ))}
          </PromptSuggestions>
        ) : null}
        <PromptInput
          focusToken={`${providerSelectionTarget}:${focusNonce}`}
          value={promptDraft.text}
          disabled={isTurnActive}
          isTurnActive={isTurnActive}
          selectedModel={selectedModelOption}
          modelOptions={modelOptions}
          projectFiles={projectFiles}
          attachedFilePath={promptDraft.attachedFilePath}
          commandPaletteItems={commandPalette.items}
          commandPaletteProviderNote={commandPalette.providerNote}
          onValueChange={(value) => updatePromptDraft({ taskId: providerSelectionTarget, patch: { text: value } })}
          onModelSelect={({ selection }) => {
            setTaskProvider({ taskId: providerSelectionTarget, provider: selection.providerId });
            if (selection.providerId === "claude-code") {
              updateSettings({
                patch: {
                  modelClaude: normalizeModelSelection({ value: selection.model, fallback: CLAUDE_SDK_MODEL_OPTIONS[0] }),
                },
              });
              return;
            }
            updateSettings({
              patch: {
                modelCodex: normalizeModelSelection({ value: selection.model, fallback: CODEX_SDK_MODEL_OPTIONS[0] }),
              },
            });
          }}
          permissionMode={permissionMode}
          onPermissionModeChange={(value) => {
            if (activeProvider === "claude-code") {
              updateSettings({ patch: { claudePermissionMode: value as typeof settings.claudePermissionMode } });
            } else {
              updateSettings({ patch: { codexApprovalPolicy: value as typeof settings.codexApprovalPolicy } });
            }
          }}
          onAttachFileChange={({ filePath }) =>
            updatePromptDraft({ taskId: providerSelectionTarget, patch: { attachedFilePath: filePath } })}
          onSubmit={async ({ text, filePath }) => {
            if (filePath) {
              await openFileFromTree({ filePath });
            }

            const latestTabs = useAppStore.getState().editorTabs;
            const tab = filePath ? latestTabs.find((item) => item.filePath === filePath) : null;
            sendUserMessage({
              taskId: activeTaskId,
              content: text,
              fileContext: tab
                ? {
                    filePath: tab.filePath,
                    content: tab.content,
                    language: tab.language,
                  }
                : undefined,
            });
            clearPromptDraft({ taskId: providerSelectionTarget });
          }}
          onAbort={() => abortTaskTurn({ taskId: activeTaskId })}
        />
      </div>
    </div>
  );
}
