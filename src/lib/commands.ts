import type { AppSettings } from "@/store/app.store";
import type { ChatMessage } from "@/types/chat";

export interface CommandContext {
  provider: string;
  model: string;
  messages: ChatMessage[];
  settings: AppSettings;
}

export interface CommandResult {
  handled: boolean;
  response?: string;
  action?: "clear";
}

interface ParsedCustomCommand {
  responseTemplate: string;
  action?: "clear";
}

function parseCustomCommandMap(args: { value: string }) {
  const map = new Map<string, ParsedCustomCommand>();
  const lines = args.value.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const arrowIndex = line.indexOf("=>");
    const equalIndex = line.indexOf("=");
    const separatorIndex = arrowIndex >= 0 ? arrowIndex : equalIndex;
    const separatorLength = arrowIndex >= 0 ? 2 : 1;
    if (separatorIndex <= 0) {
      continue;
    }

    const rawCommand = line.slice(0, separatorIndex).trim();
    const rawResponse = line.slice(separatorIndex + separatorLength).trim();
    if (!rawCommand || !rawResponse) {
      continue;
    }

    const normalizedCommand = rawCommand.startsWith("/")
      ? rawCommand.toLowerCase()
      : `/${rawCommand.toLowerCase()}`;

    map.set(normalizedCommand, {
      responseTemplate: rawResponse,
      action: rawResponse === "@clear" ? "clear" : undefined,
    });
  }
  return map;
}

function fillTemplate(args: {
  template: string;
  provider: string;
  model: string;
  messages: ChatMessage[];
  rawArgs: string;
}) {
  const userMessages = args.messages.filter((m) => m.role === "user").length;
  const assistantMessages = args.messages.filter((m) => m.role === "assistant").length;

  return args.template
    .replaceAll("{args}", args.rawArgs)
    .replaceAll("{provider}", args.provider)
    .replaceAll("{model}", args.model)
    .replaceAll("{user_count}", String(userMessages))
    .replaceAll("{assistant_count}", String(assistantMessages));
}

export function handleCommand(input: string, ctx: CommandContext): CommandResult {
  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return { handled: false };
  }

  const parts = trimmed.split(/\s+/);
  const cmd = (parts[0] ?? "").toLowerCase();
  const rawArgs = parts.slice(1).join(" ").trim();

  const customMap = parseCustomCommandMap({ value: ctx.settings.customCommands ?? "" });
  const custom = customMap.get(cmd);
  if (!custom) {
    // Unknown slash commands are passed through to provider SDK as native commands.
    return { handled: false };
  }

  if (custom.action === "clear") {
    return {
      handled: true,
      response: "Conversation cleared.",
      action: "clear",
    };
  }

  return {
    handled: true,
    response: fillTemplate({
      template: custom.responseTemplate,
      provider: ctx.provider,
      model: ctx.model,
      messages: ctx.messages,
      rawArgs,
    }),
  };
}
