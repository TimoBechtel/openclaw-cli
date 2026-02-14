import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  sendMessageToolConfig,
  handleSendMessage,
} from "./tools/sendMessage.js";

const server = new McpServer({
  name: "openclaw-mcp",
  version: "1.0.0",
});

server.registerTool("send_message", sendMessageToolConfig, handleSendMessage);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
