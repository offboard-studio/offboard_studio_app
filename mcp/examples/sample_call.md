# Example MCP conversations

Once the server is registered, an LLM client can call its tools by name.
Here are the prompts/calls a model would make to recreate the
`python_deneme/ollama10*` outputs.

## 1. Single node

Tool: `create_node`
```json
{
  "name": "Camera Capture",
  "description": "Reads frames from /dev/video0",
  "outputs": ["Image"],
  "parameters": [{"name": "fps", "default": 30}],
  "code": "def main(inputs, outputs, parameters, synchronise):\n    outputs['Image'] = capture()\n"
}
```

## 2. Whole architecture from a node list (auto-wired)

Tool: `create_architecture`
```json
{
  "project_name": "RRR Arm Demo",
  "nodes": [
    { "name": "Camera Capture",     "outputs": ["Image"] },
    { "name": "ArUco Detector",     "inputs": ["Image"], "outputs": ["Pose"] },
    { "name": "Trajectory Planner", "inputs": ["Pose"],  "outputs": ["Joints"] },
    { "name": "RRR Driver",         "inputs": ["Joints"] }
  ]
}
```
The server wires `Image → Image`, `Pose → Pose`, `Joints → Joints` automatically.

## 3. Hierarchical (node-in-node)

Tool: `nest_nodes` — collapse the planner stack into a single reusable block.
```json
{
  "package_name": "ArUco Planner",
  "inner_nodes": [
    { "name": "ArUco Detector",     "inputs": ["Image"], "outputs": ["Pose"] },
    { "name": "Trajectory Planner", "inputs": ["Pose"],  "outputs": ["Joints"] }
  ]
}
```
Returns one outer node with ports `Image (in)` and `Joints (out)`, plus the
inner architecture that the package expands to.

## 4. Backend AI shortcut

Tool: `generate_with_backend_ai`
```json
{
  "prompt": "Build a ROS2 application that controls an RRR robot arm with vision.",
  "include_catalog": true
}
```
Forwards to Django `/api/v1/ai/generate-architecture`. Server-side it walks
through `ai_service` provider abstraction (Anthropic / OpenAI / Ollama) and
returns the same shape `create_architecture` returns.

## 4.5. Context-aware planning (recommended)

Tool: `assist_project_request` — gathers the running app's live state
(current architecture, block catalog, available AI providers) and threads
it through the Django backend AI before pushing the result.

```json
{
  "prompt": "Add an obstacle-avoidance layer on top of the current arm controller. Reuse the existing camera feed if it's already wired."
}
```

By default `auto_push: true`, so the new architecture appears in the
renderer in one step. To inspect first set `auto_push: false`.

Manual two-step variant — useful when the user is iterating:

1. Tool `gather_project_context` → returns the snapshot.
2. Tool `create_architecture` (or `generate_with_backend_ai`) using that
   snapshot to inform your NodeSpec list.
3. Tool `push_to_app` to send it in.

## 5. Live push into the running app

Tool: `push_to_app` — send the bundle to the NestJS API that runs inside the
Electron app, which then broadcasts it over Socket.IO to the renderer. The
graph appears in the editor without any user action.

```json
{
  "architecture": { ... output of create_architecture ... },
  "source": "claude-code-session-42"
}
```

Requires the desktop app to be running (so `http://localhost:3333/api` is
reachable). On success the response is `{ "ok": true, "status": 202, ... }`.

## 6. Save to disk for File → Open

Tool: `save_architecture`
```json
{
  "architecture": { ... output of create_architecture ... },
  "filename": "rrr_arm_demo.json"
}
```
Renderer's **File → Open** can load the resulting file directly.
