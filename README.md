# xMCP Server

xMCP is a streamable HTTP MCP server that proxies requests to **stdio** MCP servers.

There are already multiple proxy MCP servers out there, but none of them solve the following problem:

> *What if the stdio MCP server I'd like to use uses a command that is not available in my system?*

The answer is to use `xMCP`!

## How it works

Consider the following example:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

This command will only work if you have `npx` installed.

To use this MCP server, transform it to the following:

```bash
http://localhost:3001/mcp?name=context7&command=npx&args=-y,@upstash/context7-mcp
```

By sending this request over the network, you'll be able to use the **stdio** `context7` MCP server over the network.

### Why does it work?

`xMCP` is running inside a container with the most common commands preinstalled. Add whatever you need to the container and you're good to go! (And consider creating a PR if you think others would also benefit from it.)

### Available commands

- `npx`
- `bunx`
- `uv`
- `docker`

## How to use

## Local Development

```bash
docker compose up -d

# or

make start
```

Server is running on [`http://localhost:3001/mcp`](http://localhost:3001/mcp).

Inspector is running on [`http://localhost:6274`](http://localhost:6274), however, it requires a token to be set in the URL.

Execute `make logs`, get the URL with the auth token and open it.
