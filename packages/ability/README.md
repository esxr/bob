# Ability Package - DEPRECATED

This TypeScript implementation has been replaced with a Python-based MCP server.

## New Implementation

Please use the **ability-mcp-server** located in `packages/ability-mcp-server/`

The new implementation uses:
- **Agent Lightning**: Real RL-based learning from Microsoft Research
- **FastMCP**: Proper MCP server integration
- **Python**: Native language for the Agent Lightning library

## Migration

Instead of importing this TypeScript module, connect to the MCP server:

```json
{
  "mcpServers": {
    "bob-ability": {
      "command": "bob-ability-server"
    }
  }
}
```

See `packages/ability-mcp-server/README.md` for details.
