# Bob Ability MCP Server

Ability MCP Server for Bob Agent using [Agent Lightning](https://github.com/microsoft/agent-lightning).

## Features

- **RL-Based Learning**: Reinforcement learning for continuous agent improvement
- **Episode Management**: Track agent episodes with goals and outcomes
- **LLM Call Recording**: Record and reward LLM interactions
- **Tool Call Recording**: Track tool usage and effectiveness
- **Credit Assignment**: Hierarchical credit assignment for multi-step episodes
- **Training Integration**: Automatic training batch preparation
- **Flexible Rewards**: Customizable reward functions

## Installation

```bash
pip install -e .
```

## Requirements

- Python 3.10+
- agentlightning >= 0.1.0
- fastmcp >= 0.1.0

## Usage

### Start the MCP Server

```bash
bob-ability-server
```

Or run directly:

```bash
python ability_server.py
```

### Available Tools

1. **start_episode**: Start a new training episode for the agent
2. **record_llm_call**: Record an LLM call as part of agent execution
3. **record_tool_call**: Record a tool call as part of agent execution
4. **end_episode**: End an episode and finalize its data
5. **get_episode**: Retrieve episode data
6. **get_training_stats**: Get training statistics
7. **configure_training**: Configure training parameters
8. **clear_episodes**: Clear all stored episodes

### Episode Workflow

```python
# 1. Start episode
start_episode(goal="Complete user task")

# 2. Record interactions
record_llm_call(episode_id="...", input="...", output="...", reward=0.8)
record_tool_call(episode_id="...", tool_name="search", input={...}, output={...})

# 3. End episode
end_episode(episode_id="...", success=True, final_reward=1.0)
```

### Training Configuration

- **reward_threshold**: Minimum reward threshold (default: 0.7)
- **max_episodes_per_batch**: Episodes per training batch (default: 10)
- **learning_rate**: Learning rate (default: 0.001)
- **discount_factor**: Discount factor for future rewards (default: 0.99)
- **training_enabled**: Enable/disable training (default: True)

## Integration with Bob Agent

Add this server to your `mcp.json` configuration:

```json
{
  "mcpServers": {
    "bob-ability": {
      "command": "bob-ability-server"
    }
  }
}
```

## Based on Agent Lightning

This server uses [Microsoft Agent Lightning](https://github.com/microsoft/agent-lightning), a framework for training AI agents with:
- Reinforcement Learning (RL)
- Automatic Prompt Optimization
- Supervised Fine-tuning
- Support for ANY agent framework
- Hierarchical credit assignment

For more information, visit: https://microsoft.github.io/agent-lightning/

## Research Paper

Agent Lightning: Taranjeet Singh, Deshraj Yadav, et al. "Agent Lightning: Train ANY AI Agents with Reinforcement Learning"
arXiv:2508.03680 (2024)
