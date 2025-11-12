#!/bin/bash

# Bob Agent Alpha 01 - Setup Script
# This script installs all Python MCP servers

set -e

echo "🤖 Bob Agent Alpha 01 Setup"
echo "================================"
echo ""

# Check Python version
echo "📋 Checking Python version..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo "❌ Python not found. Please install Python 3.10 or higher."
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
echo "✅ Found Python $PYTHON_VERSION"
echo ""

# Check if pip is available
echo "📋 Checking pip..."
if ! $PYTHON_CMD -m pip --version &> /dev/null; then
    echo "❌ pip not found. Please install pip."
    exit 1
fi
echo "✅ pip is available"
echo ""

# Install Memory MCP Server
echo "📦 Installing Memory MCP Server (Mem0)..."
cd packages/memory-mcp-server
$PYTHON_CMD -m pip install -e . || {
    echo "❌ Failed to install Memory MCP Server"
    exit 1
}
cd ../..
echo "✅ Memory MCP Server installed"
echo ""

# Install Observability MCP Server
echo "📦 Installing Observability MCP Server (Arize Phoenix)..."
cd packages/observability-mcp-server
$PYTHON_CMD -m pip install -e . || {
    echo "❌ Failed to install Observability MCP Server"
    exit 1
}
cd ../..
echo "✅ Observability MCP Server installed"
echo ""

# Install Ability MCP Server
echo "📦 Installing Ability MCP Server (Agent Lightning)..."
cd packages/ability-mcp-server
$PYTHON_CMD -m pip install -e . || {
    echo "❌ Failed to install Ability MCP Server"
    exit 1
}
cd ../..
echo "✅ Ability MCP Server installed"
echo ""

# Install Node dependencies (if needed)
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js dependencies..."
    if command -v npm &> /dev/null; then
        npm install || {
            echo "⚠️  Warning: Failed to install Node.js dependencies"
        }
        echo "✅ Node.js dependencies installed"
    else
        echo "⚠️  npm not found. Skipping Node.js dependencies."
    fi
    echo ""
fi

echo "✨ Setup Complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Review IMPLEMENTATION_SUMMARY.md for details"
echo "  2. Read MIGRATION_GUIDE.md for usage examples"
echo "  3. Test servers individually:"
echo "     - python packages/memory-mcp-server/memory_server.py"
echo "     - python packages/observability-mcp-server/observability_server.py"
echo "     - python packages/ability-mcp-server/ability_server.py"
echo "  4. Access Phoenix dashboard: http://localhost:6006"
echo ""
echo "🚀 Ready to run Bob Agent!"
