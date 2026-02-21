#!/usr/bin/env bun

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sendMessage } from "./openclaw/client.js";
import { runMcpServer } from "./mcp/server.js";

const VERSION = process.env.npm_package_version ?? "0.0.0";
const execFileAsync = promisify(execFile);

function printHelp(): void {
  console.log(`openclaw-cli ${VERSION}

Usage:
  openclaw-cli ask ["<message>"] [--session-key <key>] [--json] [--context=auto|none]
  openclaw-cli mcp
  openclaw-cli --help
  openclaw-cli --version

Commands:
  ask              Send a message to OpenClaw (message arg and/or piped stdin).
  mcp              Run the MCP server over stdio.

Options:
  --session-key    Reuse an existing conversation session.
  --json           Print machine-readable JSON output.
  --context        Context mode for ask: auto (default) or none.
  --help           Show help.
  --version        Show version.
`);
}

type AskArgs = {
  message?: string;
  sessionKey?: string;
  json: boolean;
  context: "auto" | "none";
};

function parseAskArgs(args: string[]): AskArgs {
  let sessionKey: string | undefined;
  let json = false;
  let context: "auto" | "none" = "auto";
  const messageParts: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) {
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg === "--session-key") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("--session-key requires a value");
      }
      sessionKey = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--context=")) {
      const value = arg.slice("--context=".length);
      if (value === "auto" || value === "none") {
        context = value;
        continue;
      }
      throw new Error(`Invalid --context value: ${value}`);
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    messageParts.push(arg);
  }

  const message = messageParts.join(" ").trim();
  return { message: message || undefined, sessionKey, json, context };
}

async function getGitOriginRemote(cwd: string): Promise<string | undefined> {
  try {
    const isRepo = await execFileAsync("git", ["-C", cwd, "rev-parse", "--is-inside-work-tree"]);
    if (isRepo.stdout.trim() !== "true") {
      return undefined;
    }
    const origin = await execFileAsync("git", ["-C", cwd, "remote", "get-url", "origin"]);
    const remote = origin.stdout.trim();
    return remote || undefined;
  } catch {
    return undefined;
  }
}

async function withAutoContext(message: string): Promise<string> {
  const cwd = process.cwd();
  const lines = ["[openclaw-context]", `cwd: ${cwd}`];
  const gitRemote = await getGitOriginRemote(cwd);
  if (gitRemote) {
    lines.push(`gitRemote: ${gitRemote}`);
  }
  lines.push("[/openclaw-context]", "", "User message:", message);
  return lines.join("\n");
}

async function readStdin(): Promise<string | undefined> {
  if (process.stdin.isTTY) {
    return undefined;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) {
    if (typeof chunk === "string") {
      chunks.push(new TextEncoder().encode(chunk));
      continue;
    }
    chunks.push(chunk);
  }
  const value = Buffer.concat(chunks).toString("utf8");
  return value.trim() ? value : undefined;
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    return;
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log(VERSION);
    return;
  }

  const command = args[0];
  if (command === "mcp") {
    await runMcpServer();
    return;
  }

  if (command !== "ask") {
    throw new Error(`Unknown command: ${command}`);
  }

  const parsed = parseAskArgs(args.slice(1));
  const stdinMessage = await readStdin();
  const baseMessage = parsed.message && stdinMessage
    ? `${parsed.message}\n\n${stdinMessage}`
    : parsed.message ?? stdinMessage;
  if (!baseMessage) {
    throw new Error("Missing input for 'ask': pass a message argument or pipe text via stdin");
  }
  const message = parsed.context === "none" ? baseMessage : await withAutoContext(baseMessage);
  const result = await sendMessage({
    message,
    sessionKey: parsed.sessionKey,
  });

  if (parsed.json) {
    console.log(JSON.stringify(result));
    return;
  }

  console.log(result.response);
  console.log("");
  console.log(`sessionKey: ${result.sessionKey}`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
