# Changelog

## [0.0.7](https://github.com/astyfx/stave/compare/v0.0.6...v0.0.7) (2026-03-11)

### Features

* add session replay drawer foundation ([8fc9293](https://github.com/astyfx/stave/commit/8fc9293f0dbaf05e0f212432a4e3cb3af470b4db))
* complete session replay workbench ([844a7e6](https://github.com/astyfx/stave/commit/844a7e650ec08cbc42089146b3232567d5a83673))
* improve rendering performance and workspace UX ([56ab728](https://github.com/astyfx/stave/commit/56ab728630e427e5aafa13d6e03103c36c4919bc))
* move generic tool logs into session replay ([2e3e0af](https://github.com/astyfx/stave/commit/2e3e0af5d4cfb57556a5c05e8c4ede33a5ae4de3))
* refresh ui primitives and add gpu diagnostics ([35d7835](https://github.com/astyfx/stave/commit/35d7835abd323d77387cb4b24c259e01c2370fac))

### Highlights

- moved generic background tool activity out of the main transcript into a Session Replay drawer with recent-turn navigation, replay filters, overview metrics, and chat deep links
- reduced renderer churn across chat, editor, and layout surfaces with narrower subscriptions, guarded store writes, deferred Monaco workspace loading, and an opt-in render profiler
- improved workspace startup and source-control behavior by hydrating Explorer files on open, filtering out worktree-owned branches in the selector, and surfacing checkout failures more clearly
- refreshed translucent shadcn menu primitives and developer diagnostics, including GPU acceleration status in Settings and updated preset metadata in the docs

## [0.0.6](https://github.com/astyfx/stave/compare/v0.0.5...v0.0.6) (2026-03-10)

- reworked provider turn execution around canonical conversation requests, runtime-side request translators, and persisted per-turn request snapshots so Claude and Codex can share one task chat model more reliably
- fixed provider concurrency by scoping abort, approval, and user-input responders to individual turn ids instead of a single active slot per provider
- centralized provider model metadata, availability, native command handling, and session labeling to reduce hardcoded Claude/Codex branching and make later provider additions cheaper
- kept Claude's dedicated plan viewer but removed the Stave-managed Codex plan parser and plan mode so Codex now streams plain responses directly into the shared chat surface
- expanded the latest-turn diagnostics UI with provider session ids, persisted event timelines, and request snapshot inspection, and added surrounding shell polish such as the keyboard shortcuts drawer

## 0.0.5 - 2026-03-10

- fixed chat markdown tables so GFM pipe-table syntax renders as actual table markup instead of plain text in assistant messages
- moved message markdown rendering into a dedicated renderer with `remark-gfm` support and regression coverage for table output
- switched markdown tables onto the shared shadcn table primitives and forced long cell content to wrap within the message bubble instead of causing horizontal overflow

## 0.0.4 - 2026-03-10

- fixed Claude workspace path anchoring so relative paths like `./docs` stay rooted in the active Stave workspace instead of drifting to guessed sibling directories
- hardened Claude tool approval and user-input permission responses to always return SDK-safe payloads, preventing the recurring `updatedInput`/`message` Zod failure seen in archived sessions
- added regression coverage for Claude approval payloads, user-input payloads, and workspace-root system prompt composition

## 0.0.3 - 2026-03-09

- simplified branding to plain `Stave`, including the window title, app title, and persisted app store key
- refined chat UI with grouped file review blocks, tool/header polish, larger message typography, task timestamp display, and tooltip cleanup
- improved workspace and project menus by moving them onto the shared dropdown primitives and adding session-id access from the task menu
- tightened settings and task list UX with reduced rerender pressure, cleaner workspace identity styling, and updated menu surfaces

## 0.0.2 - 2026-03-09

- added persisted provider runtime settings and bridge updates for Codex and Claude execution controls
- improved chat message rendering with grouped changed-files and referenced-files blocks, better diff restore behavior, and highlighted file previews
- refined editor and workspace shell UX with clearer diff handling, shared workspace identity accents, and unified tooltip usage
- rebuilt the settings dialog into section-based panels with narrower rerenders and preset-aligned inverted dropdown and tooltip surfaces
