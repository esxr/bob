"""
Minimal Ability MCP Server for Bob Agent (Railway MVP)
Uses in-memory RL tracking instead of Agent Lightning
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import json

from fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("bob-ability-server")

# Episode and transition storage
episodes_store: Dict[str, Dict[str, Any]] = {}
current_episode_id: Optional[str] = None

# Training configuration
training_config = {
    "reward_threshold": 0.7,
    "max_episodes_per_batch": 10,
    "learning_rate": 0.001,
    "discount_factor": 0.99,
    "training_enabled": True
}


@mcp.tool()
def start_episode(
    goal: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Start a new training episode for the agent"""
    global current_episode_id

    episode_id = f"episode_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
    current_episode_id = episode_id

    episode = {
        "episode_id": episode_id,
        "goal": goal,
        "start_time": datetime.now().isoformat(),
        "metadata": metadata or {},
        "transitions": [],
        "total_reward": 0.0,
        "status": "active"
    }

    episodes_store[episode_id] = episode

    return {
        "success": True,
        "episode_id": episode_id,
        "goal": goal,
        "start_time": episode["start_time"]
    }


@mcp.tool()
def record_llm_call(
    episode_id: str,
    input_text: str,
    output_text: str,
    model: str = "claude",
    reward: Optional[float] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Record an LLM call as part of agent execution"""
    if episode_id not in episodes_store:
        return {
            "success": False,
            "error": f"Episode {episode_id} not found"
        }

    if reward is None:
        reward = 0.5

    transition = {
        "type": "llm_call",
        "timestamp": datetime.now().isoformat(),
        "input": input_text,
        "output": output_text,
        "model": model,
        "reward": reward,
        "metadata": metadata or {}
    }

    episodes_store[episode_id]["transitions"].append(transition)
    episodes_store[episode_id]["total_reward"] += reward

    return {
        "success": True,
        "episode_id": episode_id,
        "transition_id": len(episodes_store[episode_id]["transitions"]) - 1,
        "reward": reward
    }


@mcp.tool()
def record_tool_call(
    episode_id: str,
    tool_name: str,
    input_data: Dict[str, Any],
    output_data: Any,
    reward: Optional[float] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Record a tool call as part of agent execution"""
    if episode_id not in episodes_store:
        return {
            "success": False,
            "error": f"Episode {episode_id} not found"
        }

    if reward is None:
        reward = 0.6

    transition = {
        "type": "tool_call",
        "timestamp": datetime.now().isoformat(),
        "tool_name": tool_name,
        "input": input_data,
        "output": output_data,
        "reward": reward,
        "metadata": metadata or {}
    }

    episodes_store[episode_id]["transitions"].append(transition)
    episodes_store[episode_id]["total_reward"] += reward

    return {
        "success": True,
        "episode_id": episode_id,
        "transition_id": len(episodes_store[episode_id]["transitions"]) - 1,
        "reward": reward
    }


@mcp.tool()
def end_episode(
    episode_id: str,
    success: bool,
    final_reward: Optional[float] = None,
    summary: Optional[str] = None
) -> Dict[str, Any]:
    """End an episode and finalize its data"""
    global current_episode_id

    if episode_id not in episodes_store:
        return {
            "success": False,
            "error": f"Episode {episode_id} not found"
        }

    episode = episodes_store[episode_id]
    episode["end_time"] = datetime.now().isoformat()
    episode["success"] = success
    episode["status"] = "completed"

    if final_reward is not None:
        episode["total_reward"] += final_reward

    if summary:
        episode["summary"] = summary

    start = datetime.fromisoformat(episode["start_time"])
    end = datetime.fromisoformat(episode["end_time"])
    episode["duration_seconds"] = (end - start).total_seconds()

    if current_episode_id == episode_id:
        current_episode_id = None

    return {
        "success": True,
        "episode_id": episode_id,
        "episode_success": success,
        "total_reward": episode["total_reward"],
        "duration_seconds": episode["duration_seconds"],
        "transitions_count": len(episode["transitions"]),
        "training": {"message": "Training data collected (MVP mode)"}
    }


@mcp.tool()
def get_training_stats() -> Dict[str, Any]:
    """Get training statistics"""
    total_episodes = len(episodes_store)
    completed_episodes = [e for e in episodes_store.values() if e["status"] == "completed"]
    successful_episodes = [e for e in completed_episodes if e.get("success", False)]

    total_transitions = sum(len(e["transitions"]) for e in episodes_store.values())
    avg_reward = (
        sum(e["total_reward"] for e in completed_episodes) / len(completed_episodes)
        if completed_episodes else 0.0
    )

    stats = {
        "total_episodes": total_episodes,
        "completed_episodes": len(completed_episodes),
        "successful_episodes": len(successful_episodes),
        "success_rate": len(successful_episodes) / len(completed_episodes) if completed_episodes else 0.0,
        "total_transitions": total_transitions,
        "avg_reward": avg_reward,
        "avg_transitions_per_episode": total_transitions / total_episodes if total_episodes else 0,
        "training_config": training_config
    }

    return {
        "success": True,
        "stats": stats
    }


def main():
    """Run the MCP server"""
    mcp.run()


if __name__ == "__main__":
    main()
