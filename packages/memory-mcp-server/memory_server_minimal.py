"""
Minimal Memory MCP Server for Bob Agent (Railway MVP)
Uses in-memory storage instead of Mem0 to avoid heavy dependencies
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import json

from fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("bob-memory-server")

# In-memory storage
memory_store: Dict[str, List[Dict[str, Any]]] = {}
memory_counter = 0

MEMORY_TYPES = {
    "episodic": "user",
    "procedural": "agent",
    "semantic": "user",
    "working": "session",
    "long-term": "user"
}


@mcp.tool()
def store_memory(
    content: str,
    memory_type: str,
    user_id: str = "default_user",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Store a new memory entry (in-memory implementation)"""
    global memory_counter

    if memory_type not in MEMORY_TYPES:
        return {
            "success": False,
            "error": f"Invalid memory_type. Must be one of: {list(MEMORY_TYPES.keys())}"
        }

    memory_counter += 1
    memory_id = f"mem_{memory_counter}"

    memory_entry = {
        "id": memory_id,
        "content": content,
        "memory_type": memory_type,
        "user_id": user_id,
        "timestamp": datetime.now().isoformat(),
        "metadata": metadata or {}
    }

    if user_id not in memory_store:
        memory_store[user_id] = []

    memory_store[user_id].append(memory_entry)

    return {
        "success": True,
        "memory_id": memory_id,
        "content": content,
        "memory_type": memory_type,
        "user_id": user_id,
        "metadata": memory_entry["metadata"]
    }


@mcp.tool()
def search_memories(
    query: str,
    user_id: str = "default_user",
    memory_type: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """Search for relevant memories (simple keyword matching)"""
    if user_id not in memory_store:
        return {
            "success": True,
            "query": query,
            "memory_type": memory_type,
            "results": [],
            "count": 0
        }

    results = []
    query_lower = query.lower()

    for mem in memory_store[user_id]:
        if memory_type and mem.get("memory_type") != memory_type:
            continue

        if query_lower in mem.get("content", "").lower():
            results.append(mem)

        if len(results) >= limit:
            break

    return {
        "success": True,
        "query": query,
        "memory_type": memory_type,
        "results": results,
        "count": len(results)
    }


@mcp.tool()
def get_all_memories(
    user_id: str = "default_user",
    memory_type: Optional[str] = None
) -> Dict[str, Any]:
    """Retrieve all memories for a user"""
    if user_id not in memory_store:
        return {
            "success": True,
            "user_id": user_id,
            "memory_type": memory_type,
            "memories": [],
            "count": 0
        }

    memories = memory_store[user_id]

    if memory_type:
        memories = [m for m in memories if m.get("memory_type") == memory_type]

    return {
        "success": True,
        "user_id": user_id,
        "memory_type": memory_type,
        "memories": memories,
        "count": len(memories)
    }


@mcp.tool()
def get_memory_stats(
    user_id: str = "default_user"
) -> Dict[str, Any]:
    """Get statistics about stored memories"""
    if user_id not in memory_store:
        return {
            "success": True,
            "user_id": user_id,
            "stats": {"total": 0, "by_type": {}}
        }

    memories = memory_store[user_id]
    stats = {
        "total": len(memories),
        "by_type": {}
    }

    for mem in memories:
        mem_type = mem.get("memory_type", "unknown")
        stats["by_type"][mem_type] = stats["by_type"].get(mem_type, 0) + 1

    return {
        "success": True,
        "user_id": user_id,
        "stats": stats
    }


def main():
    """Run the MCP server"""
    mcp.run()


if __name__ == "__main__":
    main()
