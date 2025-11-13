/**
 * Test MCP connection and debug response format
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCP() {
  const transport = new StdioClientTransport({
    command: '.venv/bin/python',
    args: ['packages/observability-mcp-server/observability_server.py'],
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  await client.connect(transport);
  console.log('Connected to MCP server');

  const result = await client.callTool({
    name: 'start_trace',
    arguments: {
      name: 'Test Trace',
      attributes: {},
    },
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('Result content:', result.content);
  console.log('Result type:', typeof result.content);
  console.log('Is Error:', result.isError);

  if (result.content && Array.isArray(result.content)) {
    console.log('Content[0]:', result.content[0]);
    console.log('Content[0] type:', typeof result.content[0]);
  }

  await client.close();
}

testMCP().catch(console.error);
