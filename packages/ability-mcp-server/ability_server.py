"""
Ability MCP Server for Bob Agent using Agent Lightning
Provides RL-based continuous learning and self-improvement capabilities
"""

from typing import Optional, List, Dict, Any, Callable
from datetime import datetime
import json

from fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("bob-ability-server")

# Note: agentlightning integration would be added here when available
# For now, we implement RL capabilities using in-memory storage

# Episode and transition storage
episodes_store: Dict[str, Dict[str, Any]] = {}
current_episode_id: Optional[str] = None
transitions_buffer: List[Dict[str, Any]] = []

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
    """
    Start a new training episode for the agent.

    Args:
        goal: The goal for this episode
        metadata: Optional metadata for the episode

    Returns:
        Dict containing episode information
    """
    global current_episode_id

    try:
        # Generate episode ID
        episode_id = f"episode_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        current_episode_id = episode_id

        # Create episode entry
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

        # Note: Agent Lightning integration would go here
        # For now, we're just tracking episodes in memory

        return {
            "success": True,
            "episode_id": episode_id,
            "goal": goal,
            "start_time": episode["start_time"]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
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
    """
    Record an LLM call as part of agent execution.

    Args:
        episode_id: ID of the current episode
        input_text: Input to the LLM
        output_text: Output from the LLM
        model: Name of the model used
        reward: Optional reward for this call
        metadata: Optional metadata

    Returns:
        Dict containing recording confirmation
    """
    try:
        if episode_id not in episodes_store:
            return {
                "success": False,
                "error": f"Episode {episode_id} not found"
            }

        # Calculate reward if not provided
        if reward is None:
            reward = _calculate_default_reward(output_text, metadata)

        # Create transition
        transition = {
            "type": "llm_call",
            "timestamp": datetime.now().isoformat(),
            "input": input_text,
            "output": output_text,
            "model": model,
            "reward": reward,
            "metadata": metadata or {}
        }

        # Add to episode
        episodes_store[episode_id]["transitions"].append(transition)
        episodes_store[episode_id]["total_reward"] += reward

        # Note: Agent Lightning integration would go here
        # Use agl.emit_object() or agl.emit_message() for tracking

        return {
            "success": True,
            "episode_id": episode_id,
            "transition_id": len(episodes_store[episode_id]["transitions"]) - 1,
            "reward": reward
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
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
    """
    Record a tool call as part of agent execution.

    Args:
        episode_id: ID of the current episode
        tool_name: Name of the tool called
        input_data: Input to the tool
        output_data: Output from the tool
        reward: Optional reward for this call
        metadata: Optional metadata

    Returns:
        Dict containing recording confirmation
    """
    try:
        if episode_id not in episodes_store:
            return {
                "success": False,
                "error": f"Episode {episode_id} not found"
            }

        # Calculate reward if not provided
        if reward is None:
            reward = _calculate_tool_reward(tool_name, output_data, metadata)

        # Create transition
        transition = {
            "type": "tool_call",
            "timestamp": datetime.now().isoformat(),
            "tool_name": tool_name,
            "input": input_data,
            "output": output_data,
            "reward": reward,
            "metadata": metadata or {}
        }

        # Add to episode
        episodes_store[episode_id]["transitions"].append(transition)
        episodes_store[episode_id]["total_reward"] += reward

        # Note: Agent Lightning integration would go here
        # Use agl.emit_object() for tracking tool calls

        return {
            "success": True,
            "episode_id": episode_id,
            "transition_id": len(episodes_store[episode_id]["transitions"]) - 1,
            "reward": reward
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def end_episode(
    episode_id: str,
    success: bool,
    final_reward: Optional[float] = None,
    summary: Optional[str] = None
) -> Dict[str, Any]:
    """
    End an episode and finalize its data.

    Args:
        episode_id: ID of the episode
        success: Whether the episode was successful
        final_reward: Optional final reward to add
        summary: Optional summary of the episode

    Returns:
        Dict containing episode completion information
    """
    global current_episode_id

    try:
        if episode_id not in episodes_store:
            return {
                "success": False,
                "error": f"Episode {episode_id} not found"
            }

        episode = episodes_store[episode_id]

        # Update episode
        episode["end_time"] = datetime.now().isoformat()
        episode["success"] = success
        episode["status"] = "completed"

        if final_reward is not None:
            episode["total_reward"] += final_reward

        if summary:
            episode["summary"] = summary

        # Calculate duration
        start = datetime.fromisoformat(episode["start_time"])
        end = datetime.fromisoformat(episode["end_time"])
        episode["duration_seconds"] = (end - start).total_seconds()

        # Apply credit assignment
        _apply_credit_assignment(episode)

        if current_episode_id == episode_id:
            current_episode_id = None

        # Check if we should trigger training
        if training_config["training_enabled"]:
            completed_episodes = [
                e for e in episodes_store.values()
                if e["status"] == "completed"
            ]

            if len(completed_episodes) >= training_config["max_episodes_per_batch"]:
                training_result = _trigger_training(completed_episodes[-training_config["max_episodes_per_batch"]:])
            else:
                training_result = {"message": "Not enough episodes for training batch"}
        else:
            training_result = {"message": "Training disabled"}

        return {
            "success": True,
            "episode_id": episode_id,
            "episode_success": success,
            "total_reward": episode["total_reward"],
            "duration_seconds": episode["duration_seconds"],
            "transitions_count": len(episode["transitions"]),
            "training": training_result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_episode(
    episode_id: str
) -> Dict[str, Any]:
    """
    Retrieve episode data.

    Args:
        episode_id: ID of the episode

    Returns:
        Dict containing episode data
    """
    try:
        if episode_id not in episodes_store:
            return {
                "success": False,
                "error": f"Episode {episode_id} not found"
            }

        return {
            "success": True,
            "episode": episodes_store[episode_id]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_training_stats() -> Dict[str, Any]:
    """
    Get training statistics.

    Returns:
        Dict containing training statistics
    """
    try:
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
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def configure_training(
    reward_threshold: Optional[float] = None,
    max_episodes_per_batch: Optional[int] = None,
    learning_rate: Optional[float] = None,
    discount_factor: Optional[float] = None,
    training_enabled: Optional[bool] = None
) -> Dict[str, Any]:
    """
    Configure training parameters.

    Args:
        reward_threshold: Minimum reward threshold
        max_episodes_per_batch: Maximum episodes per training batch
        learning_rate: Learning rate for training
        discount_factor: Discount factor for future rewards
        training_enabled: Enable or disable training

    Returns:
        Dict containing updated configuration
    """
    try:
        if reward_threshold is not None:
            training_config["reward_threshold"] = reward_threshold
        if max_episodes_per_batch is not None:
            training_config["max_episodes_per_batch"] = max_episodes_per_batch
        if learning_rate is not None:
            training_config["learning_rate"] = learning_rate
        if discount_factor is not None:
            training_config["discount_factor"] = discount_factor
        if training_enabled is not None:
            training_config["training_enabled"] = training_enabled

        return {
            "success": True,
            "config": training_config
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def clear_episodes() -> Dict[str, Any]:
    """
    Clear all stored episodes.

    Returns:
        Dict containing clearing confirmation
    """
    global episodes_store, current_episode_id

    try:
        count = len(episodes_store)
        episodes_store = {}
        current_episode_id = None

        return {
            "success": True,
            "message": f"Cleared {count} episodes"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# Helper functions

def _calculate_default_reward(output: str, metadata: Optional[Dict[str, Any]] = None) -> float:
    """Calculate default reward based on output quality"""
    # Simple heuristic: longer, more detailed outputs get higher rewards
    # In production, use more sophisticated reward functions
    base_reward = 0.5

    if metadata and metadata.get("expected"):
        # Check if output contains expected content
        expected = str(metadata["expected"]).lower()
        if expected in output.lower():
            base_reward += 0.3

    # Reward for reasonable length
    if 50 <= len(output) <= 1000:
        base_reward += 0.2

    return min(1.0, base_reward)


def _calculate_tool_reward(tool_name: str, output: Any, metadata: Optional[Dict[str, Any]] = None) -> float:
    """Calculate reward for tool calls"""
    # Base reward for successful tool execution
    base_reward = 0.6

    # Check if tool returned expected result
    if metadata and metadata.get("success"):
        base_reward += 0.4

    return min(1.0, base_reward)


def _apply_credit_assignment(episode: Dict[str, Any]) -> None:
    """Apply hierarchical credit assignment to transitions"""
    transitions = episode["transitions"]
    total_reward = episode["total_reward"]
    num_transitions = len(transitions)

    if num_transitions == 0:
        return

    # Distribute episode reward across transitions with discounting
    discount_factor = training_config["discount_factor"]

    for i, transition in enumerate(transitions):
        # Apply discount based on position (later transitions get more credit)
        position_weight = discount_factor ** (num_transitions - i - 1)
        transition["adjusted_reward"] = transition["reward"] * position_weight


def _trigger_training(episodes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Trigger training with collected episodes"""
    # In production, this would send data to Agent Lightning training server
    # For now, we just log the training data

    training_data = {
        "timestamp": datetime.now().isoformat(),
        "num_episodes": len(episodes),
        "total_transitions": sum(len(e["transitions"]) for e in episodes),
        "avg_reward": sum(e["total_reward"] for e in episodes) / len(episodes),
        "config": training_config
    }

    return {
        "triggered": True,
        "training_data": training_data,
        "message": "Training data prepared. In production, this would be sent to Agent Lightning server."
    }


def main():
    """Run the MCP server"""
    mcp.run()


if __name__ == "__main__":
    main()
