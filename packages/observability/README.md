# Observability Package - DEPRECATED

This TypeScript implementation has been replaced with a Python-based MCP server.

## New Implementation

Please use the **observability-mcp-server** located in `packages/observability-mcp-server/`

The new implementation uses:
- **Arize Phoenix**: Real AI observability platform with OpenTelemetry
- **FastMCP**: Proper MCP server integration
- **Python**: Native language for the Phoenix library

## Migration

Instead of importing this TypeScript module, connect to the MCP server:

```json
{
  "mcpServers": {
    "bob-observability": {
      "command": "bob-observability-server"
    }
  }
}
```

See `packages/observability-mcp-server/README.md` for details.
