# Offboard Studio Architecture Docs

Living documentation of the codebase, written for both humans and automated
audits. The `audit-and-fix` routine (`.claude/routines/audit-and-fix.md`)
reads `gaps.md` on every run and tries to close the highest-priority gap.

## Files

| File | What it covers |
|---|---|
| `overview.md` | Three-process model, library boundaries, build pipeline |
| `mcp.md` | MCP server: tools, build helpers, push/delete pipelines |
| `api.md` | NestJS API: architecture module, endpoints, accumulator |
| `renderer.md` | React renderer: bridge polling, react-diagrams, package widget |
| `gaps.md` | Machine-readable known-gaps list (the routine's worklist) |

## How to use

- **Reading:** start with `overview.md`, then drop into the layer doc you
  need. `gaps.md` is the canonical source of truth for what's broken.
- **Updating gaps:** when something gets fixed, the routine (or a human)
  flips the entry's `status:` from `open` to `done` and appends a one-line
  resolution note with the commit/PR.
- **New gaps:** append at the bottom of `gaps.md` with a new id. Don't
  renumber existing entries — the routine treats ids as stable.

## Out of scope (intentionally)

- File-by-file reference. The codebase changes faster than docs would; use
  `grep` / Read instead. These docs explain the *invariants*, not the
  individual files.
- The Python Django sidecar (`board_api/`). It lives outside this repo and
  is only contacted over HTTP — see `mcp.md` for the endpoints we hit.
