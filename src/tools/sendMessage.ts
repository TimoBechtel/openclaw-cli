import * as z from 'zod/v4';
import { sendMessage as sendToOpenClaw } from '../openclaw/client';

const ALIAS = process.env.OPENCLAW_ALIAS ?? 'OpenClaw';

export function buildToolDescription(): string {
	return `Use this tool when the user says to ask ${ALIAS}, tell ${ALIAS}, message ${ALIAS}, or similar. The user is explicitly requesting to communicate with ${ALIAS}.

**Sessions**: Pass the same sessionKey on every call to continue a conversation; ${ALIAS} remembers within a session. First call: omit sessionKey (one is returned). Later calls: pass the returned sessionKey.

**Context**: ${ALIAS} has no memory between sessions. When starting fresh or omitting sessionKey, include in the message: the user's question, relevant code, file paths, and any other context ${ALIAS} needs.`;
}

export const sendMessageToolConfig = {
	description: buildToolDescription(),
	inputSchema: {
		message: z
			.string()
			.describe(
				'The message to send. When continuing a session, the message can be brief; when starting fresh or stateless, include full context.'
			),
		sessionKey: z
			.string()
			.optional()
			.describe(
				"Session key from a previous call's response. Omit to start a new session (a new key will be generated and returned)."
			),
	},
};

export async function handleSendMessage(args: {
	message: string;
	sessionKey?: string;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
	const { response, sessionKey } = await sendToOpenClaw(args);
	const text = JSON.stringify({ response, sessionKey }, null, 2);
	return { content: [{ type: 'text' as const, text }] };
}
