/**
 * Bob Agent Alpha 01 - Entry Point
 *
 * A sophisticated AI agent system featuring:
 * - Ability: Continuous learning via Agent Lightning (RL)
 * - Memory: Multi-layered memory via Mem0 (episodic, procedural, semantic, working, long-term)
 * - Observability: Full tracing and monitoring via Arize Phoenix
 * - Tools: MCP-based tool integration
 */

import BobAgent from './agent';
import { AgentGoal } from './types';

async function main() {
  console.log('========================================');
  console.log('BOB AGENT ALPHA 01');
  console.log('Intelligent Agent with RL-based Learning');
  console.log('========================================\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const goalIndex = args.indexOf('--goal');
  const evalIndex = args.indexOf('--evaluation');

  if (goalIndex === -1 || goalIndex === args.length - 1) {
    console.error('Usage: npm start -- --goal "Your goal here" [--evaluation "Success criteria"]');
    console.error('\nExample:');
    console.error('  npm start -- --goal "Calculate the sum of 5 and 3" --evaluation "Returns 8"');
    process.exit(1);
  }

  const goalDescription = args[goalIndex + 1];
  const evaluation = evalIndex !== -1 && evalIndex < args.length - 1 ? args[evalIndex + 1] : undefined;

  const goal: AgentGoal = {
    description: goalDescription,
    evaluation,
    metadata: {
      startTime: new Date(),
      version: '0.1.0'
    }
  };

  console.log('Goal:', goal.description);
  if (goal.evaluation) {
    console.log('Evaluation Criteria:', goal.evaluation);
  }
  console.log('');

  // Create agent instance
  const agent = new BobAgent({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxIterations: 10
  });

  // Execute agent
  const startTime = Date.now();

  try {
    const result = await agent.execute(goal);

    const duration = Date.now() - startTime;

    console.log('\n========================================');
    console.log('EXECUTION COMPLETE');
    console.log('========================================');
    console.log(`\nStatus: ${result.success ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`\nResult: ${result.result}`);
    console.log(`\nSteps taken: ${result.progress.length}`);

    console.log('\nProgress Log:');
    result.progress.forEach((step, index) => {
      console.log(`\n  Step ${step.step}:`);
      console.log(`    Action: ${step.action}`);
      console.log(`    Observation: ${step.observation.substring(0, 100)}${step.observation.length > 100 ? '...' : ''}`);
    });

    // Get final statistics
    const stats = await agent.getStatistics();
    console.log('\n========================================');
    console.log('SYSTEM STATISTICS');
    console.log('========================================');
    console.log('\nMemory:', JSON.stringify(stats.memory, null, 2));
    console.log('\nObservability:', JSON.stringify(stats.observability, null, 2));
    console.log('\nAbility (RL):', JSON.stringify(stats.ability, null, 2));

    console.log('\n========================================\n');

    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    console.error('\n========================================');
    console.error('EXECUTION FAILED');
    console.error('========================================');
    console.error(`\nError: ${error.message}`);
    console.error('\nStack trace:', error.stack);

    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { BobAgent };
export * from './types';
export { default as MemoryManager } from '../packages/memory';
export { default as ObservabilityManager } from '../packages/observability';
export { default as AbilityManager } from '../packages/ability';
export { tools } from '../packages/tools';
export { loadMCPConfig, getMCPServers, mcpConfigExists } from './mcp-config';
