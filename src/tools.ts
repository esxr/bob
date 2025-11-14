/**
 * Real Tool Implementations for Bob Agent
 *
 * These tools actually execute operations instead of simulating them.
 */

import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Write tool - Creates or overwrites files
 */
export async function executeWriteTool(input: {
  path: string;
  content: string;
}): Promise<ToolResult> {
  try {
    const { path: filePath, content } = input;

    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write the file
    await fs.writeFile(filePath, content, 'utf-8');

    return {
      success: true,
      result: `File written to ${filePath} (${content.length} bytes)`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Read tool - Reads file contents
 */
export async function executeReadTool(input: {
  path: string;
}): Promise<ToolResult> {
  try {
    const { path: filePath } = input;
    const content = await fs.readFile(filePath, 'utf-8');

    return {
      success: true,
      result: content,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Bash tool - Executes shell commands
 */
export async function executeBashTool(input: {
  command: string;
  timeout?: number;
}): Promise<ToolResult> {
  try {
    const { command, timeout = 30000 } = input;

    console.log(`    [Bash] Executing: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });

    return {
      success: true,
      result: {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Command failed: ${error.message}`,
    };
  }
}

/**
 * Main tool executor - routes to appropriate tool
 */
export async function executeTool(
  toolName: string,
  input: any
): Promise<ToolResult> {
  switch (toolName) {
    case 'Write':
    case 'write':
    case 'write_file':
      return executeWriteTool(input);

    case 'Read':
    case 'read':
    case 'read_file':
      return executeReadTool(input);

    case 'Bash':
    case 'bash':
    case 'shell':
    case 'exec':
      return executeBashTool(input);

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
  }
}
