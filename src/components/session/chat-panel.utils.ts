import type { ChatMessage, CodeDiffPart, MessagePart } from "@/types/chat";

export function isPendingDiffStatus(status: CodeDiffPart["status"]) {
  return status === "pending";
}

export function getRenderableMessageParts(message: Pick<ChatMessage, "content" | "parts">): MessagePart[] {
  if (message.parts.length > 0) {
    return message.parts;
  }

  if (message.content.trim().length === 0) {
    return message.parts;
  }

  return [{ type: "text", text: message.content }];
}
