import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";

// Store active clients using command+args as key
const activeClients: { [key: string]: { client: Client, transport: StdioClientTransport } } = {};

// Create a unique key for a server based on its command and args
function getServerKey(command: string, args: string[]): string {
  return `${command}:${args.join(':')}`;
}

// Get or create a client for a server
async function getOrCreateClient(command: string, args: string[]): Promise<Client> {
  const key = getServerKey(command, args);

  if (activeClients[key]) {
    const { transport } = activeClients[key];
    await transport.close();
    delete activeClients[key];
  }

  const transport = new StdioClientTransport({
    command,
    args
  });

  const client = new Client({
    name: "xmcp-proxy",
    version: "1.0.0"
  });

  await client.connect(transport);
  activeClients[key] = { client, transport };
  return client;
}

export function createMcpServer(command: string, args: string[]) {
  const server = new McpServer({
    name: "xmcp-server",
    version: "1.0.0"
  });

  // Tool to list available tools from a stdio server
  server.tool(
    "list-tools",
    {},
    async () => {
      try {
        const client = await getOrCreateClient(command, args);
        const tools = await client.listTools();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(tools, null, 2)
          }]
        };
      } catch (error: any) {
        throw new Error(`Failed to list tools: ${error?.message || 'Unknown error'}`);
      }
    }
  );

  // Tool to call a tool on a stdio server
  server.tool(
    "call-tool",
    {
      tool: z.string().describe("Name of the tool to call"),
      arguments: z.record(z.any()).optional().describe("Tool arguments"),
    },
    async ({ tool, arguments: toolArgs }) => {
      try {
        const client = await getOrCreateClient(command, args);
        const result = await client.callTool({
          name: tool,
          arguments: toolArgs || {}
        });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        throw new Error(`Failed to call tool: ${error?.message || 'Unknown error'}`);
      }
    }
  );

  return server;
}
