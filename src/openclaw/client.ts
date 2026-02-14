const BASE_URL = process.env.OPENCLAW_BASE_URL ?? "http://127.0.0.1:18789";
const TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";
const AGENT_ID = process.env.OPENCLAW_AGENT_ID ?? "main";
const SESSION_KEY_PREFIX = process.env.OPENCLAW_SESSION_KEY_PREFIX ?? "";

function generateSessionKey(): string {
  const uuid = crypto.randomUUID();
  return SESSION_KEY_PREFIX ? `${SESSION_KEY_PREFIX}${uuid}` : uuid;
}

function extractResponseText(body: unknown): string {
  const output = (body as { output?: unknown[] })?.output;
  if (!Array.isArray(output)) return "";

  const parts: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown[] })?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if ((part as { type?: string }).type === "output_text") {
        const text = (part as { text?: string }).text;
        if (typeof text === "string") parts.push(text);
      }
    }
  }
  return parts.join("");
}

export async function sendMessage(params: {
  message: string;
  sessionKey?: string;
}): Promise<{ response: string; sessionKey: string }> {
  const sessionKey = params.sessionKey ?? generateSessionKey();

  const res = await fetch(`${BASE_URL}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      "x-openclaw-agent-id": AGENT_ID,
    },
    body: JSON.stringify({
      model: "openclaw",
      input: params.message,
      user: sessionKey,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let err: Error;
    try {
      const parsed = JSON.parse(errBody) as { error?: { message?: string } };
      err = new Error(parsed?.error?.message ?? errBody);
    } catch {
      err = new Error(errBody || `HTTP ${res.status}`);
    }
    throw err;
  }

  const body = (await res.json()) as unknown;
  const response = extractResponseText(body);
  return { response, sessionKey };
}
