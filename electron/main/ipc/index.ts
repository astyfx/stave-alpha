import { registerFilesystemHandlers } from "./filesystem";
import { registerLspHandlers } from "./lsp";
import { registerPersistenceHandlers } from "./persistence";
import { registerProviderHandlers } from "./provider";
import { registerScmHandlers } from "./scm";
import { registerTerminalHandlers } from "./terminal";
import { registerWindowHandlers } from "./window";

export function registerHandlers() {
  registerWindowHandlers();
  registerProviderHandlers();
  registerPersistenceHandlers();
  registerTerminalHandlers();
  registerScmHandlers();
  registerFilesystemHandlers();
  registerLspHandlers();
}
