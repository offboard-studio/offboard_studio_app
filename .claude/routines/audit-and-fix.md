# Routine: audit-and-fix

Source-of-truth prompt for the scheduled `audit-and-fix` agent. The
schedule entry references this file by content — keep the prompt block
below in sync with what was registered.

## Cadence

`0 6 * * *` UTC = 09:00 Europe/Istanbul, once daily. Tweak via the
`schedule` skill (`/schedule list` for the id, `/schedule update ...`) —
editing this file alone won't change the registered routine.

## Prompt (verbatim — what gets sent to the scheduled agent)

The prompt below is path-agnostic. The remote agent receives a fresh
clone of `github.com/offboardstudio/offboard_studio_app` and runs from
that working tree root — DO NOT hard-code local user paths here.

```
You are running the audit-and-fix routine for the Offboard Studio repo
(github.com/offboardstudio/offboard_studio_app), checked out at your
current working directory. Stay at the repo root for everything below.

Your job is to find ONE concrete gap in
`.claude/architecture/gaps.md`, implement the fix, and open a PR.

SETUP
- Confirm `package.json`, `apps/`, `libs/`, `mcp/`, and `.claude/` are
  all present at the cwd. If not, exit with a one-line note — you're
  not at the repo root.
- `git fetch && git status` to confirm a clean tree. If there are
  uncommitted changes, abort cleanly.
- `npm install` only if `node_modules/` is missing.

PROCESS
1. Read `.claude/architecture/README.md`, `overview.md`, then the
   layer doc relevant to the gap you pick (`mcp.md` / `api.md` /
   `renderer.md`). DO NOT skip these — the docs encode invariants the
   tests don't.
2. Read `.claude/architecture/gaps.md`. Pick the lowest-numbered entry
   with `status: open` and the highest priority (high > medium > low).
   Skip entries with status `blocked` or `in-progress`.
3. Create a branch: `chore/gap-G-XX-<slug>` off the current default
   branch.
4. Implement the fix following the entry's `acceptance:` and `hints:`.
   Keep the change scoped to the one gap.
5. Validate (only the relevant ones for what you touched):
   - `npx tsc --noEmit -p apps/api/tsconfig.app.json` if `apps/api/`.
   - `npx tsc --noEmit -p libs/components/tsconfig.lib.json` if
     `libs/components/`.
   - If you touched MCP: from `mcp/`, set up once if missing —
     `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
     — then `PYTHONPATH=src .venv/bin/python -c "import asyncio
     ; from offboard_mcp.server import list_tools
     ; print(len(asyncio.run(list_tools())))"`.
   - `npm run lint:all` if you touched TS sources broadly.
6. Update `.claude/architecture/gaps.md`: flip the entry to
   `status: done` and append a one-line resolution
   (`resolved: <branch-name> — <one-sentence summary>`).
7. Commit, push the branch, open a PR via `gh pr create` with a body
   that quotes the gap entry verbatim and links to the validation
   output.
8. If the fix gets stuck (compile failures you can't resolve in
   reasonable time, missing context, downstream API not reachable),
   flip the gap to `status: blocked` with a one-line reason and exit
   cleanly. Don't open a half-done PR.

CONSTRAINTS
- Touch only files explicitly required by the gap. No drive-by cleanup.
- Don't push to `new_master`, `nestjs_release`, or `main`.
- Don't run destructive git commands (reset --hard, push --force,
  branch -D) without an explicit instruction in the gap entry.
- Don't commit secrets — if you touch `.env*`, double-check.
- If `gaps.md` has zero open entries: exit with a one-line message and
  do not create a PR.

OUTPUT (under ~250 words)
- Gap id and one-sentence description.
- Files changed (paths only).
- PR link.
- Anything you flagged as `blocked` for next cycle.
```

## Updating the routine

To change cadence, prompt, or constraints:
1. Edit this file.
2. Invoke the `schedule` skill: `/schedule update <id>` and paste the
   new prompt.
3. Commit the file change alongside any prompt updates so the repo
   stays the source of truth.
