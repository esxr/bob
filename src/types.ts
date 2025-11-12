/**
 * Core type definitions for Bob Agent Alpha 01
 */

export interface AgentGoal {
  description: string;
  evaluation?: string;
  metadata?: Record<string, any>;
}

export interface AgentProgress {
  step: number;
  action: string;
  observation: string;
  reward?: number;
  timestamp: Date;
}

export interface MemoryEntry {
  type: 'episodic' | 'procedural' | 'semantic' | 'working' | 'long-term';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ObservabilityMetrics {
  traceId: string;
  spanId: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TrainingTransition {
  input: string;
  output: string;
  reward: number;
  timestamp: Date;
}

export interface AgentConfig {
  goal: AgentGoal;
  mcpServers?: MCPServerConfig[];
  observabilityEnabled?: boolean;
  trainingEnabled?: boolean;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
