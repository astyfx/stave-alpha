import { useMemo, useState } from "react";
import { Bot, Code2, Cog, Diff, Globe, KeyRound, Monitor, Moon, Palette, ScrollText, SearchCheck, Shield, Sun, TerminalSquare, Wrench, X } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLAUDE_SDK_MODEL_OPTIONS, CODEX_SDK_MODEL_OPTIONS, normalizeModelSelection } from "@/lib/providers/model-catalog";
import { cn } from "@/lib/utils";
import { PRESET_THEME_TOKENS, THEME_TOKEN_NAMES, type ThemeModeName, type ThemeTokenName, useAppStore } from "@/store/app.store";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (args: { open: boolean }) => void;
}

const sections = [
  { id: "general", label: "General", icon: Cog },
  { id: "theme", label: "Design", icon: Palette },
  { id: "chat", label: "Chat", icon: Bot },
  { id: "models", label: "Models", icon: Globe },
  { id: "rules", label: "Rules", icon: ScrollText },
  { id: "permissions", label: "Permissions", icon: Shield },
  { id: "subagents", label: "Subagent", icon: Wrench },
  { id: "skills", label: "Skills", icon: SearchCheck },
  { id: "commands", label: "Command", icon: KeyRound },
  { id: "review", label: "Review", icon: SearchCheck },
  { id: "terminal", label: "Terminal", icon: TerminalSquare },
  { id: "editor", label: "Editor", icon: Code2 },
  { id: "diff", label: "Diff", icon: Diff },
  { id: "developer", label: "Developer", icon: Wrench },
] as const;

type SectionId = (typeof sections)[number]["id"];

const sectionGroups: Array<{ label: string; ids: SectionId[] }> = [
  { label: "Workspace", ids: ["general", "theme", "editor", "diff", "terminal"] },
  { label: "Agents", ids: ["chat", "models", "rules", "permissions", "review"] },
  { label: "Automation", ids: ["subagents", "skills", "commands", "developer"] },
];

function readInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function readFloat(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function formatThemeTokenLabel(token: ThemeTokenName) {
  return token
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function SettingsDialog(args: SettingsDialogProps) {
  const { open, onOpenChange } = args;
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [themeEditorMode, setThemeEditorMode] = useState<ThemeModeName>("light");
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const sectionList = useMemo(() => sections, []);
  const sectionsById = useMemo(
    () => Object.fromEntries(sectionList.map((section) => [section.id, section])) as Record<SectionId, (typeof sections)[number]>,
    [sectionList]
  );

  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-[2px]" onMouseDown={() => onOpenChange({ open: false })}>
      <Card className="animate-dropdown-in flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border-border/80 bg-background shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <CardHeader className="border-b border-border/80 bg-card/60 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Settings</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Configure workspace behavior, model defaults, and design tokens.
              </CardDescription>
            </div>
            <Button size="sm" variant="ghost" aria-label="close-settings" onClick={() => onOpenChange({ open: false })}>
              <X className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)] gap-0 p-0">
          <aside className="min-h-0 overflow-auto border-r border-border/80 bg-card/40 p-4">
            <div className="flex flex-col gap-4">
              {sectionGroups.map((group) => (
                <div key={group.label} className="flex flex-col gap-1">
                  <p className="px-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {group.label}
                  </p>
                  {group.ids.map((sectionId) => {
                    const section = sectionsById[sectionId];
                    const Icon = section.icon;
                    const active = activeSection === section.id;

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          active
                            ? "bg-secondary text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                        {section.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </aside>

          <main className="min-h-0 overflow-auto p-6">
          {activeSection === "general" ? (
            <>
              <div className="mb-6">
                <h3 className="text-3xl font-semibold">General</h3>
                <p className="mt-1 text-sm text-muted-foreground">Global defaults for language and workspace-wide app behavior.</p>
              </div>
              <section className="flex flex-col gap-5">
                <Card className="border-border/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Language</CardTitle>
                    <CardDescription>Reserved for future localization support.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      className="h-10 rounded-md border-border/80 bg-background"
                      value={settings.language}
                      onChange={(event) => updateSettings({ patch: { language: event.target.value } })}
                    />
                  </CardContent>
                </Card>
              </section>
            </>
          ) : null}
          {activeSection === "theme" ? (
            <>
              <div className="mb-6">
                <h3 className="text-3xl font-semibold">Design</h3>
                <p className="mt-1 text-sm text-muted-foreground">Control theme mode and the shadcn token values that shape the interface.</p>
              </div>
              <section className="flex flex-col gap-5">
                <Card className="border-border/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Appearance</CardTitle>
                    <CardDescription>Choose how the app resolves light and dark mode.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-3">
                    <Button
                      className="h-10 rounded-md"
                      variant={settings.themeMode === "light" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { themeMode: "light" } })}
                    >
                      <Sun className="size-4" />
                      Light
                    </Button>
                    <Button
                      className="h-10 rounded-md"
                      variant={settings.themeMode === "dark" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { themeMode: "dark" } })}
                    >
                      <Moon className="size-4" />
                      Dark
                    </Button>
                    <Button
                      className="h-10 rounded-md"
                      variant={settings.themeMode === "system" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { themeMode: "system" } })}
                    >
                      <Monitor className="size-4" />
                      System
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-border/80">
                  <CardHeader className="pb-3">
                    <div>
                      <CardTitle className="text-base">Design Tokens</CardTitle>
                      <CardDescription className="mt-1">
                        Defaults follow `bunx --bun shadcn@latest init --preset aIkf1Td`. Override any token below.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={themeEditorMode === "light" ? "default" : "outline"}
                          onClick={() => setThemeEditorMode("light")}
                        >
                          Light Tokens
                        </Button>
                        <Button
                          size="sm"
                          variant={themeEditorMode === "dark" ? "default" : "outline"}
                          onClick={() => setThemeEditorMode("dark")}
                        >
                          Dark Tokens
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateSettings({
                            patch: {
                              themeOverrides: {
                                ...settings.themeOverrides,
                                [themeEditorMode]: {},
                              },
                            },
                          })
                        }
                      >
                        Reset {themeEditorMode}
                      </Button>
                    </div>
                    <div className="grid gap-3">
                    {THEME_TOKEN_NAMES.map((token) => {
                      const overrideValue = settings.themeOverrides[themeEditorMode][token] ?? "";
                      const effectiveValue = overrideValue || PRESET_THEME_TOKENS[themeEditorMode][token];

                      return (
                        <div key={`${themeEditorMode}-${token}`} className="grid gap-3 rounded-xl border border-border/70 bg-background/60 p-4 lg:grid-cols-[190px_52px_1fr_auto] lg:items-center">
                          <div>
                            <p className="text-sm font-medium">{formatThemeTokenLabel(token)}</p>
                            <p className="text-xs text-muted-foreground">Preset: {PRESET_THEME_TOKENS[themeEditorMode][token]}</p>
                          </div>
                          <span
                            className="size-11 rounded-lg border border-border"
                            style={{ backgroundColor: effectiveValue }}
                            aria-hidden="true"
                          />
                          <Input
                            className="h-10 rounded-md border-border/80 bg-background font-mono text-sm"
                            value={overrideValue}
                            placeholder={PRESET_THEME_TOKENS[themeEditorMode][token]}
                            onChange={(event) =>
                              updateSettings({
                                patch: {
                                  themeOverrides: {
                                    ...settings.themeOverrides,
                                    [themeEditorMode]: {
                                      ...settings.themeOverrides[themeEditorMode],
                                      [token]: event.target.value,
                                    },
                                  },
                                },
                              })
                            }
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateSettings({
                                patch: {
                                  themeOverrides: {
                                    ...settings.themeOverrides,
                                    [themeEditorMode]: {
                                      ...settings.themeOverrides[themeEditorMode],
                                      [token]: "",
                                    },
                                  },
                                },
                              })
                            }
                          >
                            Reset
                          </Button>
                        </div>
                      );
                    })}
                    </div>
                  </CardContent>
                </Card>
              </section>
            </>
          ) : null}
          {activeSection === "terminal" ? (
            <>
              <h3 className="text-3xl font-semibold">Terminal</h3>
              <p className="mt-1 text-sm text-muted-foreground">Configure terminal appearance and behavior.</p>
              <section className="mt-6 space-y-4">
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Font Size</p>
                  <Input
                    className="h-10 rounded-sm border-border/80 bg-background"
                    value={String(settings.terminalFontSize)}
                    onChange={(event) =>
                      updateSettings({
                        patch: { terminalFontSize: readInt(event.target.value, settings.terminalFontSize) },
                      })
                    }
                  />
                </Card>
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Font Family</p>
                  <Input
                    className="h-10 rounded-sm border-border/80 bg-background"
                    value={settings.terminalFontFamily}
                    onChange={(event) => updateSettings({ patch: { terminalFontFamily: event.target.value } })}
                  />
                </Card>
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Cursor Style</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.terminalCursorStyle === "block" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { terminalCursorStyle: "block" } })}
                    >
                      Block
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.terminalCursorStyle === "bar" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { terminalCursorStyle: "bar" } })}
                    >
                      Bar
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.terminalCursorStyle === "underline" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { terminalCursorStyle: "underline" } })}
                    >
                      Underline
                    </Button>
                  </div>
                </Card>
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Line Height</p>
                  <Input
                    className="h-10 rounded-sm border-border/80 bg-background"
                    value={String(settings.terminalLineHeight)}
                    onChange={(event) =>
                      updateSettings({
                        patch: { terminalLineHeight: readFloat(event.target.value, settings.terminalLineHeight) },
                      })
                    }
                  />
                </Card>
              </section>
            </>
          ) : null}

          {activeSection !== "general" && activeSection !== "terminal" ? (
            <section className="space-y-4">
              {activeSection === "models" ? (
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Model Routing</p>
                  <Input
                    className="h-10 rounded-sm border-border/80 bg-background"
                    list="claude-model-options"
                    value={settings.modelClaude}
                    onChange={(event) => updateSettings({ patch: { modelClaude: event.target.value } })}
                    onBlur={(event) =>
                      updateSettings({
                        patch: {
                          modelClaude: normalizeModelSelection({
                            value: event.target.value,
                            fallback: CLAUDE_SDK_MODEL_OPTIONS[0],
                          }),
                        },
                      })
                    }
                  />
                  <Input
                    className="mt-2 h-10 rounded-sm border-border/80 bg-background"
                    list="codex-model-options"
                    value={settings.modelCodex}
                    onChange={(event) => updateSettings({ patch: { modelCodex: event.target.value } })}
                    onBlur={(event) =>
                      updateSettings({
                        patch: {
                          modelCodex: normalizeModelSelection({
                            value: event.target.value,
                            fallback: CODEX_SDK_MODEL_OPTIONS[0],
                          }),
                        },
                      })
                    }
                  />
                  <datalist id="claude-model-options">
                    {CLAUDE_SDK_MODEL_OPTIONS.map((model) => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>
                  <datalist id="codex-model-options">
                    {CODEX_SDK_MODEL_OPTIONS.map((model) => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Verified model set only. Codex currently supports `gpt-5.4` and `gpt-5.3-codex`; Claude is limited to latest official models.
                  </p>
                </Card>
              ) : null}

              {activeSection === "rules" ? (
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Rule Presets</p>
                  <Input
                    className="h-10 rounded-sm border-border/80 bg-background"
                    value={settings.rulesPresetPrimary}
                    onChange={(event) => updateSettings({ patch: { rulesPresetPrimary: event.target.value } })}
                  />
                  <Input
                    className="mt-2 h-10 rounded-sm border-border/80 bg-background"
                    value={settings.rulesPresetSecondary}
                    onChange={(event) => updateSettings({ patch: { rulesPresetSecondary: event.target.value } })}
                  />
                </Card>
              ) : null}

              {activeSection === "chat" ? (
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Chat Defaults</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.smartSuggestions ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { smartSuggestions: true } })}
                    >
                      Smart Suggestions: On
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.smartSuggestions ? "outline" : "default"}
                      onClick={() => updateSettings({ patch: { smartSuggestions: false } })}
                    >
                      Smart Suggestions: Off
                    </Button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.chatSendPreview ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { chatSendPreview: true } })}
                    >
                      Send Preview: On
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.chatSendPreview ? "outline" : "default"}
                      onClick={() => updateSettings({ patch: { chatSendPreview: false } })}
                    >
                      Send Preview: Off
                    </Button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.chatStreamingEnabled ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { chatStreamingEnabled: true } })}
                    >
                      Streaming UI: On
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.chatStreamingEnabled ? "outline" : "default"}
                      onClick={() => updateSettings({ patch: { chatStreamingEnabled: false } })}
                    >
                      Streaming UI: Off
                    </Button>
                  </div>
                </Card>
              ) : null}

              {activeSection === "permissions" ? (
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Permission Defaults</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.permissionMode === "require-approval" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { permissionMode: "require-approval" } })}
                    >
                      Require Approval
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.permissionMode === "auto-safe" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { permissionMode: "auto-safe" } })}
                    >
                      Auto Approve Safe
                    </Button>
                  </div>
                </Card>
              ) : null}

              {activeSection === "subagents" ? (
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Subagent Defaults</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.subagentsEnabled ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { subagentsEnabled: true } })}
                    >
                      Subagents: On
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.subagentsEnabled ? "outline" : "default"}
                      onClick={() => updateSettings({ patch: { subagentsEnabled: false } })}
                    >
                      Subagents: Off
                    </Button>
                  </div>
                  <Input
                    className="mt-2 h-10 rounded-sm border-border/80 bg-background"
                    value={settings.subagentsProfile}
                    onChange={(event) => updateSettings({ patch: { subagentsProfile: event.target.value } })}
                  />
                </Card>
              ) : null}

              {activeSection === "skills" ? (
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Skills Defaults</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.skillsEnabled ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { skillsEnabled: true } })}
                    >
                      Skills: On
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.skillsEnabled ? "outline" : "default"}
                      onClick={() => updateSettings({ patch: { skillsEnabled: false } })}
                    >
                      Skills: Off
                    </Button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.skillsAutoSuggest ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { skillsAutoSuggest: true } })}
                    >
                      Auto Suggest: On
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.skillsAutoSuggest ? "outline" : "default"}
                      onClick={() => updateSettings({ patch: { skillsAutoSuggest: false } })}
                    >
                      Auto Suggest: Off
                    </Button>
                  </div>
                </Card>
              ) : null}

              {activeSection === "commands" ? (
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Command Defaults</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.commandPolicy === "confirm" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { commandPolicy: "confirm" } })}
                    >
                      Confirm
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.commandPolicy === "auto-safe" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { commandPolicy: "auto-safe" } })}
                    >
                      Auto Safe
                    </Button>
                  </div>
                  <Input
                    className="mt-2 h-10 rounded-sm border-border/80 bg-background"
                    value={settings.commandAllowlist}
                    onChange={(event) => updateSettings({ patch: { commandAllowlist: event.target.value } })}
                  />
                  <p className="mt-4 text-sm font-medium">Custom Commands</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    One per line. Format: <code>/name = response</code> or <code>/name =&gt; response</code>.
                    Unknown slash commands are sent to Claude/Codex as native commands.
                  </p>
                  <Textarea
                    className="mt-2 min-h-[140px] rounded-sm border-border/80 bg-background font-mono text-sm"
                    value={settings.customCommands}
                    onChange={(event) => updateSettings({ patch: { customCommands: event.target.value } })}
                    placeholder="/clear = @clear&#10;/hello = Hello from {provider} ({model})&#10;/stats = Users: {user_count}, Assistant: {assistant_count}"
                  />
                </Card>
              ) : null}

              {activeSection === "review" ? (
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Review Defaults</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.reviewStrictMode ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { reviewStrictMode: true } })}
                    >
                      Strict: On
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.reviewStrictMode ? "outline" : "default"}
                      onClick={() => updateSettings({ patch: { reviewStrictMode: false } })}
                    >
                      Strict: Off
                    </Button>
                  </div>
                  <Input
                    className="mt-2 h-10 rounded-sm border-border/80 bg-background"
                    value={settings.reviewChecklistPreset}
                    onChange={(event) => updateSettings({ patch: { reviewChecklistPreset: event.target.value } })}
                  />
                </Card>
              ) : null}

              {activeSection === "editor" ? (
                <>
                  <Card className="rounded-sm border-border/80 bg-card p-4">
                    <p className="mb-2 text-sm font-medium">Font Size</p>
                    <Input
                      className="h-10 rounded-sm border-border/80 bg-background"
                      type="number"
                      min={10}
                      max={32}
                      value={String(settings.editorFontSize)}
                      onChange={(event) =>
                        updateSettings({
                          patch: { editorFontSize: readInt(event.target.value, settings.editorFontSize) },
                        })
                      }
                    />
                  </Card>
                  <Card className="rounded-sm border-border/80 bg-card p-4">
                    <p className="mb-2 text-sm font-medium">Font Family</p>
                    <Input
                      className="h-10 rounded-sm border-border/80 bg-background font-mono"
                      value={settings.editorFontFamily}
                      onChange={(event) => updateSettings({ patch: { editorFontFamily: event.target.value } })}
                    />
                  </Card>
                  <Card className="rounded-sm border-border/80 bg-card p-4">
                    <p className="mb-2 text-sm font-medium">Tab Size</p>
                    <Input
                      className="h-10 rounded-sm border-border/80 bg-background"
                      type="number"
                      min={1}
                      max={8}
                      value={String(settings.editorTabSize)}
                      onChange={(event) =>
                        updateSettings({
                          patch: { editorTabSize: readInt(event.target.value, settings.editorTabSize) },
                        })
                      }
                    />
                  </Card>
                  <Card className="rounded-sm border-border/80 bg-card p-4">
                    <p className="mb-2 text-sm font-medium">Word Wrap</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.editorWordWrap ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { editorWordWrap: true } })}
                      >
                        On
                      </Button>
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.editorWordWrap ? "outline" : "default"}
                        onClick={() => updateSettings({ patch: { editorWordWrap: false } })}
                      >
                        Off
                      </Button>
                    </div>
                  </Card>
                  <Card className="rounded-sm border-border/80 bg-card p-4">
                    <p className="mb-2 text-sm font-medium">Line Numbers</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.editorLineNumbers === "on" ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { editorLineNumbers: "on" } })}
                      >
                        On
                      </Button>
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.editorLineNumbers === "off" ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { editorLineNumbers: "off" } })}
                      >
                        Off
                      </Button>
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.editorLineNumbers === "relative" ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { editorLineNumbers: "relative" } })}
                      >
                        Relative
                      </Button>
                    </div>
                  </Card>
                  <Card className="rounded-sm border-border/80 bg-card p-4">
                    <p className="mb-2 text-sm font-medium">Minimap</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.editorMinimap ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { editorMinimap: true } })}
                      >
                        On
                      </Button>
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.editorMinimap ? "outline" : "default"}
                        onClick={() => updateSettings({ patch: { editorMinimap: false } })}
                      >
                        Off
                      </Button>
                    </div>
                  </Card>
                </>
              ) : null}

              {activeSection === "diff" ? (
                <Card className="rounded-sm border-border/80 bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Diff Display</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.diffViewMode === "unified" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { diffViewMode: "unified" } })}
                    >
                      Unified
                    </Button>
                    <Button
                      className="h-10 rounded-sm"
                      variant={settings.diffViewMode === "split" ? "default" : "outline"}
                      onClick={() => updateSettings({ patch: { diffViewMode: "split" } })}
                    >
                      Split
                    </Button>
                  </div>
                </Card>
              ) : null}

              {activeSection === "developer" ? (
                <>
                  <Card className="rounded-sm border-border/80 bg-card p-4">
                    <p className="mb-2 text-sm font-medium">Provider Timeout</p>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Maximum time to wait for a Claude or Codex SDK response before showing a timeout error. Overrides the <code className="rounded bg-muted px-1">STAVE_PROVIDER_TIMEOUT_MS</code> env variable.
                    </p>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(settings.providerTimeoutMs)}
                        onValueChange={(value) => updateSettings({ patch: { providerTimeoutMs: readInt(value, settings.providerTimeoutMs) } })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60000">1 min (60s)</SelectItem>
                          <SelectItem value="120000">2 min (120s)</SelectItem>
                          <SelectItem value="300000">5 min (300s)</SelectItem>
                          <SelectItem value="600000">10 min (600s)</SelectItem>
                          <SelectItem value="1200000">20 min (1200s)</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">{settings.providerTimeoutMs / 1000}s</span>
                    </div>
                  </Card>

                  <Card className="rounded-sm border-border/80 bg-card p-4">
                    <p className="mb-2 text-sm font-medium">Claude Runtime Controls</p>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Control Claude SDK permission and sandbox behavior for each turn.
                    </p>

                    <p className="mb-2 text-sm font-medium">Permission Mode</p>
                    <Select
                      value={settings.claudePermissionMode}
                      onValueChange={(value) =>
                        updateSettings({
                          patch: {
                            claudePermissionMode: value as "default" | "acceptEdits" | "bypassPermissions" | "plan" | "dontAsk",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">default</SelectItem>
                        <SelectItem value="acceptEdits">acceptEdits</SelectItem>
                        <SelectItem value="bypassPermissions">bypassPermissions</SelectItem>
                        <SelectItem value="plan">plan</SelectItem>
                        <SelectItem value="dontAsk">dontAsk</SelectItem>
                      </SelectContent>
                    </Select>

                    <p className="mb-2 mt-4 text-sm font-medium">Dangerous Skip Permissions</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.claudeAllowDangerouslySkipPermissions ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { claudeAllowDangerouslySkipPermissions: true } })}
                      >
                        Skip: On
                      </Button>
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.claudeAllowDangerouslySkipPermissions ? "outline" : "default"}
                        onClick={() => updateSettings({ patch: { claudeAllowDangerouslySkipPermissions: false } })}
                      >
                        Skip: Off
                      </Button>
                    </div>

                    <p className="mb-2 mt-4 text-sm font-medium">Sandbox Enabled</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.claudeSandboxEnabled ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { claudeSandboxEnabled: true } })}
                      >
                        Sandbox: On
                      </Button>
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.claudeSandboxEnabled ? "outline" : "default"}
                        onClick={() => updateSettings({ patch: { claudeSandboxEnabled: false } })}
                      >
                        Sandbox: Off
                      </Button>
                    </div>

                    <p className="mb-2 mt-4 text-sm font-medium">Allow Unsandboxed Commands</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.claudeAllowUnsandboxedCommands ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { claudeAllowUnsandboxedCommands: true } })}
                      >
                        Unsandboxed: On
                      </Button>
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.claudeAllowUnsandboxedCommands ? "outline" : "default"}
                        onClick={() => updateSettings({ patch: { claudeAllowUnsandboxedCommands: false } })}
                      >
                        Unsandboxed: Off
                      </Button>
                    </div>
                  </Card>

                  <Card className="rounded-sm border-border/80 bg-card p-4">
                    <p className="mb-2 text-sm font-medium">Codex Runtime Controls</p>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Per-turn Codex SDK sandbox/network/approval settings from the Stave UI.
                    </p>

                    <p className="mb-2 text-sm font-medium">Network Access</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.codexNetworkAccessEnabled ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { codexNetworkAccessEnabled: true } })}
                      >
                        Network: On
                      </Button>
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.codexNetworkAccessEnabled ? "outline" : "default"}
                        onClick={() => updateSettings({ patch: { codexNetworkAccessEnabled: false } })}
                      >
                        Network: Off
                      </Button>
                    </div>

                    <p className="mb-2 mt-4 text-sm font-medium">Sandbox Mode</p>
                    <Select
                      value={settings.codexSandboxMode}
                      onValueChange={(value) =>
                        updateSettings({
                          patch: {
                            codexSandboxMode: value as "read-only" | "workspace-write" | "danger-full-access",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read-only">read-only</SelectItem>
                        <SelectItem value="workspace-write">workspace-write</SelectItem>
                        <SelectItem value="danger-full-access">danger-full-access</SelectItem>
                      </SelectContent>
                    </Select>

                    <p className="mb-2 mt-4 text-sm font-medium">Approval Policy</p>
                    <Select
                      value={settings.codexApprovalPolicy}
                      onValueChange={(value) =>
                        updateSettings({
                          patch: {
                            codexApprovalPolicy: value as "never" | "on-request" | "on-failure" | "untrusted",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">never</SelectItem>
                        <SelectItem value="on-request">on-request</SelectItem>
                        <SelectItem value="on-failure">on-failure</SelectItem>
                        <SelectItem value="untrusted">untrusted</SelectItem>
                      </SelectContent>
                    </Select>

                    <p className="mb-2 mt-4 text-sm font-medium">Plan Mode (Collaboration)</p>
                    <p className="mb-2 text-sm text-muted-foreground">
                      Enable Codex collaboration mode. Codex will respond with a plan wrapped in{" "}
                      <code className="rounded bg-muted px-1">&lt;proposed_plan&gt;</code> before executing.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.codexPlanMode ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { codexPlanMode: true } })}
                      >
                        Plan Mode: On
                      </Button>
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.codexPlanMode ? "outline" : "default"}
                        onClick={() => updateSettings({ patch: { codexPlanMode: false } })}
                      >
                        Plan Mode: Off
                      </Button>
                    </div>

                    <p className="mb-2 mt-4 text-sm font-medium">Reasoning Effort</p>
                    <Select
                      value={settings.codexModelReasoningEffort}
                      onValueChange={(value) =>
                        updateSettings({
                          patch: {
                            codexModelReasoningEffort: value as "minimal" | "low" | "medium" | "high" | "xhigh",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">minimal</SelectItem>
                        <SelectItem value="low">low</SelectItem>
                        <SelectItem value="medium">medium</SelectItem>
                        <SelectItem value="high">high</SelectItem>
                        <SelectItem value="xhigh">xhigh</SelectItem>
                      </SelectContent>
                    </Select>

                    <p className="mb-2 mt-4 text-sm font-medium">Codex Binary Path</p>
                    <p className="mb-2 text-sm text-muted-foreground">
                      Override the path to the <code className="rounded bg-muted px-1">codex</code> binary. Leave empty to use the system default.
                    </p>
                    <Input
                      className="h-10 rounded-sm border-border/80 bg-background font-mono text-sm"
                      placeholder="/usr/local/bin/codex"
                      value={settings.codexPathOverride}
                      onChange={(event) => updateSettings({ patch: { codexPathOverride: event.target.value } })}
                    />
                  </Card>

                  <Card className="rounded-sm border-border/80 bg-card p-4">
                    <p className="mb-2 text-sm font-medium">Provider Debug Logging</p>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Enables verbose stream event logging for all providers (Claude + Codex). Equivalent to setting <code className="rounded bg-muted px-1">STAVE_CLAUDE_DEBUG=1</code> and <code className="rounded bg-muted px-1">STAVE_CODEX_DEBUG=1</code>. Check the Electron main-process console for output.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.providerDebugStream ? "default" : "outline"}
                        onClick={() => updateSettings({ patch: { providerDebugStream: true } })}
                      >
                        Debug: On
                      </Button>
                      <Button
                        className="h-10 rounded-sm"
                        variant={settings.providerDebugStream ? "outline" : "default"}
                        onClick={() => updateSettings({ patch: { providerDebugStream: false } })}
                      >
                        Debug: Off
                      </Button>
                    </div>
                  </Card>
                </>
              ) : null}
            </section>
          ) : null}
          </main>
        </CardContent>
      </Card>
    </div>
  );
}
