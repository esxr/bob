# Multi-stage Dockerfile for Bob Agent
# Combines Python (for MCP servers) and Node.js (for main agent)

# Stage 1: Python dependencies
FROM python:3.11-slim as python-builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy Python MCP server packages
COPY packages/memory-mcp-server /app/packages/memory-mcp-server
COPY packages/observability-mcp-server /app/packages/observability-mcp-server
COPY packages/ability-mcp-server /app/packages/ability-mcp-server

# Install Python packages with cache mount for faster rebuilds
RUN --mount=type=cache,id=pip-cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install -e /app/packages/memory-mcp-server && \
    pip install -e /app/packages/observability-mcp-server && \
    pip install -e /app/packages/ability-mcp-server

# Stage 2: Node.js builder
FROM node:18-slim as node-builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install Node.js dependencies with cache mount
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci --only=production && \
    npm ci --only=development

# Copy TypeScript source
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Stage 3: Production runtime
FROM python:3.11-slim

# Install Node.js 18 in Python image
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python packages and installations from builder
COPY --from=python-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-builder /usr/local/bin /usr/local/bin
COPY --from=python-builder /app/packages /app/packages

# Copy Node.js dependencies and built files
COPY --from=node-builder /app/node_modules /app/node_modules
COPY --from=node-builder /app/dist /app/dist
COPY --from=node-builder /app/package.json /app/package.json

# Copy MCP configuration
COPY .mcp.json /app/.mcp.json

# Copy source files (needed for MCP servers)
COPY src /app/src

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PATH="/usr/local/bin:${PATH}"

# Expose Phoenix dashboard port (optional, for local development)
EXPOSE 6006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)"

# Default command - can be overridden
# Usage: docker run -e ANTHROPIC_API_KEY=... -e OPENAI_API_KEY=... bob-agent --goal "task"
ENTRYPOINT ["npm", "start", "--"]
CMD ["--goal", "Hello from Bob Agent!"]
