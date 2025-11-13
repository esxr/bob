/**
 * Main Agent Implementation
 *
 * Bob Agent Alpha 01 - Built with Claude Agent SDK
 *
 * Integrates:
 * - Ability: Agent Lightning for RL training
 * - Memory: Mem0 for multi-layered memory
 * - Observability: Phoenix for tracing and monitoring
 * - Tools: MCP-based tool integration
 */

import { AgentGoal, AgentProgress } from './types';
import MemoryManager from '../packages/memory';
import ObservabilityManager from '../packages/observability';
import AbilityManager from '../packages/ability';
import { tools } from '../packages/tools';
import { loadMCPConfig, getMCPServers } from './mcp-config';

export interface AgentOptions {
  apiKey?: string;
  model?: string;
  memoryUrl?: string;
  phoenixUrl?: string;
  lightningUrl?: string;
  maxIterations?: number;
}

export class BobAgent {
  private memory: MemoryManager;
  private observability: ObservabilityManager;
  private ability: AbilityManager;
  private apiKey: string;
  private model: string;
  private maxIterations: number;
  private currentGoal: AgentGoal | null = null;
  private progressLog: AgentProgress[] = [];
  private mcpServers: Record<string, any> = {};

  constructor(options: AgentOptions = {}) {
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = options.model || 'claude-sonnet-4-20250514';
    this.maxIterations = options.maxIterations || 10;

    // Load MCP configuration from mcp.json (not .mcp.json)
    // This allows the project to use mcp.json instead of the Claude Agent SDK default
    try {
      this.mcpServers = getMCPServers();
      console.log('[BobAgent] Loaded MCP configuration from mcp.json');
    } catch (error: any) {
      console.warn('[BobAgent] Could not load MCP configuration:', error.message);
      console.warn('[BobAgent] Proceeding without MCP servers');
    }

    // Initialize packages
    this.memory = new MemoryManager(options.memoryUrl);
    this.observability = new ObservabilityManager(options.phoenixUrl);
    this.ability = new AbilityManager(options.lightningUrl);

    console.log('[BobAgent] Initialized with:');
    console.log(`  - Model: ${this.model}`);
    console.log(`  - Memory: ${options.memoryUrl || 'default'}`);
    console.log(`  - Observability: ${options.phoenixUrl || 'default'}`);
    console.log(`  - Ability (RL): ${options.lightningUrl || 'default'}`);
    console.log(`  - Max Iterations: ${this.maxIterations}`);
    console.log(`  - MCP Servers: ${Object.keys(this.mcpServers).length} configured`);
  }

  /**
   * Execute the agent with a goal
   */
  async execute(goal: AgentGoal): Promise<{ success: boolean; result: string; progress: AgentProgress[] }> {
    this.currentGoal = goal;
    this.progressLog = [];

    // Start observability trace
    const traceInfo = await this.observability.startTrace(`Goal: ${goal.description}`);
    const traceId = traceInfo.trace_id;
    console.log(`\n[BobAgent] Starting execution for goal: "${goal.description}"`);
    console.log(`[BobAgent] Trace ID: ${traceId}\n`);

    // Start RL episode
    const episodeInfo = await this.ability.startEpisode(goal.description);
    const episodeId = episodeInfo.episode_id;

    // Store goal in memory
    await this.memory.store('episodic', `Goal: ${goal.description}`, {
      type: 'goal',
      timestamp: new Date()
    });

    try {
      // Main agent loop (Plan-Act-Reflect)
      const result = await this.runAgentLoop(traceId);

      // End episode with success
      await this.ability.endEpisode(true);

      // Store result in long-term memory
      await this.memory.store('long-term', `Successfully completed: ${goal.description}`, {
        result,
        episodeId
      });

      console.log(`\n[BobAgent] Goal completed successfully!`);
      console.log(`[BobAgent] Result: ${result}`);

      return {
        success: true,
        result,
        progress: this.progressLog
      };
    } catch (error: any) {
      console.error(`\n[BobAgent] Error during execution:`, error.message);

      // End episode with failure
      await this.ability.endEpisode(false);

      // Store failure in memory
      await this.memory.store('episodic', `Failed: ${goal.description}`, {
        error: error.message,
        episodeId
      });

      return {
        success: false,
        result: `Error: ${error.message}`,
        progress: this.progressLog
      };
    } finally {
      // Finalize trace
      await this.observability.endTrace('success');

      // Memory consolidation and decay
      await this.memory.consolidate();
      await this.memory.decay();

      // Print statistics
      await this.printStatistics(traceId);
    }
  }

  /**
   * Main agent loop implementing Plan-Act-Reflect pattern
   */
  private async runAgentLoop(traceId: string): Promise<string> {
    let iteration = 0;
    let completed = false;
    let finalResult = '';

    while (!completed && iteration < this.maxIterations) {
      iteration++;
      const iterationSpan = await this.observability.addSpan(`Iteration ${iteration}`);

      console.log(`\n--- Iteration ${iteration}/${this.maxIterations} ---`);

      try {
        // 1. PLAN: Retrieve relevant memories and plan next action
        const planSpan = await this.observability.addSpan('Plan');
        const plan = await this.plan(iteration);
        await this.observability.endSpan(planSpan.span_id, 'success');

        this.logProgress(iteration, 'PLAN', plan);
        console.log(`[Plan] ${plan}`);

        // 2. ACT: Execute the planned action
        const actSpan = await this.observability.addSpan('Act');
        const action = await this.act(plan);
        await this.observability.endSpan(actSpan.span_id, 'success');

        this.logProgress(iteration, 'ACT', action);
        console.log(`[Act] ${action}`);

        // 3. REFLECT: Evaluate the outcome and decide next step
        const reflectSpan = await this.observability.addSpan('Reflect');
        const reflection = await this.reflect(plan, action);
        await this.observability.endSpan(reflectSpan.span_id, 'success');

        this.logProgress(iteration, 'REFLECT', reflection.observation);
        console.log(`[Reflect] ${reflection.observation}`);

        // Record LLM calls and tool calls for RL training
        await this.ability.recordLLMCall(
          plan,
          action,
          'claude',
          reflection.quality,
          { completed: reflection.completed }
        );

        // Check if goal is completed
        if (reflection.completed) {
          completed = true;
          finalResult = reflection.observation;
        }

        await this.observability.endSpan(iterationSpan.span_id, 'success');
      } catch (error: any) {
        console.error(`[Iteration ${iteration}] Error:`, error.message);
        await this.observability.endSpan(iterationSpan.span_id, 'error', error.message);

        // Record failed LLM call
        await this.ability.recordLLMCall(
          `Iteration ${iteration}`,
          error.message,
          'claude',
          0,
          { completed: false, error: true }
        );

        throw error;
      }
    }

    if (!completed) {
      throw new Error(`Goal not completed within ${this.maxIterations} iterations`);
    }

    return finalResult;
  }

  /**
   * PLAN phase: Retrieve context and plan next action
   */
  private async plan(iteration: number): Promise<string> {
    // Retrieve relevant memories
    const recentMemories = await this.memory.retrieve('episodic', undefined, 5);
    const longTermContext = await this.memory.retrieve('long-term', this.currentGoal?.description, 3);

    // Build context
    const memoryContext = [
      ...recentMemories.map(m => `- ${m.content}`),
      ...longTermContext.map(m => `- ${m.content}`)
    ].join('\n');

    // Simple planning logic (in production, use Claude Agent SDK)
    const plan = `Step ${iteration}: Work towards "${this.currentGoal?.description}" using context:\n${memoryContext}`;

    return plan;
  }

  /**
   * ACT phase: Execute the planned action using tools
   */
  private async act(plan: string): Promise<string> {
    // Determine which tool to use based on plan
    // In production, use Claude Agent SDK for tool selection

    // For demo, use calculator if numbers are mentioned
    if (plan.includes('calculate') || plan.includes('math')) {
      const calculator = tools.find(t => t.name === 'calculator');
      if (calculator) {
        const result = await calculator.execute({ operation: 'add', a: 5, b: 3 });
        return `Calculated result: ${result}`;
      }
    }

    // Use web search if search is mentioned
    if (plan.includes('search') || plan.includes('find')) {
      const search = tools.find(t => t.name === 'web_search');
      if (search) {
        const result = await search.execute({ query: this.currentGoal?.description || 'query', limit: 2 });
        return `Found ${result.results.length} results`;
      }
    }

    // Default action
    return `Executed plan: ${plan.substring(0, 100)}...`;
  }

  /**
   * REFLECT phase: Evaluate outcome and determine next steps
   */
  private async reflect(plan: string, action: string): Promise<{
    observation: string;
    completed: boolean;
    quality: number;
  }> {
    // Store action in working memory
    await this.memory.store('working', `Action: ${action}`, {
      plan,
      iteration: this.progressLog.length + 1
    });

    // Simple reflection logic (in production, use Claude Agent SDK for evaluation)
    const observation = `Action completed. Continuing towards goal.`;
    const completed = this.progressLog.length >= 3; // Demo: complete after 3 iterations
    const quality = 0.8;

    return { observation, completed, quality };
  }

  /**
   * Log progress
   */
  private logProgress(step: number, action: string, observation: string): void {
    this.progressLog.push({
      step,
      action,
      observation,
      timestamp: new Date()
    });
  }

  /**
   * Print statistics after execution
   */
  private async printStatistics(traceId: string): Promise<void> {
    console.log('\n========================================');
    console.log('EXECUTION STATISTICS');
    console.log('========================================\n');

    // Memory stats
    const memoryStats = await this.memory.getStats();
    console.log('[Memory Statistics]');
    console.log(`  Total memories: ${memoryStats.total}`);
    console.log(`  By type:`, memoryStats.byType);

    // Observability stats
    console.log('\n[Observability Statistics]');
    console.log(`  Trace ID: ${traceId}`);
    const phoenixUrl = await this.observability.getPhoenixUrl();
    console.log(`  Phoenix Dashboard: ${phoenixUrl}`);

    // Ability stats
    const abilityStats = await this.ability.getTrainingStats();
    console.log('\n[Ability (RL) Statistics]');
    console.log(`  Total episodes: ${abilityStats.total_episodes}`);
    console.log(`  Completed episodes: ${abilityStats.completed_episodes}`);
    console.log(`  Success rate: ${(abilityStats.success_rate * 100).toFixed(1)}%`);
    console.log(`  Avg reward: ${abilityStats.avg_reward.toFixed(3)}`);
    console.log(`  Avg transitions per episode: ${abilityStats.avg_transitions_per_episode.toFixed(1)}`);

    console.log('\n========================================\n');
  }

  /**
   * Get agent statistics
   */
  async getStatistics(): Promise<Record<string, any>> {
    return {
      memory: await this.memory.getStats(),
      observability: {
        phoenixUrl: await this.observability.getPhoenixUrl()
      },
      ability: await this.ability.getTrainingStats()
    };
  }
}

export default BobAgent;
