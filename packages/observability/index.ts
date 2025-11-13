/**
 * Observability Package - MCP Client for Phoenix Observability Server
 *
 * This package communicates with the Python MCP server running Arize Phoenix.
 * It does NOT use console.log() - it uses real Phoenix tracing via MCP protocol.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface TraceInfo {
  trace_id: string;
  name: string;
  start_time: string;
  status: string;
}

export interface SpanInfo {
  span_id: string;
  name: string;
  type: string;
  start_time: string;
  status: string;
}

export interface MetricInfo {
  name: string;
  value: number;
  timestamp: string;
  labels: Record<string, string>;
}

export class ObservabilityManager {
  private client: Client | null = null;
  private connected: boolean = false;
  private currentTraceId: string | null = null;

  constructor(
    private serverPath: string = process.env.RAILWAY_ENVIRONMENT
      ? 'packages/observability-mcp-server/observability_server_minimal.py'
      : 'packages/observability-mcp-server/observability_server.py'
  ) {
    // Connection will be established lazily
  }

  /**
   * Connect to the MCP observability server
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
        name: 'bob-agent-observability-client',
        version: '1.0.0',
      }, {
        capabilities: {},
      });

      await this.client.connect(transport);
      this.connected = true;
      console.log('[ObservabilityManager] Connected to Phoenix MCP server');
    } catch (error) {
      console.error('[ObservabilityManager] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Start a new trace
   */
  async startTrace(name: string, attributes?: Record<string, any>): Promise<TraceInfo> {
    await this.connect();

    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.callTool({
        name: 'start_trace',
        arguments: {
          name,
          attributes: attributes || {},
        },
      });

      if (result.isError) {
        throw new Error(`Failed to start trace: ${result.content}`);
      }

      const data = (result as any).structuredContent || JSON.parse((result.content as any)[0]?.text || '{}');
      this.currentTraceId = data.trace_id;
      return data;
    } catch (error) {
      console.error('[ObservabilityManager] Start trace error:', error);
      throw error;
    }
  }

  /**
   * Add a span to the current trace
   */
  async addSpan(
    name: string,
    spanType: string = 'tool',
    attributes?: Record<string, any>
  ): Promise<SpanInfo> {
    await this.connect();

    if (!this.client || !this.currentTraceId) {
      throw new Error('No active trace');
    }

    try {
      const result = await this.client.callTool({
        name: 'add_span',
        arguments: {
          trace_id: this.currentTraceId,
          name,
          span_type: spanType,
          attributes: attributes || {},
        },
      });

      if (result.isError) {
        throw new Error(`Failed to add span: ${result.content}`);
      }

      return (result as any).structuredContent || JSON.parse((result.content as any)[0]?.text || '{}');
    } catch (error) {
      console.error('[ObservabilityManager] Add span error:', error);
      throw error;
    }
  }

  /**
   * End a span
   */
  async endSpan(spanId: string, status: string = 'success', error?: string): Promise<void> {
    await this.connect();

    if (!this.client || !this.currentTraceId) {
      return;
    }

    try {
      await this.client.callTool({
        name: 'end_span',
        arguments: {
          trace_id: this.currentTraceId,
          span_id: spanId,
          status,
          error,
        },
      });
    } catch (error) {
      console.error('[ObservabilityManager] End span error:', error);
    }
  }

  /**
   * End the current trace
   */
  async endTrace(status: string = 'success'): Promise<void> {
    await this.connect();

    if (!this.client || !this.currentTraceId) {
      return;
    }

    try {
      await this.client.callTool({
        name: 'end_trace',
        arguments: {
          trace_id: this.currentTraceId,
          status,
        },
      });

      this.currentTraceId = null;
    } catch (error) {
      console.error('[ObservabilityManager] End trace error:', error);
    }
  }

  /**
   * Record a performance metric
   */
  async recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): Promise<void> {
    await this.connect();

    if (!this.client) {
      return;
    }

    try {
      await this.client.callTool({
        name: 'record_metric',
        arguments: {
          name,
          value,
          labels: labels || {},
        },
      });
    } catch (error) {
      console.error('[ObservabilityManager] Record metric error:', error);
    }
  }

  /**
   * Get the Phoenix dashboard URL
   */
  async getPhoenixUrl(): Promise<string> {
    await this.connect();

    if (!this.client) {
      return 'http://localhost:6006';
    }

    try {
      const result = await this.client.callTool({
        name: 'get_phoenix_url',
        arguments: {},
      });

      if (result.isError) {
        return 'http://localhost:6006';
      }

      const data = (result as any).structuredContent || JSON.parse((result.content as any)[0]?.text || '{}');
      return data.phoenix_url;
    } catch (error) {
      return 'http://localhost:6006';
    }
  }

  /**
   * Get current trace ID
   */
  getCurrentTraceId(): string | null {
    return this.currentTraceId;
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.connected = false;
      console.log('[ObservabilityManager] Disconnected from Phoenix MCP server');
    }
  }
}

export default ObservabilityManager;
