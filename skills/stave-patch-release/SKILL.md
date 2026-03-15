---
name: stave-patch-release
description: Release workflow for the Stave repository that bumps the patch version, generates release notes with `conventional-changelog`, stages the full current worktree, creates or amends the release commit, creates the matching semver tag, and pushes the result to both `origin` and `public`. Use when the user asks to ship the current Stave changes, cut the next patch release, amend a just-pushed release, or sync the same Stave release commit and tag to both remotes.
---

# Stave Patch Release

Repository-local copy of the Stave release skill.

Use this skill for patch releases in `/home/astyfx/stave`.

Read `references/stave-release-checklist.md` when you need the exact repo facts, commit shape, or push sequence.

## Workflow

1. Confirm the task is a Stave patch release.
   - Work in `/home/astyfx/stave`.
   - Treat the full current worktree as the default release scope unless the user explicitly narrows it.
   - Load the current version from `package.json` before changing anything.

2. Inspect the release state before editing.
   - Check `git status --short` to see what will ship.
   - Check `git remote -v` and verify both `origin` and `public` exist.
   - Check for existing semver tags in `vX.Y.Z` form. Incremental `conventional-changelog` generation depends on them.
   - Check the latest commit if the user asks to amend or repair an in-flight release.

3. Bump only the patch version.
   - Increment `package.json` from `x.y.z` to `x.y.(z+1)`.
   - If the worktree already contains the intended release version, do not bump twice.
   - Update any user-facing docs that changed as part of the shipped work.

4. Generate release notes.
   - Use `bunx --bun conventional-changelog-cli -p conventionalcommits -i CHANGELOG.md -s`.
   - After generation, inspect the new top release section. If it is empty, heading-only, or otherwise missing meaningful bullets, automatically append a concise 3-7 bullet release summary derived from the actual release scope.
   - Build that summary from the current shipped diff, not guesswork. Use signals such as `git diff --stat <previous-tag>..HEAD`, `git diff --name-only <previous-tag>..HEAD`, changed docs, and verification results to identify the real user-visible or architecture-significant changes.
   - Summaries should be outcome-focused. Group by shipped behavior, architecture, or UX changes rather than file-by-file inventories.
   - Update `README.md` and any other release-facing docs that changed as part of the shipped behavior before finalizing the release summary so the docs and changelog stay aligned.
   - Do not hand-write the entire release section unless the user explicitly asks for manual cleanup after generation. The allowed fallback here is a small post-generation bullet summary under the generated version heading.
   - If the repo has no prior semver tag, stop and explain that a baseline `vX.Y.Z` tag is required before incremental changelog generation is safe.
   - Review the generated notes and auto-added summary bullets before commit.

5. Verify before commit.
   - Run `bun run typecheck` at minimum.
   - Run focused tests for changed areas.
   - Run broader test coverage when the change scope justifies it.
   - Report any verification you could not run.

6. Commit the release.
   - Stage the full current worktree with `git add -A`.
   - Use a Conventional Commit: `chore: release x.y.z`.
   - If the user wants to fold new changes into the most recent release commit, amend that commit instead of creating a second release commit.
   - If you encounter a non-Conventional release commit, fix it before pushing anything else.

7. Tag the release.
   - Create the matching annotated semver tag `vX.Y.Z` on the release commit.
   - Keep the tag name aligned with the released `package.json` version.
   - If the release was already tagged and the user now wants to amend it, stop and confirm before moving an existing tag.

8. Push the same commit and tag to both remotes.
   - Push the branch tip to `origin` and `public`.
   - Push the matching `vX.Y.Z` tag to both remotes.
   - If the release commit was amended after either remote already had the previous branch tip, use `--force-with-lease` for both branch pushes.
   - Do not rewrite an already-pushed release tag unless the user explicitly asks for that repair.
   - Keep both remotes on the same branch and tag state after the release.

9. Report the outcome.
   - State the new version.
   - State the release commit hash and message.
   - State the release tag.
   - State which verification commands ran.
   - State whether each branch push was normal or force-with-lease.

## Guardrails

- Do not guess a reduced commit scope. This workflow defaults to shipping all current changes.
- Do not create a non-Conventional commit.
- Do not hand-write release notes when `conventional-changelog` is the required path.
- Do not push only one remote unless the user explicitly asks for a partial push or one remote fails.
- Do not silently skip generated changelog review or release-facing doc updates when shipped behavior changed.
- Do not bump the version twice if the worktree already reflects the intended release.
