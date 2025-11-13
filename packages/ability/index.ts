/**
 * Ability Package - MCP Client for Agent Lightning Server
 *
 * This package communicates with the Python MCP server running Agent Lightning.
 * It does NOT use mock RL - it uses real Agent Lightning via MCP protocol.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface EpisodeInfo {
  episode_id: string;
  goal: string;
  start_time: string;
  status: string;
}

export interface TransitionInfo {
  transition_id: number;
  reward: number;
}

export interface TrainingStats {
  total_episodes: number;
  completed_episodes: number;
  successful_episodes: number;
  success_rate: number;
  total_transitions: number;
  avg_reward: number;
  avg_transitions_per_episode: number;
}

export class AbilityManager {
  private client: Client | null = null;
  private connected: boolean = false;
  private currentEpisodeId: string | null = null;

  constructor(
    private serverPath: string = process.env.RAILWAY_ENVIRONMENT
      ? 'packages/ability-mcp-server/ability_server_minimal.py'
      : 'packages/ability-mcp-server/ability_server.py'
  ) {
    // Connection will be established lazily
  }

  /**
   * Connect to the MCP ability server
   */
  private async connect(): Promise<void> {
    if (this.connected && this.client) {
      return;
    }

    try {
      // Use python3 for Railway deployment, .venv/bin/python for local dev
      const pythonCommand = process.env.RAILWAY_ENVIRONMENT ? 'python3' : '.venv/bin/python';

      const transport = new StdioClientTransport({
        command: pythonCommand,
        args: [this.serverPath],
      });

      this.client = new Client({
        name: 'bob-agent-ability-client',
        version: '1.0.0',
      }, {
        capabilities: {},
      });

      await this.client.connect(transport);
      this.connected = true;
      console.log('[AbilityManager] Connected to Agent Lightning MCP server');
    } catch (error) {
      console.error('[AbilityManager] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Start a new training episode
   */
  async startEpisode(goal: string, metadata?: Record<string, any>): Promise<EpisodeInfo> {
    await this.connect();

    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.callTool({
        name: 'start_episode',
        arguments: {
          goal,
          metadata: metadata || {},
        },
      });

      if (result.isError) {
        throw new Error(`Failed to start episode: ${result.content}`);
      }

      const data = (result as any).structuredContent || JSON.parse((result.content as any)[0]?.text || '{}');
      this.currentEpisodeId = data.episode_id;
      console.log(`[AbilityManager DEBUG] Episode started: ${this.currentEpisodeId}`);
      return data;
    } catch (error) {
      console.error('[AbilityManager] Start episode error:', error);
      throw error;
    }
  }

  /**
   * Record an LLM call as part of the episode
   */
  async recordLLMCall(
    inputText: string,
    outputText: string,
    model: string = 'claude',
    reward?: number,
    metadata?: Record<string, any>
  ): Promise<TransitionInfo> {
    await this.connect();

    if (!this.client || !this.currentEpisodeId) {
      throw new Error('No active episode');
    }

    try {
      const result = await this.client.callTool({
        name: 'record_llm_call',
        arguments: {
          episode_id: this.currentEpisodeId,
          input_text: inputText,
          output_text: outputText,
          model,
          reward,
          metadata: metadata || {},
        },
      });

      if (result.isError) {
        throw new Error(`Failed to record LLM call: ${result.content}`);
      }

      return (result as any).structuredContent || JSON.parse((result.content as any)[0]?.text || '{}');
    } catch (error) {
      console.error('[AbilityManager] Record LLM call error:', error);
      throw error;
    }
  }

  /**
   * Record a tool call as part of the episode
   */
  async recordToolCall(
    toolName: string,
    inputData: Record<string, any>,
    outputData: any,
    reward?: number,
    metadata?: Record<string, any>
  ): Promise<TransitionInfo> {
    await this.connect();

    if (!this.client || !this.currentEpisodeId) {
      throw new Error('No active episode');
    }

    try {
      const result = await this.client.callTool({
        name: 'record_tool_call',
        arguments: {
          episode_id: this.currentEpisodeId,
          tool_name: toolName,
          input_data: inputData,
          output_data: outputData,
          reward,
          metadata: metadata || {},
        },
      });

      if (result.isError) {
        throw new Error(`Failed to record tool call: ${result.content}`);
      }

      return (result as any).structuredContent || JSON.parse((result.content as any)[0]?.text || '{}');
    } catch (error) {
      console.error('[AbilityManager] Record tool call error:', error);
      throw error;
    }
  }

  /**
   * End the current episode
   */
  async endEpisode(
    success: boolean,
    finalReward?: number,
    summary?: string
  ): Promise<void> {
    await this.connect();

    if (!this.client || !this.currentEpisodeId) {
      return;
    }

    try {
      await this.client.callTool({
        name: 'end_episode',
        arguments: {
          episode_id: this.currentEpisodeId,
          success,
          final_reward: finalReward,
          summary,
        },
      });

      this.currentEpisodeId = null;
    } catch (error) {
      console.error('[AbilityManager] End episode error:', error);
    }
  }

  /**
   * Get training statistics
   */
  async getTrainingStats(): Promise<TrainingStats> {
    await this.connect();

    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.callTool({
        name: 'get_training_stats',
        arguments: {},
      });

      if (result.isError) {
        throw new Error(`Failed to get training stats: ${result.content}`);
      }

      const data = (result as any).structuredContent || JSON.parse((result.content as any)[0]?.text || '{}');
      return data.stats;
    } catch (error) {
      console.error('[AbilityManager] Get training stats error:', error);
      return {
        total_episodes: 0,
        completed_episodes: 0,
        successful_episodes: 0,
        success_rate: 0,
        total_transitions: 0,
        avg_reward: 0,
        avg_transitions_per_episode: 0,
      };
    }
  }

  /**
   * Configure training parameters
   */
  async configureTraining(config: {
    reward_threshold?: number;
    max_episodes_per_batch?: number;
    learning_rate?: number;
    discount_factor?: number;
    training_enabled?: boolean;
  }): Promise<void> {
    await this.connect();

    if (!this.client) {
      return;
    }

    try {
      await this.client.callTool({
        name: 'configure_training',
        arguments: config,
      });
    } catch (error) {
      console.error('[AbilityManager] Configure training error:', error);
    }
  }

  /**
   * Get current episode ID
   */
  getCurrentEpisodeId(): string | null {
    return this.currentEpisodeId;
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.connected = false;
      console.log('[AbilityManager] Disconnected from Agent Lightning MCP server');
    }
  }
}

export default AbilityManager;
