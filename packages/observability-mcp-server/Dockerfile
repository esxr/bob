# Observability MCP Server Dockerfile
FROM python:3.11-slim

LABEL maintainer="Bob Agent Team"
LABEL description="Observability MCP Server using Arize Phoenix"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY pyproject.toml README.md ./
COPY observability_server.py ./

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -e .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006

# Expose Phoenix dashboard port and MCP server port
EXPOSE 6006 8002

# Health check script
RUN echo '#!/bin/bash\npython -c "import observability_server; print(\"OK\")"' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /healthcheck.sh

# Run the MCP server
CMD ["python", "observability_server.py"]
