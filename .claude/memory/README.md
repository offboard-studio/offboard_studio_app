# Memory

Per-project Claude Code memory, versioned in git so the entire team
shares the same context.

`MEMORY.md` is the always-loaded index (≤200 lines). The other markdown
files are loaded on demand based on relevance.

## How it works

Claude Code auto-loads memory from a per-project directory it derives
from the repo's absolute path. We make that auto-load directory a
symlink that points back into this folder:

```
$HOME/.claude/projects/<derived-key>/memory  →  <repo>/.claude/memory
```

So files live in the repo (committed, team-shared), and Claude Code
still finds them transparently.

## First-time setup on a new machine

After cloning, from the repo root run:

```sh
./.claude/setup-memory.sh
```

That's it. The script derives the correct projects-dir key from
`$(pwd)`, so it works no matter where the repo is cloned or who runs
it. It's idempotent — safe to re-run after changing machines / paths.

## File types

- `feedback_*.md` — durable guidance about how to work in this project
  (corrections, validated approaches). Always includes Why + How to apply.
- `reference_*.md` — pointers / facts about external systems or layered
  invariants that aren't obvious from the code itself.
- `project_*.md` — temporary state about ongoing initiatives / deadlines.
- `user_*.md` — facts about the user's role and preferences.

## Rules

- No absolute home-directory paths — files are shared. Use repo-
  relative paths. See `feedback_no_local_paths_in_shared_artifacts.md`.
- Keep `MEMORY.md` to one-line entries: `- [Title](file.md) — hook`.
- Delete or update memories that turn out wrong. Don't accumulate cruft.
