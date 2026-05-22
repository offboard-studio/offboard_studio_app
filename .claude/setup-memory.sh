#!/usr/bin/env bash
# Wires the in-repo memory dir into Claude Code's per-project auto-load path.
#
# Idempotent — safe to re-run. Works no matter where the repo is cloned,
# which user runs it, or which OS (macOS / Linux). No paths hard-coded.
#
# Usage:
#   ./.claude/setup-memory.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_MEMORY="$REPO_ROOT/.claude/memory"

if [ ! -d "$REPO_MEMORY" ]; then
  echo "✗ No .claude/memory directory in this repo. Run from a clone that ships with one." >&2
  exit 1
fi

# Claude Code derives the projects-dir key from the absolute repo path
# by replacing every non-alphanumeric character with "-". We compute the
# same key from $(pwd) so this works for any clone location and any user.
PROJECTS_KEY="$(printf '%s' "$REPO_ROOT" | sed 's/[^a-zA-Z0-9]/-/g')"
PROJECTS_DIR="$HOME/.claude/projects/${PROJECTS_KEY}"
LINK="$PROJECTS_DIR/memory"

mkdir -p "$PROJECTS_DIR"

# If something else is already there, only replace it if it's a stale
# symlink or empty directory. Don't blow away real content.
if [ -L "$LINK" ]; then
  rm "$LINK"
elif [ -d "$LINK" ]; then
  if [ -z "$(ls -A "$LINK" 2>/dev/null)" ]; then
    rmdir "$LINK"
  else
    echo "✗ $LINK already exists with content. Move or merge it manually, then re-run." >&2
    exit 1
  fi
elif [ -e "$LINK" ]; then
  echo "✗ $LINK exists and isn't a directory or symlink. Inspect it manually." >&2
  exit 1
fi

ln -s "$REPO_MEMORY" "$LINK"
echo "✓ linked $LINK → $REPO_MEMORY"
