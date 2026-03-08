import { spawnSync } from "node:child_process";
import { accessSync, constants } from "node:fs";

interface ResolveExecutablePathArgs {
  absolutePathEnvVar: string;
  commandEnvVar: string;
  defaultCommand: string;
}

function sanitizeCommandName(args: { value: string }) {
  const trimmed = args.value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function isExecutablePath(args: { value: string }) {
  try {
    accessSync(args.value, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveFromCommand(args: { command: string }) {
  const safeCommand = sanitizeCommandName({ value: args.command });
  if (!safeCommand) {
    return null;
  }

  const result = spawnSync("which", [safeCommand], {
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    return null;
  }

  const resolved = result.stdout.trim().split("\n")[0]?.trim();
  if (!resolved) {
    return null;
  }
  if (!isExecutablePath({ value: resolved })) {
    return null;
  }
  return resolved;
}

export function resolveExecutablePath(args: ResolveExecutablePathArgs) {
  const absolutePathFromEnv = process.env[args.absolutePathEnvVar]?.trim();
  if (absolutePathFromEnv && isExecutablePath({ value: absolutePathFromEnv })) {
    return absolutePathFromEnv;
  }

  const commandFromEnv = process.env[args.commandEnvVar]?.trim();
  if (commandFromEnv) {
    const fromConfiguredCommand = resolveFromCommand({ command: commandFromEnv });
    if (fromConfiguredCommand) {
      return fromConfiguredCommand;
    }
  }

  return resolveFromCommand({ command: args.defaultCommand });
}
