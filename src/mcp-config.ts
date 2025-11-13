/**
 * MCP Configuration Loader
 *
 * Utility to load MCP server configuration from mcp.json (not .mcp.json)
 * This allows the project to use mcp.json instead of the default .mcp.json
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  type?: 'stdio' | 'sse' | 'http';
  url?: string;
  headers?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

/**
 * Load MCP configuration from mcp.json file
 *
 * The Claude Agent SDK defaults to looking for .mcp.json, but this project
 * uses mcp.json (without the dot). This function loads from mcp.json and
 * returns the configuration in the format expected by the SDK.
 *
 * @param configPath - Path to the mcp.json file (defaults to project root)
 * @returns MCPConfig object
 */
export function loadMCPConfig(configPath?: string): MCPConfig {
  const mcpConfigPath = configPath || path.join(process.cwd(), 'mcp.json');

  if (!fs.existsSync(mcpConfigPath)) {
    console.warn(`[MCP Config] Configuration file not found at ${mcpConfigPath}`);
    console.warn('[MCP Config] Note: This project uses mcp.json, not .mcp.json');
    return { mcpServers: {} };
  }

  try {
    const configContent = fs.readFileSync(mcpConfigPath, 'utf-8');
    const config = JSON.parse(configContent) as MCPConfig;

    console.log(`[MCP Config] Loaded configuration from ${mcpConfigPath}`);
    console.log(`[MCP Config] Found ${Object.keys(config.mcpServers).length} MCP server(s)`);

    return config;
  } catch (error: any) {
    console.error(`[MCP Config] Error loading configuration from ${mcpConfigPath}:`, error.message);
    throw new Error(`Failed to load MCP configuration: ${error.message}`);
  }
}

/**
 * Get MCP servers configuration
 * @param configPath - Optional path to mcp.json file
 * @returns Record of MCP server configurations
 */
export function getMCPServers(configPath?: string): Record<string, MCPServerConfig> {
  const config = loadMCPConfig(configPath);
  return config.mcpServers;
}

/**
 * Check if MCP configuration file exists
 * @param configPath - Optional path to check
 * @returns true if mcp.json exists
 */
export function mcpConfigExists(configPath?: string): boolean {
  const mcpConfigPath = configPath || path.join(process.cwd(), 'mcp.json');
  return fs.existsSync(mcpConfigPath);
}
