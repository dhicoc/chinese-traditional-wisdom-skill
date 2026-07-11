#!/usr/bin/env node
/**
 * index.ts — 中国传统玄学 MCP Server 主入口
 *
 * 用 @modelcontextprotocol/sdk 的 McpServer + StdioServerTransport，
 * 把 apps/visual/src/legacy 的 10 个 enveloped 引擎暴露为 MCP 工具。
 *
 * 这是三层架构 Layer 2 的薄壳：不实现计算逻辑，只 import enveloped 函数注册成工具。
 * 所有计算引擎都是纯 TS、零 DOM 依赖，Node 可直接运行。
 *
 * 运行：npx tsx src/index.ts（stdio 传输，供 Claude Desktop / Cursor 等客户端挂载）
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TOOLS } from './tools.js';

const server = new McpServer({
  name: 'chinese-wisdom-mcp',
  version: '0.1.0',
});

// 注册所有工具
for (const tool of TOOLS) {
  // McpServer.tool 接受 ZodRawShape（z.object 的 .shape 属性）
  const shape = tool.schema.shape;
  server.tool(
    tool.name,
    tool.description,
    shape,
    async (input: unknown) => {
      try {
        const result = tool.handler(input);
        // enveloped 函数返回 ToolEnvelope，序列化为 JSON 文本返回
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: { code: 'handler_error', message } }) }],
          isError: true,
        };
      }
    },
  );
}

// stdio 传输启动
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[chinese-wisdom-mcp] 已注册 ${TOOLS.length} 个工具，stdio 传输就绪`);
