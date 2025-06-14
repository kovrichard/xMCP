import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createMcpServer() {
  const server = new McpServer({
    name: "xmcp-server",
    version: "1.0.0"
  });

  server.tool(
    "proxy-http-to-stdio",
    {
      command: z.string(),
      args: z.array(z.string()),
    },
    async ({ command, args }) => {
      console.log(command, args);

      return {
        content: [{
          type: "text",
          text: `Got it: ${command} ${args.join(" ")}. Thanks!`
        }]
      }
    }
  );

  return server;
}
