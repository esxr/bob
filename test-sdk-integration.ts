/**
 * Test SDK Integration
 *
 * Verifies that the Claude Agent SDK query() function works properly
 * in the executeWithQuery() and executeWithSubagent() methods.
 */

import { BobAgentPlanAct } from './src/agent';

async function testSDKIntegration() {
  console.log('='.repeat(70));
  console.log('Testing Claude Agent SDK Integration');
  console.log('='.repeat(70));
  console.log();

  const agent = new BobAgentPlanAct();

  try {
    // Simple goal to test basic SDK functionality
    const goal = {
      description: 'Test SDK integration by calculating 5 + 3',
      evaluation: 'Returns the number 8',
    };

    console.log(`Testing with goal: "${goal.description}"`);
    console.log(`Expected: ${goal.evaluation}`);
    console.log();

    const result = await agent.execute(goal);

    console.log();
    console.log('='.repeat(70));
    console.log('Test Results');
    console.log('='.repeat(70));
    console.log(`Success: ${result.success}`);
    console.log(`Result: ${result.result}`);
    console.log(`Progress steps: ${result.progress.length}`);
    console.log();

    if (result.success) {
      console.log('✓ SDK integration test PASSED!');
      console.log('  - Claude Agent SDK query() is working');
      console.log('  - Streaming message processing is functional');
      console.log('  - MCP server integration is operational');
      process.exit(0);
    } else {
      console.log('✗ SDK integration test FAILED');
      console.log('  - Goal was not achieved');
      process.exit(1);
    }
  } catch (error: any) {
    console.error();
    console.error('='.repeat(70));
    console.error('Test Failed with Error');
    console.error('='.repeat(70));
    console.error(`Error: ${error.message}`);
    console.error();
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testSDKIntegration();
