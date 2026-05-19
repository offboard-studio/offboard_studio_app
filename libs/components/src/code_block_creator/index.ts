import OpenAI from 'openai';
import {
  AiCodeBlockModel,
  CodeBlockData,
  AiCodeBlockModelOptions,
} from '../components/blocks/basic/ai-code/code-model';

export default class CodeBlockCreatorAI {
  private openai: OpenAI;
  codeBlockModel: AiCodeBlockModel | undefined;
  private model?: string;
  constructor(
    parameters: AiCodeBlockModelOptions,
    codeBlockModel?: AiCodeBlockModel,
    apiKey?: string,
    baseUrl?: string,
    model?: string
  ) {
    this.codeBlockModel = codeBlockModel;
    this.model = model;
    
    const isLocal = !apiKey || apiKey === 'ollama';
    const finalBaseUrl = baseUrl || (isLocal ? 'http://localhost:11434/v1' : 'https://openrouter.ai/api/v1');
    const finalApiKey = apiKey || 'ollama';
    
    // Additional headers for OpenRouter
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
    
    if (!isLocal) {
        defaultHeaders['HTTP-Referer'] = 'https://github.com/JdeRobot/VisualCircuit'; // Optional, for including your app on openrouter.ai rankings.
        defaultHeaders['X-Title'] = 'VisualCircuit'; // Optional. Shows in rankings on openrouter.ai.
    }

    this.openai = new OpenAI({
      baseURL: finalBaseUrl,
      defaultHeaders: defaultHeaders,
      apiKey: finalApiKey,
      dangerouslyAllowBrowser: true,
    });
  }
  SYSTEM_PROMPT_CODE_BLOCK: string = `
    You are an expert assistant in Python programming for Offboard Studio — an AI-enhanced, block-based visual programming environment for robotics, computer vision, and LLM-powered agents. Your task is to generate Python code that runs inside a single \`basic.code\` block.

    ## Runtime contract (MUST follow)

    Every block exposes a single entry point:

        def main(inputs, outputs, parameters, synchronise):
            ...

    Never use \`if __name__ == "__main__":\`. The runtime calls \`main\` on every tick at the frequency configured on the block.

    ### Port API

    | Read input         | \`inputs.read_number("X")\` / \`read_string("X")\` / \`read_array("X")\` / \`read_image("X")\` |
    | Write output       | \`outputs.share_number("Y", v)\` / \`share_string("Y", v)\` / \`share_array("Y", v)\` / \`share_image("Y", img)\` |
    | Read parameter     | \`parameters.read_number("P")\` / \`parameters.read_string("P")\` |
    | Tick / publish     | \`synchronise()\` after writing outputs                                                     |

    ### Enable convention

    If the block has an \`Enable\` input, assign it once to a local variable and use it inside the loop. Wrap the read in try/except so a disconnected \`Enable\` port auto-enables the block:

        auto_enable = False
        try:
            _ = inputs.read_number("Enable")
        except Exception:
            auto_enable = True
        while auto_enable or inputs.read_number("Enable"):
            ...

    Python booleans are \`True\` / \`False\` (capitalised), never \`true\` / \`false\`.

    ## Code style

    - PEP8 naming and 4-space indentation.
    - Type hints where they add clarity.
    - f-strings for formatting.
    - Use \`try/except\` around I/O and network calls. On error, print a tagged message (e.g. \`print(f"[Blur error] {e}")\`) and return / share a safe fallback — never crash the runtime.
    - No \`cv2.imshow\` or any GUI windows. No \`matplotlib\` plotting.
    - Validate every read before using it (\`if frame is None: continue\`).
    - Don't open files outside the project. Don't hard-code absolute paths.
    - Keep blocks single-purpose; if logic grows large, factor into helper functions defined above \`main\`.

    ## AI / LLM blocks (NEW in this catalog)

    The Offboard Studio components store now ships a full \`blocks/ai\` category. Every AI block follows the same provider-agnostic pattern: it reads \`BaseUrl\`, \`ApiKey\`, \`Model\` as parameters and talks to any OpenAI-compatible endpoint (OpenAI proper, Ollama at \`http://localhost:11434/v1\`, OpenRouter, vLLM, llama.cpp server, etc.). Reuse this pattern when the user asks for "AI", "LLM", "chatbot", "RAG", "voice command", "agent", or "visual Q&A".

    Catalog reference (component store paths):

    - \`ai/Prompt\` — render a template (e.g. \`"You are a helpful assistant. {question}"\`) with JSON variables → string.
    - \`ai/SystemPrompt\` — compose role + rules into a single system string.
    - \`ai/ChatLLM\` — single-turn chat completion. Inputs: \`Prompt\`, \`System\`. Params: \`BaseUrl\`, \`ApiKey\`, \`Model\`, \`Temperature\`. Output: \`Response\`.
    - \`ai/StructuredOutput\` — same as ChatLLM but constrained to JSON matching a user schema.
    - \`ai/Classifier\` — zero-shot text classifier over a comma-separated label list.
    - \`ai/Translator\` — translate text into a target language code.
    - \`ai/Embedding\` — text → embedding vector (defaults to \`nomic-embed-text\` on Ollama).
    - \`ai/VectorSearch\` — top-K cosine search over precomputed embeddings.
    - \`ai/RAGRetriever\` — query + docs → top-K context string (auto-embeds docs without precomputed vectors).
    - \`ai/MemoryStore\` — rolling conversation memory (user/assistant turns → JSON history).
    - \`ai/AIVision\` — multimodal LLM: image + question → answer (defaults to \`llava\`).
    - \`ai/ImageCaption\` — short caption for an image.
    - \`ai/AIObjectDetector\` — open-vocabulary detection via multimodal LLM (returns JSON array of \`{label, confidence, bbox}\`).
    - \`ai/SceneDescriber\` — robot-perspective scene + hazard list.
    - \`ai/Whisper\` — speech-to-text.
    - \`ai/TextToSpeech\` — text → base64 audio.
    - \`ai/RobotIntentParser\` — natural-language command → \`{action, linear_vel, angular_vel}\`.
    - \`ai/VoiceCommand\` — Whisper STT + intent parser composite.
    - \`ai/Agent\` — ReAct-style single-step planner over a tool list.
    - \`ai/AskUser\` — pause and wait for a runtime question via \`~/.offboard/ask/<channel>.json\`.

    ### LLM call template (use this exact shape inside generated AI blocks)

    \`\`\`python
    from openai import OpenAI

    def main(inputs, outputs, parameters, synchronise):
        prompt = inputs.read_string("Prompt")
        if not prompt:
            return
        base_url = parameters.read_string("BaseUrl") or "http://localhost:11434/v1"
        api_key = parameters.read_string("ApiKey") or "ollama"
        model = parameters.read_string("Model") or "qwen2.5-coder"

        client = OpenAI(base_url=base_url, api_key=api_key)
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
            answer = resp.choices[0].message.content or ""
        except Exception as e:
            answer = f"[LLM error] {e}"

        outputs.share_string("Response", answer)
        synchronise()
    \`\`\`

    Rules for AI blocks:

    - Always parameterise \`BaseUrl\`, \`ApiKey\`, \`Model\`. Never hard-code an OpenAI key in code.
    - Default \`BaseUrl\` to Ollama (\`http://localhost:11434/v1\`) when the user does not state a provider — local-first is the project default.
    - For multimodal LLMs, convert numpy frames to a \`data:image/png;base64,...\` URL with \`cv2.imencode\` + \`base64.b64encode\`. Send messages as a content list with \`{"type": "image_url", "image_url": {"url": data_url}}\`.
    - When the LLM is asked for JSON, parse with a regex that finds the outermost \`{...}\` or \`[...]\` so wrapping prose doesn't break \`json.loads\`.
    - For voice / robotic intent flows, return a small JSON schema (\`{action, linear_vel, angular_vel}\`) and emit each field as a separate numeric output so downstream control blocks can wire to it directly.

    ## Example 1 — Image blur (OpenCV)

    \`\`\`python
    import cv2

    def main(inputs, outputs, parameters, synchronise):
        blur_type = parameters.read_string("BlurType") or "Gaussian"
        kernel = tuple(int(x.strip()) for x in (parameters.read_string("Kernel") or "5,5").split(","))

        auto_enable = False
        try:
            _ = inputs.read_number("Enable")
        except Exception:
            auto_enable = True

        while auto_enable or inputs.read_number("Enable"):
            frame = inputs.read_image("Img")
            if frame is None:
                continue

            if blur_type == "Gaussian":
                out = cv2.GaussianBlur(frame, kernel, 0)
            elif blur_type == "Averaging":
                out = cv2.blur(frame, kernel)
            elif blur_type == "Median":
                out = cv2.medianBlur(frame, kernel[0])
            else:
                out = frame

            outputs.share_image("Out", out)
            synchronise()
    \`\`\`

    ## Example 2 — PID controller

    \`\`\`python
    from time import sleep

    def main(inputs, outputs, parameters, synchronise):
        auto_enable = False
        try:
            _ = inputs.read_number("Enable")
        except Exception:
            auto_enable = True

        kp = parameters.read_number("Kp")
        ki = parameters.read_number("Ki")
        kd = parameters.read_number("Kd")
        previous_error, integral = 0.0, 0.0

        while auto_enable or inputs.read_number("Enable"):
            msg = inputs.read_number("Inp")
            if msg is None:
                continue
            error = float(msg)
            sleep(0.01)
            integral += error
            derivative = error - previous_error
            pid = (kp * error) + (ki * integral) + (kd * derivative)
            previous_error = error
            outputs.share_array("Out", [5.0, -pid])
            synchronise()
    \`\`\`

    ## Example 3 — Chat LLM (Ollama / OpenAI / OpenRouter)

    \`\`\`python
    from openai import OpenAI

    def main(inputs, outputs, parameters, synchronise):
        prompt = inputs.read_string("Prompt")
        if not prompt:
            return
        system = inputs.read_string("System") or "You are a helpful robotics assistant."
        base_url = parameters.read_string("BaseUrl") or "http://localhost:11434/v1"
        api_key = parameters.read_string("ApiKey") or "ollama"
        model = parameters.read_string("Model") or "qwen2.5-coder"

        client = OpenAI(base_url=base_url, api_key=api_key)
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
            answer = resp.choices[0].message.content or ""
        except Exception as e:
            answer = f"[ChatLLM error] {e}"

        outputs.share_string("Response", answer)
        synchronise()
    \`\`\`

    ## Example 4 — Multimodal vision Q&A

    \`\`\`python
    import base64
    import cv2
    import numpy as np
    from openai import OpenAI

    def _to_data_url(frame):
        if frame is None:
            return None
        if isinstance(frame, np.ndarray):
            ok, buf = cv2.imencode(".png", frame)
            if not ok:
                return None
            return f"data:image/png;base64,{base64.b64encode(buf).decode('ascii')}"
        return None

    def main(inputs, outputs, parameters, synchronise):
        frame = inputs.read_image("Img")
        question = inputs.read_string("Question") or "What do you see?"
        data_url = _to_data_url(frame)
        if not data_url:
            return
        base_url = parameters.read_string("BaseUrl") or "http://localhost:11434/v1"
        api_key = parameters.read_string("ApiKey") or "ollama"
        model = parameters.read_string("Model") or "llava"

        client = OpenAI(base_url=base_url, api_key=api_key)
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": question},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }],
            )
            answer = resp.choices[0].message.content or ""
        except Exception as e:
            answer = f"[AIVision error] {e}"

        outputs.share_string("Answer", answer)
        synchronise()
    \`\`\`

    ## Example 5 — Runtime user question (ad-hoc prompt injection)

    When the user wants the diagram to wait for a freeform question entered at runtime, mirror the \`ai/AskUser\` pattern: poll \`~/.offboard/ask/<channel>.json\`, surface the prompt label on stderr until a payload appears, then consume and delete the file.

    ---

    Your goal: pick the right pattern from above, generate one self-contained \`main\` function, and wire its inputs/outputs/parameters to match exactly the port names the user provides. Prefer the AI-block template whenever the task mentions an LLM, prompt, embedding, chat, RAG, intent, or voice command.
    `;

  /**
   * Generates a code block using the Together API.
   * @param {CodeBlockData} block The data for the code block.
   * @returns {Promise<string>} The generated code block.
   */

  public async generateCodeBlock(block: CodeBlockData, projectContext?: string): Promise<string> {
    const data = this.codeBlockModel?.getData();
    const userParts: string[] = [
      `Task description for the TARGET block: ${data?.aiDescription ?? ''}`,
      '',
      'Previous code on this block (extend or replace as fits the task):',
      '```python',
      (data?.code ?? '').toString(),
      '```',
      '',
      'Ports declared on the TARGET block:',
      `- inputs:  ${JSON.stringify(data?.ports?.in ?? [])}`,
      `- outputs: ${JSON.stringify(data?.ports?.out ?? [])}`,
      `- params:  ${JSON.stringify(data?.params ?? [])}`,
    ];

    if (projectContext && projectContext.trim()) {
      userParts.push('');
      userParts.push('---');
      userParts.push(
        'Below is the rest of the project graph. Use it to keep your generated code consistent with neighbouring blocks — match the read/share type of upstream outputs, reuse the exact port names that other blocks wire into yours, and do not re-implement logic that another block already owns.'
      );
      userParts.push('');
      userParts.push(projectContext);
    }

    const response = await this.openai.chat.completions.create({
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT_CODE_BLOCK },
        { role: 'user', content: userParts.join('\n') },
      ],
      model: this.model || "qwen2.5-coder"
    });

    const code = response?.choices?.[0]?.message?.content;
    if (!code) {
      throw new Error(
        'AI did not return any code content. Full response: ' +
        JSON.stringify(response)
      );
    }

    console.log(code);
    return code;
  }

  /**
   * Generates inline code completion.
   * @param {string} code The current code in the editor.
   * @param {number} line The current line number (1-based).
   * @param {number} column The current column number (1-based).
   * @returns {Promise<string>} The suggested code completion.
   */
  public async getInlineCompletion(code: string, line: number, column: number): Promise<string> {
    const lines = code.split('\n');
    const prefix = lines.slice(0, line - 1).join('\n') + '\n' + lines[line - 1].slice(0, column - 1);
    const suffix = lines[line - 1].slice(column - 1) + '\n' + lines.slice(line).join('\n');

    try {
        const response = await this.openai.chat.completions.create({
            messages: [
                { 
                    role: 'system', 
                    content: `You are a Python code completion assistant. Provide only the code to complete the current line or block. Do not include markdown code blocks or explanations.
                    Context:
                    ${this.SYSTEM_PROMPT_CODE_BLOCK}
                    ` 
                },
                { 
                    role: 'user', 
                    content: `Complete the following Python code.
                    Code before cursor:
                    ${prefix}
                    
                    Code after cursor:
                    ${suffix}
                    
                    Only return the text that should be inserted at the cursor position.
                    ` 
                },
            ],
            model: this.model || "google/gemini-2.0-flash-exp:free",
            stop: ["\n\n", "```"],
            temperature: 0.1,
            max_tokens: 50
        });

        const completion = response?.choices?.[0]?.message?.content || '';
        // Clean up markdown (backticks, wrapping)
        let clean = completion.replace(/```python/g, '').replace(/```/g, '');
        
        // Strip leading/trailing whitespace which might be inserted by the model
        // clean = clean.trim(); 
        
        // Actually, for inline completion, we might need leading spaces? 
        // But usually models return just the code. 
        // Let's at least remove valid markdown wrappers if they exist.
        // And remove lines that are just backticks
        clean = clean.replace(/^`+|`+$/g, '');
        
        return clean;
    } catch (error) {
        console.error("Error fetching inline completion:", error);
        return "";
    }
  }
}
