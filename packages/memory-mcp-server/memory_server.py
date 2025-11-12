"""
Memory MCP Server for Bob Agent using Mem0
Provides multi-layered memory system (episodic, procedural, semantic, working, long-term)
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import json

from fastmcp import FastMCP
from mem0 import Memory

# Initialize FastMCP server
mcp = FastMCP("bob-memory-server")

# Initialize Mem0 Memory (lazy initialization to avoid errors at import time)
# Mem0 configuration - using default settings
# For production, configure with custom vector stores, LLMs, etc.
memory = None


def get_memory():
    """Get or create Memory instance"""
    global memory
    if memory is None:
        try:
            # Try to initialize with API key from environment
            import os
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                # Use a basic in-memory configuration without LLM for testing
                from mem0.configs.base import MemoryConfig
                config = MemoryConfig(
                    vector_store={"provider": "qdrant", "config": {"collection_name": "bob_memories", "path": ":memory:"}},
                    llm=None  # Skip LLM requirement for basic functionality
                )
                memory = Memory.from_config(config) if hasattr(Memory, 'from_config') else Memory()
            else:
                memory = Memory()
        except Exception as e:
            # Fallback to None and return error in tools
            print(f"Warning: Memory initialization failed: {e}")
            memory = None
    return memory

# Memory type mapping for Bob's architecture
MEMORY_TYPES = {
    "episodic": "user",      # Episodic memories are stored per user
    "procedural": "agent",   # Procedural memories are agent-specific
    "semantic": "user",      # Semantic knowledge is user-specific
    "working": "session",    # Working memory is session-specific
    "long-term": "user"      # Long-term memories are user-specific
}


@mcp.tool()
def store_memory(
    content: str,
    memory_type: str,
    user_id: str = "default_user",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Store a new memory entry using Mem0.

    Args:
        content: The memory content to store
        memory_type: Type of memory (episodic, procedural, semantic, working, long-term)
        user_id: User identifier (default: "default_user")
        metadata: Optional metadata to store with the memory

    Returns:
        Dict containing the stored memory information
    """
    if memory_type not in MEMORY_TYPES:
        return {
            "success": False,
            "error": f"Invalid memory_type. Must be one of: {list(MEMORY_TYPES.keys())}"
        }

    # Enhance metadata with memory type and timestamp
    full_metadata = {
        "memory_type": memory_type,
        "timestamp": datetime.now().isoformat(),
        **(metadata or {})
    }

    # Prepare messages for Mem0
    messages = [{"role": "user", "content": content}]

    try:
        mem = get_memory()
        if mem is None:
            return {"success": False, "error": "Memory system not initialized. Set OPENAI_API_KEY environment variable."}

        # Add memory using Mem0
        result = mem.add(
            messages=messages,
            user_id=user_id,
            metadata=full_metadata
        )

        return {
            "success": True,
            "memory_id": result.get("id") if isinstance(result, dict) else str(result),
            "content": content,
            "memory_type": memory_type,
            "user_id": user_id,
            "metadata": full_metadata
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def search_memories(
    query: str,
    user_id: str = "default_user",
    memory_type: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search for relevant memories using semantic search.

    Args:
        query: Search query
        user_id: User identifier (default: "default_user")
        memory_type: Optional filter by memory type
        limit: Maximum number of results to return (default: 10)

    Returns:
        Dict containing search results
    """
    try:
        mem = get_memory()
        if mem is None:
            return {"success": False, "error": "Memory system not initialized. Set OPENAI_API_KEY environment variable."}

        # Search memories using Mem0
        results = mem.search(
            query=query,
            user_id=user_id,
            limit=limit
        )

        # Filter by memory_type if specified
        if memory_type and memory_type in MEMORY_TYPES:
            filtered_results = []
            for result in results.get("results", []):
                result_metadata = result.get("metadata", {})
                if result_metadata.get("memory_type") == memory_type:
                    filtered_results.append(result)
            results["results"] = filtered_results

        return {
            "success": True,
            "query": query,
            "memory_type": memory_type,
            "results": results.get("results", []),
            "count": len(results.get("results", []))
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_all_memories(
    user_id: str = "default_user",
    memory_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieve all memories for a user.

    Args:
        user_id: User identifier (default: "default_user")
        memory_type: Optional filter by memory type

    Returns:
        Dict containing all memories
    """
    try:
        mem = get_memory()
        if mem is None:
            return {"success": False, "error": "Memory system not initialized. Set OPENAI_API_KEY environment variable."}

        # Get all memories using Mem0
        results = mem.get_all(user_id=user_id)

        # Filter by memory_type if specified
        if memory_type and memory_type in MEMORY_TYPES:
            filtered_results = []
            for result in results:
                result_metadata = result.get("metadata", {})
                if result_metadata.get("memory_type") == memory_type:
                    filtered_results.append(result)
            results = filtered_results

        return {
            "success": True,
            "user_id": user_id,
            "memory_type": memory_type,
            "memories": results,
            "count": len(results)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def update_memory(
    memory_id: str,
    content: str,
    user_id: str = "default_user"
) -> Dict[str, Any]:
    """
    Update an existing memory entry.

    Args:
        memory_id: ID of the memory to update
        content: New content for the memory
        user_id: User identifier (default: "default_user")

    Returns:
        Dict containing update result
    """
    try:
        mem = get_memory()
        if mem is None:
            return {"success": False, "error": "Memory system not initialized. Set OPENAI_API_KEY environment variable."}

        # Update memory using Mem0
        result = mem.update(
            memory_id=memory_id,
            data=content
        )

        return {
            "success": True,
            "memory_id": memory_id,
            "updated_content": content,
            "result": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def delete_memory(
    memory_id: str
) -> Dict[str, Any]:
    """
    Delete a specific memory entry.

    Args:
        memory_id: ID of the memory to delete

    Returns:
        Dict containing deletion result
    """
    try:
        mem = get_memory()
        if mem is None:
            return {"success": False, "error": "Memory system not initialized. Set OPENAI_API_KEY environment variable."}

        # Delete memory using Mem0
        mem.delete(memory_id=memory_id)

        return {
            "success": True,
            "memory_id": memory_id,
            "message": "Memory deleted successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def delete_all_memories(
    user_id: str = "default_user"
) -> Dict[str, Any]:
    """
    Delete all memories for a user.

    Args:
        user_id: User identifier (default: "default_user")

    Returns:
        Dict containing deletion result
    """
    try:
        mem = get_memory()
        if mem is None:
            return {"success": False, "error": "Memory system not initialized. Set OPENAI_API_KEY environment variable."}

        # Delete all memories using Mem0
        mem.delete_all(user_id=user_id)

        return {
            "success": True,
            "user_id": user_id,
            "message": "All memories deleted successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_memory_history(
    memory_id: str
) -> Dict[str, Any]:
    """
    Get the history of changes for a specific memory.

    Args:
        memory_id: ID of the memory

    Returns:
        Dict containing memory history
    """
    try:
        mem = get_memory()
        if mem is None:
            return {"success": False, "error": "Memory system not initialized. Set OPENAI_API_KEY environment variable."}

        # Get memory history using Mem0
        history = mem.history(memory_id=memory_id)

        return {
            "success": True,
            "memory_id": memory_id,
            "history": history
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_memory_stats(
    user_id: str = "default_user"
) -> Dict[str, Any]:
    """
    Get statistics about stored memories.

    Args:
        user_id: User identifier (default: "default_user")

    Returns:
        Dict containing memory statistics
    """
    try:
        mem = get_memory()
        if mem is None:
            return {"success": False, "error": "Memory system not initialized. Set OPENAI_API_KEY environment variable."}

        # Get all memories and compute stats
        all_memories = mem.get_all(user_id=user_id)

        stats = {
            "total": len(all_memories),
            "by_type": {}
        }

        for mem in all_memories:
            mem_type = mem.get("metadata", {}).get("memory_type", "unknown")
            stats["by_type"][mem_type] = stats["by_type"].get(mem_type, 0) + 1

        return {
            "success": True,
            "user_id": user_id,
            "stats": stats
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def main():
    """Run the MCP server"""
    mcp.run()


if __name__ == "__main__":
    main()
