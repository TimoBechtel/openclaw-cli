import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  sendMessageToolConfig,
  handleSendMessage,
} from "../tools/sendMessage.js";
import { CompatibleStdioServerTransport } from "../transport/compatibleStdio.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "openclaw-cli",
    version: "1.0.0",
  });

  server.registerTool("send_message", sendMessageToolConfig, handleSendMessage);
  return server;
}

export async function runMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new CompatibleStdioServerTransport();
  await server.connect(transport);
}
