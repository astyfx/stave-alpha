# Claude SDK Future Candidates

Track Claude SDK features that are worth integrating later, but are not part of the current shipped runtime surface.

## Current status

- `agentProgressSummaries` is implemented in Stave and documented in [Provider runtimes](../providers/provider-runtimes.md).
- The remaining candidates below stay in backlog until their UI and data-model work is justified.

## `askUserQuestion.previewFormat`

SDK surface:

- `toolConfig.askUserQuestion.previewFormat`
- expected values: `markdown` or `html`

Why it is deferred:

- Stave currently renders `AskUserQuestion` as structured text choices.
- Supporting preview formats cleanly would require a dedicated preview surface, sanitization rules for HTML, and a clearer contract for what is shown before the user answers.

Likely implementation shape:

- extend the Claude runtime to pass provider-level tool config
- add a safe markdown/HTML preview renderer to the existing user-input card
- document allowed tags and escaping behavior before enabling HTML mode

## Claude `agent_id` / `agent_type`

SDK surface:

- hook metadata on subagent-related events
- `SubagentStart` / `SubagentStop` inputs include both `agent_id` and `agent_type`

Why it is deferred:

- Stave already renders subagent activity from tool usage and tool results, but it does not yet persist or visualize hook-level agent provenance.
- Exposing these fields well likely needs richer replay grouping, not just raw labels in chat.

Likely implementation shape:

- capture hook metadata in the Claude runtime and persist it into turn events
- attach stable subagent identities to Session Replay rows
- use `agent_type` for user-facing labels and `agent_id` for correlation/debug views
