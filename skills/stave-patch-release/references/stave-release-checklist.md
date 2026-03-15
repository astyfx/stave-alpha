# Stave Release Checklist

## Repo Facts

- Repository root: `/home/astyfx/stave`
- Default branch: `main`
- Required remotes:
  - `origin` -> `git@github.com:astyfx/stave.git`
  - `public` -> `git@github.com:astyfx/stave-alpha.git`
- Version source: root `package.json`
- Release notes file: root `CHANGELOG.md`
- Release notes generator: `bunx --bun conventional-changelog-cli -p conventionalcommits -i CHANGELOG.md -s`
- Incremental changelog prerequisite: semver git tags in `vX.Y.Z` form
- Expected release commit message: `chore: release x.y.z`
- Expected release tag: `vX.Y.Z`

## Patch Release Sequence

1. Read the current version from `package.json`.
2. Inspect the full release scope with `git status --short`.
3. Verify both remotes with `git remote -v`.
4. Check for an existing prior semver tag in `vX.Y.Z` form.
5. Bump only the patch component in `package.json`.
6. Generate or refresh `CHANGELOG.md` with:

```bash
bunx --bun conventional-changelog-cli -p conventionalcommits -i CHANGELOG.md -s
```

7. Inspect the newly generated top release section.
8. If that section is missing meaningful bullets, automatically append a concise 3-7 bullet summary derived from the actual release scope:
   - compare against the previous semver tag
   - use `git diff --stat`, changed-path inspection, and verification output
   - summarize user-visible or architecture-significant outcomes, not file lists
9. Update `README.md` plus any other release-facing docs that changed as part of the shipped behavior, and make sure the changelog bullets match those docs.
10. Run verification:
   - minimum: `bun run typecheck`
   - then focused tests for the touched area
   - use broader commands such as `bun test` or `bun run test:ci` when the scope is broad enough to justify them
11. Stage everything with `git add -A`.
12. Commit or amend with a Conventional Commit:

```bash
git commit -m "chore: release x.y.z"
```

13. Create the matching annotated tag:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
```

14. Push the same branch tip to both remotes:

```bash
git push origin main
git push public main
```

15. Push the tag to both remotes:

```bash
git push origin vX.Y.Z
git push public vX.Y.Z
```

## Repair Rules

- If the repo has no prior semver tags, stop and ask whether to bootstrap from the last shipped release before using incremental `conventional-changelog`.
- If `package.json` already has the intended new version, continue from that state instead of incrementing again.
- If `conventional-changelog` output needs formatting cleanup, make the smallest explicit post-generation fix instead of hand-writing the whole release section.
- If the latest release commit exists but missed files, amend it and keep the final message `chore: release x.y.z`.
- If the release tag already exists on a remote, stop and confirm before rewriting it.
- If either `origin` or `public` is missing, stop and report the missing remote before committing.
- If verification fails, stop and surface the failure unless the user explicitly accepts releasing anyway.
