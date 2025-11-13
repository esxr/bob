# Bob Agent Test Suite

This directory contains all tests for the Bob Agent project, organized following open-source best practices.

## Directory Structure

```
tests/
├── python/
│   └── e2e/                    # End-to-end tests for Python MCP servers
│       ├── test_memory_server.py
│       ├── test_observability_server.py
│       └── test_ability_server.py
├── typescript/
│   └── integration/            # TypeScript integration tests
│       ├── test-mcp.ts
│       └── test-ability.ts
├── scripts/                    # Test scripts and verification utilities
│   ├── verify-setup.sh         # Verify Python package installation
│   ├── verify-working.sh       # Verify complete working setup
│   └── test-mcp-servers.sh     # Docker-based MCP server tests
└── outputs/                    # Test outputs and logs
    └── verification_output.txt
```

## Test Categories

### 1. Python End-to-End Tests (`python/e2e/`)

These tests verify that each Python MCP server works correctly with real library implementations.

#### Memory Server Tests (`test_memory_server.py`)
- Tests Mem0 integration
- Validates all memory operations: store, retrieve, update, delete
- Tests all memory types: episodic, procedural, semantic, working, long-term
- Verifies memory search and statistics

**Run:**
```bash
.venv/bin/python tests/python/e2e/test_memory_server.py
```

#### Observability Server Tests (`test_observability_server.py`)
- Tests Arize Phoenix integration
- Validates distributed tracing operations
- Tests span creation, updates, and retrieval
- Verifies metrics collection and evaluation
- Tests Phoenix dashboard URL retrieval

**Run:**
```bash
.venv/bin/python tests/python/e2e/test_observability_server.py
```

#### Ability Server Tests (`test_ability_server.py`)
- Tests Agent Lightning integration
- Validates RL episode management
- Tests LLM and tool call recording
- Verifies training statistics and configuration
- Tests episode data retrieval

**Run:**
```bash
.venv/bin/python tests/python/e2e/test_ability_server.py
```

### 2. TypeScript Integration Tests (`typescript/integration/`)

These tests verify that the TypeScript client can communicate with Python MCP servers.

#### MCP Connection Test (`test-mcp.ts`)
- Tests MCP protocol communication
- Validates client-server connection
- Tests observability server tool calls
- Verifies response format parsing

**Run:**
```bash
ts-node tests/typescript/integration/test-mcp.ts
```

#### Ability Integration Test (`test-ability.ts`)
- Tests ability server integration
- Validates episode creation
- Tests structured response parsing

**Run:**
```bash
ts-node tests/typescript/integration/test-ability.ts
```

### 3. Verification Scripts (`scripts/`)

#### Setup Verification (`verify-setup.sh`)
- Checks Python package installation
- Verifies Node.js dependencies
- Validates configuration files
- Tests server startup capability

**Run:**
```bash
npm run test:setup
# or
bash tests/scripts/verify-setup.sh
```

#### Working State Verification (`verify-working.sh`)
- Comprehensive system health check
- Validates all Python dependencies with versions
- Tests MCP server imports
- Verifies TypeScript build
- Checks environment configuration
- Confirms all components work together

**Run:**
```bash
npm run test:verify
# or
bash tests/scripts/verify-working.sh
```

#### Docker MCP Server Tests (`test-mcp-servers.sh`)
- Tests MCP servers in Docker containers
- Validates Docker image builds
- Tests server module loading in containers
- Verifies MCP tools registration
- Tests container startup and health

**Run:**
```bash
npm run test:mcp-servers
# or
bash tests/scripts/test-mcp-servers.sh
```

## Quick Test Commands

### Run All Tests
```bash
npm test
```

This runs:
1. `npm run test:verify` - Complete setup verification
2. `npm run test:python` - All Python E2E tests
3. `npm run test:typescript` - TypeScript integration tests

### Run Individual Test Suites
```bash
# Verify complete setup and working state
npm run test:verify

# Check installation status only
npm run test:setup

# Run Python MCP server E2E tests
npm run test:python

# Run TypeScript integration tests
npm run test:typescript

# Docker-based MCP server tests
npm run test:mcp-servers
```

### Run Specific Tests
```bash
# Individual Python tests
.venv/bin/python tests/python/e2e/test_memory_server.py
.venv/bin/python tests/python/e2e/test_observability_server.py
.venv/bin/python tests/python/e2e/test_ability_server.py

# Individual TypeScript tests
ts-node tests/typescript/integration/test-mcp.ts
ts-node tests/typescript/integration/test-ability.ts
```

## Test Requirements

### Prerequisites
- Python 3.10+ with virtual environment at `.venv/`
- Node.js 18+
- All Python packages installed: `mem0ai`, `arize-phoenix`, `fastmcp`, `agentlightning`
- TypeScript dependencies: `@modelcontextprotocol/sdk`, `@anthropic-ai/claude-agent-sdk`
- Environment variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (optional for some tests)

### Setup
```bash
# Install Python dependencies
pip install -e packages/memory-mcp-server
pip install -e packages/observability-mcp-server
pip install -e packages/ability-mcp-server

# Install Node.js dependencies
npm install

# Build TypeScript
npm run build

# Verify setup
npm run test:setup
```

## Test Output

Test outputs and logs are stored in `tests/outputs/`:
- `verification_output.txt` - Latest verification script output

## Continuous Integration

These tests are designed to run in CI/CD environments:
- All tests exit with proper status codes
- No interactive prompts
- Clear pass/fail reporting
- Machine-readable output formats

## Adding New Tests

### Python Tests
1. Create test file in `tests/python/e2e/test_<name>.py`
2. Follow the existing test structure with test counters
3. Use MCP client session for server communication
4. Add to `test:python` script in `package.json`

### TypeScript Tests
1. Create test file in `tests/typescript/integration/<name>.test.ts`
2. Use `@modelcontextprotocol/sdk` for MCP communication
3. Add proper error handling and logging
4. Update `test:typescript` script in `package.json`

### Test Scripts
1. Create script in `tests/scripts/<name>.sh`
2. Make executable: `chmod +x tests/scripts/<name>.sh`
3. Add colored output for better UX
4. Add to package.json scripts

## Troubleshooting

### Python Tests Failing
- Verify virtual environment: `.venv/bin/python --version`
- Check package installation: `pip list | grep mem0`
- Verify server can start: `python packages/memory-mcp-server/memory_server.py --help`

### TypeScript Tests Failing
- Rebuild TypeScript: `npm run clean && npm run build`
- Check dependencies: `npm list @modelcontextprotocol/sdk`
- Verify MCP config: `cat mcp.json`

### Script Tests Failing
- Make scripts executable: `chmod +x tests/scripts/*.sh`
- Check file paths are absolute
- Verify all dependencies installed

## Test Philosophy

This test suite follows these principles:

1. **Real Libraries**: No mocks - tests use actual Mem0, Phoenix, and Agent Lightning
2. **End-to-End Coverage**: Tests verify complete workflows, not just units
3. **MCP Protocol**: Tests validate MCP communication between TypeScript and Python
4. **Fast Feedback**: Tests run quickly for rapid development cycles
5. **Clear Reporting**: Test output is human-readable and actionable
6. **CI-Ready**: All tests designed for automated environments

## Contributing

When adding tests:
- Follow existing patterns and structure
- Add clear documentation
- Ensure tests are idempotent
- Include both happy path and error cases
- Update this README with new test information

See [CONTRIBUTING.md](../CONTRIBUTING.md) for general contribution guidelines.
