#!/usr/bin/env python3
"""
Comprehensive end-to-end tests for Observability MCP Server
Tests tracing, spans, metrics, and evaluation
"""

import json
import sys
import asyncio
from datetime import datetime
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

class ObservabilityServerTester:
    def __init__(self):
        self.session = None
        self.trace_id = None
        self.span_ids = []
        self.results = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "tests": []
        }

    async def connect(self, command: str, args: list):
        """Connect to the MCP server"""
        server_params = StdioServerParameters(
            command=command,
            args=args,
            env=None
        )

        stdio_transport = await stdio_client(server_params)
        self.stdio, self.write = stdio_transport
        self.session = ClientSession(self.stdio, self.write)

        await self.session.initialize()
        print("Connected to Observability MCP Server")

    async def disconnect(self):
        """Disconnect from the MCP server"""
        if self.session:
            await self.session.__aexit__(None, None, None)
        print("Disconnected from Observability MCP Server")

    def record_test(self, name: str, passed: bool, details: str = ""):
        """Record test result"""
        self.results["total"] += 1
        if passed:
            self.results["passed"] += 1
            status = "PASS"
        else:
            self.results["failed"] += 1
            status = "FAIL"

        self.results["tests"].append({
            "name": name,
            "status": status,
            "details": details
        })

        print(f"[{status}] {name}")
        if details:
            print(f"  Details: {details}")

    async def test_start_trace(self):
        """Test starting a trace"""
        print("\n=== Testing Trace Start ===")

        try:
            result = await self.session.call_tool(
                "start_trace",
                arguments={
                    "name": "test_trace",
                    "attributes": {
                        "test": "true",
                        "environment": "testing"
                    }
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                self.trace_id = response.get("trace_id")
                self.record_test(
                    "Start trace",
                    True,
                    f"Trace ID: {self.trace_id}"
                )
            else:
                self.record_test(
                    "Start trace",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Start trace",
                False,
                f"Exception: {str(e)}"
            )

    async def test_add_spans(self):
        """Test adding spans to a trace"""
        print("\n=== Testing Span Addition ===")

        span_types = ["tool", "llm", "agent", "system"]

        for span_type in span_types:
            try:
                result = await self.session.call_tool(
                    "add_span",
                    arguments={
                        "trace_id": self.trace_id,
                        "name": f"test_{span_type}_span",
                        "span_type": span_type,
                        "attributes": {
                            "test": True,
                            "span_type": span_type
                        }
                    }
                )

                response = json.loads(result.content[0].text)

                if response.get("success"):
                    span_id = response.get("span_id")
                    self.span_ids.append(span_id)
                    self.record_test(
                        f"Add {span_type} span",
                        True,
                        f"Span ID: {span_id}"
                    )
                else:
                    self.record_test(
                        f"Add {span_type} span",
                        False,
                        f"Error: {response.get('error')}"
                    )
            except Exception as e:
                self.record_test(
                    f"Add {span_type} span",
                    False,
                    f"Exception: {str(e)}"
                )

            # Small delay to ensure different timestamps
            await asyncio.sleep(0.1)

    async def test_end_spans(self):
        """Test ending spans"""
        print("\n=== Testing Span Completion ===")

        for i, span_id in enumerate(self.span_ids):
            try:
                status = "success" if i % 2 == 0 else "error"
                error = "Test error" if status == "error" else None

                result = await self.session.call_tool(
                    "end_span",
                    arguments={
                        "trace_id": self.trace_id,
                        "span_id": span_id,
                        "status": status,
                        "error": error
                    }
                )

                response = json.loads(result.content[0].text)

                if response.get("success"):
                    duration = response.get("duration_ms", 0)
                    self.record_test(
                        f"End span {span_id}",
                        True,
                        f"Status: {status}, Duration: {duration:.2f}ms"
                    )
                else:
                    self.record_test(
                        f"End span {span_id}",
                        False,
                        f"Error: {response.get('error')}"
                    )
            except Exception as e:
                self.record_test(
                    f"End span {span_id}",
                    False,
                    f"Exception: {str(e)}"
                )

    async def test_record_metrics(self):
        """Test recording metrics"""
        print("\n=== Testing Metric Recording ===")

        metrics = [
            {"name": "test_latency", "value": 123.45, "labels": {"unit": "ms"}},
            {"name": "test_throughput", "value": 456.78, "labels": {"unit": "req/s"}},
            {"name": "test_error_rate", "value": 0.05, "labels": {"unit": "percent"}}
        ]

        for metric in metrics:
            try:
                result = await self.session.call_tool(
                    "record_metric",
                    arguments=metric
                )

                response = json.loads(result.content[0].text)

                if response.get("success"):
                    self.record_test(
                        f"Record metric: {metric['name']}",
                        True,
                        f"Value: {metric['value']}"
                    )
                else:
                    self.record_test(
                        f"Record metric: {metric['name']}",
                        False,
                        f"Error: {response.get('error')}"
                    )
            except Exception as e:
                self.record_test(
                    f"Record metric: {metric['name']}",
                    False,
                    f"Exception: {str(e)}"
                )

    async def test_get_metrics(self):
        """Test retrieving metrics"""
        print("\n=== Testing Metric Retrieval ===")

        try:
            result = await self.session.call_tool(
                "get_metrics",
                arguments={}
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                count = response.get("count", 0)
                self.record_test(
                    "Get all metrics",
                    count >= 3,
                    f"Retrieved {count} metrics"
                )
            else:
                self.record_test(
                    "Get all metrics",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Get all metrics",
                False,
                f"Exception: {str(e)}"
            )

    async def test_get_trace(self):
        """Test retrieving trace data"""
        print("\n=== Testing Trace Retrieval ===")

        try:
            result = await self.session.call_tool(
                "get_trace",
                arguments={
                    "trace_id": self.trace_id
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                trace = response.get("trace", [])
                self.record_test(
                    "Get trace",
                    len(trace) > 0,
                    f"Retrieved trace with {len(trace)} items"
                )
            else:
                self.record_test(
                    "Get trace",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Get trace",
                False,
                f"Exception: {str(e)}"
            )

    async def test_evaluate_performance(self):
        """Test performance evaluation"""
        print("\n=== Testing Performance Evaluation ===")

        try:
            result = await self.session.call_tool(
                "evaluate_performance",
                arguments={
                    "trace_id": self.trace_id
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                evaluation = response.get("evaluation", {})
                total_spans = evaluation.get("total_spans", 0)
                success_rate = evaluation.get("success_rate", 0)

                self.record_test(
                    "Evaluate performance",
                    total_spans == len(self.span_ids),
                    f"Spans: {total_spans}, Success rate: {success_rate:.2f}"
                )
            else:
                self.record_test(
                    "Evaluate performance",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Evaluate performance",
                False,
                f"Exception: {str(e)}"
            )

    async def test_end_trace(self):
        """Test ending a trace"""
        print("\n=== Testing Trace Completion ===")

        try:
            result = await self.session.call_tool(
                "end_trace",
                arguments={
                    "trace_id": self.trace_id,
                    "status": "success"
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                duration = response.get("duration_ms", 0)
                total_spans = response.get("total_spans", 0)
                self.record_test(
                    "End trace",
                    True,
                    f"Duration: {duration:.2f}ms, Spans: {total_spans}"
                )
            else:
                self.record_test(
                    "End trace",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "End trace",
                False,
                f"Exception: {str(e)}"
            )

    async def test_get_phoenix_url(self):
        """Test getting Phoenix dashboard URL"""
        print("\n=== Testing Phoenix URL ===")

        try:
            result = await self.session.call_tool(
                "get_phoenix_url",
                arguments={}
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                url = response.get("phoenix_url", "")
                self.record_test(
                    "Get Phoenix URL",
                    "http" in url,
                    f"URL: {url}"
                )
            else:
                self.record_test(
                    "Get Phoenix URL",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Get Phoenix URL",
                False,
                f"Exception: {str(e)}"
            )

    async def run_all_tests(self, command: str, args: list):
        """Run all tests"""
        print("=" * 60)
        print("Observability MCP Server - End-to-End Tests")
        print("=" * 60)

        try:
            await self.connect(command, args)

            # Run tests in sequence
            await self.test_start_trace()
            if self.trace_id:
                await self.test_add_spans()
                await self.test_end_spans()
                await self.test_record_metrics()
                await self.test_get_metrics()
                await self.test_get_trace()
                await self.test_evaluate_performance()
                await self.test_end_trace()
            await self.test_get_phoenix_url()

        except Exception as e:
            print(f"\nFATAL ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            await self.disconnect()

        # Print summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.results['total']}")
        print(f"Passed: {self.results['passed']}")
        print(f"Failed: {self.results['failed']}")
        print(f"Success Rate: {(self.results['passed'] / self.results['total'] * 100) if self.results['total'] > 0 else 0:.1f}%")

        return self.results['failed'] == 0

async def main():
    """Main entry point"""
    # Determine command and args based on environment
    if len(sys.argv) > 1:
        command = sys.argv[1]
        args = sys.argv[2:] if len(sys.argv) > 2 else []
    else:
        command = "python"
        args = ["packages/observability-mcp-server/observability_server.py"]

    tester = ObservabilityServerTester()
    success = await tester.run_all_tests(command, args)

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
