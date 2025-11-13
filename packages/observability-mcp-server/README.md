# Bob Observability MCP Server

Observability MCP Server for Bob Agent using [Arize Phoenix](https://github.com/Arize-ai/phoenix).

## Features

- **End-to-End Tracing**: Detailed tracing of agent workflows and decisions
- **Performance Monitoring**: Track execution time, success rates, and errors
- **Metrics Recording**: Record and retrieve performance metrics
- **Evaluation**: Automatically evaluate trace performance
- **Phoenix Dashboard**: Visual interface for exploring traces and metrics
- **OpenTelemetry Integration**: Standard telemetry protocol support

## Installation

```bash
pip install -e .
```

## Requirements

- Python 3.10+
- arize-phoenix >= 5.0.0
- opentelemetry-api >= 1.20.0
- opentelemetry-sdk >= 1.20.0
- fastmcp >= 0.1.0

## Usage

### Start the MCP Server

```bash
bob-observability-server
```

Or run directly:

```bash
python observability_server.py
```

### Phoenix Dashboard

Once started, the Phoenix dashboard will be available at:
```
http://localhost:6006
```

Open this URL in your browser to visualize traces and metrics.

### Available Tools

1. **start_trace**: Start a new trace for monitoring agent execution
2. **add_span**: Add a span to an existing trace
3. **end_span**: End a span and mark its completion status
4. **end_trace**: End a trace and finalize its data
5. **get_trace**: Retrieve a complete trace with all its spans
6. **get_all_traces**: Retrieve all traces
7. **record_metric**: Record a performance metric
8. **get_metrics**: Retrieve recorded metrics
9. **evaluate_performance**: Evaluate the performance of a trace
10. **get_phoenix_url**: Get the URL for the Phoenix dashboard

### Span Types

- **tool**: Tool invocations
- **llm**: LLM calls
- **agent**: Agent reasoning steps
- **memory**: Memory operations
- **custom**: Custom operations

## Integration with Bob Agent

Add this server to your `mcp.json` configuration:

```json
{
  "mcpServers": {
    "bob-observability": {
      "command": "bob-observability-server"
    }
  }
}
```

## Based on Arize Phoenix

This server uses [Arize Phoenix](https://github.com/Arize-ai/phoenix), an open-source AI observability platform with:
- Real-time tracing and monitoring
- OpenTelemetry compatibility
- Advanced visualization
- Performance evaluation
- Anomaly detection

For more information, visit: https://phoenix.arize.com
