# Memory Package - DEPRECATED

This TypeScript implementation has been replaced with a Python-based MCP server.

## New Implementation

Please use the **memory-mcp-server** located in `packages/memory-mcp-server/`

The new implementation uses:
- **Mem0**: Real intelligent memory layer with semantic search
- **FastMCP**: Proper MCP server integration
- **Python**: Native language for the Mem0 library

## Migration

Instead of importing this TypeScript module, connect to the MCP server:

```json
{
  "mcpServers": {
    "bob-memory": {
      "command": "bob-memory-server"
    }
  }
}
```

See `packages/memory-mcp-server/README.md` for details.
