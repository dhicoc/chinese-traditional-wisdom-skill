#!/usr/bin/env node
/**
 * index.ts — 中国传统玄学 MCP Server 主入口
 *
 * 用 @modelcontextprotocol/sdk 的 McpServer + StdioServerTransport，
 * 把 apps/visual/src/legacy 的 25 个 enveloped 引擎暴露为 MCP 工具。
 *
 * 这是三层架构 Layer 2 的薄壳：不实现计算逻辑，只 import enveloped 函数注册成工具。
 * 所有计算引擎都是纯 TS、零 DOM 依赖，Node 可直接运行。
 *
 * 运行：npx tsx src/index.ts（stdio 传输，供 Claude Desktop / Cursor 等客户端挂载）
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TOOLS } from './tools.js';
import { getToolGuidance, listToolGuidance, validateToolInput, GLOBAL_AGENT_RULES, TOOL_GUIDANCE } from './guidance.js';
import { dispatchIntent } from './dispatch.js';

const server = new McpServer({
  name: 'chinese-wisdom-mcp',
  version: '0.1.0',
});

const META_TOOLS_COUNT = 2;

// ─── 注册计算工具（Agent/MCP 硬闸门）───
for (const tool of TOOLS) {
  // McpServer.tool 接受 ZodRawShape（z.object 的 .shape 属性）
  const shape = tool.schema.shape;
  server.tool(
    tool.name,
    tool.description,
    shape,
    async (input: unknown) => {
      try {
        const { missing, prompts } = validateToolInput(tool.name, (input as Record<string, unknown>) || {});
        if (missing.length > 0) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                ok: false,
                error: {
                  code: 'validation_error',
                  missing: missing.map((requirement) => requirement.name),
                  prompts,
                },
              }),
            }],
          };
        }

        const result = await tool.handler(input);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
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

// ─── 元工具 1: agent_guidance（参数引导，防 AI 瞎猜）───
server.tool(
  'agent_guidance',
  '参数引导工具。调用计算工具前，先用本工具确认必要参数，避免瞎猜生辰/性别/事项等。传入 toolName 返回该工具的必填参数清单 + 缺参追问文本 + 推荐工作流；不传 toolName 返回所有工具的引导摘要 + 全局规则。借鉴 horosa agent_guidance 设计。',
  {
    toolName: z.string().optional().describe('要查询引导的工具名（如 bazi_calculate）；不传则返回全部工具摘要'),
    includeAll: z.boolean().optional().describe('是否返回所有工具的完整引导（默认 false）'),
  },
  async (input: unknown) => {
    const { toolName, includeAll } = (input || {}) as { toolName?: string; includeAll?: boolean };
    let payload: unknown;
    if (toolName) {
      const g = getToolGuidance(toolName);
      payload = g ?? { error: `工具 ${toolName} 无引导（可能不存在）`, availableTools: listToolGuidance().map((x) => x.tool) };
    } else if (includeAll) {
      payload = { globalRules: GLOBAL_AGENT_RULES, tools: TOOL_GUIDANCE };
    } else {
      payload = { globalRules: GLOBAL_AGENT_RULES, tools: listToolGuidance() };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
  },
);

// ─── 元工具 2: wisdom_dispatch（自然语言意图路由）───
server.tool(
  'wisdom_dispatch',
  '自然语言意图路由。用户用自然语言描述需求（如"帮我排个八字，1990年6月15日12时男"），本工具自动判断该用哪个计算工具、自动填充能提取的参数、并提示仍缺失的必填参数。借鉴 horosa horosa_dispatch 设计。返回 {tool, arguments, missingPrompts, reason}，AI 据此调对应工具或先追问用户。',
  {
    text: z.string().min(1).describe('用户自然语言输入'),
  },
  async (input: unknown) => {
    const { text } = (input || {}) as { text?: string };
    const result = dispatchIntent(text || '');
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

// stdio 传输启动
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[chinese-wisdom-mcp] 已注册 ${TOOLS.length + META_TOOLS_COUNT} 个工具（${TOOLS.length} 计算 + ${META_TOOLS_COUNT} 元工具），stdio 传输就绪`);
