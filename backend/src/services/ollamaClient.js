// Minimal Ollama client (local Ollama or Ollama Cloud).
//   Local : OLLAMA_BASE_URL=http://127.0.0.1:11434   (no API key needed)
//   Cloud : OLLAMA_BASE_URL=https://ollama.com        + OLLAMA_API_KEY=<key from ollama.com/settings/keys>
//   Model : OLLAMA_MODEL (default qwen2.5:7b)
const baseUrl = () => (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
export const ollamaModel = () => process.env.OLLAMA_MODEL || "qwen2.5:7b";

// Provider switch (same function name so the rest of the code does not change):
//   LLM_PROVIDER=openai  -> any OpenAI-compatible local server (LM Studio, llama.cpp, Jan...):
//       LLM_BASE_URL=http://127.0.0.1:1234/v1   LLM_MODEL=<model name shown by the server>   (LLM_API_KEY optional)
//   otherwise            -> Ollama (above).
// Local models can be slow: default timeout is 5 minutes (LLM_TIMEOUT_MS to change).
const defaultTimeout = () => Number(process.env.LLM_TIMEOUT_MS) || 300000;

async function openAiChat({ system, prompt, format, timeoutMs }) {
  const base = (process.env.LLM_BASE_URL || "http://127.0.0.1:1234/v1").replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json" };
  if (process.env.LLM_API_KEY) headers.Authorization = `Bearer ${process.env.LLM_API_KEY}`;
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        ...(process.env.LLM_MODEL ? { model: process.env.LLM_MODEL } : {}),
        messages,
        stream: false,
        temperature: format ? 0 : 0.4,
        ...(format ? { response_format: { type: "json_schema", json_schema: { name: "report_intent", schema: format } } } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`LLM server ${res.status} ${res.statusText} ${body.slice(0, 300)}`.trim());
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("LLM server returned an empty answer.");
    return text;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("LLM server timed out.");
    if (error?.cause?.code === "ECONNREFUSED") throw new Error(`Cannot reach the LLM server at ${base} - is the local server started?`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function ollamaChat({ system, prompt, format, timeoutMs = defaultTimeout() }) {
  if (String(process.env.LLM_PROVIDER || "").toLowerCase() === "openai") {
    return openAiChat({ system, prompt, format, timeoutMs });
  }
  const headers = { "Content-Type": "application/json" };
  if (process.env.OLLAMA_API_KEY) headers.Authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}/api/chat`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: ollamaModel(),
        messages,
        stream: false,
        ...(format ? { format } : {}),
        options: { temperature: format ? 0 : 0.4 },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama ${res.status} ${res.statusText} ${body.slice(0, 300)}`.trim());
    }
    const data = await res.json();
    const text = data?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("Ollama returned an empty answer.");
    return text;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Ollama timed out.");
    if (error?.cause?.code === "ECONNREFUSED") throw new Error(`Cannot reach Ollama at ${baseUrl()} - is it running?`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Gemini schemas use upper-case types (OBJECT, STRING...). Ollama wants plain JSON Schema.
export function toJsonSchema(node) {
  if (Array.isArray(node)) return node.map(toJsonSchema);
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "type" && typeof value === "string") out.type = value.toLowerCase();
    else if (key === "nullable") continue;
    else out[key] = toJsonSchema(value);
  }
  return out;
}
