import { z } from "zod";

const BASE_URL = process.env.OPENCLAW_BASE_URL ?? "http://127.0.0.1:18789";
const TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";
const AGENT_ID = process.env.OPENCLAW_AGENT_ID ?? "main";
const SESSION_KEY_PREFIX = process.env.OPENCLAW_SESSION_KEY_PREFIX ?? "";

function generateSessionKey(): string {
  const uuid = crypto.randomUUID();
  return SESSION_KEY_PREFIX ? `${SESSION_KEY_PREFIX}${uuid}` : uuid;
}

// Zod schemas for response validation
const OutputTextPartSchema = z.object({
  type: z.literal("output_text"),
  text: z.string(),
});

const ContentItemSchema = z.object({
  content: z.array(OutputTextPartSchema).optional(),
});

const ResponseBodySchema = z.object({
  output: z.array(ContentItemSchema).optional(),
});

function extractResponseText(body: unknown): string {
  const result = ResponseBodySchema.safeParse(body);
  if (!result.success) return "";

  const parts: string[] = [];
  for (const item of result.data.output ?? []) {
    for (const part of item.content ?? []) {
      parts.push(part.text);
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
