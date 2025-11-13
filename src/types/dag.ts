/**
 * DAG Type Definitions and Zod Schemas
 *
 * Based on research from DAG_METHODS.md:
 * - Pattern: JSON Schema with Explicit Dependencies
 * - Type-safe with Zod validation
 * - Supports multiple execution methods (tool, query, subagent, auto)
 */

import { z } from 'zod';

/**
 * Task status enumeration
 */
export const TaskStatus = {
  PENDING: 'pending' as const,
  EXECUTING: 'executing' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
};

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

/**
 * Execution method enumeration
 */
export const ExecutionMethod = {
  TOOL: 'tool' as const,        // Direct tool invocation (no LLM)
  QUERY: 'query' as const,      // LLM query with tools
  SUBAGENT: 'subagent' as const, // Spawn specialized subagent
  AUTO: 'auto' as const,        // Automatically determine method
};

export type ExecutionMethod = typeof ExecutionMethod[keyof typeof ExecutionMethod];

/**
 * Zod schema for a single task/node in the DAG
 */
export const PlanNodeSchema = z.object({
  id: z.string().describe('Unique task identifier'),
  action: z.string().describe('Human-readable description of what this task does'),

  // Tool-based execution (executionMethod: tool)
  tool: z.string().optional().describe('Tool name (bash, read_file, etc.)'),
  toolInput: z.record(z.any()).optional().describe('Tool-specific parameters'),

  // Dependencies
  dependsOn: z.array(z.string()).default([]).describe('Task IDs that must complete first'),

  // Execution method
  executionMethod: z.enum(['tool', 'query', 'subagent', 'auto']).default('auto')
    .describe('How to execute this task'),

  // Query-based execution (executionMethod: query)
  query: z.string().optional().describe('Query text for LLM reasoning'),
  tools: z.array(z.string()).optional().describe('Available tools for query() call'),

  // Subagent execution (executionMethod: subagent)
  subagentConfig: z.object({
    description: z.string().describe('When to use this subagent'),
    prompt: z.string().describe('System prompt for the subagent'),
    tools: z.array(z.string()).describe('Restricted tool access'),
    model: z.enum(['sonnet', 'opus', 'haiku', 'inherit']).optional()
      .describe('Model to use for subagent'),
  }).optional(),

  // Runtime state
  status: z.enum(['pending', 'executing', 'completed', 'failed']).default('pending'),
  result: z.any().optional().describe('Task output when completed'),
  error: z.string().optional().describe('Error message if failed'),
  metadata: z.record(z.any()).optional().describe('Additional task metadata'),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type PlanNode = z.infer<typeof PlanNodeSchema>;

/**
 * Zod schema for the complete DAG structure
 */
export const DAGSchema = z.object({
  tasks: z.array(PlanNodeSchema).describe('List of tasks in the execution plan'),
  reasoning: z.string().optional().describe('LLM explanation of the plan strategy'),
});

/**
 * TypeScript type for DAG
 */
export type DAGPlan = z.infer<typeof DAGSchema>;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * DAG statistics
 */
export interface DAGStats {
  total: number;
  pending: number;
  executing: number;
  completed: number;
  failed: number;
}
