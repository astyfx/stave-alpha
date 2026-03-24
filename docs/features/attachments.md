# Attachments

Stave supports attaching files and images to chat messages through the prompt composer.

## File attachments

Users can attach project files to a message using the `@` file search or the file picker button in the composer toolbar.

- The file picker opens an inline panel with a search filter scoped to the current workspace's `projectFiles`.
- Selected files appear as removable chips above the toolbar.
- On send, Stave opens each attached file through the editor tab system, reads its content and language, and forwards the result as `fileContexts` alongside the user message.

## Image attachments

Images can be attached in three ways:

1. **Screenshot capture** — click the camera button in the composer toolbar. Stave calls `window.api.capture.screenshot()` in the Electron runtime, which returns a `dataUrl` that becomes an image attachment.
2. **Clipboard paste** — paste an image from the system clipboard (`Cmd/Ctrl+V`) directly into the prompt textarea. The `onPaste` handler detects `image/*` items in `clipboardData`, reads each file as a data URL via `FileReader`, and appends them as image attachments. Text-only pastes are unaffected.
3. **Multiple images** — both screenshot capture and clipboard paste can add multiple images. Each image receives a unique `crypto.randomUUID()` identifier.

Attached images appear as small thumbnails with a remove button. Clicking a thumbnail opens a full-screen preview overlay.

## Data model

```typescript
type Attachment =
  | { kind: "file"; filePath: string }
  | { kind: "image"; id: string; dataUrl: string; label: string };
```

- `kind: "file"` attachments carry a workspace-relative path and are resolved to file content at send time.
- `kind: "image"` attachments carry an inline data URL and a display label such as `"Screenshot"` or `"Pasted image"`.

Attachments are stored in the prompt draft state (`promptDraftByTask`) and cleared after a successful send.

## Send path

On send, Stave converts image attachments into `imageContexts`:

```typescript
{
  dataUrl: string;
  label: string;
  mimeType: "image/png";
}
```

These are passed to `sendUserMessage()` alongside `fileContexts` and the text content, where the active provider runtime includes them as image parts in the conversation turn.

## Component structure

- `PromptInput` — owns the paste handler, attachment display, file picker, and screenshot button
- `ChatInput` — manages attachment state via `promptDraftByTask` and converts attachments to provider-facing contexts on send
- `MessageAttachment` / `MessageAttachments` — display components for rendering attachments in sent messages

## Verification

- Screenshot capture requires the Electron runtime (`window.api.capture.screenshot`).
- Clipboard paste works in both Electron and browser runtimes since it uses standard `ClipboardEvent` and `FileReader` APIs.
- The `onAttachmentsChange` callback must be provided for image features to activate. If absent, paste and screenshot are no-ops.
