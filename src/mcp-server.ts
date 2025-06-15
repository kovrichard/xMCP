import { convertToZodShape } from "@/lib/schema-converter";
import type { JsonSchema } from "@/types/schema";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Store active clients using command+args as key
const activeClients: {
  [key: string]: { client: Client; transport: StdioClientTransport };
} = {};

// Create a unique key for a server based on its command and args
function getServerKey(
  command: string,
  args: string[],
  env: Record<string, string>
): string {
  return `${command}:${args.join(":")}:${JSON.stringify(env)}`;
}

// Get or create a client for a server
async function getOrCreateClient(
  command: string,
  args: string[],
  env: Record<string, string>
): Promise<Client> {
  const key = getServerKey(command, args, env);

  if (activeClients[key]) {
    const { transport } = activeClients[key];
    await transport.close();
    delete activeClients[key];
  }

  const payload = {
    command,
    args,
    env,
  };

  const transport = new StdioClientTransport(payload);

  const client = new Client({
    name: "xmcp-proxy",
    version: "1.0.0",
  });

  await client.connect(transport);
  activeClients[key] = { client, transport };
  return client;
}

export async function createMcpServer(
  name: string,
  command: string,
  args: string[],
  env: Record<string, string>
) {
  const server = new McpServer({
    name: name,
    version: "1.0.0",
  });

  const client = await getOrCreateClient(command, args, env);
  const tools = await client.listTools();

  tools.tools.forEach((tool) => {
    const zodShape = convertToZodShape(tool.inputSchema as JsonSchema);
    server.tool(tool.name, tool.description || "", zodShape, async (args) => {
      console.log("Calling tool", tool.name, args);

      const result = await client.callTool({
        name: tool.name,
        arguments: args,
      });

      return {
        content: result.content as any,
      };
    });
  });

  return server;
}
