---
name: Never hard-code local user paths in shared artifacts
description: Prompts that ship to remote agents, docs checked into the repo, and any `.claude/`-versioned files must use repo-relative paths or "the repo root" — never embed any developer's home directory.
type: feedback
---
When writing content that lives outside the current developer's machine
(scheduled-agent prompts, `.claude/routines/*`, `.claude/architecture/*`,
PR templates, anything that someone else or a cloud sandbox will read)
do NOT embed an absolute home-dir path. Use "the repo root" or
repo-relative paths. The repo can be cloned anywhere on any developer's
machine — assumptions about its location break instructions for everyone
but the original author.

**Why:** The user caught a hard-coded home path in
`.claude/routines/audit-and-fix.md`. Remote agents get a fresh clone
under a sandbox-controlled directory; that path doesn't exist there.
Files under `.claude/` are checked into git — any collaborator on a
different machine sees broken instructions. Even setup scripts in this
repo derive paths dynamically (`$(pwd)`, `$HOME`, `whoami`) instead of
hard-coding.

**How to apply:**
- In agent prompts say "the working tree root" or "the cloned repo" and
  let the agent infer the cwd.
- In docs use repo-relative paths (`apps/api/...`, `mcp/...`,
  `libs/components/...`).
- Memory for this project now lives in `<repo>/.claude/memory/`
  (versioned in git, shared across machines / collaborators). The
  system auto-load path `~/.claude/projects/.../memory/` is a symlink
  pointing into the repo. Treat memory entries as team-shared content
  — same no-absolute-paths rule applies as for routine prompts.
- Bash commands in conversational reply text MAY use the absolute path
  (the user runs them locally), but commands that get baked into a
  script or routine prompt must be relative.
