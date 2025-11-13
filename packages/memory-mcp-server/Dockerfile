# Memory MCP Server Dockerfile
FROM python:3.11-slim

LABEL maintainer="Bob Agent Team"
LABEL description="Memory MCP Server using Mem0"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY pyproject.toml README.md ./
COPY memory_server.py ./

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -e .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Expose MCP server port (stdio-based, no port needed but we'll expose 8001 for health checks)
EXPOSE 8001

# Health check script
RUN echo '#!/bin/bash\npython -c "import memory_server; print(\"OK\")"' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /healthcheck.sh

# Run the MCP server
CMD ["python", "memory_server.py"]
