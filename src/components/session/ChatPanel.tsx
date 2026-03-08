import { memo, Suspense, lazy, useMemo, useRef, useState } from "react";
import type { VirtuosoHandle } from "react-virtuoso";
import { Check, ChevronDown, ChevronRight, Copy, MessageSquareIcon } from "lucide-react";
import { Badge, Button, Card, Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, WaveIndicator } from "@/components/ui";
import {
  ChainOfThought,
  type ChainOfThoughtStep,
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationScrollButton,
  ConversationVirtualList,
  ConfirmationCompact,
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
  ModelIcon,
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  SubagentCard,
  TodoCard,
  Tool,
  ToolContent,
  ToolGroup,
  ToolHeader,
  ToolInput,
  ToolOutput,
  UserInputCard,
  parseSubagentToolInput,
} from "@/components/ai-elements";
import { getRenderableMessageParts, isPendingDiffStatus } from "@/components/session/chat-panel.utils";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import type { MessagePart } from "@/types/chat";

const ReactDiffViewer = lazy(() => import("react-diff-viewer-continued"));

const CHAT_DIFF_VIEWER_STYLES = {
  variables: {
    light: {
      diffViewerBackground: "var(--editor)",
      diffViewerTitleBackground: "var(--editor-tab)",
      diffViewerColor: "var(--editor-foreground)",
      diffViewerTitleColor: "var(--editor-foreground)",
      diffViewerTitleBorderColor: "var(--border)",
      addedBackground: "var(--diff-added)",
      addedColor: "var(--diff-added-foreground)",
      removedBackground: "var(--diff-removed)",
      removedColor: "var(--diff-removed-foreground)",
      addedGutterBackground: "var(--diff-added)",
      removedGutterBackground: "var(--diff-removed)",
      gutterBackground: "var(--editor-muted)",
      gutterColor: "var(--muted-foreground)",
      addedGutterColor: "var(--diff-added-foreground)",
      removedGutterColor: "var(--diff-removed-foreground)",
      highlightBackground: "color-mix(in oklch, var(--accent) 14%, transparent)",
      highlightGutterBackground: "color-mix(in oklch, var(--accent) 18%, transparent)",
      codeFoldBackground: "var(--editor-muted)",
      codeFoldGutterBackground: "var(--editor-muted)",
      codeFoldContentColor: "var(--muted-foreground)",
      emptyLineBackground: "var(--editor)",
    },
    dark: {
      diffViewerBackground: "var(--editor)",
      diffViewerTitleBackground: "var(--editor-tab)",
      diffViewerColor: "var(--editor-foreground)",
      diffViewerTitleColor: "var(--editor-foreground)",
      diffViewerTitleBorderColor: "var(--border)",
      addedBackground: "var(--diff-added)",
      addedColor: "var(--diff-added-foreground)",
      removedBackground: "var(--diff-removed)",
      removedColor: "var(--diff-removed-foreground)",
      addedGutterBackground: "var(--diff-added)",
      removedGutterBackground: "var(--diff-removed)",
      gutterBackground: "var(--editor-muted)",
      gutterBackgroundDark: "var(--editor-muted)",
      gutterColor: "var(--muted-foreground)",
      addedGutterColor: "var(--diff-added-foreground)",
      removedGutterColor: "var(--diff-removed-foreground)",
      highlightBackground: "color-mix(in oklch, var(--accent) 14%, transparent)",
      highlightGutterBackground: "color-mix(in oklch, var(--accent) 18%, transparent)",
      codeFoldBackground: "var(--editor-muted)",
      codeFoldGutterBackground: "var(--editor-muted)",
      codeFoldContentColor: "var(--muted-foreground)",
      emptyLineBackground: "var(--editor)",
    },
  },
} as const;

function toProviderStartCase(args: { providerId: "claude-code" | "codex" }) {
  return args.providerId
    .split("-")
    .map((chunk) => `${chunk.slice(0, 1).toUpperCase()}${chunk.slice(1)}`)
    .join(" ");
}

function toProviderWaveToneClass(args: { providerId: "claude-code" | "codex" | "user" }) {
  return args.providerId === "claude-code" ? "text-provider-claude" : "text-provider-codex";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <MessageAction
      label="Copy"
      tooltip="Copy message"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
    </MessageAction>
  );
}

function MessagePartRenderer(args: { part: MessagePart; taskId: string; messageId: string; isStreaming?: boolean; isLastTextPart?: boolean }) {
  const { part, taskId, messageId, isStreaming, isLastTextPart } = args;
  const resolveApproval = useAppStore((state) => state.resolveApproval);
  const resolveUserInput = useAppStore((state) => state.resolveUserInput);
  const resolveDiff = useAppStore((state) => state.resolveDiff);
  const openDiffInEditor = useAppStore((state) => state.openDiffInEditor);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const [diffOpen, setDiffOpen] = useState(false);

  switch (part.type) {
    case "tool_use":
      if (isSubagentToolPart({ toolName: part.toolName })) {
        return (
          <SubagentCard
            defaultOpen={false}
            input={part.input}
            output={part.output}
            state={part.state}
          />
        );
      }
      if (isTodoToolPart({ toolName: part.toolName })) {
        return (
          <TodoCard
            defaultOpen={true}
            input={part.input}
            output={part.output}
            state={part.state}
          />
        );
      }
      return (
        <Tool defaultOpen={false}>
          <ToolHeader type={part.toolName} state={part.state} />
          <ToolContent>
            <ToolInput input={part.input} />
            {part.state !== "input-streaming" && (
              <ToolOutput
                output={part.output ? <pre className="whitespace-pre-wrap text-sm">{part.output}</pre> : null}
                errorText={part.state === "output-error" ? (part.output ?? "Tool failed.") : undefined}
              />
            )}
          </ToolContent>
        </Tool>
      );
    case "code_diff":
      const isPendingDiff = isPendingDiffStatus(part.status);
      return (
        <Card className="overflow-hidden p-0">
          <button
            type="button"
            className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm"
            onClick={() => setDiffOpen((current) => !current)}
          >
            <span className="min-w-0 truncate font-medium">{part.filePath}</span>
            {diffOpen ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
          </button>
          {diffOpen ? (
            <Suspense fallback={<div className="px-3 py-2 text-sm text-muted-foreground">Loading diff...</div>}>
              <ReactDiffViewer
                oldValue={part.oldContent}
                newValue={part.newContent}
                splitView={false}
                hideLineNumbers={false}
                useDarkTheme={isDarkMode}
                styles={CHAT_DIFF_VIEWER_STYLES}
              />
            </Suspense>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">Diff hidden until expanded.</div>
          )}
          <div className="flex items-center gap-2 border-t px-3 py-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                openDiffInEditor({
                  messageId,
                  filePath: part.filePath,
                  oldContent: part.oldContent,
                  newContent: part.newContent,
                })
              }
            >
              Open in Editor
            </Button>
            {isPendingDiff && (
              <>
                <Button size="sm" onClick={() => resolveDiff({ taskId, messageId, accepted: true })}>Accept</Button>
                <Button size="sm" variant="outline" onClick={() => resolveDiff({ taskId, messageId, accepted: false })}>
                  Reject
                </Button>
              </>
            )}
          </div>
        </Card>
      );
    case "file_context":
      return (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
            <span className="font-medium">{part.filePath}</span>
            <Badge variant="secondary">{part.language}</Badge>
          </div>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap bg-card/50 px-3 py-2 text-xs">{part.content}</pre>
          {part.instruction ? (
            <div className="border-t px-3 py-2 text-sm text-muted-foreground">{part.instruction}</div>
          ) : null}
        </Card>
      );
    case "approval":
      return (
        <ConfirmationCompact
          toolName={part.toolName}
          description={part.description}
          state={part.state}
          onApprove={() => resolveApproval({ taskId, messageId, approved: true })}
          onReject={() => resolveApproval({ taskId, messageId, approved: false })}
        />
      );
    case "user_input":
      return (
        <UserInputCard
          toolName={part.toolName}
          questions={part.questions}
          answers={part.answers}
          state={part.state}
          onSubmit={(answers) => resolveUserInput({ taskId, messageId, answers })}
          onDeny={() => resolveUserInput({ taskId, messageId, denied: true })}
        />
      );
    case "system_event":
      if (!part.content?.trim()) return null;
      return <p className="text-sm italic text-muted-foreground">{part.content}</p>;
    case "text":
      if (!part.text?.trim()) return null;
      return <MessageResponse isStreaming={isStreaming && isLastTextPart}>{part.text}</MessageResponse>;
    case "thinking":
      return null;
  }
}

type Segment =
  | { kind: "tools"; parts: MessagePart[]; startIndex: number }
  | { kind: "other"; part: MessagePart; index: number };

function isSubagentToolPart(args: { toolName: string }) {
  return args.toolName.trim().toLowerCase() === "agent";
}

function isTodoToolPart(args: { toolName: string }) {
  return args.toolName.trim().toLowerCase() === "todowrite";
}

function groupSegments(parts: MessagePart[]): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  while (i < parts.length) {
    const currentPart = parts[i];
    if (
      currentPart?.type === "tool_use"
      && !isSubagentToolPart({ toolName: currentPart.toolName })
      && !isTodoToolPart({ toolName: currentPart.toolName })
    ) {
      const group: MessagePart[] = [];
      const startIndex = i;
      while (i < parts.length) {
        const candidate = parts[i];
        if (
          candidate?.type !== "tool_use"
          || isSubagentToolPart({ toolName: candidate.toolName })
          || isTodoToolPart({ toolName: candidate.toolName })
        ) {
          break;
        }
        group.push(candidate);
        i++;
      }
      segments.push({ kind: "tools", parts: group, startIndex });
    } else {
      segments.push({ kind: "other", part: currentPart!, index: i });
      i++;
    }
  }
  return segments;
}

function buildChainOfThoughtSteps(parts: MessagePart[]): ChainOfThoughtStep[] {
  const steps: ChainOfThoughtStep[] = [];
  parts.forEach((part, index) => {
    if (part.type === "tool_use") {
      const isSubagent = isSubagentToolPart({ toolName: part.toolName });
      const subagentInput = isSubagent ? parseSubagentToolInput({ input: part.input }) : null;
      steps.push({
        id: `tool-${index}`,
        label: isSubagent
          ? subagentInput?.description ?? subagentInput?.subagentType ?? "Subagent"
          : part.toolName,
        detail: isSubagent
          ? (subagentInput?.prompt ?? part.input ?? part.output)
          : part.input || part.output,
        status: part.state === "input-streaming"
          ? "active"
          : part.state === "output-available"
          ? "done"
          : "pending",
        kind: isSubagent ? "agent" : "tool",
      });
      return;
    }
    if (part.type === "system_event") {
      steps.push({
        id: `system-${index}`,
        label: part.content,
        status: "done",
        kind: "system",
      });
    }
  });
  return steps;
}

function hasVisibleContent(part: MessagePart): boolean {
  if (part.type === "thinking") {
    return false;
  }
  if (part.type === "text") {
    return part.text.trim().length > 0;
  }
  return true;
}

function MessageBody(args: {
  message: { content?: string; parts: MessagePart[]; isStreaming?: boolean };
  taskId: string;
  messageId: string;
  streamingEnabled: boolean;
}) {
  const { message, taskId, messageId, streamingEnabled } = args;
  const isActivelyStreaming = Boolean(message.isStreaming);
  const isStreaming = streamingEnabled && isActivelyStreaming;
  const renderableParts = useMemo(() => getRenderableMessageParts({
    content: message.content ?? "",
    parts: message.parts,
  }), [message.content, message.parts]);
  const reasoningParts = useMemo(() => renderableParts.filter((part) => part.type === "thinking"), [renderableParts]);
  const hasReasoning = reasoningParts.length > 0;
  const reasoningText = useMemo(() => reasoningParts.map((part) => part.text).join(""), [reasoningParts]);
  const visibleParts = useMemo(() => renderableParts.filter(hasVisibleContent), [renderableParts]);
  const chainOfThoughtSteps = useMemo(() => buildChainOfThoughtSteps(renderableParts), [renderableParts]);
  const hasChainOfThought = chainOfThoughtSteps.length > 0;
  const showChainOfThought = hasChainOfThought && !hasReasoning;

  if (isActivelyStreaming && visibleParts.length === 0 && !hasReasoning) {
    return (
      <Reasoning isStreaming>
        <ReasoningTrigger />
        <ReasoningContent>Thinking...</ReasoningContent>
      </Reasoning>
    );
  }

  if (!isActivelyStreaming && visibleParts.length === 0 && !hasReasoning) {
    return <p className="text-sm italic text-muted-foreground">No response.</p>;
  }

  const segments = useMemo(() => groupSegments(visibleParts), [visibleParts]);
  const lastTextPartIndex = useMemo(
    () => visibleParts.map((p, i) => (p.type === "text" ? i : -1)).filter((i) => i !== -1).at(-1),
    [visibleParts]
  );

  return (
    <>
      {hasReasoning ? (
        <Reasoning isStreaming={isStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText || "Thinking..."}</ReasoningContent>
        </Reasoning>
      ) : null}
      {showChainOfThought ? <ChainOfThought isStreaming={isStreaming} steps={chainOfThoughtSteps} className={hasReasoning ? "mt-2" : undefined} /> : null}
      {segments.map((segment) => {
        if (segment.kind === "tools") {
          return (
            <div key={`${messageId}-tools-${segment.startIndex}`} className="mt-2 first:mt-0">
              <ToolGroup states={segment.parts.map((p) => (p.type === "tool_use" ? p.state : undefined))}>
                {segment.parts.map((part, idx) => (
                  <MessagePartRenderer
                    key={`${messageId}-part-${segment.startIndex + idx}`}
                    part={part}
                    taskId={taskId}
                    messageId={messageId}
                    isStreaming={isStreaming}
                    isLastTextPart={false}
                  />
                ))}
              </ToolGroup>
            </div>
          );
        }
        return (
          <div key={`${messageId}-part-${segment.index}`} className="mt-2 first:mt-0">
            <MessagePartRenderer
              part={segment.part}
              taskId={taskId}
              messageId={messageId}
              isStreaming={isStreaming}
              isLastTextPart={segment.index === lastTextPartIndex}
            />
          </div>
        );
      })}
    </>
  );
}

const MemoizedMessageBody = memo(MessageBody);

interface MessageRowProps {
  activeTaskId: string;
  activeTurnId?: string;
  chatStreamingEnabled: boolean;
  liveStreamingMessageId?: string;
  message: {
    id: string;
    role: "user" | "assistant";
    providerId: "claude-code" | "codex" | "user";
    model: string;
    content: string;
    parts: MessagePart[];
    isStreaming?: boolean;
  };
}

interface TaskScrollAnchor {
  anchorMessageId: string;
  offset: number;
}

const MessageRow = memo(function MessageRow(args: MessageRowProps) {
  const { activeTaskId, activeTurnId, chatStreamingEnabled, liveStreamingMessageId, message } = args;
  const showRespondingWave =
    Boolean(activeTurnId)
    && message.id === liveStreamingMessageId
    && message.role === "assistant"
    && message.isStreaming;

  return (
    <div data-message-id={message.id}>
      <Message from={message.role}>
        <div
          className={cn(
            "group/message-shell flex w-fit max-w-[88%] flex-col items-stretch",
            message.role === "assistant" && "gap-1",
          )}
        >
          <MessageContent>
            <MemoizedMessageBody
              message={message}
              taskId={activeTaskId}
              messageId={message.id}
              streamingEnabled={chatStreamingEnabled}
            />
          </MessageContent>
          <MessageActions
            className={cn(
              message.role === "user" && "pointer-events-none self-end !ml-0 !mt-1 opacity-0 transition-opacity group-hover/message-shell:pointer-events-auto group-hover/message-shell:opacity-100",
              message.role === "assistant" && "self-stretch !ml-0 !mt-0",
              showRespondingWave && "relative w-full items-center pr-10",
            )}
          >
            <div className="flex min-w-0 items-center gap-1">
              {message.providerId !== "user" && message.model ? (
                <MessageAction
                  key="provider-action"
                  label={toProviderStartCase({ providerId: message.providerId })}
                  className="pointer-events-none h-7 cursor-default rounded-sm border border-border/70 bg-muted/60 px-2 text-sm font-normal text-foreground opacity-100"
                >
                  <ModelIcon providerId={message.providerId} className="size-3.5" />
                  {toProviderStartCase({ providerId: message.providerId })}
                </MessageAction>
              ) : null}
              <CopyButton key="copy-action" text={message.content} />
            </div>
            {showRespondingWave ? (
              <MessageAction
                key="responding-action"
                label="Responding"
                className={cn(
                  "pointer-events-none absolute right-0 top-1/2 h-8 w-8 shrink-0 -translate-y-1/2 cursor-default p-0 opacity-100",
                  toProviderWaveToneClass({ providerId: message.providerId }),
                )}
              >
                <WaveIndicator />
              </MessageAction>
            ) : null}
          </MessageActions>
        </div>
      </Message>
    </div>
  );
});

export function ChatPanel() {
  const activeTaskId = useAppStore((state) => state.activeTaskId);
  const tasks = useAppStore((state) => state.tasks);
  const messagesByTask = useAppStore((state) => state.messagesByTask);
  const activeTurnIdsByTask = useAppStore((state) => state.activeTurnIdsByTask);
  const chatStreamingEnabled = useAppStore((state) => state.settings.chatStreamingEnabled);
  const scrollAnchorByTaskRef = useRef(new Map<string, TaskScrollAnchor>());
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  const messages = useMemo(() => messagesByTask[activeTaskId] ?? [], [activeTaskId, messagesByTask]);
  const visibleMessages = useMemo(() => messages.filter((message) => !message.isPlanResponse), [messages]);
  const activeTaskTitle = tasks.find((task) => task.id === activeTaskId)?.title ?? "Untitled Task";
  const activeTurnId = activeTurnIdsByTask[activeTaskId];
  const liveStreamingMessageId = activeTurnId ? visibleMessages.at(-1)?.id : undefined;
  const conversationDownloadRows = useMemo(() => messages.map((message) => ({
    role: message.role,
    content: message.isPlanResponse
      ? `[Plan]\n${message.planText?.trim() || message.content}`
      : message.content,
  })), [messages]);
  const autoScrollKey = `${visibleMessages.length}:${liveStreamingMessageId ?? "idle"}:${activeTurnId ?? "none"}`;
  const messageIndexById = useMemo(
    () => new Map(visibleMessages.map((message, index) => [message.id, index])),
    [visibleMessages]
  );
  const restoreAnchor = activeTaskId ? scrollAnchorByTaskRef.current.get(activeTaskId) : undefined;
  const restoreItemIndex = restoreAnchor ? messageIndexById.get(restoreAnchor.anchorMessageId) : undefined;

  return (
    <Conversation>
      <div className="flex h-full w-full flex-col">
        <header className="flex h-10 items-center justify-between border-b border-border/80 px-3 text-sm">
          <p className="inline-flex min-w-0 items-center gap-2 font-medium text-foreground">
            <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{activeTaskTitle}</span>
          </p>
          <Badge variant="secondary">{visibleMessages.length} messages</Badge>
        </header>
        <ConversationContent
          autoScrollKey={autoScrollKey}
          autoScrollBehavior="auto"
          withInnerLayout={visibleMessages.length === 0}
          onScrollPositionChange={({ container }) => {
            if (!activeTaskId) {
              return;
            }
            const containerTop = container.getBoundingClientRect().top;
            const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-message-id]"));
            const anchorNode = nodes.find((node) => node.getBoundingClientRect().bottom > containerTop);
            if (!anchorNode) {
              return;
            }
            const anchorMessageId = anchorNode.dataset.messageId;
            if (!anchorMessageId) {
              return;
            }
            const offset = Math.max(0, Math.round(containerTop - anchorNode.getBoundingClientRect().top));
            scrollAnchorByTaskRef.current.set(activeTaskId, {
              anchorMessageId,
              offset,
            });
          }}
        >
          {visibleMessages.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquareIcon />
                </EmptyMedia>
                <EmptyTitle>Start a conversation</EmptyTitle>
                <EmptyDescription>Send a prompt to begin this task.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ConversationVirtualList
              listKey={activeTaskId}
              listRef={virtuosoRef}
              data={visibleMessages}
              restoreItemIndex={restoreItemIndex}
              restoreItemOffset={restoreAnchor?.offset}
              itemKey={(_, message) => message.id}
              itemContent={(_, message) => (
                <MessageRow
                  activeTaskId={activeTaskId}
                  activeTurnId={activeTurnId}
                  chatStreamingEnabled={chatStreamingEnabled}
                  liveStreamingMessageId={liveStreamingMessageId}
                  message={message}
                />
              )}
            />
          )}
        </ConversationContent>
      </div>
      <ConversationDownload messages={conversationDownloadRows} />
      <ConversationScrollButton />
    </Conversation>
  );
}
