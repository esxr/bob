#!/usr/bin/env python3
"""
Comprehensive end-to-end tests for Memory MCP Server
Tests all memory operations: store, retrieve, update, delete
"""

import json
import sys
import asyncio
from datetime import datetime
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Test configuration
TEST_USER_ID = "test_user_e2e"
MEMORY_TYPES = ["episodic", "procedural", "semantic", "working", "long-term"]

class MemoryServerTester:
    def __init__(self):
        self.session = None
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
        print("Connected to Memory MCP Server")

    async def disconnect(self):
        """Disconnect from the MCP server"""
        if self.session:
            await self.session.__aexit__(None, None, None)
        print("Disconnected from Memory MCP Server")

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

    async def test_store_memory(self):
        """Test storing memories of different types"""
        print("\n=== Testing Memory Storage ===")

        for memory_type in MEMORY_TYPES:
            try:
                result = await self.session.call_tool(
                    "store_memory",
                    arguments={
                        "content": f"Test {memory_type} memory content",
                        "memory_type": memory_type,
                        "user_id": TEST_USER_ID,
                        "metadata": {"test": True, "timestamp": datetime.now().isoformat()}
                    }
                )

                response = json.loads(result.content[0].text)

                if response.get("success"):
                    self.record_test(
                        f"Store {memory_type} memory",
                        True,
                        f"Memory ID: {response.get('memory_id')}"
                    )
                else:
                    self.record_test(
                        f"Store {memory_type} memory",
                        False,
                        f"Error: {response.get('error')}"
                    )
            except Exception as e:
                self.record_test(
                    f"Store {memory_type} memory",
                    False,
                    f"Exception: {str(e)}"
                )

    async def test_search_memories(self):
        """Test searching memories"""
        print("\n=== Testing Memory Search ===")

        try:
            result = await self.session.call_tool(
                "search_memories",
                arguments={
                    "query": "test memory",
                    "user_id": TEST_USER_ID,
                    "limit": 10
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                count = response.get("count", 0)
                self.record_test(
                    "Search memories",
                    True,
                    f"Found {count} memories"
                )
            else:
                self.record_test(
                    "Search memories",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Search memories",
                False,
                f"Exception: {str(e)}"
            )

    async def test_get_all_memories(self):
        """Test retrieving all memories"""
        print("\n=== Testing Get All Memories ===")

        try:
            result = await self.session.call_tool(
                "get_all_memories",
                arguments={
                    "user_id": TEST_USER_ID
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                count = response.get("count", 0)
                self.record_test(
                    "Get all memories",
                    count >= 5,  # We stored 5 memory types
                    f"Retrieved {count} memories"
                )
            else:
                self.record_test(
                    "Get all memories",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Get all memories",
                False,
                f"Exception: {str(e)}"
            )

    async def test_memory_stats(self):
        """Test getting memory statistics"""
        print("\n=== Testing Memory Statistics ===")

        try:
            result = await self.session.call_tool(
                "get_memory_stats",
                arguments={
                    "user_id": TEST_USER_ID
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                stats = response.get("stats", {})
                total = stats.get("total", 0)
                by_type = stats.get("by_type", {})

                self.record_test(
                    "Get memory statistics",
                    total >= 5,
                    f"Total: {total}, By type: {by_type}"
                )
            else:
                self.record_test(
                    "Get memory statistics",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Get memory statistics",
                False,
                f"Exception: {str(e)}"
            )

    async def test_delete_all_memories(self):
        """Test deleting all memories"""
        print("\n=== Testing Memory Deletion ===")

        try:
            result = await self.session.call_tool(
                "delete_all_memories",
                arguments={
                    "user_id": TEST_USER_ID
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                self.record_test(
                    "Delete all memories",
                    True,
                    "All memories deleted successfully"
                )
            else:
                self.record_test(
                    "Delete all memories",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Delete all memories",
                False,
                f"Exception: {str(e)}"
            )

    async def run_all_tests(self, command: str, args: list):
        """Run all tests"""
        print("=" * 60)
        print("Memory MCP Server - End-to-End Tests")
        print("=" * 60)

        try:
            await self.connect(command, args)

            # Run tests in sequence
            await self.test_store_memory()
            await self.test_search_memories()
            await self.test_get_all_memories()
            await self.test_memory_stats()
            await self.test_delete_all_memories()

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
        # Custom command provided
        command = sys.argv[1]
        args = sys.argv[2:] if len(sys.argv) > 2 else []
    else:
        # Default: assume Python script in current directory
        command = "python"
        args = ["packages/memory-mcp-server/memory_server.py"]

    tester = MemoryServerTester()
    success = await tester.run_all_tests(command, args)

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
