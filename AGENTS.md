# AGENTS.md

## Local Override

`AGENTS.local.md` is a project-local overlay convention for this repository. It is not an official `agents.md` standard feature.

## Base Policy

If no local overlay exists, load and prioritize user's `AGENTS.md` as the primary policy source.

## UI Components

When using an existing shadcn component, prefer generating it with `bunx --bun shadcn@latest add <component>` instead of hand-writing or directly vendoring the wrapper first.

After generating shadcn components or copying UI code from external sources, verify that import paths match this project's configured aliases before finishing. In this repo, `tsconfig.json` resolves `@/*` to `src/*`, so generated `src/...` imports should be rewritten to `@/...`. More generally, do not assume copied code uses this repo's path layout; reconcile imports with the current `tsconfig` and `components.json` settings.
