# openclaw-mcp

Connects OpenClaw to other agents via MCP. This lets your primary agent (e.g., in Cursor) ask OpenClaw questions directly.

## Setup

You need [Bun](https://bun.sh) installed.

```bash
bun install
```

## Configuration

| Variable | Description | Default |
|---|---|---|
| `OPENCLAW_BASE_URL` | OpenClaw Gateway URL | `http://127.0.0.1:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | Bearer token for auth | - |
| `OPENCLAW_AGENT_ID` | Target agent ID | `main` |
| `OPENCLAW_SESSION_KEY_PREFIX` | Prefix for session keys | - |
| `OPENCLAW_ALIAS` | Name to invoke the agent | `OpenClaw` |

**Tip:** Match your server key in the mcp config to your `OPENCLAW_ALIAS` (e.g., `"bob"`) . This lets you naturally type "ask Bob" in your chat.

## Client Config

### Cursor

Paste this into your config file:

- **Cursor:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "bun",
      "args": ["run", "/Users/timo/Projects/openclaw-mcp/src/index.ts"],
      "env": {
        "OPENCLAW_GATEWAY_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Requirements

You must enable `OpenResponses` in your OpenClaw config:

```json5
{ gateway: { http: { endpoints: { responses: { enabled: true } } } } }
```

I don't recommend exposing your OpenClaw Gateway to the internet. Use something like [Tailscale](https://tailscale.com) if you need remote access.
