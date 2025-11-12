# Contributing to Bob Agent

Thank you for your interest in contributing to Bob Agent! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors. We expect:

- Respectful communication
- Constructive feedback
- Focus on what is best for the community
- Empathy towards other community members

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- Git
- Anthropic API key
- OpenAI API key

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bob-agent.git
   cd bob-agent
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/bob-agent.git
   ```

## Development Setup

### Quick Setup

Run the automated setup script:

```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

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

### Environment Configuration

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
# Edit .env with your API keys
```

### Verify Setup

```bash
./verify-setup.sh
```

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

1. **Bug Fixes**: Fix identified bugs in the codebase
2. **Features**: Implement new features or enhancements
3. **Documentation**: Improve or add documentation
4. **Tests**: Add or improve test coverage
5. **Performance**: Optimize existing code
6. **MCP Tools**: Create new MCP tool integrations

### Finding Issues to Work On

- Check the [Issues](https://github.com/OWNER/bob-agent/issues) page
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to let others know you're working on it

### Proposing New Features

Before implementing a new feature:

1. Open an issue to discuss the feature
2. Wait for feedback from maintainers
3. If approved, proceed with implementation

## Code Style

### TypeScript

- Use TypeScript strict mode
- Follow existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Maximum line length: 100 characters

```typescript
/**
 * Brief description of the function
 * @param goal - The agent's goal
 * @returns The execution result
 */
async function execute(goal: AgentGoal): Promise<ExecutionResult> {
  // Implementation
}
```

### Python

- Follow PEP 8 style guide
- Use type hints
- Add docstrings to functions and classes
- Maximum line length: 88 characters (Black formatter)

```python
def process_memory(content: str, metadata: dict) -> MemoryEntry:
    """
    Process and store a memory entry.

    Args:
        content: The memory content
        metadata: Additional metadata

    Returns:
        The created memory entry
    """
    # Implementation
```

### Formatting

We use automated formatters:

**TypeScript**: Prettier
```bash
npm run format
```

**Python**: Black
```bash
black packages/
```

## Testing

### Running Tests

```bash
# Test all MCP servers
./verify-setup.sh

# Test individual components
python packages/memory-mcp-server/memory_server.py
python packages/observability-mcp-server/observability_server.py
python packages/ability-mcp-server/ability_server.py

# Run TypeScript tests
npm test
```

### Writing Tests

- Add tests for new features
- Ensure existing tests pass
- Aim for meaningful test coverage
- Test edge cases and error conditions

**TypeScript Tests**:
```typescript
describe('BobAgent', () => {
  it('should execute a simple goal', async () => {
    const agent = new BobAgent(config);
    const result = await agent.execute(goal);
    expect(result.success).toBe(true);
  });
});
```

**Python Tests**:
```python
def test_memory_storage():
    """Test memory storage functionality"""
    server = MemoryServer()
    result = server.store_memory("test content", {})
    assert result is not None
```

## Pull Request Process

### Before Submitting

1. **Update from upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests**:
   ```bash
   ./verify-setup.sh
   npm test
   ```

3. **Run linters**:
   ```bash
   npm run lint
   black packages/
   ```

4. **Update documentation** if needed

### Creating a Pull Request

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request on GitHub

### Commit Message Format

Follow conventional commits:

```
type(scope): subject

body

footer
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(memory): add semantic search capability
fix(agent): resolve execution timeout issue
docs(readme): update installation instructions
```

### Pull Request Requirements

- **Title**: Clear, descriptive title
- **Description**: Explain what changes were made and why
- **Tests**: Include tests for new functionality
- **Documentation**: Update relevant documentation
- **No breaking changes** without discussion
- **Clean commit history**: Squash if necessary

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

## Reporting Issues

### Bug Reports

When reporting bugs, include:

1. **Description**: Clear description of the bug
2. **Steps to reproduce**: Detailed steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Environment**:
   - OS and version
   - Python version
   - Node.js version
   - Relevant package versions
6. **Logs**: Error messages or logs
7. **Screenshots**: If applicable

### Feature Requests

When requesting features, include:

1. **Description**: Clear description of the feature
2. **Use case**: Why is this feature needed?
3. **Proposed solution**: How might it work?
4. **Alternatives**: Other approaches considered

## Development Workflow

### Branching Strategy

- `main`: Production-ready code
- `develop`: Integration branch (if used)
- `feature/*`: New features
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates

### Release Process

1. Version bump in `package.json` and relevant `pyproject.toml` files
2. Update `CHANGELOG.md`
3. Create release notes
4. Tag the release
5. Deploy to package registries

## Getting Help

- **Documentation**: Check the [docs/](./docs/) directory
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community (link)

## Recognition

Contributors will be recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Project README

Thank you for contributing to Bob Agent!
