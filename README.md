# openclaw-cli

Talk to OpenClaw from your terminal with `openclaw-cli`, or run it as an MCP server with `openclaw-cli mcp`.

## Install CLI

```bash
curl -fsSL https://raw.githubusercontent.com/TimoBechtel/openclaw-cli/main/install.sh | bash
```

## Skill

This repo ships a skill at `skills/openclaw-cli/SKILL.md` so agents can call the CLI directly.

Install it with:

```bash
npx skills add TimoBechtel/openclaw-cli --skill openclaw-cli
```

## CLI usage

```bash
openclaw-cli ask "Is there anything on my calendar for today?" # one-off question
openclaw-cli ask "Let's cancel this appointment and block 1h this afternoon for a coding session." --session-key "<session-key>" # continue same conversation
openclaw-cli ask "Send me a rain report for tomorrow on Telegram." --json # script-friendly JSON object: { response, sessionKey }
openclaw-cli ask "What should I do next?" --context=none # opt out of auto context injection
cat prompt.txt | openclaw-cli ask "Create a skill from this" # combine message argument + piped content
cat prompt.txt | openclaw-cli ask # stdin-only input also works
openclaw-cli mcp # run as an MCP server over stdio
```

When omitted, `--session-key` is auto-generated.

## MCP setup

Example MCP config for Cursor (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "openclaw-cli",
      "args": ["mcp"],
      "env": {
        "OPENCLAW_GATEWAY_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Configuration

| Variable | Description | Default |
|---|---|---|
| `OPENCLAW_BASE_URL` | OpenClaw Gateway URL | `http://127.0.0.1:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | Bearer token for auth | - |
| `OPENCLAW_AGENT_ID` | Target agent ID | `main` |
| `OPENCLAW_SESSION_KEY_PREFIX` | Prefix for generated session keys | - |
| `OPENCLAW_ALIAS` | Alias in MCP tool description | `OpenClaw` |

## Requirements

Enable `OpenResponses` in your OpenClaw config:

```json5
{ gateway: { http: { endpoints: { responses: { enabled: true } } } } }
```

Do not expose your OpenClaw Gateway to the public internet. Use [Tailscale](https://tailscale.com) for remote access.

## Build from source

You need [Bun](https://bun.sh).

```bash
bun install
bun run build:all
```
