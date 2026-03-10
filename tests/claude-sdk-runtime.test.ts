import { describe, expect, test } from "bun:test";
import {
  buildClaudeApprovalPermissionResult,
  buildClaudeSystemPrompt,
  buildClaudeUserInputPermissionResult,
  mapClaudeMessageToEvents,
} from "../electron/providers/claude-sdk-runtime";

describe("mapClaudeMessageToEvents", () => {
  test("surfaces Claude init session ids as provider conversation metadata", () => {
    const events = mapClaudeMessageToEvents({
      message: {
        type: "system",
        subtype: "init",
        session_id: "session-1",
        uuid: "msg-init-1",
      } as never,
      claudeDebugStream: false,
    });

    expect(events).toEqual([
      {
        type: "provider_conversation",
        providerId: "claude-code",
        nativeConversationId: "session-1",
      },
    ]);
  });

  test("surfaces Claude local command output as assistant text", () => {
    const events = mapClaudeMessageToEvents({
      message: {
        type: "system",
        subtype: "local_command_output",
        content: "Current cost: $0.12",
        uuid: "msg-1",
        session_id: "session-1",
      } as never,
      claudeDebugStream: false,
    });

    expect(events).toEqual([
      { type: "text", text: "Current cost: $0.12" },
    ]);
  });
});

describe("buildClaudeApprovalPermissionResult", () => {
  test("returns an allow payload with updated input for approved tools", () => {
    expect(buildClaudeApprovalPermissionResult({
      approved: true,
      normalizedInput: { skill: "keybindings-help" },
      denialMessage: "denied",
    })).toEqual({
      behavior: "allow",
      updatedInput: { skill: "keybindings-help" },
    });
  });

  test("returns a deny payload with a message for rejected tools", () => {
    expect(buildClaudeApprovalPermissionResult({
      approved: false,
      normalizedInput: { file_path: "/tmp/demo" },
      denialMessage: "User denied permission for Read.",
    })).toEqual({
      behavior: "deny",
      message: "User denied permission for Read.",
    });
  });
});

describe("buildClaudeUserInputPermissionResult", () => {
  test("returns an allow payload with merged answers for approved question responses", () => {
    expect(buildClaudeUserInputPermissionResult({
      normalizedInput: {
        questions: [{ header: "Name", question: "Who?", options: [{ label: "A", description: "A" }] }],
      },
      answers: { name: "Asty" },
    })).toEqual({
      behavior: "allow",
      updatedInput: {
        questions: [{ header: "Name", question: "Who?", options: [{ label: "A", description: "A" }] }],
        answers: { name: "Asty" },
      },
    });
  });

  test("returns a deny payload when the user declines to answer", () => {
    expect(buildClaudeUserInputPermissionResult({
      normalizedInput: { questions: [] },
      denied: true,
    })).toEqual({
      behavior: "deny",
      message: "User declined to answer questions.",
    });
  });
});

describe("buildClaudeSystemPrompt", () => {
  test("anchors relative paths to the active workspace root", () => {
    expect(buildClaudeSystemPrompt({
      cwd: "/home/astyfx/stave",
    })).toContain("Current workspace root: /home/astyfx/stave");
  });

  test("preserves any existing system prompt before appending workspace rules", () => {
    const systemPrompt = buildClaudeSystemPrompt({
      cwd: "/home/astyfx/stave",
      baseSystemPrompt: "Follow repository conventions.",
    });

    expect(systemPrompt.startsWith("Follow repository conventions.")).toBe(true);
    expect(systemPrompt).toContain("Resolve every relative filesystem path against the workspace root above.");
  });
});
