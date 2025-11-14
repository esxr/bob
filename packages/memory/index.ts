/**
 * Memory Package - MCP Client for Mem0 Memory Server
 *
 * This package communicates with the Python MCP server running Mem0.
 * It does NOT use in-memory Map() - it uses real Mem0 via MCP protocol.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export type MemoryType = 'episodic' | 'procedural' | 'semantic' | 'working' | 'long-term';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  priority?: number;
  accessCount?: number;
}

export class MemoryManager {
  private client: Client | null = null;
  private connected: boolean = false;

  constructor(
    private serverPath: string = process.env.RAILWAY_ENVIRONMENT
      ? 'packages/memory-mcp-server/memory_server_minimal.py'
      : 'packages/memory-mcp-server/memory_server.py'
  ) {
    // Connection will be established lazily
  }

  /**
   * Connect to the MCP memory server
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
        env: {
          ...process.env as Record<string, string>,  // Pass all environment variables including OPENAI_API_KEY
        },
      });

      this.client = new Client({
        name: 'bob-agent-memory-client',
        version: '1.0.0',
      }, {
        capabilities: {},
      });

      await this.client.connect(transport);
      this.connected = true;
      console.log('[MemoryManager] Connected to Mem0 MCP server');
    } catch (error) {
      console.error('[MemoryManager] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Store a new memory entry using Mem0
   */
  async store(
    type: MemoryType,
    content: string,
    metadata?: Record<string, any>
  ): Promise<MemoryEntry> {
    await this.connect();

    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.callTool({
        name: 'store_memory',
        arguments: {
          content,
          memory_type: type,
          user_id: 'default_user',
          metadata: metadata || {},
        },
      });

      if (result.isError) {
        throw new Error(`Failed to store memory: ${result.content}`);
      }

      const data = (result as any).structuredContent || JSON.parse((result.content as any)[0]?.text || '{}');
      return {
        id: data.memory_id,
        type,
        content,
        timestamp: new Date(data.metadata?.timestamp || Date.now()),
        metadata: data.metadata,
        priority: 5,
        accessCount: 0,
      };
    } catch (error) {
      console.error('[MemoryManager] Store error:', error);
      throw error;
    }
  }

  /**
   * Retrieve memories by type using semantic search
   */
  async retrieve(
    type?: MemoryType,
    query?: string,
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    await this.connect();

    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.callTool({
        name: 'search_memories',
        arguments: {
          query: query || '',
          user_id: 'default_user',
          memory_type: type,
          limit,
        },
      });

      if (result.isError) {
        throw new Error(`Failed to retrieve memories: ${result.content}`);
      }

      const data = (result as any).structuredContent || JSON.parse((result.content as any)[0]?.text || '{}');
      return (data.results || []).map((r: any) => ({
        id: r.id,
        type: r.metadata?.memory_type || 'working',
        content: r.memory || r.content,
        timestamp: new Date(r.metadata?.timestamp || Date.now()),
        metadata: r.metadata,
        priority: 5,
        accessCount: 0,
      }));
    } catch (error) {
      console.error('[MemoryManager] Retrieve error:', error);
      return [];
    }
  }

  /**
   * Consolidate memories (move from short-term to long-term)
   */
  async consolidate(): Promise<void> {
    // This would be implemented server-side or as a batch operation
    console.log('[MemoryManager] Consolidation not yet implemented on MCP server');
  }

  /**
   * Apply dynamic decay to low-relevance entries
   */
  async decay(): Promise<void> {
    // This would be implemented server-side
    console.log('[MemoryManager] Decay not yet implemented on MCP server');
  }

  /**
   * Clear specific memory types
   */
  async clear(type?: MemoryType): Promise<void> {
    await this.connect();

    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      await this.client.callTool({
        name: 'delete_all_memories',
        arguments: {
          user_id: 'default_user',
        },
      });
    } catch (error) {
      console.error('[MemoryManager] Clear error:', error);
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<{ total: number; byType: Record<string, number> }> {
    await this.connect();

    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.callTool({
        name: 'get_memory_stats',
        arguments: {
          user_id: 'default_user',
        },
      });

      if (result.isError) {
        return { total: 0, byType: {} };
      }

      const data = (result as any).structuredContent || JSON.parse((result.content as any)[0]?.text || '{}');
      return data.stats || { total: 0, byType: {} };
    } catch (error) {
      console.error('[MemoryManager] Stats error:', error);
      return { total: 0, byType: {} };
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.connected = false;
      console.log('[MemoryManager] Disconnected from Mem0 MCP server');
    }
  }
}

export default MemoryManager;
