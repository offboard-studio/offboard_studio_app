---
name: Start a new MCP project when the topic shifts
description: When the user asks for a robotics project that is unrelated to the current canvas, wipe the accumulator and update project settings before adding nodes — don't pile new pipelines onto an old domain.
type: feedback
originSessionId: e3b14804-ed89-4166-aa6b-197d66d10f2d
---
When the user requests a *new* project type (e.g. USV after a wheeled robot, an LLM robot after USV, a robot arm after an LLM robot), do NOT accumulate the new nodes onto the existing canvas. Start fresh: clear the accumulator + outer canvas, push fresh project settings, then build.

**Why:** The user said "eski board üzerinden devam ediyor, konudan bağımsız başka bir soru sorulduğunda yeni proje oluştursun." Old domains piling up makes the canvas unreadable and forces a manual cleanup pass before each new build. They explicitly want the topic transition to trigger a reset.

**How to apply:**
- If the new request is about a clearly different domain or platform (drone vs USV vs arm vs LLM bot), call `start_new_project` first.
- If the request says "ekle", "bağla", "bunu değiştir", "buna ek olarak", treat it as a continuation and *do not* wipe — keep building on the current canvas.
- When in doubt, ask in one short line: "Mevcut canvas üzerine mi ekleyeyim, yoksa yeni proje mi?"
- `start_new_project` in the MCP server: fetches every node id from `/api/architecture/state`, surgical-removes them via `/api/architecture/remove-nodes`, then updates project settings. One call replaces the manual "list ids → delete_nodes → update_project_settings" choreography we kept repeating.
