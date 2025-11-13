# Bob Agent - AI Agent with Memory, Observability & Reinforcement Learning

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Claude Agent SDK](https://img.shields.io/badge/Claude-Agent%20SDK-purple)](https://github.com/anthropics/anthropic-sdk-typescript)
[![Deploy on Railway](https://img.shields.io/badge/Deploy%20on-Railway-blueviolet)](https://railway.app/new/template)

**A sophisticated AI agent system built with Claude SDK featuring real production-ready libraries for memory, observability, and reinforcement learning.**

[Quick Start](#-quick-start) • [Features](#-features) • [Architecture](#-architecture) • [Deploy](#-deploy-to-railway) • [Documentation](#-documentation)

</div>

---

## Overview

Bob Agent combines cutting-edge AI agent capabilities with proven production libraries:

- **Memory System**: [Mem0](https://github.com/mem0ai/mem0) - Universal memory layer with 26% accuracy improvement and 91% faster performance
- **Observability**: [Arize Phoenix](https://github.com/Arize-ai/phoenix) - Real-time tracing, monitoring, and performance evaluation
- **Reinforcement Learning**: [Agent Lightning](https://github.com/microsoft/agent-lightning) - Microsoft's RL training framework for continuous agent improvement
- **MCP Integration**: FastMCP-based Python servers exposing production libraries to TypeScript agent

## Features

### Memory (Mem0)

- **Research-backed performance**: +26% accuracy, 91% faster, 90% fewer tokens vs OpenAI Memory
- Semantic search with vector databases
- Multi-level memory architecture:
  - Episodic memory (specific events)
  - Procedural memory (learned skills)
  - Semantic memory (knowledge graph)
  - Working memory (active context)
  - Long-term memory (consolidated knowledge)
- Automatic memory consolidation and decay
- **Research Paper**: [arXiv:2504.19413](https://arxiv.org/abs/2504.19413)

### Observability (Arize Phoenix)

- Real-time distributed tracing with OpenTelemetry
- Visual dashboard at `http://localhost:6006`
- Multi-agent tracing and span analytics
- Performance evaluation and anomaly detection
- Production-ready monitoring with metric collection
- LLM cost and latency tracking

### Ability (Agent Lightning)

- Reinforcement learning-based agent training (Microsoft Research)
- Hierarchical credit assignment across agent steps
- Framework-agnostic: works with ANY agent implementation
- Automatic training batch preparation from execution traces
- Continuous improvement without manual tuning
- **Research Paper**: [arXiv:2508.03680](https://arxiv.org/abs/2508.03680)

## Quick Start

### Prerequisites

- **Python 3.10+** - For MCP servers
- **Node.js 18+** - For main agent
- **Anthropic API Key** - Get yours at [console.anthropic.com](https://console.anthropic.com/)
- **OpenAI API Key** - Required for Mem0, get at [platform.openai.com](https://platform.openai.com/)

### Installation

#### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/bob-agent.git
cd bob-agent

# Run automated setup
chmod +x setup.sh
./setup.sh
```

#### Option 2: Manual Setup

```bash
# Install Python MCP servers
pip install -e packages/memory-mcp-server
pip install -e packages/observability-mcp-server
pip install -e packages/ability-mcp-server

# Install Node.js dependencies
npm install

# Build TypeScript
npm run build
```

### Configuration

Create a `.env` file or export environment variables:

```bash
# Required
export ANTHROPIC_API_KEY="your-anthropic-key"
export OPENAI_API_KEY="your-openai-key"

# Optional
export AGENT_MODEL="claude-sonnet-4"
export MAX_TURNS=50
export PHOENIX_COLLECTOR_ENDPOINT="http://localhost:6006"
```

See [`.env.example`](.env.example) for all configuration options.

### Run Your First Agent

```bash
npm start -- --goal "Calculate the sum of 5 and 3" --evaluation "Returns 8"
```

The agent will:
1. Parse your goal and evaluation criteria
2. Execute using Claude Agent SDK
3. Store memories in Mem0
4. Send traces to Phoenix dashboard
5. Prepare RL training data in Agent Lightning
6. Return results with full execution log

### View Observability Dashboard

Start the Phoenix server (if not already running):

```bash
python -m phoenix.server.main serve
```

Open the dashboard: **http://localhost:6006**

You'll see real-time traces, performance metrics, and agent behavior analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Bob Agent (TypeScript + Claude SDK)             │
│                      Main Agent Loop                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ MCP Protocol
        ┌──────────────────┼──────────────────┬────────────────┐
        │                  │                  │                │
┌───────▼──────────┐ ┌─────▼────────┐ ┌──────▼───────┐ ┌─────▼──────┐
│ Memory Server    │ │ Observability│ │ Ability      │ │   Tools    │
│ (Python + Mem0)  │ │ (Python +    │ │ (Python +    │ │  Package   │
│                  │ │  Phoenix)    │ │  Agent       │ │            │
│ - Semantic search│ │ - Dashboard  │ │  Lightning)  │ │ - Sample   │
│ - Multi-level    │ │ - Tracing    │ │ - RL training│ │   MCP tools│
│   memory         │ │ - Metrics    │ │ - Rewards    │ │            │
└──────────────────┘ └──────────────┘ └──────────────┘ └────────────┘
```

**Why Python MCP Servers?**

All three core libraries (Mem0, Phoenix, Agent Lightning) are Python-native with PyPI packages. Using FastMCP to expose them as MCP servers allows the TypeScript main agent to leverage real, production-ready implementations without language barriers.

## Deploy to Railway

Deploy Bob Agent with one click:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

Railway will:
- Build the Docker image with both Python and Node.js
- Set up environment variables
- Deploy your agent automatically
- Provide a URL for accessing the agent

### Manual Railway Deployment

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Deploy:
```bash
railway up
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## Project Structure

```
bob-agent/
├── README.md                         # This file
├── LICENSE                           # MIT License
├── CONTRIBUTING.md                   # Contribution guidelines
├── CHANGELOG.md                      # Version history
├── Dockerfile                        # Multi-stage Docker build
├── docker-compose.yml                # Local development
├── .env.example                      # Environment template
├── .dockerignore                     # Docker exclusions
├── mcp.json                          # MCP server configuration
├── setup.sh                          # Automated setup script
├── package.json                      # Node.js dependencies
├── tsconfig.json                     # TypeScript config
├── src/
│   ├── index.ts                      # Entry point
│   ├── agent.ts                      # Main agent implementation
│   └── types.ts                      # Type definitions
├── packages/
│   ├── memory-mcp-server/            # Python Memory Server (Mem0)
│   ├── observability-mcp-server/     # Python Observability Server (Phoenix)
│   ├── ability-mcp-server/           # Python Ability Server (Agent Lightning)
│   └── tools/                        # Sample MCP tools
├── tests/
│   ├── python/e2e/                   # Python end-to-end tests
│   ├── typescript/integration/       # TypeScript integration tests
│   ├── scripts/                      # Test scripts and verification
│   ├── outputs/                      # Test outputs and logs
│   └── README.md                     # Test documentation
└── docs/
    ├── ARCHITECTURE.md               # System architecture
    ├── DEPLOYMENT.md                 # Deployment guide
    └── API.md                        # API reference
```

## Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get up and running in 5 minutes
- **[Architecture Documentation](docs/ARCHITECTURE.md)** - System design and components
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[API Reference](docs/API.md)** - Complete API documentation
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute

### Package Documentation

- [Memory MCP Server](./packages/memory-mcp-server/README.md) - Mem0 integration
- [Observability MCP Server](./packages/observability-mcp-server/README.md) - Phoenix integration
- [Ability MCP Server](./packages/ability-mcp-server/README.md) - Agent Lightning integration

## Examples

### Basic Agent Execution

```bash
npm start -- --goal "Analyze the latest tech news" --evaluation "Provides summary"
```

### With Custom Model

```bash
export AGENT_MODEL="claude-opus-3"
npm start -- --goal "Write a haiku about AI" --evaluation "3 lines, 5-7-5 syllables"
```

### View Memory Statistics

```bash
# After running an agent, check stored memories
python -c "from packages.memory_mcp_server import memory_server; print(memory_server.get_stats())"
```

## Development

### Testing

All tests are organized in the `tests/` directory:

```
tests/
├── python/e2e/          # End-to-end Python MCP server tests
├── typescript/integration/  # TypeScript integration tests
├── scripts/             # Verification and setup scripts
└── outputs/             # Test outputs and logs
```

```bash
# Run all tests
npm test

# Run individual test suites
npm run test:verify      # Verify complete setup and working state
npm run test:setup       # Check installation status
npm run test:python      # Run Python MCP server E2E tests
npm run test:typescript  # Run TypeScript integration tests
npm run test:mcp-servers # Docker-based MCP server tests

# Run specific test files
.venv/bin/python tests/python/e2e/test_memory_server.py
.venv/bin/python tests/python/e2e/test_observability_server.py
.venv/bin/python tests/python/e2e/test_ability_server.py
ts-node tests/typescript/integration/test-mcp.ts
```

See [tests/README.md](tests/README.md) for detailed test documentation.

### Building

```bash
# Clean build
npm run clean
npm run build

# Development mode
npm run dev
```

## References

### Libraries

- [Mem0 (43k+ stars)](https://github.com/mem0ai/mem0) - Universal memory layer
- [Arize Phoenix](https://github.com/Arize-ai/phoenix) - AI observability platform
- [Agent Lightning](https://github.com/microsoft/agent-lightning) - RL training framework

### Documentation

- [Mem0 Documentation](https://docs.mem0.ai/)
- [Arize Phoenix Documentation](https://docs.arize.com/phoenix)
- [Agent Lightning Documentation](https://microsoft.github.io/agent-lightning/)
- [Claude Agent SDK Documentation](https://github.com/anthropics/anthropic-sdk-typescript)

### Research Papers

- **Mem0**: "Building Production-Ready AI Agents with Scalable Long-Term Memory" ([arXiv:2504.19413](https://arxiv.org/abs/2504.19413))
- **Agent Lightning**: "Agent Lightning: Train ANY AI Agents with Reinforcement Learning" ([arXiv:2508.03680](https://arxiv.org/abs/2508.03680))

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Key areas for contribution:
- Additional MCP tool integrations
- Performance optimizations
- Documentation improvements
- Bug fixes and testing
- Example agent implementations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Component Licenses

- **Mem0**: Apache 2.0 License
- **Arize Phoenix**: Apache 2.0 License
- **Agent Lightning**: MIT License
- **Claude Agent SDK**: Anthropic License

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/bob-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/bob-agent/discussions)
- **Documentation**: [docs/](./docs/)

## Acknowledgements

Built with:
- [Claude Agent SDK](https://github.com/anthropics/anthropic-sdk-typescript) by Anthropic
- [Mem0](https://github.com/mem0ai/mem0) memory system
- [Arize Phoenix](https://github.com/Arize-ai/phoenix) observability platform
- [Agent Lightning](https://github.com/microsoft/agent-lightning) by Microsoft Research
- [FastMCP](https://github.com/jlowin/fastmcp) for MCP server implementation

---

<div align="center">

**Built with Claude Agent SDK • Memory by Mem0 • Observability by Arize Phoenix • RL by Agent Lightning**

Made with ❤️ by the Bob Agent Team

</div>
