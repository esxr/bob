# Docker Setup and Usage for Bob Agent MCP Servers

This document provides comprehensive instructions for using the Dockerized MCP servers in the Bob Agent project.

## Overview

The Bob Agent project includes three Python MCP servers that have been containerized:

1. **Memory Server** (Mem0) - Multi-layered memory system
2. **Observability Server** (Arize Phoenix) - Distributed tracing and monitoring
3. **Ability Server** (Agent Lightning) - Reinforcement learning training

## Architecture

### Docker Images

Each MCP server has its own Dockerfile:
- `/packages/memory-mcp-server/Dockerfile`
- `/packages/observability-mcp-server/Dockerfile`
- `/packages/ability-mcp-server/Dockerfile`

### Docker Compose

The `docker-compose.mcp.yml` file orchestrates all three servers with:
- Isolated networks for inter-service communication
- Persistent volumes for data storage
- Health checks for monitoring
- Environment variable configuration

## Building the Images

### Build All Images

```bash
docker-compose -f docker-compose.mcp.yml build
```

### Build Individual Images

```bash
# Memory server
docker build -t bob-memory-server packages/memory-mcp-server/

# Observability server
docker build -t bob-observability-server packages/observability-mcp-server/

# Ability server
docker build -t bob-ability-server packages/ability-mcp-server/
```

### Build with No Cache

```bash
docker-compose -f docker-compose.mcp.yml build --no-cache
```

## Running the Containers

### Start All Services

```bash
docker-compose -f docker-compose.mcp.yml up -d
```

### Start Individual Services

```bash
docker-compose -f docker-compose.mcp.yml up -d bob-memory-server
docker-compose -f docker-compose.mcp.yml up -d bob-observability-server
docker-compose -f docker-compose.mcp.yml up -d bob-ability-server
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.mcp.yml logs -f

# Individual service
docker logs bob-memory-server -f
docker logs bob-observability-server -f
docker logs bob-ability-server -f
```

### Stop Services

```bash
docker-compose -f docker-compose.mcp.yml down
```

### Stop and Remove Volumes

```bash
docker-compose -f docker-compose.mcp.yml down -v
```

## Environment Variables

### Memory Server

- `OPENAI_API_KEY` - Required for Mem0 embeddings (optional for basic testing)

### Observability Server

- `PHOENIX_COLLECTOR_ENDPOINT` - Phoenix collector URL (default: http://localhost:6006)

### Ability Server

No special environment variables required for basic operation.

### Setting Environment Variables

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=your_openai_api_key_here
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006
```

Or pass them directly:

```bash
OPENAI_API_KEY=your_key docker-compose -f docker-compose.mcp.yml up
```

## Accessing Services

### Observability Dashboard (Phoenix)

Once the observability server is running, access the Phoenix dashboard at:

```
http://localhost:6006
```

### Port Mappings

- Memory Server: 8001 (internal only)
- Observability Server: 8002, 6006 (Phoenix dashboard)
- Ability Server: 8003 (internal only)

## Testing

### Run the Comprehensive Test Suite

```bash
./test-mcp-servers.sh
```

This script tests:
- Docker image existence
- Module loading in containers
- Tool registration
- Container startup and health

### Manual Testing

Test individual servers:

```bash
# Test memory server
docker run --rm bob_agent_alpha_01-bob-memory-server python -c "import memory_server; print('OK')"

# Test observability server
docker run --rm bob_agent_alpha_01-bob-observability-server python -c "import observability_server; print('OK')"

# Test ability server
docker run --rm bob_agent_alpha_01-bob-ability-server python -c "import ability_server; print('OK')"
```

## Understanding MCP Server Behavior

### STDIO-Based Communication

MCP servers use STDIO (standard input/output) for communication, not HTTP. This means:

1. **Expected Behavior**: Memory and Ability servers will appear to "restart" when run in detached mode because they wait for input on stdin.
2. **Solution**: These servers are designed to be started by a parent process (like the TypeScript main agent) that communicates via stdin/stdout.

### Container Status

When you run `docker ps`, you may see:
- **Observability Server**: Running (it includes a web dashboard)
- **Memory Server**: Restarting (normal for STDIO servers)
- **Ability Server**: Restarting (normal for STDIO servers)

This is expected behavior. The servers are functioning correctly and will respond when accessed via the MCP protocol.

## Integration with Main Agent

The TypeScript main agent connects to these servers via the configuration in `mcp.json`:

```json
{
  "mcpServers": {
    "bob-memory": {
      "command": ".venv/bin/python",
      "args": ["packages/memory-mcp-server/memory_server.py"]
    },
    "bob-observability": {
      "command": ".venv/bin/python",
      "args": ["packages/observability-mcp-server/observability_server.py"]
    },
    "bob-ability": {
      "command": ".venv/bin/python",
      "args": ["packages/ability-mcp-server/ability_server.py"]
    }
  }
}
```

For Docker-based deployment, you would modify this to use Docker exec or docker-compose exec.

## Data Persistence

Data is persisted in Docker volumes:

- `bob-memory-data` - Memory/embedding data
- `bob-observability-data` - Traces and metrics
- `bob-ability-data` - RL training episodes

### View Volume Data

```bash
docker volume ls | grep bob
docker volume inspect bob-memory-data
```

### Backup Volumes

```bash
# Create backup directory
mkdir -p backups

# Backup memory data
docker run --rm -v bob-memory-data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/memory-data-$(date +%Y%m%d).tar.gz -C /data .

# Backup observability data
docker run --rm -v bob-observability-data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/observability-data-$(date +%Y%m%d).tar.gz -C /data .

# Backup ability data
docker run --rm -v bob-ability-data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/ability-data-$(date +%Y%m%d).tar.gz -C /data .
```

### Restore Volumes

```bash
# Restore memory data
docker run --rm -v bob-memory-data:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/memory-data-YYYYMMDD.tar.gz -C /data

# Similar for other volumes...
```

## Troubleshooting

### Issue: Containers Keep Restarting

**Explanation**: This is normal for STDIO-based MCP servers. They wait for input on stdin.

**Solution**: Use the servers via the MCP protocol, not by running containers in detached mode.

### Issue: Out of Memory Errors

**Solution**: Increase Docker memory limits in Docker Desktop settings.

### Issue: Port Already in Use

**Solution**: Change port mappings in `docker-compose.mcp.yml` or stop conflicting services.

```bash
# Check what's using port 6006
lsof -i :6006

# Kill the process
kill -9 <PID>
```

### Issue: Permission Denied

**Solution**: Ensure Docker has proper permissions and you're in the docker group (Linux).

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## Development Workflow

### Rebuild After Code Changes

```bash
# Rebuild specific service
docker-compose -f docker-compose.mcp.yml build bob-memory-server

# Rebuild all services
docker-compose -f docker-compose.mcp.yml build

# Restart services
docker-compose -f docker-compose.mcp.yml up -d
```

### View Real-Time Logs

```bash
docker-compose -f docker-compose.mcp.yml logs -f --tail=100
```

### Execute Commands in Running Container

```bash
docker exec -it bob-memory-server /bin/bash
docker exec -it bob-observability-server python -c "import observability_server; print(observability_server.get_phoenix_url())"
```

## Production Deployment

### Recommendations

1. **Use Environment-Specific Configurations**: Separate dev, staging, and prod compose files.
2. **Enable Health Checks**: Already configured in docker-compose.mcp.yml
3. **Use Docker Secrets**: For sensitive environment variables
4. **Set Resource Limits**: Add memory and CPU limits
5. **Use Volume Backups**: Regular automated backups
6. **Monitor Logs**: Use a log aggregation service (e.g., ELK stack)

### Example Resource Limits

Add to `docker-compose.mcp.yml`:

```yaml
services:
  bob-memory-server:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

## Advanced Usage

### Custom Network Configuration

```yaml
networks:
  bob-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

### Multi-Stage Builds

The Dockerfiles use multi-stage builds to minimize image size:
- Build stage installs dependencies
- Production stage copies only necessary files

### Health Check Customization

Modify health check intervals in docker-compose.mcp.yml:

```yaml
healthcheck:
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s
```

## Summary

The Bob Agent MCP servers are now fully dockerized and ready for deployment. Key points:

- ✅ All three servers have individual Dockerfiles
- ✅ Docker Compose orchestrates all services
- ✅ Persistent volumes for data storage
- ✅ Health checks for monitoring
- ✅ Comprehensive test suite included
- ✅ Phoenix dashboard accessible at localhost:6006
- ✅ MCP protocol communication via STDIO

For questions or issues, refer to the main project documentation or create an issue in the repository.
