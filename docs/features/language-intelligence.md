# Language Intelligence

Stave supports two editor intelligence paths today.

## Built-in Monaco support

TypeScript and JavaScript use Monaco's built-in TypeScript worker plus workspace-loaded `tsconfig.json`, source files, and type libraries.

That path powers:

- module resolution
- diagnostics
- hover
- completion
- go to definition

## Project language servers

Other languages can use an Electron-managed Language Server Protocol runtime.

Current support:

- Python via `pyright-langserver` or `basedpyright-langserver`

The editor settings expose:

- a toggle to enable the LSP runtime
- a Python server command override

When enabled, Stave starts one stdio-backed language-server session per active workspace root and language, then forwards Monaco document sync, hover, completion, definition, and diagnostics through Electron IPC.

## Current limits

- Python support depends on an installed external language server
- the active workspace root is the session boundary
- nested per-package config discovery is not implemented yet
- rename, references, and code actions are not implemented yet
