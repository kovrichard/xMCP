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

interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  properties?: Record<string, JsonSchemaProperty>;
}

interface JsonSchema {
  type: 'object';
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

// Convert input schema to ZodRawShape
function convertToZodShape(schema: JsonSchema): z.ZodRawShape {
  if (!schema.properties) {
    return {};
  }

  const shape: z.ZodRawShape = {};
  for (const [key, value] of Object.entries(schema.properties)) {
    let zodType: z.ZodTypeAny;

    switch (value.type) {
      case 'string':
        zodType = z.string();
        break;
      case 'number':
        zodType = z.number();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      case 'array':
        zodType = z.array(z.any());
        break;
      case 'object':
        zodType = value.properties
          ? z.object(convertToZodShape({ type: 'object', properties: value.properties }))
          : z.record(z.any());
        break;
      default:
        zodType = z.any();
    }

    // Add description if available
    if (value.description) {
      zodType = zodType.describe(value.description);
    }

    // Make optional if not in required array
    if (!schema.required?.includes(key)) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }
  return shape;
}

export async function createMcpServer(name: string, command: string, args: string[]) {
  const server = new McpServer({
    name: "xmcp-server",
    version: "1.0.0"
  });

  const client = await getOrCreateClient(command, args);
  const tools = await client.listTools();

  tools.tools.forEach(tool => {
    const zodShape = convertToZodShape(tool.inputSchema as JsonSchema);
    server.tool(tool.name, tool.description || "", zodShape, async (args) => {
      const result = await client.callTool({
        name: tool.name,
        arguments: args
      });

      return {
        content: result.content as any
      }
    });
  });

  return server;
}
