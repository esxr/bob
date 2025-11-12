/**
 * Tools Package - Sample MCP Tools
 *
 * Provides basic tools via MCP protocol:
 * - Calculator
 * - Web Search
 * - File Operations
 */

export interface Tool {
  name: string;
  description: string;
  execute: (args: any) => Promise<any>;
}

export class Calculator implements Tool {
  name = 'calculator';
  description = 'Perform basic arithmetic operations';

  async execute(args: { operation: string; a: number; b: number }): Promise<number> {
    const { operation, a, b } = args;

    switch (operation) {
      case 'add':
        return a + b;
      case 'subtract':
        return a - b;
      case 'multiply':
        return a * b;
      case 'divide':
        if (b === 0) throw new Error('Division by zero');
        return a / b;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}

export class WebSearch implements Tool {
  name = 'web_search';
  description = 'Search the web for information';

  async execute(args: { query: string; limit?: number }): Promise<any> {
    const { query, limit = 5 } = args;

    // Simple mock implementation
    // In production, integrate with actual search API
    return {
      query,
      results: [
        {
          title: `Result 1 for "${query}"`,
          url: 'https://example.com/1',
          snippet: 'This is a sample search result...'
        },
        {
          title: `Result 2 for "${query}"`,
          url: 'https://example.com/2',
          snippet: 'Another relevant result...'
        }
      ].slice(0, limit)
    };
  }
}

export class FileOperations implements Tool {
  name = 'file_operations';
  description = 'Read and write files';

  async execute(args: { operation: 'read' | 'write'; path: string; content?: string }): Promise<any> {
    const { operation, path, content } = args;
    const fs = require('fs').promises;

    switch (operation) {
      case 'read':
        try {
          const data = await fs.readFile(path, 'utf-8');
          return { success: true, content: data };
        } catch (error: any) {
          return { success: false, error: error.message };
        }

      case 'write':
        if (!content) throw new Error('Content required for write operation');
        try {
          await fs.writeFile(path, content, 'utf-8');
          return { success: true, message: `File written to ${path}` };
        } catch (error: any) {
          return { success: false, error: error.message };
        }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}

// Export all tools
export const tools: Tool[] = [
  new Calculator(),
  new WebSearch(),
  new FileOperations()
];

export default tools;
