import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

const replacements = [
  {
    filePath: path.join(repoRoot, "node_modules/better-sqlite3/src/objects/statement.cpp"),
    from: "Statement* stmt = Unwrap<Statement>(info.This());",
    to: "Statement* stmt = Unwrap<Statement>(info.HolderV2());",
  },
  {
    filePath: path.join(repoRoot, "node_modules/better-sqlite3/src/objects/database.cpp"),
    from: "info.GetReturnValue().Set(Unwrap<Database>(info.This())->open);",
    to: "info.GetReturnValue().Set(Unwrap<Database>(info.HolderV2())->open);",
  },
  {
    filePath: path.join(repoRoot, "node_modules/better-sqlite3/src/objects/database.cpp"),
    from: "Database* db = Unwrap<Database>(info.This());",
    to: "Database* db = Unwrap<Database>(info.HolderV2());",
  },
];

for (const replacement of replacements) {
  const source = readFileSync(replacement.filePath, "utf8");
  if (source.includes(replacement.to)) {
    continue;
  }
  if (!source.includes(replacement.from)) {
    throw new Error(`Patch target not found in ${replacement.filePath}`);
  }
  writeFileSync(replacement.filePath, source.replace(replacement.from, replacement.to), "utf8");
}
