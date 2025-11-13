# Ability MCP Server Dockerfile
FROM python:3.11-slim

LABEL maintainer="Bob Agent Team"
LABEL description="Ability MCP Server using Agent Lightning"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY pyproject.toml README.md ./
COPY ability_server.py ./

# Install Python dependencies
# Note: agentlightning may not be available on PyPI, so we handle it gracefully
RUN pip install --upgrade pip && \
    pip install fastmcp || true && \
    pip install -e . || (pip install fastmcp && echo "Installed fastmcp fallback")

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Expose MCP server port
EXPOSE 8003

# Health check script
RUN echo '#!/bin/bash\npython -c "import ability_server; print(\"OK\")"' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /healthcheck.sh

# Run the MCP server
CMD ["python", "ability_server.py"]
