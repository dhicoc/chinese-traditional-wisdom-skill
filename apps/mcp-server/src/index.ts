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

import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TOOLS } from './tools.js';
import { getToolContract, openObjectOutputSchema, toolEnvelopeOutputSchema, trueSolarOutputSchema } from './mcpContract.js';
import { getToolGuidance, listToolGuidance, validateToolInput, GLOBAL_AGENT_RULES, TOOL_GUIDANCE } from './guidance.js';
import { dispatchIntent } from './dispatch.js';
import { validateBaziPresentation, type BaziPresentationClaim } from './baziClaimVerifier.js';
import { validateBazhaiPresentation, type BazhaiPresentationClaim } from './bazhaiClaimVerifier.js';
import { validateCalendarPresentation, type CalendarPresentationClaim } from './calendarClaimVerifier.js';
import { validateComboPresentation, type ComboPresentationClaim } from './comboClaimVerifier.js';
import { validateDailyPresentation, type DailyPresentationClaim } from './dailyClaimVerifier.js';
import { validateDivinationPresentation, type DivinationPresentationClaim } from './divinationClaimVerifier.js';
import { validateFeixingPresentation, type FeixingPresentationClaim } from './feixingClaimVerifier.js';
import { validateNumericAssertions, registerNumericAssertions, type NumericAssertionClaim } from './numericAssertionVerifier.js';
import { validateZiweiPresentation, type ZiweiPresentationClaim } from './ziweiClaimVerifier.js';

const server = new McpServer({
  name: 'chinese-wisdom-mcp',
  version: '0.1.0',
});

const META_TOOLS_COUNT = 11;

function attachNumericAssertionToken(tool: string, result: Record<string, unknown>) {
  if (result.ok !== true) return result;

  const numericAssertionToken = randomUUID();
  registerNumericAssertions(numericAssertionToken, tool, result);
  const resultMeta = (result.result_meta as Record<string, unknown> | undefined) ?? {};
  return { ...result, result_meta: { ...resultMeta, numericAssertionToken } };
}

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
        const resultWithNumericAssertionToken = attachNumericAssertionToken(tool.name, result);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(resultWithNumericAssertionToken, null, 2) }],
          structuredContent: resultWithNumericAssertionToken,
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
    description: '八宅\u5448\u73b0依据校验。对本次 calc_bazhai 返回的 result_meta.presentationToken 与拟\u5448\u73b0的结构化确定性八宅断言逐项比对；仅核验命卦、八方游年星与吉凶、指定年份的太岁、岁破、三煞和五黄方位。传统释义、布局建议、门主灶与化解建议不进入 claims。校验器不生成、补全或修正解读；任一断言不符时必须移除或改为引擎实际结果。',
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

// ─── 元工具 5: validate_feixing_presentation（流年飞星解读依据校验）───
server.registerTool(
  'validate_feixing_presentation',
  {
    ...getToolContract('validate_feixing_presentation'),
    description: '流年飞星呈现依据校验。对本次 calc_feixing 返回的 result_meta.presentationToken 与拟呈现的结构化年度盘面断言逐项比对；仅核验年度、元运、中宫与指定九宫的飞星及吉凶。化解、布局、财位与个人命卦解释不进入 claims。校验器不生成、补全或修正解读；任一断言不符时必须移除或改为引擎实际结果。',
    inputSchema: {
      presentationToken: z.string().uuid().describe('本次 calc_feixing 返回的 result_meta.presentationToken，仅在当前 MCP 进程有效'),
      claims: z.array(z.union([
        z.object({ kind: z.literal('year'), value: z.number().int().min(1900).max(2100) }),
        z.object({ kind: z.literal('yuanYun'), field: z.enum(['num', 'wangStar', 'shengStar', 'tuiStar']), value: z.number().int() }),
        z.object({ kind: z.literal('yuanYun'), field: z.literal('name'), value: z.string().min(1) }),
        z.object({ kind: z.literal('center'), field: z.literal('centerStar'), value: z.number().int().min(1).max(9) }),
        z.object({ kind: z.literal('center'), field: z.enum(['starName', 'wuxing', 'luck']), value: z.string().min(1) }),
        z.object({ kind: z.literal('palace'), palace: z.string().min(1), field: z.literal('starNum'), value: z.number().int().min(1).max(9) }),
        z.object({ kind: z.literal('palace'), palace: z.string().min(1), field: z.enum(['starName', 'luck']), value: z.string().min(1) }),
      ])).describe('拟呈现文本中的确定性流年飞星盘面断言；不包含化解、布局、财位或个人命卦解释'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { presentationToken, claims } = input as { presentationToken: string; claims: FeixingPresentationClaim[] };
    const validation = validateFeixingPresentation(presentationToken, claims);
    const structuredContent = validation ? { ...validation } : {
      valid: false,
      violations: [{
        kind: 'presentationToken',
        message: 'presentationToken 无效、已失效或不属于当前 MCP 进程；请重新调用 calc_feixing。',
      }],
    };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent,
    };
  },
);

// ─── 元工具 6: validate_calendar_presentation（历法与年度盘面解读依据校验）───
server.registerTool(
  'validate_calendar_presentation',
  {
    ...getToolContract('validate_calendar_presentation'),
    description: '历法与年度盘面呈现依据校验。对本次 calc_yunqi、显式 queryDate 的 xingxiu_daily 或显式 date 的 get_almanac 返回的 result_meta.presentationToken 与拟呈现的结构化基础事实逐项比对。仅核验年度干支、岁运司天在泉与客气步骤，或显式日期的星宿/黄历基础历法字段；宜忌、疾病与养生建议、歌诀和传统解释不进入 claims。校验器不生成、补全或修正解读。',
    inputSchema: {
      presentationToken: z.string().uuid().describe('本次可复现历法或年度盘面工具返回的 result_meta.presentationToken，仅在当前 MCP 进程有效'),
      claims: z.array(z.union([
        z.object({ kind: z.literal('yunqiYear'), field: z.literal('year'), value: z.number().int().min(1900).max(2100) }),
        z.object({ kind: z.literal('yunqiYear'), field: z.enum(['tiangan', 'dizhi']), value: z.string().min(1) }),
        z.object({ kind: z.literal('yunqiWuyun'), field: z.literal('dayun'), value: z.string().min(1) }),
        z.object({ kind: z.literal('yunqiLiuqi'), field: z.enum(['sitian', 'zaiquan']), value: z.string().min(1) }),
        z.object({ kind: z.literal('yunqiStep'), step: z.string().min(1), field: z.enum(['qi', 'start', 'end']), value: z.string().min(1) }),
        z.object({ kind: z.literal('xingxiu'), field: z.enum(['queryDate', 'zhiXiu', 'zhiXiuFull', 'xiang', 'wuxing', 'yao', 'animal']), value: z.string().min(1) }),
        z.object({ kind: z.literal('almanac'), field: z.enum(['solarDate', 'lunarDate', 'yearGanZhi', 'monthGanZhi', 'dayGanZhi', 'zodiac', 'jieQi', 'dayNaYin', 'dayXiu', 'dayTianShen', 'dayTianShenType', 'chong', 'sha', 'liuYao', 'dayNineStar']), value: z.string().min(1) }),
        z.object({ kind: z.literal('almanacHour'), label: z.string().min(1), field: z.enum(['ganZhi', 'tianShen', 'tianShenType', 'luck']), value: z.string().min(1) }),
      ])).describe('拟呈现的可复现历法或年度盘面基础事实；不包含宜忌、疾病/养生建议、歌诀或传统解释'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { presentationToken, claims } = input as { presentationToken: string; claims: CalendarPresentationClaim[] };
    const validation = validateCalendarPresentation(presentationToken, claims);
    const structuredContent = validation ?? {
      valid: false,
      violations: [{
        kind: 'presentationToken',
        message: 'presentationToken 无效、已失效、非显式可复现输入或不属于当前 MCP 进程；请重新调用对应工具并传入 year、queryDate 或 date。',
      }],
    };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent: { ...structuredContent },
    };
  },
);

// ─── 元工具 7: validate_divination_presentation（占测／卦象呈现依据校验）───
server.registerTool(
  'validate_divination_presentation',
  {
    ...getToolContract('validate_divination_presentation'),
    description: '占测／卦象呈现依据校验。对本次六爻、梅花易数、奇门遁甲、大六壬、太乙神数或皇极经世返回的 result_meta.presentationToken 与拟呈现的基础盘面事实逐项比对。仅核验卦名、动爻、局式、宫位、干支、三传、周期等盘面字段；吉凶、应期、策略、传统解释与行动建议不进入 claims。校验器不生成、补全或修正解读。',
    inputSchema: {
      presentationToken: z.string().uuid().describe('本次占测／卦象工具返回的 result_meta.presentationToken，仅在当前 MCP 进程有效'),
      claims: z.array(z.union([
        z.object({ tool: z.literal('cast_liuyao'), kind: z.literal('hexagram'), field: z.enum(['name', 'changedName', 'palace', 'palaceElement', 'dayGanZhi', 'monthGanZhi']), value: z.string().min(1) }),
        z.object({ tool: z.literal('cast_liuyao'), kind: z.literal('yao'), field: z.enum(['shiYao', 'yingYao']), value: z.number().int().min(1).max(6) }),
        z.object({ tool: z.literal('cast_liuyao'), kind: z.literal('yao'), field: z.literal('changingYao'), value: z.string() }),
        z.object({ tool: z.literal('cast_meihua'), kind: z.literal('hexagram'), field: z.enum(['name', 'changedName', 'bodyTrigram', 'useTrigram', 'bodyUseRelation']), value: z.string().min(1) }),
        z.object({ tool: z.literal('cast_meihua'), kind: z.literal('yao'), field: z.literal('changingLine'), value: z.number().int().min(1).max(6) }),
        z.object({ tool: z.literal('cast_meihua'), kind: z.literal('trigram'), position: z.enum(['upper', 'lower']), field: z.enum(['name', 'nature', 'element']), value: z.string().min(1) }),
        z.object({ tool: z.literal('arrange_qimen'), kind: z.literal('basic'), field: z.enum(['dun', 'ju', 'yuan', 'season', 'monthElement']), value: z.string() }),
        z.object({ tool: z.literal('arrange_qimen'), kind: z.literal('zhiFu'), field: z.enum(['star', 'heavenlyStem']), value: z.string() }),
        z.object({ tool: z.literal('arrange_qimen'), kind: z.literal('zhiFu'), field: z.literal('position'), value: z.number().int().min(1).max(9) }),
        z.object({ tool: z.literal('arrange_qimen'), kind: z.literal('zhiShi'), field: z.literal('gate'), value: z.string() }),
        z.object({ tool: z.literal('arrange_qimen'), kind: z.literal('zhiShi'), field: z.literal('position'), value: z.number().int().min(1).max(9) }),
        z.object({ tool: z.literal('arrange_qimen'), kind: z.literal('palace'), position: z.number().int().min(1).max(9), field: z.enum(['trigram', 'gate', 'star', 'deity', 'heavenlyStem', 'earthlyStem', 'earthBranch']), value: z.string() }),
        z.object({ tool: z.literal('liuren_calculate'), kind: z.literal('basic'), field: z.enum(['jieqi', 'dayGanZhi', 'hourGanZhi', 'dayNight', 'yueJiang', 'yueJiangName']), value: z.string().min(1) }),
        z.object({ tool: z.literal('liuren_calculate'), kind: z.literal('sike'), position: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), field: z.enum(['shangShen', 'xiaShen', 'tianJiang', 'relation']), value: z.string().min(1) }),
        z.object({ tool: z.literal('liuren_calculate'), kind: z.literal('sanchuan'), stage: z.enum(['chuChuan', 'zhongChuan', 'moChuan']), field: z.enum(['diZhi', 'tianJiang', 'liuQin']), value: z.string().min(1) }),
        z.object({ tool: z.literal('liuren_calculate'), kind: z.literal('sanchuan'), stage: z.enum(['chuChuan', 'zhongChuan', 'moChuan']), field: z.literal('xunKong'), value: z.string().nullable() }),
        z.object({ tool: z.literal('taiyi_calculate'), kind: z.literal('basic'), field: z.enum(['yearGz', 'monthGz', 'dayGz', 'hourGz', 'jieqi', 'jiStyleName', 'acumYearName']), value: z.string().min(1) }),
        z.object({ tool: z.literal('taiyi_calculate'), kind: z.literal('kook'), field: z.enum(['wen', 'nian', 'dun']), value: z.string().min(1) }),
        z.object({ tool: z.literal('taiyi_calculate'), kind: z.literal('kook'), field: z.literal('num'), value: z.number().int() }),
        z.object({ tool: z.literal('taiyi_calculate'), kind: z.literal('position'), subject: z.enum(['taiyi', 'wenchang', 'shiji', 'dingmu']), field: z.literal('gong'), value: z.string().min(1) }),
        z.object({ tool: z.literal('taiyi_calculate'), kind: z.literal('position'), subject: z.literal('taiyi'), field: z.literal('num'), value: z.number().int() }),
        z.object({ tool: z.literal('taiyi_calculate'), kind: z.literal('calculation'), side: z.enum(['home', 'away']), field: z.enum(['cal', 'general', 'vgen']), value: z.number().int() }),
        z.object({ tool: z.literal('huangji_calculate'), kind: z.literal('ganZhi'), pillar: z.enum(['year', 'month', 'day', 'hour']), value: z.string().min(1) }),
        z.object({ tool: z.literal('huangji_calculate'), kind: z.literal('lunarMonth'), value: z.number().int().min(1).max(12) }),
        z.object({ tool: z.literal('huangji_calculate'), kind: z.literal('cycle'), field: z.enum(['acumYear', 'hui', 'yun', 'shi']), value: z.number().int() }),
        z.object({ tool: z.literal('huangji_calculate'), kind: z.literal('gua'), layer: z.enum(['zheng', 'yun', 'shi', 'xun', 'year', 'month', 'day', 'hour', 'minute']), value: z.string().min(1) }),
        z.object({ tool: z.literal('huangji_calculate'), kind: z.literal('movingLine'), layer: z.enum(['yun', 'shi', 'xun']), value: z.number().int().min(1).max(6) }),
      ])).describe('拟呈现的基础占测／卦象盘面事实；不包含吉凶、应期、策略、传统解释或行动建议'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { presentationToken, claims } = input as { presentationToken: string; claims: DivinationPresentationClaim[] };
    const validation = validateDivinationPresentation(presentationToken, claims);
    const structuredContent = validation ?? {
      valid: false,
      violations: [{ kind: 'presentationToken', message: 'presentationToken 无效、已失效或不属于当前 MCP 进程；请重新调用对应占测／卦象工具。' }],
    };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent: { ...structuredContent },
    };
  },
);

// ─── 元工具 8: validate_daily_presentation（日用与民俗呈现依据校验）───
server.registerTool(
  'validate_daily_presentation',
  {
    ...getToolContract('validate_daily_presentation'),
    description: '日用与民俗呈现依据校验。对本次姓名分析、喜用神推算、五运六气体质倾向、周公解梦查询、测字、称骨、每日节律或体质问卷返回的 result_meta.presentationToken 与拟呈现的结构化基础事实逐项比对。仅核验姓名分数/等级/维度、喜用神日主/同异类五行及分数/强弱/用神、体质倾向岁运/司天/在泉与倾向类型、梦象命中状态及条目标题/分类/吉凶标签、测字笔画/数理/五行/结构/八字补益、称骨骨重/版本、节律日期/节气/经络、问卷主体质/转化分；不核验置信说明、倾向理由、边界说明、现代释义、古文断语、心理学解释、调养方案与医疗建议。校验器不生成、补全或修正解读。',
    inputSchema: {
      presentationToken: z.string().uuid().describe('本次日用或民俗工具返回的 result_meta.presentationToken，仅在当前 MCP 进程有效'),
      claims: z.array(z.union([
        z.object({ tool: z.literal('analyze_name'), kind: z.literal('nameRating'), field: z.enum(['totalScore', 'grade']), value: z.union([z.number(), z.string().min(1)]) }),
        z.object({ tool: z.literal('analyze_name'), kind: z.literal('nameDimension'), name: z.string().min(1), field: z.enum(['score', 'weight']), value: z.number().finite() }),
        z.object({ tool: z.literal('calc_xiyong'), kind: z.literal('xiyong'), field: z.enum(['dayMasterWuxing', 'qiangRuo', 'shen']), value: z.string().min(1) }),
        z.object({ tool: z.literal('calc_xiyong'), kind: z.literal('xiyong'), field: z.enum(['similarPoint', 'heterogeneousPoint']), value: z.number().finite() }),
        z.object({ tool: z.literal('calc_xiyong'), kind: z.literal('xiyongElements'), group: z.enum(['similar', 'heterogeneous']), value: z.array(z.string().min(1)) }),
        z.object({ tool: z.literal('get_constitution_tendency'), kind: z.literal('constitutionTendencySource'), field: z.enum(['dayun', 'sitian', 'zaiquan']), value: z.string() }),
        z.object({ tool: z.literal('get_constitution_tendency'), kind: z.literal('constitutionTendency'), index: z.number().int().min(0), field: z.literal('type'), value: z.string().min(1) }),
        z.object({ tool: z.literal('dream_interpret'), kind: z.literal('dreamSearch'), field: z.literal('hit'), value: z.boolean() }),
        z.object({ tool: z.literal('dream_interpret'), kind: z.literal('dreamEntry'), index: z.number().int().min(0), field: z.enum(['title', 'biglx', 'smalllx', 'luck']), value: z.string().min(1) }),
        z.object({ tool: z.literal('cast_cezi'), kind: z.literal('cezi'), field: z.enum(['char', 'strokes', 'strokesEstimated', 'charWuxing']), value: z.union([z.string().min(1), z.number().int(), z.boolean()]) }),
        z.object({ tool: z.literal('cast_cezi'), kind: z.literal('ceziShuli'), field: z.enum(['number', 'lucky', 'skyNine']), value: z.union([z.number().int(), z.string().min(1)]) }),
        z.object({ tool: z.literal('cast_cezi'), kind: z.literal('ceziStructure'), field: z.enum(['structure', 'radical']), value: z.string().min(1) }),
        z.object({ tool: z.literal('cast_cezi'), kind: z.literal('ceziBaziComplement'), field: z.enum(['complement', 'score']), value: z.union([z.string().min(1), z.number(), z.null()]) }),
        z.object({ tool: z.literal('calc_chenguz'), kind: z.literal('chenguzBone'), component: z.enum(['yearBone', 'hourBone']), field: z.enum(['branch', 'liang', 'qian']), value: z.union([z.string().min(1), z.number().int()]) }),
        z.object({ tool: z.literal('calc_chenguz'), kind: z.literal('chenguzBone'), component: z.literal('monthBone'), field: z.enum(['lunarMonth', 'liang', 'qian']), value: z.number().int() }),
        z.object({ tool: z.literal('calc_chenguz'), kind: z.literal('chenguzBone'), component: z.literal('dayBone'), field: z.enum(['lunarDay', 'liang', 'qian']), value: z.number().int() }),
        z.object({ tool: z.literal('calc_chenguz'), kind: z.literal('chenguzTotal'), field: z.enum(['liang', 'qian', 'text']), value: z.union([z.string().min(1), z.number().int()]) }),
        z.object({ tool: z.literal('calc_chenguz'), kind: z.literal('chenguzVersion'), field: z.enum(['id', 'name']), value: z.string().min(1) }),
        z.object({ tool: z.literal('get_daily_rhythm'), kind: z.literal('rhythm'), field: z.enum(['date', 'jieqi']), value: z.string().min(1) }),
        z.object({ tool: z.literal('get_daily_rhythm'), kind: z.literal('rhythmMeridian'), field: z.enum(['time', 'hours', 'meridian', 'organ']), value: z.string().min(1).nullable() }),
        z.object({ tool: z.literal('assess_constitution'), kind: z.literal('constitution'), field: z.literal('dominantType'), value: z.string().min(1) }),
        z.object({ tool: z.literal('assess_constitution'), kind: z.literal('constitutionScore'), type: z.string().min(1), value: z.number().finite() }),
      ])).min(1).describe('拟呈现的基础日用或民俗事实；不包含断语、歌诀、解释、调养方案或医疗建议'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { presentationToken, claims } = input as { presentationToken: string; claims: DailyPresentationClaim[] };
    const validation = validateDailyPresentation(presentationToken, claims);
    const structuredContent = validation ?? {
      valid: false,
      violations: [{ kind: 'presentationToken', message: 'presentationToken 无效、已失效或不属于当前 MCP 进程；请重新调用对应日用或民俗工具。' }],
    };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent: { ...structuredContent },
    };
  },
);

// ─── 元工具 9: validate_combo_presentation（组合工具呈现依据校验）───
server.registerTool(
  'validate_combo_presentation',
  {
    ...getToolContract('validate_combo_presentation'),
    description: '组合工具呈现依据校验。对本次 combo_zeri 的结构化基础事实、combo_monthly_fortune 的年月/流月干支/节气/模式、combo_marriage 的场景/双方日柱日主五行命卦/逐柱干支冲合布尔关系，或 combo_daily_wellness 的传统规则／知识输出逐项比对。择日仅核验用途、搜索范围、候选条目与方位基础字段；月度仅核验结构化上下文，不核验运势结论或建议；合婚不核验姓名、紫微、评分、结论、风水或建议；养生可核验本次节气、体质、时辰经络、方位提示及传统规则建议条目是否与工具输出一致。养生 valid:true 仅表示与本次传统规则输出一致，不代表现实效果、医疗安全性或个体结果保证；结果仅供传统文化与日常参考，切勿盲目相信。校验器不生成、补全或修正解读。',
    inputSchema: {
      presentationToken: z.string().uuid().describe('本次 combo_zeri、combo_monthly_fortune、combo_marriage 或 combo_daily_wellness 返回的 result_meta.presentationToken，仅在当前 MCP 进程有效'),
      claims: z.array(z.union([
        z.object({ tool: z.literal('combo_zeri'), kind: z.literal('zeriPurpose'), value: z.enum(['开业', '结婚', '搬家', '动土', '出行', '签约', '安葬', '祈福']) }),
        z.object({ tool: z.literal('combo_zeri'), kind: z.literal('zeriRange'), field: z.enum(['start', 'end']), value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
        z.object({ tool: z.literal('combo_zeri'), kind: z.literal('zeriRange'), field: z.literal('scannedDays'), value: z.number().int().min(0) }),
        z.object({ tool: z.literal('combo_zeri'), kind: z.literal('zeriRankedDay'), index: z.number().int().min(0), field: z.enum(['date', 'lunarDate', 'dayGanZhi', 'tone']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_zeri'), kind: z.literal('zeriRankedDay'), index: z.number().int().min(0), field: z.literal('score'), value: z.number().finite() }),
        z.object({ tool: z.literal('combo_zeri'), kind: z.literal('zeriRankedDay'), index: z.number().int().min(0), field: z.enum(['chongOwner', 'hitsAnnualSha']), value: z.boolean() }),
        z.object({ tool: z.literal('combo_zeri'), kind: z.literal('zeriAnnualSha'), field: z.enum(['taisui', 'suiPo', 'sanSha', 'fiveYellow']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_zeri'), kind: z.literal('zeriPersonalDirection'), index: z.number().int().min(0), field: z.enum(['star', 'direction']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_monthly_fortune'), kind: z.literal('monthlyContext'), field: z.enum(['year', 'month']), value: z.number().int() }),
        z.object({ tool: z.literal('combo_monthly_fortune'), kind: z.literal('monthlyContext'), field: z.enum(['monthGanZhi', 'jieqi']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_monthly_fortune'), kind: z.literal('monthlyMode'), value: z.enum(['local-exact', 'local-approx']) }),
        z.object({ tool: z.literal('combo_marriage'), kind: z.literal('marriageScene'), value: z.enum(['婚恋', '合伙', '合作']) }),
        z.object({ tool: z.literal('combo_marriage'), kind: z.literal('marriagePerson'), person: z.enum(['personA', 'personB']), field: z.enum(['dayGanZhi', 'dayMaster', 'dayMasterWuxing']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_marriage'), kind: z.literal('marriageElement'), person: z.enum(['personA', 'personB']), element: z.enum(['木', '火', '土', '金', '水']), value: z.number().int().min(0) }),
        z.object({ tool: z.literal('combo_marriage'), kind: z.literal('marriageMingGua'), person: z.enum(['personA', 'personB']), field: z.enum(['trigram', 'group']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_marriage'), kind: z.literal('marriageChongHe'), index: z.number().int().min(0), field: z.enum(['pillar', 'aGanZhi', 'bGanZhi']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_marriage'), kind: z.literal('marriageChongHeRelation'), index: z.number().int().min(0), field: z.enum(['chong', 'liuHe', 'sanHe', 'hai', 'xing', 'ganHe', 'ganChong']), value: z.boolean() }),
        z.object({ tool: z.literal('combo_daily_wellness'), kind: z.literal('wellnessContext'), field: z.enum(['date', 'jieqi', 'season', 'shichen', 'meridian']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_daily_wellness'), kind: z.literal('wellnessConstitution'), field: z.enum(['type', 'source', 'reason']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_daily_wellness'), kind: z.literal('wellnessJieqi'), field: z.enum(['jieqi', 'season', 'feature', 'diet', 'lifestyle', 'exercise', 'acupoints', 'principle']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_daily_wellness'), kind: z.literal('wellnessMeridian'), field: z.enum(['name', 'time', 'hours', 'meridian', 'organ', 'function', 'advice', 'wuxing']), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_daily_wellness'), kind: z.literal('wellnessDirection'), value: z.string().min(1) }),
        z.object({ tool: z.literal('combo_daily_wellness'), kind: z.literal('wellnessRecommendation'), index: z.number().int().min(0), field: z.enum(['label', 'value', 'tone']), value: z.string().min(1) }),
      ])).min(1).describe('拟呈现的组合输出；养生 claims 仅用于核验与本次传统规则／知识输出一致，不构成医疗或效果保证'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { presentationToken, claims } = input as { presentationToken: string; claims: ComboPresentationClaim[] };
    const validation = validateComboPresentation(presentationToken, claims);
    const structuredContent = validation ?? {
      valid: false,
      violations: [{ kind: 'presentationToken', message: 'presentationToken 无效、已失效或不属于当前 MCP 进程；请重新调用对应组合工具。' }],
    };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent: { ...structuredContent },
    };
  },
);

// ─── 元工具 10: validate_numeric_assertions（数值断言依据校验）───
server.registerTool(
  'validate_numeric_assertions',
  {
    ...getToolContract('validate_numeric_assertions'),
    description: '数值断言依据校验。对本次任一成功计算工具返回的 result_meta.numericAssertionToken 与 Agent 拟呈现的结构化数值断言逐项比对。每条 claim 仅可引用 data.* 下的有限数值；不解析或校验自由文本，不读取 result_meta、evidence 或其他内部字段。校验器不生成、补全或修正解读。',
    inputSchema: {
      numericAssertionToken: z.string().uuid().describe('本次成功计算工具返回的 result_meta.numericAssertionToken，仅在当前 MCP 进程有效'),
      claims: z.array(z.object({
        tool: z.string().optional().describe('可选的原始计算工具名；提供时必须与凭证所属工具一致'),
        path: z.string().regex(/^data(?:\.[^.]+)+$/).describe('ToolEnvelope 中待校验的 data.* 数值路径，如 data.elements.木'),
        value: z.number().finite().describe('拟呈现的数值'),
      })).min(1).describe('拟呈现文本中的结构化数值断言；不包含自由文本'),
    },
    outputSchema: openObjectOutputSchema,
  },
  async (input: unknown) => {
    const { numericAssertionToken, claims } = input as { numericAssertionToken: string; claims: NumericAssertionClaim[] };
    const validation = validateNumericAssertions(numericAssertionToken, claims);
    const structuredContent = validation ?? {
      valid: false,
      violations: [{ path: 'numericAssertionToken', message: 'numericAssertionToken 无效、已失效或不属于当前 MCP 进程；请重新调用对应计算工具。' }],
    };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent: { ...structuredContent },
    };
  },
);

// ─── 元工具 11: wisdom_dispatch（自然语言意图路由）───
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
