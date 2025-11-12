import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function test() {
  const transport = new StdioClientTransport({
    command: '.venv/bin/python',
    args: ['packages/ability-mcp-server/ability_server.py'],
  });

  const client = new Client({
    name: 'test',
    version: '1.0.0',
  }, { capabilities: {} });

  await client.connect(transport);
  console.log('Connected');

  const result = await client.callTool({
    name: 'start_episode',
    arguments: {
      goal: 'Test Goal',
      metadata: {},
    },
  });

  console.log('Full result:', JSON.stringify(result, null, 2));
  console.log('Structured:', result.structuredContent);

  await client.close();
}

test().catch(console.error);
