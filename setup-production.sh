#!/bin/bash
# Production Setup Script for Bob Agent Alpha 01
# This script sets up ALL dependencies correctly

set -e  # Exit on error

echo "=========================================="
echo "Bob Agent Alpha 01 - Production Setup"
echo "=========================================="
echo ""

# Check for required tools
echo "📋 Checking prerequisites..."

if ! command -v /opt/homebrew/bin/python3.12 &> /dev/null; then
    echo "❌ Python 3.12 not found at /opt/homebrew/bin/python3.12"
    echo "   Please install Python 3.12+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    echo "   Please install Node.js and npm"
    exit 1
fi

echo "✅ Prerequisites OK"
echo ""

# Create Python virtual environment
echo "🐍 Setting up Python environment..."

if [ -d ".venv" ]; then
    echo "   Virtual environment already exists"
else
    /opt/homebrew/bin/python3.12 -m venv .venv
    echo "   ✅ Created virtual environment"
fi

# Upgrade pip
.venv/bin/python -m pip install --upgrade pip --quiet

echo "✅ Python environment ready"
echo ""

# Install Python dependencies
echo "📦 Installing Python dependencies..."

.venv/bin/pip install --quiet \
    fastmcp \
    mem0ai \
    arize-phoenix \
    opentelemetry-api \
    opentelemetry-sdk

echo "   ✅ Core dependencies installed"

# Install Agent Lightning from GitHub
echo "   Installing Agent Lightning..."
.venv/bin/pip install --quiet git+https://github.com/microsoft/agent-lightning.git

# Fix version conflicts
.venv/bin/pip install --upgrade --quiet mcp rich websockets

echo "✅ All Python dependencies installed"
echo ""

# Verify Python packages
echo "🔍 Verifying Python installation..."

REQUIRED_PACKAGES=("fastmcp" "mem0ai" "arize-phoenix" "agentlightning" "opentelemetry-api")
ALL_OK=true

for package in "${REQUIRED_PACKAGES[@]}"; do
    if .venv/bin/python -c "import ${package//-/_}" 2>/dev/null; then
        echo "   ✅ $package"
    else
        echo "   ❌ $package - FAILED TO IMPORT"
        ALL_OK=false
    fi
done

if [ "$ALL_OK" = false ]; then
    echo ""
    echo "❌ Some packages failed to import"
    exit 1
fi

echo "✅ All Python packages verified"
echo ""

# Install Node dependencies
echo "📦 Installing Node dependencies..."

npm install --silent

echo "✅ Node dependencies installed"
echo ""

# Test Python MCP servers
echo "🧪 Testing Python MCP servers..."

TEST_OK=true

# Test memory server can import
if .venv/bin/python -c "from packages.memory_mcp_server import memory_server" 2>/dev/null; then
    echo "   ✅ Memory server imports"
else
    # Try running it directly
    if .venv/bin/python packages/memory-mcp-server/memory_server.py --help &>/dev/null; then
        echo "   ✅ Memory server (manual test)"
    else
        echo "   ⚠️  Memory server (needs OPENAI_API_KEY for full functionality)"
    fi
fi

if .venv/bin/python -c "import phoenix" 2>/dev/null; then
    echo "   ✅ Observability server libraries"
else
    echo "   ❌ Observability server - phoenix import failed"
    TEST_OK=false
fi

if .venv/bin/python -c "import agentlightning" 2>/dev/null; then
    echo "   ✅ Ability server libraries"
else
    echo "   ❌ Ability server - agentlightning import failed"
    TEST_OK=false
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "📊 Installation Summary:"
echo ""
echo "Python Environment:"
echo "  Location: .venv/"
echo "  Version: $(.venv/bin/python --version)"
echo ""
echo "Key Packages:"
.venv/bin/pip list | grep -E "(fastmcp|mem0ai|arize-phoenix|agentlightning)" | sed 's/^/  /'
echo ""
echo "MCP Servers:"
echo "  • bob-memory (mem0ai)"
echo "  • bob-observability (arize-phoenix)"
echo "  • bob-ability (agentlightning)"
echo ""
echo "🚀 Ready to run:"
echo ""
echo "  # Run the agent:"
echo "  npm start -- --goal 'Your goal here'"
echo ""
echo "  # Test memory server directly:"
echo "  .venv/bin/python packages/memory-mcp-server/memory_server.py"
echo ""
echo "  # View Phoenix observability UI:"
echo "  open http://localhost:6006"
echo ""
echo "📝 Optional: Set environment variables for full functionality:"
echo "  export OPENAI_API_KEY='your-key'  # For mem0 semantic search"
echo "  export ANTHROPIC_API_KEY='your-key'  # For Claude agent"
echo ""
