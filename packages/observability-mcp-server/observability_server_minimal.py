"""
Minimal Observability MCP Server for Bob Agent (Railway MVP)
Uses simple in-memory tracing instead of Arize Phoenix
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import json

from fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("bob-observability-server")

# Store for traces and metrics
traces_store: Dict[str, List[Dict[str, Any]]] = {}
metrics_store: List[Dict[str, Any]] = []
current_trace_id: Optional[str] = None


@mcp.tool()
def start_trace(
    name: str,
    attributes: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Start a new trace for monitoring agent execution"""
    global current_trace_id

    trace_id = f"trace_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
    current_trace_id = trace_id

    trace_entry = {
        "trace_id": trace_id,
        "name": name,
        "start_time": datetime.now().isoformat(),
        "attributes": attributes or {},
        "spans": [],
        "status": "active"
    }

    traces_store[trace_id] = [trace_entry]

    return {
        "success": True,
        "trace_id": trace_id,
        "name": name,
        "start_time": trace_entry["start_time"]
    }


@mcp.tool()
def add_span(
    trace_id: str,
    name: str,
    span_type: str = "tool",
    attributes: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Add a span to an existing trace"""
    if trace_id not in traces_store:
        return {
            "success": False,
            "error": f"Trace {trace_id} not found"
        }

    span_id = f"span_{len(traces_store[trace_id])}"
    span_entry = {
        "span_id": span_id,
        "name": name,
        "type": span_type,
        "start_time": datetime.now().isoformat(),
        "attributes": attributes or {},
        "status": "active"
    }

    traces_store[trace_id].append(span_entry)

    return {
        "success": True,
        "trace_id": trace_id,
        "span_id": span_id,
        "name": name,
        "type": span_type
    }


@mcp.tool()
def end_span(
    trace_id: str,
    span_id: str,
    status: str = "success",
    error: Optional[str] = None
) -> Dict[str, Any]:
    """End a span and mark its completion status"""
    if trace_id not in traces_store:
        return {
            "success": False,
            "error": f"Trace {trace_id} not found"
        }

    for span in traces_store[trace_id]:
        if span.get("span_id") == span_id:
            span["end_time"] = datetime.now().isoformat()
            span["status"] = status
            if error:
                span["error"] = error

            start = datetime.fromisoformat(span["start_time"])
            end = datetime.fromisoformat(span["end_time"])
            span["duration_ms"] = (end - start).total_seconds() * 1000

            return {
                "success": True,
                "trace_id": trace_id,
                "span_id": span_id,
                "status": status,
                "duration_ms": span["duration_ms"]
            }

    return {
        "success": False,
        "error": f"Span {span_id} not found in trace {trace_id}"
    }


@mcp.tool()
def end_trace(
    trace_id: str,
    status: str = "success"
) -> Dict[str, Any]:
    """End a trace and finalize its data"""
    global current_trace_id

    if trace_id not in traces_store:
        return {
            "success": False,
            "error": f"Trace {trace_id} not found"
        }

    trace_entry = traces_store[trace_id][0]
    trace_entry["end_time"] = datetime.now().isoformat()
    trace_entry["status"] = status

    start = datetime.fromisoformat(trace_entry["start_time"])
    end = datetime.fromisoformat(trace_entry["end_time"])
    trace_entry["duration_ms"] = (end - start).total_seconds() * 1000

    if current_trace_id == trace_id:
        current_trace_id = None

    return {
        "success": True,
        "trace_id": trace_id,
        "status": status,
        "duration_ms": trace_entry["duration_ms"],
        "total_spans": len(traces_store[trace_id]) - 1
    }


@mcp.tool()
def record_metric(
    name: str,
    value: float,
    labels: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Record a performance metric"""
    metric = {
        "name": name,
        "value": value,
        "timestamp": datetime.now().isoformat(),
        "labels": labels or {}
    }

    metrics_store.append(metric)

    return {
        "success": True,
        "metric": metric
    }


@mcp.tool()
def get_phoenix_url() -> Dict[str, Any]:
    """Get the URL for the Phoenix observability dashboard"""
    return {
        "success": True,
        "phoenix_url": "http://localhost:6006",
        "message": "Phoenix dashboard not available in MVP deployment (using minimal observability)"
    }


def main():
    """Run the MCP server"""
    mcp.run()


if __name__ == "__main__":
    main()
