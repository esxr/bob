"""
Observability MCP Server for Bob Agent using Arize Phoenix
Provides comprehensive monitoring, tracing, and evaluation capabilities
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import json

from fastmcp import FastMCP
import phoenix as px
from phoenix.otel import register
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, ConsoleSpanExporter
from opentelemetry.trace import Status, StatusCode

# Initialize FastMCP server
mcp = FastMCP("bob-observability-server")

# Initialize Phoenix
# Launch Phoenix in the background
phoenix_session = None
tracer_provider = None
tracer = None

# Store for traces and metrics (in-memory for now)
traces_store: Dict[str, List[Dict[str, Any]]] = {}
metrics_store: List[Dict[str, Any]] = []
current_trace_id: Optional[str] = None


def initialize_phoenix():
    """Initialize Phoenix tracing and observability"""
    global phoenix_session, tracer_provider, tracer

    try:
        # Launch Phoenix
        phoenix_session = px.launch_app()

        # Register Phoenix tracer
        tracer_provider = register(
            project_name="bob-agent",
            endpoint="http://localhost:6006/v1/traces"
        )

        # Get tracer
        tracer = trace.get_tracer(__name__)

        return {
            "success": True,
            "phoenix_url": "http://localhost:6006",
            "message": "Phoenix initialized successfully"
        }
    except Exception as e:
        # If Phoenix launch fails, use basic tracer
        tracer_provider = TracerProvider()
        trace.set_tracer_provider(tracer_provider)
        tracer = trace.get_tracer(__name__)

        return {
            "success": True,
            "message": f"Phoenix initialization skipped (running in basic mode): {str(e)}"
        }


# Initialize Phoenix on module load
init_result = initialize_phoenix()


@mcp.tool()
def start_trace(
    name: str,
    attributes: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Start a new trace for monitoring agent execution.

    Args:
        name: Name of the trace
        attributes: Optional attributes to attach to the trace

    Returns:
        Dict containing trace information
    """
    global current_trace_id

    try:
        # Generate trace ID
        trace_id = f"trace_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        current_trace_id = trace_id

        # Create trace entry
        trace_entry = {
            "trace_id": trace_id,
            "name": name,
            "start_time": datetime.now().isoformat(),
            "attributes": attributes or {},
            "spans": [],
            "status": "active"
        }

        traces_store[trace_id] = [trace_entry]

        # Start OpenTelemetry span
        with tracer.start_as_current_span(name) as span:
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, str(value))

            span.set_attribute("trace_id", trace_id)

        return {
            "success": True,
            "trace_id": trace_id,
            "name": name,
            "start_time": trace_entry["start_time"]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def add_span(
    trace_id: str,
    name: str,
    span_type: str = "tool",
    attributes: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Add a span to an existing trace.

    Args:
        trace_id: ID of the trace
        name: Name of the span
        span_type: Type of span (tool, llm, agent, etc.)
        attributes: Optional attributes to attach to the span

    Returns:
        Dict containing span information
    """
    try:
        if trace_id not in traces_store:
            return {
                "success": False,
                "error": f"Trace {trace_id} not found"
            }

        # Create span entry
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

        # Create OpenTelemetry span
        with tracer.start_as_current_span(name) as span:
            span.set_attribute("span.type", span_type)
            span.set_attribute("trace_id", trace_id)
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, str(value))

        return {
            "success": True,
            "trace_id": trace_id,
            "span_id": span_id,
            "name": name,
            "type": span_type
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def end_span(
    trace_id: str,
    span_id: str,
    status: str = "success",
    error: Optional[str] = None
) -> Dict[str, Any]:
    """
    End a span and mark its completion status.

    Args:
        trace_id: ID of the trace
        span_id: ID of the span
        status: Status of the span (success, error)
        error: Optional error message if status is error

    Returns:
        Dict containing span completion information
    """
    try:
        if trace_id not in traces_store:
            return {
                "success": False,
                "error": f"Trace {trace_id} not found"
            }

        # Find and update span
        for span in traces_store[trace_id]:
            if span.get("span_id") == span_id:
                span["end_time"] = datetime.now().isoformat()
                span["status"] = status
                if error:
                    span["error"] = error

                # Calculate duration
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
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def end_trace(
    trace_id: str,
    status: str = "success"
) -> Dict[str, Any]:
    """
    End a trace and finalize its data.

    Args:
        trace_id: ID of the trace
        status: Final status of the trace (success, error)

    Returns:
        Dict containing trace completion information
    """
    global current_trace_id

    try:
        if trace_id not in traces_store:
            return {
                "success": False,
                "error": f"Trace {trace_id} not found"
            }

        # Update trace entry
        trace_entry = traces_store[trace_id][0]
        trace_entry["end_time"] = datetime.now().isoformat()
        trace_entry["status"] = status

        # Calculate total duration
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
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_trace(
    trace_id: str
) -> Dict[str, Any]:
    """
    Retrieve a complete trace with all its spans.

    Args:
        trace_id: ID of the trace

    Returns:
        Dict containing the complete trace data
    """
    try:
        if trace_id not in traces_store:
            return {
                "success": False,
                "error": f"Trace {trace_id} not found"
            }

        return {
            "success": True,
            "trace": traces_store[trace_id]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_all_traces() -> Dict[str, Any]:
    """
    Retrieve all traces.

    Returns:
        Dict containing all traces
    """
    try:
        return {
            "success": True,
            "traces": list(traces_store.values()),
            "count": len(traces_store)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def record_metric(
    name: str,
    value: float,
    labels: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Record a performance metric.

    Args:
        name: Name of the metric
        value: Metric value
        labels: Optional labels for the metric

    Returns:
        Dict containing metric recording confirmation
    """
    try:
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
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_metrics(
    name: Optional[str] = None,
    since: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieve recorded metrics.

    Args:
        name: Optional filter by metric name
        since: Optional ISO timestamp to filter metrics since

    Returns:
        Dict containing filtered metrics
    """
    try:
        filtered_metrics = metrics_store

        if name:
            filtered_metrics = [m for m in filtered_metrics if m["name"] == name]

        if since:
            since_dt = datetime.fromisoformat(since)
            filtered_metrics = [
                m for m in filtered_metrics
                if datetime.fromisoformat(m["timestamp"]) >= since_dt
            ]

        return {
            "success": True,
            "metrics": filtered_metrics,
            "count": len(filtered_metrics)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def evaluate_performance(
    trace_id: str
) -> Dict[str, Any]:
    """
    Evaluate the performance of a trace.

    Args:
        trace_id: ID of the trace to evaluate

    Returns:
        Dict containing evaluation results
    """
    try:
        if trace_id not in traces_store:
            return {
                "success": False,
                "error": f"Trace {trace_id} not found"
            }

        trace_data = traces_store[trace_id]
        spans = trace_data[1:]  # Exclude the trace entry itself

        # Calculate metrics
        total_spans = len(spans)
        successful_spans = len([s for s in spans if s.get("status") == "success"])
        error_spans = len([s for s in spans if s.get("status") == "error"])

        durations = [s.get("duration_ms", 0) for s in spans if "duration_ms" in s]
        avg_duration = sum(durations) / len(durations) if durations else 0
        max_duration = max(durations) if durations else 0
        min_duration = min(durations) if durations else 0

        success_rate = successful_spans / total_spans if total_spans > 0 else 0
        error_rate = error_spans / total_spans if total_spans > 0 else 0

        evaluation = {
            "trace_id": trace_id,
            "total_spans": total_spans,
            "successful_spans": successful_spans,
            "error_spans": error_spans,
            "success_rate": success_rate,
            "error_rate": error_rate,
            "avg_duration_ms": avg_duration,
            "max_duration_ms": max_duration,
            "min_duration_ms": min_duration,
            "evaluation": {
                "performance": "good" if success_rate >= 0.8 and avg_duration < 5000 else "needs_improvement",
                "reliability": "high" if error_rate <= 0.1 else "low",
                "efficiency": "efficient" if avg_duration < 3000 else "slow"
            }
        }

        return {
            "success": True,
            "evaluation": evaluation
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_phoenix_url() -> Dict[str, Any]:
    """
    Get the URL for the Phoenix observability dashboard.

    Returns:
        Dict containing the Phoenix dashboard URL
    """
    return {
        "success": True,
        "phoenix_url": "http://localhost:6006",
        "message": "Open this URL in your browser to view the Phoenix dashboard"
    }


def main():
    """Run the MCP server"""
    mcp.run()


if __name__ == "__main__":
    main()
