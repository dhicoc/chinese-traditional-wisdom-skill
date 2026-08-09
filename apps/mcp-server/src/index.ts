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
import { getToolContract, openObjectOutputSchema, toolEnvelopeOutputSchema, trueSolarOutputSchema } from './mcpContract.js';
import { getToolGuidance, listToolGuidance, validateToolInput, GLOBAL_AGENT_RULES, TOOL_GUIDANCE } from './guidance.js';
import { dispatchIntent } from './dispatch.js';
import { validateBaziPresentation, type BaziPresentationClaim } from './baziClaimVerifier.js';
import { validateBazhaiPresentation, type BazhaiPresentationClaim } from './bazhaiClaimVerifier.js';
import { validateZiweiPresentation, type ZiweiPresentationClaim } from './ziweiClaimVerifier.js';

const server = new McpServer({
  name: 'chinese-wisdom-mcp',
  version: '0.1.0',
});

const META_TOOLS_COUNT = 4;

// ─── 注册计算工具（Agent/MCP 硬闸门）───
for (const tool of TOOLS) {
  const contract = getToolContract(tool.name);
  const outputSchema = tool.name === 'resolve_true_solar_time' ? trueSolarOutputSchema : toolEnvelopeOutputSchema;
  server.registerTool(
    tool.name,
    {
      title: contract.title,
      description: tool.description,
      inputSchema: tool.schema.shape,
      outputSchema,
      annotations: contract.annotations,
    },
    async (input: unknown) => {
      try {
        const { missing, prompts } = validateToolInput(tool.name, (input as Record<string, unknown>) || {});
        if (missing.length > 0) {
          const validationError = {
            ok: false,
            error: {
              code: 'validation_error',
              missing: missing.map((requirement) => requirement.name),
              prompts,
            },
          };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(validationError) }],
            structuredContent: {
              ok: false,
              tool: tool.name,
              version: '1.0.0',
              input_normalized: (input as Record<string, unknown>) || {},
              data: null,
              error: { code: 'validation_error', message: '缺少调用所需参数。' },
            },
          };
        }

        const result = await tool.handler(input) as Record<string, unknown>;
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
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
server.registerTool(
  'agent_guidance',
  {
    ...getToolContract('agent_guidance'),
    description: '参数引导工具。调用计算工具前，先用本工具确认必要参数，避免瞎猜生辰/性别/事项等。传入 toolName 返回该工具的必填参数清单 + 缺参追问文本 + 推荐工作流；不传 toolName 返回所有工具的引导摘要 + 全局规则。借鉴 horosa agent_guidance 设计。',
    inputSchema: {
      toolName: z.string().optional().describe('要查询引导的工具名（如 bazi_calculate）；不传则返回全部工具摘要'),
      includeAll: z.boolean().optional().describe('是否返回所有工具的完整引导（默认 false）'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { toolName, includeAll } = (input || {}) as { toolName?: string; includeAll?: boolean };
    let payload: Record<string, unknown>;
    if (toolName) {
      const g = getToolGuidance(toolName);
      payload = g ? { ...g } : { error: `工具 ${toolName} 无引导（可能不存在）`, availableTools: listToolGuidance().map((x) => x.tool) };
    } else if (includeAll) {
      payload = { globalRules: GLOBAL_AGENT_RULES, tools: TOOL_GUIDANCE };
    } else {
      payload = { globalRules: GLOBAL_AGENT_RULES, tools: listToolGuidance() };
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
);

// ─── 元工具 2: validate_bazi_presentation（八字解读依据校验）───
server.registerTool(
  'validate_bazi_presentation',
  {
    ...getToolContract('validate_bazi_presentation'),
    description: '八字呈现依据校验。对本次 bazi_calculate 返回的 result_meta.presentationToken 与 Agent 拟呈现的结构化确定性断言逐项比对；仅核验四柱、日主、五行计数、强弱、大运、神煞。文化背景和建议不进入 claims。校验器不生成、补全或修正解读；任一断言不符时必须移除或改为引擎实际结果。',
    inputSchema: {
      presentationToken: z.string().uuid().describe('本次 bazi_calculate 返回的 result_meta.presentationToken，仅在当前 MCP 进程有效'),
      claims: z.array(z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('pillar'), pillar: z.enum(['year', 'month', 'day', 'hour']), value: z.string().length(2) }),
        z.object({ kind: z.literal('dayMaster'), value: z.string().length(1) }),
        z.object({ kind: z.literal('elementCount'), element: z.enum(['木', '火', '土', '金', '水']), value: z.number().int().min(0) }),
        z.object({ kind: z.literal('strength'), value: z.enum(['身强', '身弱', '中和']) }),
        z.object({ kind: z.literal('luck'), ageStart: z.number().int().min(0), value: z.string().length(2) }),
        z.object({ kind: z.literal('shenSha'), value: z.string().min(1) }),
      ])).describe('拟呈现文本中的确定性八字断言；不包含文化背景或建议'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { presentationToken, claims } = input as { presentationToken: string; claims: BaziPresentationClaim[] };
    const validation = validateBaziPresentation(presentationToken, claims);
    const structuredContent = validation ? { ...validation } : {
      valid: false,
      violations: [{
        kind: 'presentationToken',
        message: 'presentationToken 无效、已失效或不属于当前 MCP 进程；请重新调用 bazi_calculate。',
      }],
    };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent,
    };
  },
);

// ─── 元工具 3: validate_ziwei_presentation（紫微解读依据校验）───
server.registerTool(
  'validate_ziwei_presentation',
  {
    ...getToolContract('validate_ziwei_presentation'),
    description: '紫微呈现依据校验。对本次 ziwei_chart 返回的 result_meta.presentationToken 与拟呈现的结构化确定性紫微断言逐项比对；仅核验宫位、星曜、四化、元资料与本次动态层。传统解释、条件性推论和建议不进入 claims。校验器不生成、补全或修正解读；任一断言不符时必须移除或改为引擎实际结果。',
    inputSchema: {
      presentationToken: z.string().uuid().describe('本次 ziwei_chart 返回的 result_meta.presentationToken，仅在当前 MCP 进程有效'),
      claims: z.array(z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('palace'), palace: z.string().min(1), field: z.enum(['position', 'miaoxian']), value: z.string().min(1) }),
        z.object({ kind: z.literal('palaceStar'), palace: z.string().min(1), value: z.string().min(1) }),
        z.object({ kind: z.literal('sihua'), star: z.string().min(1), value: z.enum(['禄', '权', '科', '忌']) }),
        z.object({ kind: z.literal('mainStar'), value: z.string().min(1) }),
        z.object({ kind: z.literal('metadata'), field: z.enum(['fiveElementsClass', 'soul', 'body', 'bodyPalaceBranch', 'originalPalaceBranch']), value: z.string().min(1) }),
        z.object({ kind: z.literal('transit'), field: z.enum(['decadal', 'yearly', 'monthly', 'age', 'yearlyMingPalace', 'yearlyJiStar']), value: z.union([z.string().min(1), z.number().int().min(0)]) }),
      ])).describe('拟呈现文本中的确定性紫微断言；不包含传统解释或建议'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { presentationToken, claims } = input as { presentationToken: string; claims: ZiweiPresentationClaim[] };
    const validation = validateZiweiPresentation(presentationToken, claims);
    const structuredContent = validation ? { ...validation } : {
      valid: false,
      violations: [{
        kind: 'presentationToken',
        message: 'presentationToken 无效、已失效或不属于当前 MCP 进程；请重新调用 ziwei_chart。',
      }],
    };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent,
    };
  },
);

// ─── 元工具 4: validate_bazhai_presentation（八宅解读依据校验）───
server.registerTool(
  'validate_bazhai_presentation',
  {
    ...getToolContract('validate_bazhai_presentation'),
    description: '八宅呈现依据校验。对本次 calc_bazhai 返回的 result_meta.presentationToken 与拟呈现的结构化确定性八宅断言逐项比对；仅核验命卦、八方游年星与吉凶、指定年份的太岁、岁破、三煞和五黄方位。传统释义、布局建议、门主灶与化解建议不进入 claims。校验器不生成、补全或修正解读；任一断言不符时必须移除或改为引擎实际结果。',
    inputSchema: {
      presentationToken: z.string().uuid().describe('本次 calc_bazhai 返回的 result_meta.presentationToken，仅在当前 MCP 进程有效'),
      claims: z.array(z.union([
        z.object({ kind: z.literal('mingGua'), field: z.enum(['trigram', 'group']), value: z.string().min(1) }),
        z.object({ kind: z.literal('mingGua'), field: z.literal('num'), value: z.number().int().min(1).max(9) }),
        z.object({ kind: z.literal('direction'), direction: z.string().min(1), field: z.enum(['star', 'quality']), value: z.string().min(1) }),
        z.object({ kind: z.literal('annual'), field: z.enum(['yearZhi', 'taisuiZhi', 'taisuiDirection', 'taisuiBagua', 'suiPoZhi', 'suiPoDirection', 'suiPoBagua', 'sanShaZhiList', 'sanShaDirection', 'fiveYellowBagua', 'fiveYellowDirection']), value: z.string().min(1) }),
      ])).describe('拟呈现文本中的确定性八宅断言；不包含传统释义、布局建议、门主灶或化解建议'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { presentationToken, claims } = input as { presentationToken: string; claims: BazhaiPresentationClaim[] };
    const validation = validateBazhaiPresentation(presentationToken, claims);
    const structuredContent = validation ? { ...validation } : {
      valid: false,
      violations: [{
        kind: 'presentationToken',
        message: 'presentationToken 无效、已失效或不属于当前 MCP 进程；请重新调用 calc_bazhai。',
      }],
    };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent,
    };
  },
);

// ─── 元工具 5: wisdom_dispatch（自然语言意图路由）───
server.registerTool(
  'wisdom_dispatch',
  {
    ...getToolContract('wisdom_dispatch'),
    description: '自然语言意图路由。用户用自然语言描述需求（如"帮我排个八字，1990年6月15日12时男"），本工具自动判断该用哪个计算工具、自动填充能提取的参数、并提示仍缺失的必填参数。借鉴 horosa horosa_dispatch 设计。返回 {tool, arguments, missingPrompts, reason}，AI 据此调对应工具或先追问用户。',
    inputSchema: {
      text: z.string().min(1).describe('用户自然语言输入'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { text } = (input || {}) as { text?: string };
    const result = dispatchIntent(text || '');
    const structuredContent = { ...result };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent,
    };
  },
);

// stdio 传输启动
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[chinese-wisdom-mcp] 已注册 ${TOOLS.length + META_TOOLS_COUNT} 个工具（${TOOLS.length} 计算 + ${META_TOOLS_COUNT} 元工具），stdio 传输就绪`);
