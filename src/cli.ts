#!/usr/bin/env bun

import { sendMessage } from "./openclaw/client.js";
import { runMcpServer } from "./mcp/server.js";

const VERSION = process.env.npm_package_version ?? "0.0.0";

function printHelp(): void {
  console.log(`openclaw-cli ${VERSION}

Usage:
  openclaw-cli ask "<message>" [--session-key <key>] [--json]
  openclaw-cli mcp
  openclaw-cli --help
  openclaw-cli --version

Commands:
  ask              Send a message to OpenClaw.
  mcp              Run the MCP server over stdio.

Options:
  --session-key    Reuse an existing conversation session.
  --json           Print machine-readable JSON output.
  --help           Show help.
  --version        Show version.
`);
}

type AskArgs = {
  message: string;
  sessionKey?: string;
  json: boolean;
};

function parseAskArgs(args: string[]): AskArgs {
  let sessionKey: string | undefined;
  let json = false;
  const messageParts: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
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

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    messageParts.push(arg);
  }

  const message = messageParts.join(" ").trim();
  if (!message) {
    throw new Error("Missing required message argument for 'ask'");
  }

  return { message, sessionKey, json };
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
  const result = await sendMessage({
    message: parsed.message,
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
