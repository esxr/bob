# Bob Memory MCP Server

Memory MCP Server for Bob Agent using [Mem0](https://github.com/mem0ai/mem0).

## Features

- **Multi-layered Memory System**: Supports episodic, procedural, semantic, working, and long-term memory types
- **Semantic Search**: Find relevant memories using natural language queries
- **Memory Management**: Add, update, delete, and retrieve memories
- **History Tracking**: Track changes to memories over time
- **Statistics**: Get insights into memory usage

## Installation

```bash
pip install -e .
```

## Requirements

- Python 3.10+
- mem0ai >= 1.0.0
- fastmcp >= 0.1.0

## Usage

### Start the MCP Server

```bash
bob-memory-server
```

Or run directly:

```bash
python memory_server.py
```

### Available Tools

1. **store_memory**: Store a new memory entry
2. **search_memories**: Search for relevant memories using semantic search
3. **get_all_memories**: Retrieve all memories for a user
4. **update_memory**: Update an existing memory entry
5. **delete_memory**: Delete a specific memory entry
6. **delete_all_memories**: Delete all memories for a user
7. **get_memory_history**: Get the history of changes for a specific memory
8. **get_memory_stats**: Get statistics about stored memories

### Memory Types

- **episodic**: Specific events, interactions, conversations
- **procedural**: How to perform tasks, routines, strategies
- **semantic**: Conceptual knowledge and relationships
- **working**: Temporary state and current focus
- **long-term**: Persistent knowledge across sessions

## Integration with Bob Agent

Add this server to your `.mcp.json` configuration:

```json
{
  "mcpServers": {
    "bob-memory": {
      "command": "bob-memory-server"
    }
  }
}
```

## Based on Mem0

This server uses [Mem0](https://github.com/mem0ai/mem0), a universal memory layer for AI agents with:
- +26% Accuracy over OpenAI Memory
- 91% Faster responses
- 90% Lower token usage

For more information, visit: https://mem0.ai
