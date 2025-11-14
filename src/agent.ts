/**
 * BobAgentPlanAct - PlanAct Architecture Implementation
 *
 * Replaces the old ReAct-based architecture with Plan-Act-Replan pattern:
 * 1. Planning Phase: Create complete task DAG upfront
 * 2. Execution Phase: Execute tasks in parallel based on dependencies
 * 3. Replanning Phase: Triggered only on failures
 *
 * Integrates with:
 * - Memory: Mem0 for multi-layered memory
 * - Observability: Arize Phoenix for distributed tracing
 * - Ability: Agent Lightning for RL training
 */

import Anthropic from '@anthropic-ai/sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { AgentGoal, AgentProgress } from './types';
import MemoryManager from '../packages/memory';
import ObservabilityManager from '../packages/observability';
import AbilityManager from '../packages/ability';
import { executeTool } from './tools';
import { ExecutionDAG } from './dag/ExecutionDAG';
import { PlanNode, DAGPlan, DAGSchema } from './types/dag';
import { getMCPServers } from './mcp-config';

export interface AgentOptions {
  apiKey?: string;
  model?: string;
  memoryUrl?: string;
  phoenixUrl?: string;
  lightningUrl?: string;
  maxExecutionCycles?: number;
}

export class BobAgentPlanAct {
  private memory: MemoryManager;
  private observability: ObservabilityManager;
  private ability: AbilityManager;
  private anthropic: Anthropic;
  private model: string;
  private maxExecutionCycles: number;
  private progressLog: AgentProgress[] = [];
  private currentTraceId: string = '';
  private currentEpisodeId: string = '';

  constructor(options: AgentOptions = {}) {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = options.model || process.env.AGENT_MODEL || 'claude-sonnet-4-5-20250929';
    this.maxExecutionCycles = options.maxExecutionCycles || 10;

    // Initialize Anthropic SDK
    this.anthropic = new Anthropic({ apiKey });

    // Initialize MCP servers for integrated package access
    this.memory = new MemoryManager(options.memoryUrl);
    this.observability = new ObservabilityManager(options.phoenixUrl);
    this.ability = new AbilityManager(options.lightningUrl);

    console.log('[BobAgentPlanAct] Initialized with PlanAct architecture');
    console.log(`  - Model: ${this.model}`);
    console.log(`  - Max Execution Cycles: ${this.maxExecutionCycles}`);
  }

  /**
   * Execute goal using PlanAct pattern
   */
  async execute(goal: AgentGoal): Promise<{
    success: boolean;
    result: string;
    progress: AgentProgress[];
  }> {
    this.progressLog = [];

    // Start observability trace
    const traceInfo = await this.observability.startTrace(
      `PlanAct Goal: ${goal.description}`
    );
    this.currentTraceId = traceInfo.trace_id;

    console.log(`\n[BobAgentPlanAct] Starting execution`);
    console.log(`[Goal] ${goal.description}`);
    console.log(`[Evaluation] ${goal.evaluation}`);
    console.log(`[Trace ID] ${this.currentTraceId}\n`);

    // Start RL episode
    const episodeInfo = await this.ability.startEpisode(goal.description);
    this.currentEpisodeId = episodeInfo.episode_id;

    // Store goal in episodic memory
    await this.memory.store('episodic', `Goal: ${goal.description}`, {
      type: 'goal',
      evaluation: goal.evaluation,
      timestamp: new Date().toISOString(),
    });

    try {
      let executionCycle = 0;
      let dag: ExecutionDAG | null = null;
      let finalResult = '';

      // Main PlanAct loop: Plan → Execute → Replan (if needed)
      while (executionCycle < this.maxExecutionCycles) {
        executionCycle++;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`EXECUTION CYCLE ${executionCycle}/${this.maxExecutionCycles}`);
        console.log(`${'='.repeat(60)}\n`);

        // PHASE 1: PLANNING
        // Create or recreate DAG if needed
        if (!dag || dag.isComplete() || dag.hasFailed()) {
          const planningResult = await this.planningPhase(goal, dag);
          dag = planningResult.dag;

          this.logProgress(
            executionCycle,
            'PLANNING',
            `Created plan with ${dag.getAllTasks().length} tasks`
          );
        }

        // PHASE 2: EXECUTION
        const executionResult = await this.executionPhase(dag, executionCycle);

        if (executionResult.complete) {
          finalResult = executionResult.finalResult || 'Goal completed successfully';
          console.log(`\n[SUCCESS] Goal completed!`);
          break;
        }

        // PHASE 3: REPLANNING CHECK
        const shouldReplan = this.shouldReplan(dag, executionResult);

        if (shouldReplan) {
          console.log(`\n[REPLANNING] Triggered due to failures or blockers`);
          this.logProgress(
            executionCycle,
            'REPLANNING',
            'Replanning triggered due to failures'
          );
          // Loop will create new plan in next iteration
        } else if (!dag.isComplete()) {
          console.log(`\n[WARNING] DAG not complete but no replanning triggered`);
          break;
        }
      }

      if (!finalResult) {
        throw new Error(
          `Goal not completed within ${this.maxExecutionCycles} execution cycles`
        );
      }

      // Mark episode as successful
      await this.ability.endEpisode(true);

      // Store success in long-term memory
      await this.memory.store(
        'long-term',
        `Successfully completed: ${goal.description}`,
        {
          result: finalResult,
          episodeId: this.currentEpisodeId,
          pattern: 'planact',
        }
      );

      console.log(`\n[FINAL RESULT] ${finalResult}\n`);

      return {
        success: true,
        result: finalResult,
        progress: this.progressLog,
      };
    } catch (error: any) {
      console.error(`\n[ERROR] ${error.message}\n`);

      // Mark episode as failed
      await this.ability.endEpisode(false);

      // Store failure in memory
      await this.memory.store('episodic', `Failed: ${goal.description}`, {
        error: error.message,
        episodeId: this.currentEpisodeId,
      });

      return {
        success: false,
        result: `Error: ${error.message}`,
        progress: this.progressLog,
      };
    } finally {
      // End trace
      await this.observability.endTrace('success');

      // Memory consolidation and decay
      await this.memory.consolidate();
      await this.memory.decay();

      // Print statistics
      await this.printStatistics();
    }
  }

  /**
   * PHASE 1: Planning - Create execution DAG
   */
  private async planningPhase(
    goal: AgentGoal,
    previousDag?: ExecutionDAG | null
  ): Promise<{ dag: ExecutionDAG }> {
    const planSpan = await this.observability.addSpan('Planning Phase');

    try {
      console.log(`[PLANNING PHASE] Creating execution plan...`);

      // Retrieve relevant memories for context
      const recentMemories = await this.memory.retrieve('episodic', undefined, 5);
      const longTermContext = await this.memory.retrieve(
        'long-term',
        goal.description,
        3
      );

      // Build context from previous attempt if replanning
      let previousContext = '';
      if (previousDag) {
        const stats = previousDag.getStats();
        const failedTasks = previousDag.getFailedTasks();

        previousContext = `
PREVIOUS EXECUTION ATTEMPT:
- Completed: ${stats.completed} tasks
- Failed: ${stats.failed} tasks
${
  failedTasks.length > 0
    ? `\nFailed tasks:\n${failedTasks
        .map(t => `  - ${t.id}: ${t.action}\n    Error: ${t.error}`)
        .join('\n')}`
    : ''
}

Please create a new plan that addresses these failures and completes the goal.
        `.trim();
      }

      // Build memory context
      const memoryContext = [
        'RECENT MEMORIES:',
        ...recentMemories.map(m => `- ${m.content}`),
        '',
        'LONG-TERM CONTEXT:',
        ...longTermContext.map(m => `- ${m.content}`),
      ].join('\n');

      // Build planning prompt with JSON schema
      const planningPrompt = `
You are a planning agent creating an execution plan for a goal using a DAG (Directed Acyclic Graph) structure.

GOAL: ${goal.description}

EVALUATION CRITERIA: ${goal.evaluation}

${memoryContext}

${previousContext}

Create a complete step-by-step execution plan as a JSON object following this exact schema:

{
  "reasoning": "Brief explanation of your plan strategy",
  "tasks": [
    {
      "id": "unique_task_id",
      "action": "Human-readable description of what this task does",
      "executionMethod": "tool" | "query" | "subagent" | "auto",
      "tool": "tool_name",              // If executionMethod is "tool"
      "toolInput": {},                  // Tool parameters if executionMethod is "tool"
      "query": "question text",         // If executionMethod is "query"
      "dependsOn": ["task_id1", ...]    // Task IDs that must complete first
    }
  ]
}

EXECUTION METHODS:
- "tool": Direct tool invocation (fastest, cheapest - use when possible)
- "query": LLM reasoning with tools (use when analysis needed)
- "subagent": Specialized subagent (use for complex, isolated tasks)
- "auto": Let system decide (default)

AVAILABLE TOOLS (use sparingly):
- Bash: Execute shell commands
- Read: Read file contents
- Write: Write files
- Glob: Find files by pattern
- Grep: Search file contents

RULES:
1. NO circular dependencies (task A cannot depend on task B if B depends on A)
2. Each task must have a unique ID (use descriptive names: "read_config", "analyze_code", etc.)
3. Tasks should be as parallel as possible - only add dependencies when truly necessary
4. The dependsOn array lists task IDs that MUST complete before this task starts
5. Empty dependsOn [] means task can start immediately
6. Prefer "tool" executionMethod for simple operations (no LLM needed)
7. Use "query" only when reasoning/analysis is required
8. Keep plan concise but complete

OUTPUT VALID JSON ONLY (no markdown, no explanations outside JSON):
      `.trim();

      console.log(`[Planning] Sending plan request to LLM...`);

      let planJson: any;

      try {
        // Use Anthropic SDK directly
        const response = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: planningPrompt,
            },
          ],
        });

        console.log(`[Planning] Received response, parsing JSON...`);

        // Extract text from response
        const textContent = response.content.find((c: any) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text content in LLM response');
        }

        let jsonText = textContent.text.trim();

        // Remove markdown code blocks if present
        const jsonMatch =
          jsonText.match(/```json\n([\s\S]*?)\n```/) ||
          jsonText.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }

        // Parse JSON
        planJson = JSON.parse(jsonText);

        // Validate with Zod schema
        const validated = DAGSchema.parse(planJson);
        planJson = validated;
      } catch (error: any) {
        console.error(`[Planning] Error parsing plan:`, error.message);
        throw new Error(`Failed to parse plan JSON: ${error.message}`);
      }

      const dagPlan = planJson as DAGPlan;

      console.log(`[Planning] Plan created:`);
      console.log(`  Reasoning: ${dagPlan.reasoning || 'N/A'}`);
      console.log(`  Tasks: ${dagPlan.tasks.length}`);

      // Record planning decision for RL
      await this.ability.recordLLMCall(
        `Goal: ${goal.description}`,
        JSON.stringify(dagPlan),
        this.model,
        1.0
      );

      // Store plan in procedural memory
      await this.memory.store('procedural', 'Created execution plan', {
        reasoning: dagPlan.reasoning,
        taskCount: dagPlan.tasks.length,
        timestamp: new Date().toISOString(),
      });

      // Build ExecutionDAG from plan
      const tasks: PlanNode[] = dagPlan.tasks.map(task => ({
        ...task,
        status: 'pending',
        dependsOn: task.dependsOn || [],
        executionMethod: task.executionMethod || 'auto',
      }));

      const dag = new ExecutionDAG(tasks);

      // Validate DAG structure
      const validation = dag.validate();
      if (!validation.valid) {
        throw new Error(`Invalid DAG: ${validation.errors.join(', ')}`);
      }

      // Log execution layers
      const layers = dag.getExecutionLayers();
      console.log(
        `[Planning] Execution will proceed in ${layers.length} layer(s):`
      );
      layers.forEach((layer, idx) => {
        console.log(
          `  Layer ${idx + 1}: ${layer.length} task(s) - ${layer
            .map(t => t.id)
            .join(', ')}`
        );
      });

      await this.observability.endSpan(planSpan.span_id, 'success');

      return { dag };
    } catch (error: any) {
      await this.observability.endSpan(planSpan.span_id, 'error', error.message);
      throw error;
    }
  }

  /**
   * PHASE 2: Execution - Execute DAG with parallelism
   */
  private async executionPhase(
    dag: ExecutionDAG,
    cycle: number
  ): Promise<{ complete: boolean; finalResult?: string }> {
    const execSpan = await this.observability.addSpan('Execution Phase');

    try {
      console.log(`[EXECUTION PHASE] Starting task execution...`);

      let iterationCount = 0;
      const maxIterations = 50; // Safety limit

      while (!dag.isComplete() && iterationCount < maxIterations) {
        iterationCount++;

        // Get ready tasks
        const readyTasks = dag.getReadyTasks();

        if (readyTasks.length === 0) {
          // Check for blockers
          if (dag.hasFailed()) {
            console.log(`[Execution] Blocked by failed tasks`);
            break;
          }

          // No ready tasks but nothing failed - should be complete
          break;
        }

        console.log(
          `\n[Execution Iteration ${iterationCount}] Executing ${readyTasks.length} task(s) in parallel:`
        );
        readyTasks.forEach(task => {
          console.log(`  - ${task.id}: ${task.action}`);
        });

        // Mark all as executing
        readyTasks.forEach(task => dag.markExecuting(task.id));

        // Execute in parallel
        const taskPromises = readyTasks.map(task => this.executeTask(task, dag));

        try {
          await Promise.all(taskPromises);
        } catch (error: any) {
          console.error(`[Execution] Error during parallel execution:`, error.message);
          // Individual task failures are recorded in DAG
        }

        // Log progress
        const stats = dag.getStats();
        console.log(
          `[Progress] Completed: ${stats.completed}/${stats.total}, Failed: ${stats.failed}`
        );

        this.logProgress(
          cycle,
          'EXECUTION',
          `Completed ${stats.completed}/${stats.total} tasks, ${stats.failed} failed`
        );
      }

      // Check completion
      if (dag.isComplete()) {
        console.log(`\n[Execution] All tasks completed successfully!`);

        // Extract final result
        const allTasks = dag.getAllTasks();
        const lastTask = allTasks[allTasks.length - 1];

        await this.observability.endSpan(execSpan.span_id, 'success');

        return {
          complete: true,
          finalResult:
            typeof lastTask.result === 'string'
              ? lastTask.result
              : JSON.stringify(lastTask.result),
        };
      }

      await this.observability.endSpan(execSpan.span_id, 'partial');

      return { complete: false };
    } catch (error: any) {
      await this.observability.endSpan(execSpan.span_id, 'error', error.message);
      throw error;
    }
  }

  /**
   * Execute a single task based on executionMethod
   */
  private async executeTask(task: PlanNode, dag: ExecutionDAG): Promise<void> {
    const taskSpan = await this.observability.addSpan(`Task: ${task.id}`);

    try {
      console.log(`  [${task.id}] Starting: ${task.action}`);

      // Store task start in procedural memory
      await this.memory.store('procedural', `Executing: ${task.id}`, {
        action: task.action,
        executionMethod: task.executionMethod,
        timestamp: new Date().toISOString(),
      });

      // Get dependency results
      const dependencyResults = dag.getDependencyResults(task);

      // Route based on execution method
      let result: any;

      const effectiveMethod = task.executionMethod || 'auto';

      switch (effectiveMethod) {
        case 'tool':
          result = await this.executeDirectToolCall(task, dependencyResults);
          break;

        case 'query':
          result = await this.executeWithQuery(task, dependencyResults);
          break;

        case 'subagent':
          result = await this.executeWithSubagent(task, dependencyResults);
          break;

        case 'auto':
          result = await this.executeAdaptive(task, dependencyResults);
          break;

        default:
          throw new Error(`Unknown execution method: ${task.executionMethod}`);
      }

      // Mark as completed
      dag.completeTask(task.id, result);

      // Record for RL
      await this.ability.recordToolCall(
        task.tool || 'generic',
        task.toolInput || {},
        result,
        1.0, // Success
        { taskId: task.id }
      );

      // Store result in memory
      await this.memory.store('procedural', `Completed: ${task.id}`, {
        result: typeof result === 'string' ? result : JSON.stringify(result),
        timestamp: new Date().toISOString(),
      });

      await this.observability.endSpan(taskSpan.span_id, 'success');

      console.log(`  [${task.id}] Completed successfully`);
    } catch (error: any) {
      console.error(`  [${task.id}] Failed: ${error.message}`);

      // Mark as failed
      dag.failTask(task.id, error.message);

      // Record failure for RL
      await this.ability.recordToolCall(
        task.tool || 'generic',
        task.toolInput || {},
        { error: error.message },
        0.0, // Failure
        { taskId: task.id, failed: true }
      );

      await this.observability.endSpan(taskSpan.span_id, 'error', error.message);

      // Don't throw - let other parallel tasks continue
    }
  }

  /**
   * Direct tool execution (no LLM call) - REAL IMPLEMENTATION
   */
  private async executeDirectToolCall(
    task: PlanNode,
    dependencyResults: Record<string, any>
  ): Promise<any> {
    console.log(
      `    [Direct Tool] ${task.tool} with input:`,
      JSON.stringify(task.toolInput)
    );

    // Execute the tool for real!
    const toolResult = await executeTool(task.tool || '', task.toolInput || {});

    if (!toolResult.success) {
      throw new Error(`Tool execution failed: ${toolResult.error}`);
    }

    return {
      method: 'direct_tool',
      tool: task.tool,
      input: task.toolInput,
      dependencies: dependencyResults,
      result: toolResult.result,
    };
  }

  /**
   * Execute via LLM query using Claude Agent SDK
   */
  private async executeWithQuery(
    task: PlanNode,
    dependencyResults: Record<string, any>
  ): Promise<any> {
    console.log(`    [Query] Using LLM reasoning with Claude Agent SDK`);

    // Build query prompt
    const queryPrompt = `
You are executing a specific task as part of a larger plan.

Task: ${task.action}

${
  Object.keys(dependencyResults).length > 0
    ? `Context from previous tasks:\n${JSON.stringify(dependencyResults, null, 2)}\n`
    : ''
}

${task.query || 'Complete this task and return the result.'}
    `.trim();

    try {
      // Use Claude Agent SDK query() with streaming
      const stream = query({
        prompt: queryPrompt,
        options: {
          model: this.model,
          maxTurns: 3, // Limit turns for single task execution
          mcpServers: getMCPServers() as any, // Load MCP servers from mcp.json
          permissionMode: 'bypassPermissions', // Auto-approve for agent execution
        }
      });

      let finalResult: string = '';
      let error: string | null = null;

      // Process streaming messages
      for await (const message of stream) {
        if (message.type === 'result') {
          // Extract final result
          if (message.subtype === 'success') {
            finalResult = message.result;
          } else if (message.subtype === 'error_max_turns' || message.subtype === 'error_during_execution') {
            error = `Query execution failed: ${message.subtype}`;
          }
        }
      }

      if (error) {
        throw new Error(error);
      }

      return {
        method: 'query',
        result: finalResult.trim(),
      };
    } catch (err: any) {
      throw new Error(`Query execution failed: ${err.message}`);
    }
  }

  /**
   * Execute with specialized subagent using Claude Agent SDK
   */
  private async executeWithSubagent(
    task: PlanNode,
    dependencyResults: Record<string, any>
  ): Promise<any> {
    console.log(`    [Subagent] Spawning specialized agent with Claude Agent SDK`);

    if (!task.subagentConfig) {
      throw new Error(`Subagent task ${task.id} missing subagentConfig`);
    }

    // Build subagent task description and prompt
    const taskPrompt = `
${task.subagentConfig.prompt}

${
  Object.keys(dependencyResults).length > 0
    ? `Context from previous tasks:\n${JSON.stringify(dependencyResults, null, 2)}\n`
    : ''
}

Complete this task: ${task.action}
    `.trim();

    try {
      // Define the subagent configuration
      const subagentType = (task.subagentConfig as any).type || 'specialized_agent';
      const agents: Record<string, any> = {
        [subagentType]: {
          description: task.subagentConfig.description || `Specialized agent for: ${task.action}`,
          prompt: task.subagentConfig.prompt,
          tools: task.subagentConfig.tools || undefined,
          model: task.subagentConfig.model || 'inherit',
        }
      };

      // Use Claude Agent SDK query() with subagent configuration
      const stream = query({
        prompt: `Use the ${subagentType} subagent to complete the following task:\n\n${taskPrompt}`,
        options: {
          model: this.model,
          maxTurns: 5, // More turns for subagent complexity
          agents, // Define subagent programmatically
          mcpServers: getMCPServers() as any,
          permissionMode: 'bypassPermissions',
        }
      });

      let finalResult: string = '';
      let error: string | null = null;

      // Process streaming messages
      for await (const message of stream) {
        if (message.type === 'result') {
          if (message.subtype === 'success') {
            finalResult = message.result;
          } else if (message.subtype === 'error_max_turns' || message.subtype === 'error_during_execution') {
            error = `Subagent execution failed: ${message.subtype}`;
          }
        }
      }

      if (error) {
        throw new Error(error);
      }

      return {
        method: 'subagent',
        result: finalResult.trim(),
      };
    } catch (err: any) {
      throw new Error(`Subagent execution failed: ${err.message}`);
    }
  }

  /**
   * Adaptive execution - automatically determine method
   */
  private async executeAdaptive(
    task: PlanNode,
    dependencyResults: Record<string, any>
  ): Promise<any> {
    // Simple heuristics for method selection
    if (task.tool && task.toolInput) {
      // Has explicit tool - use direct execution
      return this.executeDirectToolCall(task, dependencyResults);
    } else if (task.subagentConfig) {
      // Has subagent config - use subagent
      return this.executeWithSubagent(task, dependencyResults);
    } else {
      // Default to query for reasoning
      return this.executeWithQuery(task, dependencyResults);
    }
  }

  /**
   * Determine if replanning should be triggered
   */
  private shouldReplan(
    dag: ExecutionDAG,
    executionResult: { complete: boolean }
  ): boolean {
    // Replan if we have failed tasks
    if (dag.hasFailed()) {
      return true;
    }

    // Replan if execution not complete but no ready tasks (blocked)
    if (!executionResult.complete && dag.getReadyTasks().length === 0) {
      return true;
    }

    return false;
  }

  /**
   * Log progress entry
   */
  private logProgress(step: number, action: string, observation: string): void {
    this.progressLog.push({
      step,
      action,
      observation,
      timestamp: new Date(),
    });
  }

  /**
   * Print execution statistics
   */
  private async printStatistics(): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log('PLANACT EXECUTION STATISTICS');
    console.log(`${'='.repeat(60)}\n`);

    // Memory stats
    const memoryStats = await this.memory.getStats();
    console.log('[Memory]');
    console.log(`  Total memories: ${memoryStats.total}`);
    console.log(`  By type:`, memoryStats.byType);

    // Observability stats
    const phoenixUrl = await this.observability.getPhoenixUrl();
    console.log(`\n[Observability]`);
    console.log(`  Trace ID: ${this.currentTraceId}`);
    console.log(`  Phoenix Dashboard: ${phoenixUrl}`);

    // Ability stats
    const abilityStats = await this.ability.getTrainingStats();
    console.log(`\n[Ability (RL)]`);
    console.log(`  Total episodes: ${abilityStats.total_episodes}`);
    console.log(`  Success rate: ${(abilityStats.success_rate * 100).toFixed(1)}%`);
    console.log(`  Avg reward: ${abilityStats.avg_reward.toFixed(3)}`);

    console.log(`\n${'='.repeat(60)}\n`);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // MCP servers will be cleaned up automatically by managers
    console.log('[BobAgentPlanAct] Cleanup complete');
  }
}

export default BobAgentPlanAct;
