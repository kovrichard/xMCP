import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";

// Store active clients
const activeClients: { [key: string]: { client: Client, transport: StdioClientTransport } } = {};

export function createMcpServer() {
  const server = new McpServer({
    name: "xmcp-server",
    version: "1.0.0"
  });

  // Tool to start and configure a stdio server
  server.tool(
    "start-stdio-server",
    {
      name: z.string().describe("Unique name for this stdio server"),
      command: z.string().describe("Command to run"),
      args: z.array(z.string()).describe("Command arguments"),
    },
    async ({ name, command, args }) => {
      // Clean up existing client if any
      if (activeClients[name]) {
        const { transport } = activeClients[name];
        await transport.close();
        delete activeClients[name];
      }

      try {
        const transport = new StdioClientTransport({
          command,
          args
        });

        const client = new Client({
          name: "xmcp-proxy",
          version: "1.0.0"
        });

        await client.connect(transport);
        activeClients[name] = { client, transport };

        return {
          content: [{
            type: "text",
            text: `Successfully connected to stdio server "${name}"`
          }]
        };
      } catch (error: any) {
        throw new Error(`Failed to start stdio server: ${error?.message || 'Unknown error'}`);
      }
    }
  );

  // Tool to list available tools from a stdio server
  server.tool(
    "list-tools",
    {
      server: z.string().describe("Name of the stdio server"),
    },
    async ({ server }) => {
      const clientInfo = activeClients[server];
      if (!clientInfo) {
        throw new Error(`Server "${server}" not found. Start it first using start-stdio-server.`);
      }

      try {
        const tools = await clientInfo.client.listTools();
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
      server: z.string().describe("Name of the stdio server"),
      tool: z.string().describe("Name of the tool to call"),
      arguments: z.record(z.any()).optional().describe("Tool arguments"),
    },
    async ({ server, tool, arguments: args }) => {
      const clientInfo = activeClients[server];
      if (!clientInfo) {
        throw new Error(`Server "${server}" not found. Start it first using start-stdio-server.`);
      }

      try {
        const result = await clientInfo.client.callTool({
          name: tool,
          arguments: args || {}
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

  // Tool to list available prompts from a stdio server
  server.tool(
    "list-prompts",
    {
      server: z.string().describe("Name of the stdio server"),
    },
    async ({ server }) => {
      const clientInfo = activeClients[server];
      if (!clientInfo) {
        throw new Error(`Server "${server}" not found. Start it first using start-stdio-server.`);
      }

      try {
        const prompts = await clientInfo.client.listPrompts();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(prompts, null, 2)
          }]
        };
      } catch (error: any) {
        throw new Error(`Failed to list prompts: ${error?.message || 'Unknown error'}`);
      }
    }
  );

  // Tool to get a prompt from a stdio server
  server.tool(
    "get-prompt",
    {
      server: z.string().describe("Name of the stdio server"),
      prompt: z.string().describe("Name of the prompt"),
      arguments: z.record(z.any()).optional().describe("Prompt arguments"),
    },
    async ({ server, prompt, arguments: args }) => {
      const clientInfo = activeClients[server];
      if (!clientInfo) {
        throw new Error(`Server "${server}" not found. Start it first using start-stdio-server.`);
      }

      try {
        const result = await clientInfo.client.getPrompt({
          name: prompt,
          arguments: args || {}
        });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        throw new Error(`Failed to get prompt: ${error?.message || 'Unknown error'}`);
      }
    }
  );

  return server;
}
