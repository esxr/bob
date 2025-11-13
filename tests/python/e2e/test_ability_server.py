#!/usr/bin/env python3
"""
Comprehensive end-to-end tests for Ability MCP Server
Tests RL training, episodes, transitions, and training configuration
"""

import json
import sys
import asyncio
from datetime import datetime
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

class AbilityServerTester:
    def __init__(self):
        self.session = None
        self.episode_id = None
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
        print("Connected to Ability MCP Server")

    async def disconnect(self):
        """Disconnect from the MCP server"""
        if self.session:
            await self.session.__aexit__(None, None, None)
        print("Disconnected from Ability MCP Server")

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

    async def test_start_episode(self):
        """Test starting a training episode"""
        print("\n=== Testing Episode Start ===")

        try:
            result = await self.session.call_tool(
                "start_episode",
                arguments={
                    "goal": "Test goal: Learn to use tools effectively",
                    "metadata": {
                        "test": True,
                        "environment": "testing"
                    }
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                self.episode_id = response.get("episode_id")
                self.record_test(
                    "Start episode",
                    True,
                    f"Episode ID: {self.episode_id}"
                )
            else:
                self.record_test(
                    "Start episode",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Start episode",
                False,
                f"Exception: {str(e)}"
            )

    async def test_record_llm_calls(self):
        """Test recording LLM calls"""
        print("\n=== Testing LLM Call Recording ===")

        llm_calls = [
            {
                "input_text": "What is the capital of France?",
                "output_text": "The capital of France is Paris.",
                "model": "claude",
                "reward": 1.0
            },
            {
                "input_text": "Calculate 2 + 2",
                "output_text": "2 + 2 = 4",
                "model": "claude",
                "reward": 1.0
            },
            {
                "input_text": "Write a haiku about coding",
                "output_text": "Code flows like water\nBugs surface, then disappear\nPeace in the machine",
                "model": "claude",
                "reward": 0.9
            }
        ]

        for i, call in enumerate(llm_calls):
            try:
                result = await self.session.call_tool(
                    "record_llm_call",
                    arguments={
                        "episode_id": self.episode_id,
                        **call,
                        "metadata": {"call_number": i + 1}
                    }
                )

                response = json.loads(result.content[0].text)

                if response.get("success"):
                    transition_id = response.get("transition_id")
                    reward = response.get("reward", 0)
                    self.record_test(
                        f"Record LLM call {i+1}",
                        True,
                        f"Transition ID: {transition_id}, Reward: {reward}"
                    )
                else:
                    self.record_test(
                        f"Record LLM call {i+1}",
                        False,
                        f"Error: {response.get('error')}"
                    )
            except Exception as e:
                self.record_test(
                    f"Record LLM call {i+1}",
                    False,
                    f"Exception: {str(e)}"
                )

            await asyncio.sleep(0.05)

    async def test_record_tool_calls(self):
        """Test recording tool calls"""
        print("\n=== Testing Tool Call Recording ===")

        tool_calls = [
            {
                "tool_name": "calculator",
                "input_data": {"operation": "add", "a": 5, "b": 3},
                "output_data": {"result": 8},
                "reward": 1.0
            },
            {
                "tool_name": "web_search",
                "input_data": {"query": "python tutorials"},
                "output_data": {"results": ["result1", "result2"]},
                "reward": 0.8
            },
            {
                "tool_name": "file_reader",
                "input_data": {"path": "/test/file.txt"},
                "output_data": {"content": "test content"},
                "reward": 0.9
            }
        ]

        for i, call in enumerate(tool_calls):
            try:
                result = await self.session.call_tool(
                    "record_tool_call",
                    arguments={
                        "episode_id": self.episode_id,
                        **call,
                        "metadata": {"call_number": i + 1, "success": True}
                    }
                )

                response = json.loads(result.content[0].text)

                if response.get("success"):
                    transition_id = response.get("transition_id")
                    reward = response.get("reward", 0)
                    self.record_test(
                        f"Record tool call: {call['tool_name']}",
                        True,
                        f"Transition ID: {transition_id}, Reward: {reward}"
                    )
                else:
                    self.record_test(
                        f"Record tool call: {call['tool_name']}",
                        False,
                        f"Error: {response.get('error')}"
                    )
            except Exception as e:
                self.record_test(
                    f"Record tool call: {call['tool_name']}",
                    False,
                    f"Exception: {str(e)}"
                )

            await asyncio.sleep(0.05)

    async def test_get_episode(self):
        """Test retrieving episode data"""
        print("\n=== Testing Episode Retrieval ===")

        try:
            result = await self.session.call_tool(
                "get_episode",
                arguments={
                    "episode_id": self.episode_id
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                episode = response.get("episode", {})
                transitions = episode.get("transitions", [])
                self.record_test(
                    "Get episode",
                    len(transitions) == 6,  # 3 LLM + 3 tool calls
                    f"Retrieved episode with {len(transitions)} transitions"
                )
            else:
                self.record_test(
                    "Get episode",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Get episode",
                False,
                f"Exception: {str(e)}"
            )

    async def test_configure_training(self):
        """Test configuring training parameters"""
        print("\n=== Testing Training Configuration ===")

        try:
            result = await self.session.call_tool(
                "configure_training",
                arguments={
                    "reward_threshold": 0.8,
                    "max_episodes_per_batch": 5,
                    "learning_rate": 0.002,
                    "discount_factor": 0.95,
                    "training_enabled": True
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                config = response.get("config", {})
                self.record_test(
                    "Configure training",
                    config.get("learning_rate") == 0.002,
                    f"Config: {config}"
                )
            else:
                self.record_test(
                    "Configure training",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Configure training",
                False,
                f"Exception: {str(e)}"
            )

    async def test_end_episode(self):
        """Test ending an episode"""
        print("\n=== Testing Episode Completion ===")

        try:
            result = await self.session.call_tool(
                "end_episode",
                arguments={
                    "episode_id": self.episode_id,
                    "success": True,
                    "final_reward": 2.0,
                    "summary": "Successfully completed all tasks"
                }
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                total_reward = response.get("total_reward", 0)
                duration = response.get("duration_seconds", 0)
                transitions = response.get("transitions_count", 0)

                self.record_test(
                    "End episode",
                    response.get("episode_success") == True,
                    f"Reward: {total_reward}, Duration: {duration:.2f}s, Transitions: {transitions}"
                )
            else:
                self.record_test(
                    "End episode",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "End episode",
                False,
                f"Exception: {str(e)}"
            )

    async def test_get_training_stats(self):
        """Test getting training statistics"""
        print("\n=== Testing Training Statistics ===")

        try:
            result = await self.session.call_tool(
                "get_training_stats",
                arguments={}
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                stats = response.get("stats", {})
                total_episodes = stats.get("total_episodes", 0)
                completed_episodes = stats.get("completed_episodes", 0)
                success_rate = stats.get("success_rate", 0)

                self.record_test(
                    "Get training stats",
                    total_episodes >= 1,
                    f"Episodes: {total_episodes}, Completed: {completed_episodes}, Success rate: {success_rate:.2f}"
                )
            else:
                self.record_test(
                    "Get training stats",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Get training stats",
                False,
                f"Exception: {str(e)}"
            )

    async def test_clear_episodes(self):
        """Test clearing all episodes"""
        print("\n=== Testing Episode Clearing ===")

        try:
            result = await self.session.call_tool(
                "clear_episodes",
                arguments={}
            )

            response = json.loads(result.content[0].text)

            if response.get("success"):
                message = response.get("message", "")
                self.record_test(
                    "Clear episodes",
                    True,
                    message
                )
            else:
                self.record_test(
                    "Clear episodes",
                    False,
                    f"Error: {response.get('error')}"
                )
        except Exception as e:
            self.record_test(
                "Clear episodes",
                False,
                f"Exception: {str(e)}"
            )

    async def run_all_tests(self, command: str, args: list):
        """Run all tests"""
        print("=" * 60)
        print("Ability MCP Server - End-to-End Tests")
        print("=" * 60)

        try:
            await self.connect(command, args)

            # Run tests in sequence
            await self.test_start_episode()
            if self.episode_id:
                await self.test_record_llm_calls()
                await self.test_record_tool_calls()
                await self.test_get_episode()
                await self.test_configure_training()
                await self.test_end_episode()
            await self.test_get_training_stats()
            await self.test_clear_episodes()

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
        args = ["packages/ability-mcp-server/ability_server.py"]

    tester = AbilityServerTester()
    success = await tester.run_all_tests(command, args)

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
