#!/bin/bash

# Bob Agent Alpha 01 - Verification Script
# This script verifies that all Python MCP servers are properly installed

set -e

echo "🔍 Bob Agent Alpha 01 - Setup Verification"
echo "==========================================="
echo ""

# Determine Python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo "❌ Python not found"
    exit 1
fi

# Check Python packages
echo "📦 Checking Python packages..."
echo ""

# Check Memory Server
echo "1. Memory MCP Server (Mem0):"
if $PYTHON_CMD -c "import mem0" 2>/dev/null; then
    echo "   ✅ mem0ai installed"
else
    echo "   ❌ mem0ai not installed"
    echo "      Run: pip install -e packages/memory-mcp-server"
fi

if $PYTHON_CMD -c "import fastmcp" 2>/dev/null; then
    echo "   ✅ fastmcp installed"
else
    echo "   ❌ fastmcp not installed"
fi

if [ -f "packages/memory-mcp-server/memory_server.py" ]; then
    echo "   ✅ memory_server.py exists"
else
    echo "   ❌ memory_server.py not found"
fi
echo ""

# Check Observability Server
echo "2. Observability MCP Server (Arize Phoenix):"
if $PYTHON_CMD -c "import phoenix" 2>/dev/null; then
    echo "   ✅ arize-phoenix installed"
else
    echo "   ❌ arize-phoenix not installed"
    echo "      Run: pip install -e packages/observability-mcp-server"
fi

if $PYTHON_CMD -c "import opentelemetry" 2>/dev/null; then
    echo "   ✅ opentelemetry installed"
else
    echo "   ❌ opentelemetry not installed"
fi

if [ -f "packages/observability-mcp-server/observability_server.py" ]; then
    echo "   ✅ observability_server.py exists"
else
    echo "   ❌ observability_server.py not found"
fi
echo ""

# Check Ability Server
echo "3. Ability MCP Server (Agent Lightning):"
if $PYTHON_CMD -c "import agentlightning" 2>/dev/null; then
    echo "   ✅ agentlightning installed"
else
    echo "   ❌ agentlightning not installed"
    echo "      Run: pip install -e packages/ability-mcp-server"
fi

if [ -f "packages/ability-mcp-server/ability_server.py" ]; then
    echo "   ✅ ability_server.py exists"
else
    echo "   ❌ ability_server.py not found"
fi
echo ""

# Check configuration
echo "📋 Checking configuration..."
echo ""

if [ -f "mcp.json" ]; then
    echo "   ✅ mcp.json exists"
else
    echo "   ❌ mcp.json not found"
fi

if [ -f "IMPLEMENTATION_SUMMARY.md" ]; then
    echo "   ✅ IMPLEMENTATION_SUMMARY.md exists"
else
    echo "   ❌ IMPLEMENTATION_SUMMARY.md not found"
fi

if [ -f "MIGRATION_GUIDE.md" ]; then
    echo "   ✅ MIGRATION_GUIDE.md exists"
else
    echo "   ❌ MIGRATION_GUIDE.md not found"
fi
echo ""

# Check Node.js
echo "📦 Checking Node.js..."
echo ""

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js installed: $NODE_VERSION"
else
    echo "   ⚠️  Node.js not found (required for main agent)"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "   ✅ npm installed: $NPM_VERSION"
else
    echo "   ⚠️  npm not found"
fi

if [ -f "package.json" ]; then
    echo "   ✅ package.json exists"
else
    echo "   ❌ package.json not found"
fi
echo ""

# Summary
echo "📊 Summary"
echo "=========="
echo ""
echo "📚 Documentation:"
echo "   - README.md                    Main documentation"
echo "   - IMPLEMENTATION_SUMMARY.md    Technical details"
echo "   - MIGRATION_GUIDE.md           Usage examples"
echo "   - CHANGES.md                   Change summary"
echo ""
echo "🔧 MCP Servers:"
echo "   - packages/memory-mcp-server/"
echo "   - packages/observability-mcp-server/"
echo "   - packages/ability-mcp-server/"
echo ""
echo "🧪 Test servers individually:"
echo "   python packages/memory-mcp-server/memory_server.py"
echo "   python packages/observability-mcp-server/observability_server.py"
echo "   python packages/ability-mcp-server/ability_server.py"
echo ""
echo "🌐 Phoenix Dashboard:"
echo "   http://localhost:6006 (when observability server is running)"
echo ""
