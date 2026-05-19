#!/usr/bin/env bash
# Convenience wrapper: run the MCP server without needing `pip install -e .`.
#
# Use this when:
#   - You only want to smoke-test the server.
#   - Your distro pip is too old for PEP 660 editable installs.
#   - You don't want a shell entry point on PATH.
#
# Set up once:
#   cd mcp
#   python3.13 -m venv .venv
#   source .venv/bin/activate
#   pip install -r requirements.txt
#
# Then run:
#   ./run.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONPATH="${HERE}/src:${PYTHONPATH:-}"
PY="${HERE}/.venv/bin/python"
[ -x "$PY" ] || PY="$(command -v python3 || command -v python)"
exec "$PY" -m offboard_mcp.server "$@"
