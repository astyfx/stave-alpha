# Provider Runtimes

## Claude runtime

Claude turns are handled in `electron/providers/claude-sdk-runtime.ts`.

High-level flow:

1. The renderer submits a turn through `window.api.provider.streamTurn(...)`.
2. `electron/main.ts` forwards that request into `electron/providers/runtime.ts`.
3. `streamClaudeWithSdk(...)` imports `@anthropic-ai/claude-agent-sdk` and runs the turn from Electron.
4. Claude SDK messages are converted into Stave `BridgeEvent` records.
5. The renderer consumes those normalized events and renders chat text, thinking, tools, approval prompts, user-input prompts, plans, and completion state.

Claude event mapping:

- assistant text -> `text`
- thinking or thinking delta -> `thinking`
- tool use -> `tool`
- `ExitPlanMode` tool payload -> `plan_ready`
- `task_progress.summary` -> `system` when Claude agent progress summaries are enabled
- stream or runtime failures -> `error`

Claude-specific runtime controls come from the UI and runtime options:

- permission mode
- dangerous skip permissions
- sandbox enabled
- allow unsandboxed commands
- agent progress summaries
- provider timeout
- debug stream logging

In the chat composer, Stave mirrors the active provider runtime in a status line under the prompt box so the current turn settings stay visible. Permission/approval plus the most-used provider controls can also be adjusted inline there.

When Claude `agentProgressSummaries` is enabled, Stave forwards the SDK flag explicitly and renders incoming `task_progress.summary` updates as inline system events in the active assistant message.

Claude path and approval handling:

- Stave runs Claude with the active workspace `cwd`
- workspace-root guidance is appended so relative paths stay rooted correctly
- approval and user-input responses are validated before they are returned to the SDK

## Codex runtime

Codex turns are handled in `electron/providers/codex-sdk-runtime.ts`.

High-level flow:

1. The renderer submits a turn through the same provider bridge.
2. `streamCodexWithSdk(...)` imports `@openai/codex-sdk`.
3. Stave creates a `Codex` instance in Electron and starts or reuses a thread for the current task and runtime configuration.
4. `thread.runStreamed(...)` yields Codex `ThreadEvent` items.
5. Stave maps those items into the same `BridgeEvent` format used by Claude.
6. File changes are post-processed through `turn-diff-tracker.ts` so the UI can render diffs.

Codex event mapping:

- agent messages -> `text`
- reasoning -> `thinking`
- command execution -> `tool`
- MCP tool calls -> `tool`
- web search -> `tool`
- todo list -> `tool`
- file changes -> diff events
- failures -> `error`

Codex-specific runtime controls come from the UI and runtime options:

- network access
- sandbox mode
- approval policy
- reasoning effort
- reasoning summary and raw reasoning toggles
- binary path override
- provider timeout
- debug stream logging

Stave now forwards an explicit `show_raw_agent_reasoning: false` override when the Codex UI toggle is off, so local CLI defaults or config files do not leave raw reasoning enabled unexpectedly.

Codex threads are keyed by task/cwd plus the active sandbox, network, approval, model, reasoning, and web-search settings so Stave can preserve thread context without mixing incompatible runtime modes.

## Supported Codex baseline

- Codex SDK: `@openai/codex-sdk@0.114.0`
- Codex CLI baseline: `0.114.0`

Stave expects a local Codex CLI installation. A user-configured binary path takes precedence over PATH-based discovery.

## Executable path resolution

Stave does not hardcode one binary path. It probes a small set of candidates and accepts only executable files.

### Codex CLI lookup order

1. `runtimeOptions.codexPathOverride`
2. `STAVE_CODEX_CLI_PATH`
3. `STAVE_CODEX_CMD` resolved through `which`
4. default `codex` resolved through `which`
5. explicit probes of `~/.bun/bin/codex` and `~/.local/bin/codex`

If multiple executable candidates exist, Stave runs `candidate --version`, parses semver, and prefers the newest valid version.

### Claude CLI lookup candidates

1. `STAVE_CLAUDE_CLI_PATH`
2. `CLAUDE_CODE_PATH`
3. `~/.bun/bin/claude`
4. `~/.local/bin/claude`

Each candidate must be executable and respond successfully to `--version`. If multiple valid candidates exist, Stave sorts them by parsed version and chooses the newest one.

## Useful environment variables

- `STAVE_PROVIDER_TIMEOUT_MS`
- `STAVE_CLAUDE_CLI_PATH`
- `CLAUDE_CODE_PATH`
- `STAVE_CLAUDE_DEBUG`
- `STAVE_CODEX_CLI_PATH`
- `STAVE_CODEX_CMD`
- `STAVE_CODEX_SANDBOX_MODE`
- `STAVE_CODEX_NETWORK_ACCESS`
- `STAVE_CODEX_APPROVAL_POLICY`
- `STAVE_CODEX_DEBUG`

Most per-turn runtime settings can also be changed from the Settings dialog, and those UI values override the environment defaults for active turns.
