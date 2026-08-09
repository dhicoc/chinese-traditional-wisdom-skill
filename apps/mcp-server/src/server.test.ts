import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * MCP Server 端到端协议测试。
 * 启动真实 server 进程（tsx src/index.ts），通过 stdio 发 JSON-RPC 消息，
 * 验证 MCP 协议握手 + tools/list + tools/call 全链路。
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = resolve(__dirname, 'index.ts');

interface JsonRpcResponse {
  id: number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

/** 启动 server，发送一组 MCP 消息，收集响应 */
function runMcpSession(messages: string[], timeoutMs = 30000): Promise<JsonRpcResponse[]> {
  return new Promise((resolveP, rejectP) => {
    const proc = spawn('npx', ['tsx', SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    const responses: JsonRpcResponse[] = [];
    let buffer = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      // MCP 每条消息一行 JSON
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as JsonRpcResponse;
          if (parsed.id !== null && parsed.id !== undefined) responses.push(parsed);
        } catch {
          /* 非 JSON 行忽略 */
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timeout = setTimeout(() => {
      proc.kill();
      rejectP(new Error(`MCP session 超时。stderr: ${stderr}`));
    }, timeoutMs);

    proc.on('error', (err) => {
      clearTimeout(timeout);
      rejectP(err);
    });

    // 发送所有消息
    const input = messages.join('\n') + '\n';
    proc.stdin.write(input);
    proc.stdin.end();

    proc.on('close', () => {
      clearTimeout(timeout);
      resolveP(responses);
    });
  });
}

function runMcpSessionWithFollowUp(
  initialMessages: string[],
  followUp: (response: JsonRpcResponse) => string[] | null,
  timeoutMs = 30000,
): Promise<JsonRpcResponse[]> {
  return new Promise((resolveP, rejectP) => {
    const proc = spawn('npx', ['tsx', SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    const responses: JsonRpcResponse[] = [];
    let buffer = '';
    let stderr = '';
    let followUpSent = false;

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as JsonRpcResponse;
          if (parsed.id === null || parsed.id === undefined) continue;
          responses.push(parsed);
          const messages = followUpSent ? null : followUp(parsed);
          if (messages) {
            followUpSent = true;
            proc.stdin.write(`${messages.join('\n')}\n`);
            proc.stdin.end();
          }
        } catch {
          /* 非 JSON 行忽略 */
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timeout = setTimeout(() => {
      proc.kill();
      rejectP(new Error(`MCP session 超时。stderr: ${stderr}`));
    }, timeoutMs);

    proc.on('error', (err) => {
      clearTimeout(timeout);
      rejectP(err);
    });

    proc.stdin.write(`${initialMessages.join('\n')}\n`);

    proc.on('close', () => {
      clearTimeout(timeout);
      resolveP(responses);
    });
  });
}

const INIT_MSG = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'vitest', version: '1.0' } },
});
const INITIALIZED_MSG = JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' });
const TOOLS_LIST_MSG = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' });

function toolCallMsg(id: number, name: string, args: unknown): string {
  return JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
}

function toolCatalog(tools: Array<Record<string, unknown>>) {
  return tools
    .map(({ name, title, description, inputSchema, outputSchema, annotations }) => ({
      name,
      title,
      description,
      inputSchema,
      outputSchema,
      annotations,
    }))
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
}

describe('MCP Server 端到端协议', () => {
  it('initialize 握手返回 serverInfo', async () => {
    const responses = await runMcpSession([INIT_MSG, INITIALIZED_MSG]);
    const init = responses.find((r) => r.id === 1);
    expect(init).toBeDefined();
    const result = init!.result as { serverInfo?: { name: string; version: string }; protocolVersion?: string };
    expect(result.serverInfo?.name).toBe('chinese-wisdom-mcp');
    expect(result.protocolVersion).toBe('2024-11-05');
  }, 30000);

  it('tools/list 返回 43 个工具（32 计算 + 11 元工具）且 inputSchema 完整', async () => {
    const responses = await runMcpSession([INIT_MSG, INITIALIZED_MSG, TOOLS_LIST_MSG]);
    const list = responses.find((r) => r.id === 2);
    expect(list).toBeDefined();
    const tools = (list!.result as {
      tools: Array<{
        name: string;
        title?: string;
        description: string;
        inputSchema: { type: string; properties: unknown };
        outputSchema?: { type: string };
        annotations?: {
          readOnlyHint?: boolean;
          destructiveHint?: boolean;
          idempotentHint?: boolean;
          openWorldHint?: boolean;
        };
      }>;
    }).tools;
    expect(tools.length).toBe(43);
    tools.forEach((t) => {
      expect(t.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.inputSchema.type).toBe('object');
      expect(t.inputSchema.properties).toBeDefined();
    });
    // 验证关键工具存在（含元工具）
    const names = tools.map((t) => t.name);
    expect(names).toContain('bazi_calculate');
    expect(names).toContain('resolve_true_solar_time');
    expect(names).toContain('ziwei_chart');
    expect(names).toContain('dream_interpret');
    expect(names).toContain('agent_guidance');
    expect(names).toContain('validate_bazi_presentation');
    expect(names).toContain('validate_ziwei_presentation');
    expect(names).toContain('validate_bazhai_presentation');
    expect(names).toContain('validate_feixing_presentation');
    expect(names).toContain('validate_calendar_presentation');
    expect(names).toContain('validate_divination_presentation');
    expect(names).toContain('validate_daily_presentation');
    expect(names).toContain('validate_combo_presentation');
    expect(names).toContain('validate_numeric_assertions');
    expect(names).toContain('wisdom_dispatch');
    tools.forEach((tool) => {
      expect(tool.title).toBeTruthy();
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: expect.any(Boolean),
        openWorldHint: false,
      });
      expect(tool.outputSchema).toMatchObject({ type: 'object' });
    });
  }, 30000);

  it('tools/list 的公开输入输出契约保持快照稳定', async () => {
    const responses = await runMcpSession([INIT_MSG, INITIALIZED_MSG, TOOLS_LIST_MSG]);
    const list = responses.find((response) => response.id === 2);
    const tools = (list!.result as { tools: Array<Record<string, unknown>> }).tools;
    expect(toolCatalog(tools)).toMatchSnapshot();
  }, 30000);

  it('tools/call agent_guidance 返回 bazi 引导', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(20, 'agent_guidance', { toolName: 'bazi_calculate' }),
    ]);
    const call = responses.find((r) => r.id === 20);
    const result = call!.result as { content: Array<{ type: string; text: string }> };
    const payload = JSON.parse(result.content[0].text) as { tool: string; requiredParams: Array<{ name: string }>; workflow: string };
    expect(payload.tool).toBe('bazi_calculate');
    expect(payload.requiredParams.some((p) => p.name === 'birth.hour')).toBe(true);
    expect(payload.workflow).toBeTruthy();
  }, 30000);

  it('tools/call validate_bazi_presentation 拒绝无效凭证', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(24, 'validate_bazi_presentation', {
        presentationToken: '00000000-0000-4000-8000-000000000000',
        claims: [{ kind: 'dayMaster', value: '甲' }],
      }),
    ]);
    const call = responses.find((r) => r.id === 24);
    const result = call!.result as { content: Array<{ type: string; text: string }>; structuredContent: { valid: boolean; violations: Array<{ kind: string }> } };
    const payload = JSON.parse(result.content[0].text) as { valid: boolean; violations: Array<{ kind: string }> };
    expect(result.structuredContent).toEqual(payload);
    expect(payload).toEqual({ valid: false, violations: [expect.objectContaining({ kind: 'presentationToken' })] });
  }, 30000);

  it('tools/call validate_ziwei_presentation 拒绝无效凭证', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(28, 'validate_ziwei_presentation', {
        presentationToken: '00000000-0000-4000-8000-000000000000',
        claims: [{ kind: 'mainStar', value: '紫微' }],
      }),
    ]);
    const call = responses.find((r) => r.id === 28);
    const result = call!.result as { content: Array<{ type: string; text: string }>; structuredContent: { valid: boolean; violations: Array<{ kind: string }> } };
    const payload = JSON.parse(result.content[0].text) as { valid: boolean; violations: Array<{ kind: string }> };
    expect(result.structuredContent).toEqual(payload);
    expect(payload).toEqual({ valid: false, violations: [expect.objectContaining({ kind: 'presentationToken' })] });
  }, 30000);

  it('tools/call validate_feixing_presentation 拒绝无效凭证', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(35, 'validate_feixing_presentation', {
        presentationToken: '00000000-0000-4000-8000-000000000000',
        claims: [{ kind: 'year', value: 2026 }],
      }),
    ]);
    const call = responses.find((r) => r.id === 35);
    const result = call!.result as { content: Array<{ type: string; text: string }>; structuredContent: { valid: boolean; violations: Array<{ kind: string }> } };
    const payload = JSON.parse(result.content[0].text) as { valid: boolean; violations: Array<{ kind: string }> };
    expect(result.structuredContent).toEqual(payload);
    expect(payload).toEqual({ valid: false, violations: [expect.objectContaining({ kind: 'presentationToken' })] });
  }, 30000);

  it('tools/call validate_divination_presentation 拒绝无效凭证', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(49, 'validate_divination_presentation', {
        presentationToken: '00000000-0000-4000-8000-000000000000',
        claims: [{ tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: '乾为天' }],
      }),
    ]);
    const call = responses.find((r) => r.id === 49);
    const result = call!.result as { content: Array<{ type: string; text: string }>; structuredContent: { valid: boolean; violations: Array<{ kind: string }> } };
    const payload = JSON.parse(result.content[0].text) as { valid: boolean; violations: Array<{ kind: string }> };
    expect(result.structuredContent).toEqual(payload);
    expect(payload).toEqual({ valid: false, violations: [expect.objectContaining({ kind: 'presentationToken' })] });
  }, 30000);

  it('tools/call validate_calendar_presentation 拒绝无效凭证', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(39, 'validate_calendar_presentation', {
        presentationToken: '00000000-0000-4000-8000-000000000000',
        claims: [{ kind: 'yunqiYear', field: 'year', value: 2026 }],
      }),
    ]);
    const call = responses.find((r) => r.id === 39);
    const result = call!.result as { content: Array<{ type: string; text: string }>; structuredContent: { valid: boolean; violations: Array<{ kind: string }> } };
    const payload = JSON.parse(result.content[0].text) as { valid: boolean; violations: Array<{ kind: string }> };
    expect(result.structuredContent).toEqual(payload);
    expect(payload).toEqual({ valid: false, violations: [expect.objectContaining({ kind: 'presentationToken' })] });
  }, 30000);

  it('同一会话中仅允许通过校验的八字断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(25, 'bazi_calculate', {
        birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
        timeBasis: 'civil-unverified',
        civilFallbackConfirmed: true,
      }),
    ], (calculation) => {
      if (calculation.id !== 25) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: {
            pillars: { year: { stem: string; branch: string } };
            dayMaster: string;
            elements: Record<string, number>;
          };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      const claims = [
        { kind: 'pillar', pillar: 'year', value: `${envelope.data.pillars.year.stem}${envelope.data.pillars.year.branch}` },
        { kind: 'dayMaster', value: envelope.data.dayMaster },
        { kind: 'elementCount', element: '木', value: envelope.data.elements.木 },
      ];

      return [
        toolCallMsg(26, 'validate_bazi_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims,
        }),
        toolCallMsg(27, 'validate_bazi_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [...claims.slice(0, 2), { kind: 'elementCount', element: '木', value: envelope.data.elements.木 + 1 }],
        }),
      ];
    });

    const validResult = responses.find((response) => response.id === 26)!.result as {
      content: Array<{ text: string }>;
      structuredContent: { valid: boolean; violations: unknown[] };
    };
    const invalidResult = responses.find((response) => response.id === 27)!.result as {
      content: Array<{ text: string }>;
      structuredContent: { valid: boolean; violations: Array<{ kind: string; expected: number; actual: number }> };
    };
    const validPayload = JSON.parse(validResult.content[0].text) as { valid: boolean; violations: unknown[] };
    const invalidPayload = JSON.parse(invalidResult.content[0].text) as { valid: boolean; violations: Array<{ kind: string; expected: number; actual: number }> };

    expect(validResult.structuredContent).toEqual(validPayload);
    expect(validPayload).toEqual({ valid: true, violations: [] });
    expect(invalidResult.structuredContent).toEqual(invalidPayload);
    expect(invalidPayload).toEqual({
      valid: false,
      violations: [expect.objectContaining({ kind: 'elementCount', actual: expect.any(Number), expected: expect.any(Number) })],
    });
  }, 30000);

  it('同一会话中仅允许通过校验的紫微断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(29, 'ziwei_chart', {
        birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
        transit: { year: 2025, month: 7 },
      }),
    ], (calculation) => {
      if (calculation.id !== 29) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: { palaces: { 命宫: { stars: string[] } }; mainStars: string[] };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      const claims = [
        { kind: 'palaceStar', palace: '命宫', value: envelope.data.palaces.命宫.stars[0] },
        { kind: 'mainStar', value: envelope.data.mainStars[0] },
      ];

      return [
        toolCallMsg(30, 'validate_ziwei_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims,
        }),
        toolCallMsg(31, 'validate_ziwei_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ kind: 'palaceStar', palace: '命宫', value: '不存在星曜' }],
        }),
      ];
    });

    const validResult = responses.find((response) => response.id === 30)!.result as {
      content: Array<{ text: string }>;
      structuredContent: { valid: boolean; violations: unknown[] };
    };
    const invalidResult = responses.find((response) => response.id === 31)!.result as {
      content: Array<{ text: string }>;
      structuredContent: { valid: boolean; violations: Array<{ kind: string; actual: string }> };
    };
    const validPayload = JSON.parse(validResult.content[0].text) as { valid: boolean; violations: unknown[] };
    const invalidPayload = JSON.parse(invalidResult.content[0].text) as { valid: boolean; violations: Array<{ kind: string; actual: string }> };

    expect(validResult.structuredContent).toEqual(validPayload);
    expect(validPayload).toEqual({ valid: true, violations: [] });
    expect(invalidResult.structuredContent).toEqual(invalidPayload);
    expect(invalidPayload).toEqual({
      valid: false,
      violations: [expect.objectContaining({ kind: 'palaceStar', actual: '不存在星曜' })],
    });
  }, 30000);

  it('同一会话中仅允许通过校验的八宅断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(32, 'calc_bazhai', { birthYear: 1990, gender: '男', year: 2026 }),
    ], (calculation) => {
      if (calculation.id !== 32) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: {
            mingGua: { trigram: string };
            directions: Array<{ direction: string; star: string }>;
            taisui: { fiveYellow: { direction: string } };
          };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      const direction = envelope.data.directions[0]!;
      const claims = [
        { kind: 'mingGua', field: 'trigram', value: envelope.data.mingGua.trigram },
        { kind: 'direction', direction: direction.direction, field: 'star', value: direction.star },
        { kind: 'annual', field: 'fiveYellowDirection', value: envelope.data.taisui.fiveYellow.direction },
      ];

      return [
        toolCallMsg(33, 'validate_bazhai_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims,
        }),
        toolCallMsg(34, 'validate_bazhai_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ kind: 'annual', field: 'fiveYellowDirection', value: '不存在方位' }],
        }),
      ];
    });

    const validResult = responses.find((response) => response.id === 33)!.result as {
      content: Array<{ text: string }>;
      structuredContent: { valid: boolean; violations: unknown[] };
    };
    const invalidResult = responses.find((response) => response.id === 34)!.result as {
      content: Array<{ text: string }>;
      structuredContent: { valid: boolean; violations: Array<{ kind: string; actual: string }> };
    };
    const validPayload = JSON.parse(validResult.content[0].text) as { valid: boolean; violations: unknown[] };
    const invalidPayload = JSON.parse(invalidResult.content[0].text) as { valid: boolean; violations: Array<{ kind: string; actual: string }> };

    expect(validResult.structuredContent).toEqual(validPayload);
    expect(validPayload).toEqual({ valid: true, violations: [] });
    expect(invalidResult.structuredContent).toEqual(invalidPayload);
    expect(invalidPayload).toEqual({
      valid: false,
      violations: [expect.objectContaining({ kind: 'annual', actual: '不存在方位' })],
    });
  }, 30000);

  it('同一会话中仅允许通过校验的流年飞星断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(36, 'calc_feixing', { year: 2026 }),
    ], (calculation) => {
      if (calculation.id !== 36) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: {
            year: number;
            yuanYun: { name: string; wangStar: number };
            center: { centerStar: number; luck: string };
            grid: Array<Array<{ palace: string; starNum: number; starName: string }>>;
          };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      const palace = envelope.data.grid.flat()[0]!;
      const claims = [
        { kind: 'year', value: envelope.data.year },
        { kind: 'yuanYun', field: 'name', value: envelope.data.yuanYun.name },
        { kind: 'yuanYun', field: 'wangStar', value: envelope.data.yuanYun.wangStar },
        { kind: 'center', field: 'centerStar', value: envelope.data.center.centerStar },
        { kind: 'center', field: 'luck', value: envelope.data.center.luck },
        { kind: 'palace', palace: palace.palace, field: 'starNum', value: palace.starNum },
        { kind: 'palace', palace: palace.palace, field: 'starName', value: palace.starName },
      ];

      return [
        toolCallMsg(37, 'validate_feixing_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims,
        }),
        toolCallMsg(38, 'validate_feixing_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ kind: 'center', field: 'centerStar', value: envelope.data.center.centerStar + 1 }],
        }),
      ];
    });

    const validResult = responses.find((response) => response.id === 37)!.result as {
      content: Array<{ text: string }>;
      structuredContent: { valid: boolean; violations: unknown[] };
    };
    const invalidResult = responses.find((response) => response.id === 38)!.result as {
      content: Array<{ text: string }>;
      structuredContent: { valid: boolean; violations: Array<{ kind: string; actual: number }> };
    };
    const validPayload = JSON.parse(validResult.content[0].text) as { valid: boolean; violations: unknown[] };
    const invalidPayload = JSON.parse(invalidResult.content[0].text) as { valid: boolean; violations: Array<{ kind: string; actual: number }> };

    expect(validResult.structuredContent).toEqual(validPayload);
    expect(validPayload).toEqual({ valid: true, violations: [] });
    expect(invalidResult.structuredContent).toEqual(invalidPayload);
    expect(invalidPayload).toEqual({
      valid: false,
      violations: [expect.objectContaining({ kind: 'center', actual: expect.any(Number) })],
    });
  }, 30000);

  it('同一会话中仅允许通过校验的五运六气年度断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(40, 'calc_yunqi', { year: 2026, currentMonth: 6 }),
    ], (calculation) => {
      if (calculation.id !== 40) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: { year: number; tiangan: string; liuqi: { sitian: string } };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      const claims = [
        { kind: 'yunqiYear', field: 'year', value: envelope.data.year },
        { kind: 'yunqiYear', field: 'tiangan', value: envelope.data.tiangan },
        { kind: 'yunqiLiuqi', field: 'sitian', value: envelope.data.liuqi.sitian },
      ];
      return [
        toolCallMsg(41, 'validate_calendar_presentation', { presentationToken: envelope.result_meta.presentationToken, claims }),
        toolCallMsg(42, 'validate_calendar_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ kind: 'yunqiYear', field: 'year', value: envelope.data.year + 1 }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 41)!.result as { structuredContent: { valid: boolean } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 42)!.result as { structuredContent: { valid: boolean; violations: Array<{ kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({ valid: false, violations: [expect.objectContaining({ kind: 'yunqiYear' })] });
  }, 30000);

  it('同一会话中只为显式星宿日期签发可校验断言', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(43, 'xingxiu_daily', {
        birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
        queryDate: '2026-08-09',
      }),
    ], (calculation) => {
      if (calculation.id !== 43) return null;
      const envelope = (calculation.result as {
        structuredContent: { data: { queryDate: string; zhiXiu: string }; result_meta: { presentationToken: string } };
      }).structuredContent;
      return [
        toolCallMsg(44, 'validate_calendar_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { kind: 'xingxiu', field: 'queryDate', value: envelope.data.queryDate },
            { kind: 'xingxiu', field: 'zhiXiu', value: envelope.data.zhiXiu },
          ],
        }),
        toolCallMsg(45, 'validate_calendar_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ kind: 'xingxiu', field: 'queryDate', value: '2026-08-10' }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 44)!.result as { structuredContent: { valid: boolean } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 45)!.result as { structuredContent: { valid: boolean; violations: Array<{ kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({ valid: false, violations: [expect.objectContaining({ kind: 'xingxiu' })] });
  }, 30000);

  it('同一会话中只为显式黄历日期签发可校验断言', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(46, 'get_almanac', { date: '2026-08-09' }),
    ], (calculation) => {
      if (calculation.id !== 46) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: { solarDate: string; dayGanZhi: string };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      return [
        toolCallMsg(47, 'validate_calendar_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { kind: 'almanac', field: 'solarDate', value: envelope.data.solarDate },
            { kind: 'almanac', field: 'dayGanZhi', value: envelope.data.dayGanZhi },
          ],
        }),
        toolCallMsg(48, 'validate_calendar_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ kind: 'almanac', field: 'dayGanZhi', value: '甲子' }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 47)!.result as { structuredContent: { valid: boolean } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 48)!.result as { structuredContent: { valid: boolean; violations: Array<{ kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({ valid: false, violations: [expect.objectContaining({ kind: 'almanac' })] });
  }, 30000);

  it('tools/call validate_daily_presentation 拒绝无效凭证', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(57, 'validate_daily_presentation', {
        presentationToken: '00000000-0000-4000-8000-000000000000',
        claims: [{ tool: 'analyze_name', kind: 'nameRating', field: 'grade', value: '上吉' }],
      }),
    ]);
    const call = responses.find((response) => response.id === 57);
    const result = call!.result as { content: Array<{ text: string }>; structuredContent: { valid: boolean; violations: Array<{ kind: string }> } };
    const payload = JSON.parse(result.content[0].text) as { valid: boolean; violations: Array<{ kind: string }> };
    expect(result.structuredContent).toEqual(payload);
    expect(payload).toEqual({ valid: false, violations: [expect.objectContaining({ kind: 'presentationToken' })] });
  }, 30000);

  it('tools/call validate_combo_presentation 拒绝无效凭证', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(77, 'validate_combo_presentation', {
        presentationToken: '00000000-0000-4000-8000-000000000000',
        claims: [{ tool: 'combo_zeri', kind: 'zeriPurpose', value: '开业' }],
      }),
    ]);
    const call = responses.find((response) => response.id === 77);
    const result = call!.result as { content: Array<{ text: string }>; structuredContent: { valid: boolean; violations: Array<{ kind: string }> } };
    const payload = JSON.parse(result.content[0].text) as { valid: boolean; violations: Array<{ kind: string }> };
    expect(result.structuredContent).toEqual(payload);
    expect(payload).toEqual({ valid: false, violations: [expect.objectContaining({ kind: 'presentationToken' })] });
  }, 30000);

  it('同一会话中仅允许通过校验的组合择日基础断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(78, 'combo_zeri', {
        birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
        purpose: '开业',
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        targetYear: 2026,
        topN: 3,
      }),
    ], (calculation) => {
      if (calculation.id !== 78) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: {
            zeriPurpose: string;
            range: { start: string; scannedDays: number };
            rankedDays: Array<{ date: string; score: number; chongOwner: boolean }>;
            annualSha: { taisui: string };
            personalAuspicious: Array<{ direction: string }>;
          };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      const rankedDay = envelope.data.rankedDays[0]!;
      return [
        toolCallMsg(79, 'validate_combo_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { tool: 'combo_zeri', kind: 'zeriPurpose', value: envelope.data.zeriPurpose },
            { tool: 'combo_zeri', kind: 'zeriRange', field: 'start', value: envelope.data.range.start },
            { tool: 'combo_zeri', kind: 'zeriRange', field: 'scannedDays', value: envelope.data.range.scannedDays },
            { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'date', value: rankedDay.date },
            { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'score', value: rankedDay.score },
            { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'chongOwner', value: rankedDay.chongOwner },
            { tool: 'combo_zeri', kind: 'zeriAnnualSha', field: 'taisui', value: envelope.data.annualSha.taisui },
            { tool: 'combo_zeri', kind: 'zeriPersonalDirection', index: 0, field: 'direction', value: envelope.data.personalAuspicious[0]!.direction },
          ],
        }),
        toolCallMsg(80, 'validate_combo_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'score', value: rankedDay.score + 1 }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 79)!.result as { structuredContent: { valid: boolean; violations: unknown[] } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 80)!.result as { structuredContent: { valid: boolean; violations: Array<{ tool: string; kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({ valid: false, violations: [expect.objectContaining({ tool: 'combo_zeri', kind: 'zeriRankedDay' })] });
  }, 30000);

  it('同一会话中仅允许通过校验的组合月度基础事实进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(84, 'combo_monthly_fortune', {
        birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
        targetYear: 2026,
        targetMonth: 8,
      }),
    ], (calculation) => {
      if (calculation.id !== 84) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: { context: { year: number; month: number; monthGanZhi: string; jieqi: string }; mode: 'local-exact' | 'local-approx' };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      return [
        toolCallMsg(85, 'validate_combo_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'year', value: envelope.data.context.year },
            { tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'month', value: envelope.data.context.month },
            { tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'monthGanZhi', value: envelope.data.context.monthGanZhi },
            { tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'jieqi', value: envelope.data.context.jieqi },
            { tool: 'combo_monthly_fortune', kind: 'monthlyMode', value: envelope.data.mode },
          ],
        }),
        toolCallMsg(86, 'validate_combo_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'monthGanZhi', value: '甲子' }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 85)!.result as { structuredContent: { valid: boolean; violations: unknown[] } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 86)!.result as { structuredContent: { valid: boolean; violations: Array<{ tool: string; kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({ valid: false, violations: [expect.objectContaining({ tool: 'combo_monthly_fortune', kind: 'monthlyContext' })] });
  }, 30000);

  it('同一会话中仅允许通过校验的组合合婚基础事实进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(87, 'combo_marriage', {
        personA: {
          birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
          baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
        },
        personB: {
          birth: { year: 1992, month: 9, day: 20, hour: 8, gender: '女' },
          baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
        },
        scene: '婚恋',
        targetYear: 2026,
      }),
    ], (calculation) => {
      if (calculation.id !== 87) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: {
            scene: '婚恋' | '合伙' | '合作';
            personA: { dayGanZhi: string; dayMaster: string; elements: Record<string, number>; mingGua: { trigram: string } };
            personB: { dayMasterWuxing: string; mingGua: { group: string } };
            chongHeScan: Array<{ pillar: string; aGanZhi: string; relation: { ganHe: boolean } }>;
          };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      return [
        toolCallMsg(88, 'validate_combo_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { tool: 'combo_marriage', kind: 'marriageScene', value: envelope.data.scene },
            { tool: 'combo_marriage', kind: 'marriagePerson', person: 'personA', field: 'dayGanZhi', value: envelope.data.personA.dayGanZhi },
            { tool: 'combo_marriage', kind: 'marriagePerson', person: 'personA', field: 'dayMaster', value: envelope.data.personA.dayMaster },
            { tool: 'combo_marriage', kind: 'marriagePerson', person: 'personB', field: 'dayMasterWuxing', value: envelope.data.personB.dayMasterWuxing },
            { tool: 'combo_marriage', kind: 'marriageElement', person: 'personA', element: '木', value: envelope.data.personA.elements['木']! },
            { tool: 'combo_marriage', kind: 'marriageMingGua', person: 'personA', field: 'trigram', value: envelope.data.personA.mingGua.trigram },
            { tool: 'combo_marriage', kind: 'marriageMingGua', person: 'personB', field: 'group', value: envelope.data.personB.mingGua.group },
            { tool: 'combo_marriage', kind: 'marriageChongHe', index: 0, field: 'pillar', value: envelope.data.chongHeScan[0]!.pillar },
            { tool: 'combo_marriage', kind: 'marriageChongHe', index: 0, field: 'aGanZhi', value: envelope.data.chongHeScan[0]!.aGanZhi },
            { tool: 'combo_marriage', kind: 'marriageChongHeRelation', index: 0, field: 'ganHe', value: envelope.data.chongHeScan[0]!.relation.ganHe },
          ],
        }),
        toolCallMsg(89, 'validate_combo_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { tool: 'combo_marriage', kind: 'marriageElement', person: 'personA', element: '木', value: envelope.data.personA.elements['木']! + 1 },
            { tool: 'combo_marriage', kind: 'marriageChongHe', index: 99, field: 'pillar', value: '年柱' },
          ],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 88)!.result as { structuredContent: { valid: boolean; violations: unknown[] } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 89)!.result as { structuredContent: { valid: boolean; violations: Array<{ tool: string; kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({
      valid: false,
      violations: [
        expect.objectContaining({ tool: 'combo_marriage', kind: 'marriageElement' }),
        expect.objectContaining({ tool: 'combo_marriage', kind: 'marriageChongHe' }),
      ],
    });
  }, 30000);

  it('同一会话中仅允许通过校验的组合养生传统规则输出进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(81, 'combo_daily_wellness', {
        birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
        constitution: '气虚质',
        now: { year: 2026, month: 8, day: 1, hour: 12 },
        targetYear: 2026,
      }),
    ], (calculation) => {
      if (calculation.id !== 81) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: {
            context: { jieqi: string; meridian: string };
            constitution: { type: string };
            jieqiWellness: { diet: string; principle: string };
            meridianHour: { advice: string };
            directionTip: string;
            recommendations: Array<{ value: string }>;
          };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      return [
        toolCallMsg(82, 'validate_combo_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { tool: 'combo_daily_wellness', kind: 'wellnessContext', field: 'jieqi', value: envelope.data.context.jieqi },
            { tool: 'combo_daily_wellness', kind: 'wellnessConstitution', field: 'type', value: envelope.data.constitution.type },
            { tool: 'combo_daily_wellness', kind: 'wellnessJieqi', field: 'principle', value: envelope.data.jieqiWellness.principle },
            { tool: 'combo_daily_wellness', kind: 'wellnessJieqi', field: 'diet', value: envelope.data.jieqiWellness.diet },
            { tool: 'combo_daily_wellness', kind: 'wellnessMeridian', field: 'advice', value: envelope.data.meridianHour.advice },
            { tool: 'combo_daily_wellness', kind: 'wellnessDirection', value: envelope.data.directionTip },
            { tool: 'combo_daily_wellness', kind: 'wellnessRecommendation', index: 0, field: 'value', value: envelope.data.recommendations[0]!.value },
          ],
        }),
        toolCallMsg(83, 'validate_combo_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ tool: 'combo_daily_wellness', kind: 'wellnessJieqi', field: 'diet', value: '任意饮食均可' }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 82)!.result as { structuredContent: { valid: boolean; violations: unknown[] } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 83)!.result as { structuredContent: { valid: boolean; violations: Array<{ tool: string; kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({ valid: false, violations: [expect.objectContaining({ tool: 'combo_daily_wellness', kind: 'wellnessJieqi' })] });
  }, 30000);

  it('同一会话中仅允许通过校验的日用与民俗基础断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(58, 'cast_cezi', { char: '明' }),
    ], (calculation) => {
      if (calculation.id !== 58) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: { char: string; strokes: number; shuli: { number: number }; structure: { structure: string } };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      return [
        toolCallMsg(59, 'validate_daily_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { tool: 'cast_cezi', kind: 'cezi', field: 'char', value: envelope.data.char },
            { tool: 'cast_cezi', kind: 'ceziShuli', field: 'number', value: envelope.data.shuli.number },
            { tool: 'cast_cezi', kind: 'ceziStructure', field: 'structure', value: envelope.data.structure.structure },
          ],
        }),
        toolCallMsg(60, 'validate_daily_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { tool: 'cast_cezi', kind: 'cezi', field: 'strokes', value: envelope.data.strokes + 1 },
            { tool: 'analyze_name', kind: 'nameRating', field: 'grade', value: '上吉' },
          ],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 59)!.result as { structuredContent: { valid: boolean; violations: unknown[] } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 60)!.result as { structuredContent: { valid: boolean; violations: Array<{ tool: string; kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({
      valid: false,
      violations: [
        expect.objectContaining({ tool: 'cast_cezi', kind: 'cezi' }),
        expect.objectContaining({ tool: 'analyze_name', kind: 'nameRating' }),
      ],
    });
  }, 30000);

  it('同一会话中仅允许通过校验的梦象基础断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(74, 'dream_interpret', { keyword: '蛇' }),
    ], (calculation) => {
      if (calculation.id !== 74) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: { hit: boolean; entries: Array<{ title: string; luck: string; biglx: string }> };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      return [
        toolCallMsg(75, 'validate_daily_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { tool: 'dream_interpret', kind: 'dreamSearch', field: 'hit', value: envelope.data.hit },
            { tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'title', value: envelope.data.entries[0]!.title },
            { tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'luck', value: envelope.data.entries[0]!.luck },
            { tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'biglx', value: envelope.data.entries[0]!.biglx },
          ],
        }),
        toolCallMsg(76, 'validate_daily_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'luck', value: '吉' }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 75)!.result as { structuredContent: { valid: boolean; violations: unknown[] } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 76)!.result as { structuredContent: { valid: boolean; violations: Array<{ tool: string; kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({ valid: false, violations: [expect.objectContaining({ tool: 'dream_interpret', kind: 'dreamEntry' })] });
  }, 30000);

  it('同一会话中仅允许通过校验的喜用神基础断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(68, 'calc_xiyong', { dayMasterWuxing: '金', elements: { 木: 1, 火: 2, 土: 3, 金: 4, 水: 5 } }),
    ], (calculation) => {
      if (calculation.id !== 68) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: { dayMasterWuxing: string; similarPoint: number; similar: string[] };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      return [
        toolCallMsg(69, 'validate_daily_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { tool: 'calc_xiyong', kind: 'xiyong', field: 'dayMasterWuxing', value: envelope.data.dayMasterWuxing },
            { tool: 'calc_xiyong', kind: 'xiyong', field: 'similarPoint', value: envelope.data.similarPoint },
            { tool: 'calc_xiyong', kind: 'xiyongElements', group: 'similar', value: envelope.data.similar },
          ],
        }),
        toolCallMsg(70, 'validate_daily_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ tool: 'calc_xiyong', kind: 'xiyong', field: 'similarPoint', value: envelope.data.similarPoint + 1 }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 69)!.result as { structuredContent: { valid: boolean; violations: unknown[] } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 70)!.result as { structuredContent: { valid: boolean; violations: Array<{ tool: string; kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({ valid: false, violations: [expect.objectContaining({ tool: 'calc_xiyong', kind: 'xiyong' })] });
  }, 30000);

  it('同一会话中仅允许通过校验的五运六气体质倾向基础断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(71, 'get_constitution_tendency', { wuyun: { dayun: '木运太过' }, liuqi: { sitian: '厥阴风木', zaquan: '少阳相火' } }),
    ], (calculation) => {
      if (calculation.id !== 71) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: { dayun: string; tendencies: Array<{ type: string }> };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      return [
        toolCallMsg(72, 'validate_daily_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [
            { tool: 'get_constitution_tendency', kind: 'constitutionTendencySource', field: 'dayun', value: envelope.data.dayun },
            { tool: 'get_constitution_tendency', kind: 'constitutionTendency', index: 0, field: 'type', value: envelope.data.tendencies[0]!.type },
          ],
        }),
        toolCallMsg(73, 'validate_daily_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ tool: 'get_constitution_tendency', kind: 'constitutionTendency', index: 0, field: 'type', value: '不存在体质' }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 72)!.result as { structuredContent: { valid: boolean; violations: unknown[] } }).structuredContent;
    const invalid = (responses.find((response) => response.id === 73)!.result as { structuredContent: { valid: boolean; violations: Array<{ tool: string; kind: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(invalid).toMatchObject({ valid: false, violations: [expect.objectContaining({ tool: 'get_constitution_tendency', kind: 'constitutionTendency' })] });
  }, 30000);

  it('七个日用与民俗工具都签发进程内呈现凭证', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(61, 'analyze_name', { surname: '张', givenName: '伟', birthYear: 1990 }),
      toolCallMsg(62, 'calc_xiyong', { dayMasterWuxing: '金', elements: { 木: 1, 火: 2, 土: 3, 金: 4, 水: 5 } }),
      toolCallMsg(63, 'get_constitution_tendency', { wuyun: { dayun: '木运太过' }, liuqi: { sitian: '厥阴风木', zaquan: '少阳相火' } }),
      toolCallMsg(64, 'cast_cezi', { char: '明' }),
      toolCallMsg(65, 'calc_chenguz', { birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } }),
      toolCallMsg(66, 'get_daily_rhythm', { date: '2026-08-01', hour: 12 }),
      toolCallMsg(67, 'assess_constitution', { answers: [{ type: '气虚质', score: 5 }, { type: '平和质', score: 3 }] }),
    ]);
    [61, 62, 63, 64, 65, 66, 67].forEach((id) => {
      const envelope = (responses.find((response) => response.id === id)!.result as {
        structuredContent: { ok: boolean; result_meta: { presentationToken: string } };
      }).structuredContent;
      expect(envelope.ok).toBe(true);
      expect(envelope.result_meta.presentationToken).toMatch(/^[0-9a-f-]{36}$/i);
    });
  }, 30000);

  it('tools/call validate_numeric_assertions 拒绝无效凭证', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(53, 'validate_numeric_assertions', {
        numericAssertionToken: '00000000-0000-4000-8000-000000000000',
        claims: [{ path: 'data.year', value: 2026 }],
      }),
    ]);
    const call = responses.find((response) => response.id === 53);
    const result = call!.result as { content: Array<{ text: string }>; structuredContent: { valid: boolean; violations: Array<{ path: string }> } };
    const payload = JSON.parse(result.content[0].text) as { valid: boolean; violations: Array<{ path: string }> };
    expect(result.structuredContent).toEqual(payload);
    expect(payload).toEqual({ valid: false, violations: [expect.objectContaining({ path: 'numericAssertionToken' })] });
  }, 30000);

  it('同一会话中仅允许通过校验的数值断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(54, 'calc_feixing', { year: 2026 }),
    ], (calculation) => {
      if (calculation.id !== 54) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: { year: number; center: { centerStar: number } };
          result_meta: { numericAssertionToken: string };
        };
      }).structuredContent;
      return [
        toolCallMsg(55, 'validate_numeric_assertions', {
          numericAssertionToken: envelope.result_meta.numericAssertionToken,
          claims: [
            { tool: 'calc_feixing', path: 'data.year', value: envelope.data.year },
            { path: 'data.center.centerStar', value: envelope.data.center.centerStar },
          ],
        }),
        toolCallMsg(56, 'validate_numeric_assertions', {
          numericAssertionToken: envelope.result_meta.numericAssertionToken,
          claims: [{ path: 'data.year', value: envelope.data.year + 1 }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 55)!.result as { structuredContent: { valid: boolean; violations: unknown[] } }).structuredContent;
    const forged = (responses.find((response) => response.id === 56)!.result as { structuredContent: { valid: boolean; violations: Array<{ path: string; expected: number; actual: number }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(forged).toMatchObject({
      valid: false,
      violations: [expect.objectContaining({ path: 'data.year', expected: 2026, actual: 2027 })],
    });
  }, 30000);

  it('同一会话中仅允许通过校验的占测／卦象盘面断言进入呈现', async () => {
    const responses = await runMcpSessionWithFollowUp([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(50, 'cast_liuyao', {
        birth: { year: 2024, month: 3, day: 15, hour: 9, gender: '男' },
        method: 'manual',
        yaoValues: '777777',
        question: '本次校验测试',
      }),
    ], (calculation) => {
      if (calculation.id !== 50) return null;
      const envelope = (calculation.result as {
        structuredContent: {
          data: { hexagramName: string; shiYao: number };
          result_meta: { presentationToken: string };
        };
      }).structuredContent;
      const claims = [
        { tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: envelope.data.hexagramName },
        { tool: 'cast_liuyao', kind: 'yao', field: 'shiYao', value: envelope.data.shiYao },
      ];
      return [
        toolCallMsg(51, 'validate_divination_presentation', { presentationToken: envelope.result_meta.presentationToken, claims }),
        toolCallMsg(52, 'validate_divination_presentation', {
          presentationToken: envelope.result_meta.presentationToken,
          claims: [{ tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: '不存在卦象' }],
        }),
      ];
    });
    const valid = (responses.find((response) => response.id === 51)!.result as { structuredContent: { valid: boolean } }).structuredContent;
    const forged = (responses.find((response) => response.id === 52)!.result as { structuredContent: { valid: boolean; violations: Array<{ tool: string }> } }).structuredContent;
    expect(valid).toEqual({ valid: true, violations: [] });
    expect(forged).toMatchObject({ valid: false, violations: [expect.objectContaining({ tool: 'cast_liuyao' })] });
  }, 30000);

  it('tools/call wisdom_dispatch 将“排八字”路由为真太阳时预检', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(21, 'wisdom_dispatch', { text: '帮我排个八字，1990年6月15日12时男' }),
    ]);
    const call = responses.find((r) => r.id === 21);
    const result = call!.result as { content: Array<{ type: string; text: string }> };
    const payload = JSON.parse(result.content[0].text) as {
      tool: string;
      arguments: { birth: { year: number } };
      baziPreflight: { status: string; civilFallbackExplicitlyConfirmed: boolean };
      hit: boolean;
    };
    expect(payload.hit).toBe(true);
    expect(payload.tool).toBe('resolve_true_solar_time');
    expect(payload.arguments.birth.year).toBe(1990);
    expect(payload.baziPreflight).toEqual({
      status: 'needs-true-solar-verification',
      requiredBeforeCalculation: expect.any(Array),
      civilFallbackExplicitlyConfirmed: false,
    });
  }, 30000);

  it('tools/call wisdom_dispatch 路由"今天黄历宜什么"到 get_almanac', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(22, 'wisdom_dispatch', { text: '今天黄历宜什么' }),
    ]);
    const call = responses.find((r) => r.id === 22);
    const result = call!.result as { content: Array<{ type: string; text: string }> };
    const payload = JSON.parse(result.content[0].text) as { tool: string; hit: boolean };
    expect(payload.hit).toBe(true);
    expect(payload.tool).toBe('get_almanac');
  }, 30000);

  it('tools/call 缺少 Agent 所需参数时拒绝执行，不再软提示后计算', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(11, 'dream_interpret', {}),
    ]);
    const call = responses.find((r) => r.id === 11);
    expect(call).toBeDefined();
    const result = call!.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('keyword');
  }, 30000);

  it('tools/call guidance 跨字段缺失时返回 validation_error 且不执行 handler', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(23, 'get_constitution_tendency', {}),
    ]);
    const call = responses.find((r) => r.id === 23);
    expect(call).toBeDefined();
    const result = call!.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result.isError).toBeFalsy();
    const payload = JSON.parse(result.content[0].text) as { ok: boolean; error: { code: string; missing: string[] } };
    expect(payload).toEqual({
      ok: false,
      error: {
        code: 'validation_error',
        missing: ['wuyun.dayun', 'liuqi.sitian'],
        prompts: expect.any(Array),
      },
    });
  }, 30000);

  it('tools/call get_almanac 返回 ToolEnvelope 黄历数据', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(12, 'get_almanac', { date: '2026-08-01' }),
    ]);
    const call = responses.find((r) => r.id === 12);
    expect(call).toBeDefined();
    const result = call!.result as { content: Array<{ type: string; text: string }>; structuredContent: { ok: boolean; tool: string; data: { solarDate: string } }; isError?: boolean };
    expect(result.isError).toBeFalsy();
    const envelope = JSON.parse(result.content[0].text) as { ok: boolean; tool: string; data: { solarDate: string; dayGanZhi: string; yi: string[]; ji: string[]; hours: unknown[] } };
    expect(result.structuredContent).toEqual(envelope);
    expect(envelope.ok).toBe(true);
    expect(envelope.tool).toBe('get_almanac');
    expect(envelope.data.solarDate).toContain('2026年8月1日');
    expect(envelope.data.dayGanZhi).toBeTruthy();
    expect(envelope.data.hours.length).toBeGreaterThan(0);
  }, 30000);

  it('tools/call calc_feixing 返回流年飞星盘', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(12, 'calc_feixing', { year: 2026, gender: '男', birthYear: 1990 }),
    ]);
    const call = responses.find((r) => r.id === 12);
    expect(call).toBeDefined();
    const result = call!.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result.isError).toBeFalsy();
    const envelope = JSON.parse(result.content[0].text) as { ok: boolean; tool: string; data: { year: number; center: { centerStar: number }; grid: unknown[]; mingGua: { trigram: string } } };
    expect(envelope.ok).toBe(true);
    expect(envelope.tool).toBe('calc_feixing');
    expect(envelope.data.year).toBe(2026);
    expect(envelope.data.center.centerStar).toBeGreaterThan(0);
    expect(envelope.data.grid.length).toBe(3);
    expect(envelope.data.mingGua.trigram).toBeTruthy();
  }, 30000);

  it('tools/call calc_bazhai 返回命卦与八方吉凶', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(13, 'calc_bazhai', { birthYear: 1990, gender: '男', door: '南', bedroom: '北', kitchen: '东' }),
    ]);
    const call = responses.find((r) => r.id === 13);
    expect(call).toBeDefined();
    const result = call!.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result.isError).toBeFalsy();
    const envelope = JSON.parse(result.content[0].text) as { ok: boolean; tool: string; data: { mingGua: { trigram: string; group: string }; directions: Array<{ direction: string; star: string }>; menZhuZao: { doorBedroomRelation: { type: string } }; taisui: { taisui: { direction: string } } } };
    expect(envelope.ok).toBe(true);
    expect(envelope.tool).toBe('calc_bazhai');
    expect(envelope.data.mingGua.trigram).toBeTruthy();
    expect(envelope.data.directions.length).toBeGreaterThan(0);
    expect(envelope.data.menZhuZao.doorBedroomRelation.type).toBeTruthy();
    expect(envelope.data.taisui.taisui.direction).toBeTruthy();
  }, 30000);

  it('tools/call get_daily_rhythm 返回节气调养与时辰经络', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(14, 'get_daily_rhythm', { date: '2026-08-01', hour: 12 }),
    ]);
    const call = responses.find((r) => r.id === 14);
    expect(call).toBeDefined();
    const result = call!.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result.isError).toBeFalsy();
    const envelope = JSON.parse(result.content[0].text) as { ok: boolean; tool: string; data: { jieqi: string; wellness: { principle: string }; meridian: { meridian: string } | null } };
    expect(envelope.ok).toBe(true);
    expect(envelope.tool).toBe('get_daily_rhythm');
    expect(envelope.data.jieqi).toBeTruthy();
    expect(envelope.data.wellness.principle).toBeTruthy();
    expect(envelope.data.meridian).toBeTruthy();
  }, 30000);

  it('tools/call assess_constitution 按答题算体质', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(15, 'assess_constitution', {
        answers: [
          { type: '气虚质', score: 5 }, { type: '气虚质', score: 4 },
          { type: '阳虚质', score: 2 }, { type: '阳虚质', score: 2 },
          { type: '平和质', score: 3 },
        ],
      }),
    ]);
    const call = responses.find((r) => r.id === 15);
    expect(call).toBeDefined();
    const result = call!.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result.isError).toBeFalsy();
    const envelope = JSON.parse(result.content[0].text) as { ok: boolean; tool: string; data: { dominantType: string; scores: Record<string, number>; advices: Array<{ type: string }> } };
    expect(envelope.ok).toBe(true);
    expect(envelope.tool).toBe('assess_constitution');
    expect(envelope.data.dominantType).toBeTruthy();
    expect(Object.keys(envelope.data.scores).length).toBeGreaterThan(0);
    expect(envelope.data.advices.length).toBeGreaterThan(0);
  }, 30000);

  it('tools/call bazi_calculate 民用降级须显式确认并返回标记', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(10, 'bazi_calculate', {
        birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
        timeBasis: 'civil-unverified',
        civilFallbackConfirmed: true,
      }),
    ]);
    const call = responses.find((r) => r.id === 10);
    expect(call).toBeDefined();
    const result = call!.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result.isError).toBeFalsy();
    expect(result.content[0].type).toBe('text');
    const envelope = JSON.parse(result.content[0].text) as { ok: boolean; tool: string; data: { mode: string; pillars: { year: { stem: string } }; timeSource: { timeBasis: string; notice: string }; export_snapshot: { summary: string } } };
    expect(envelope.ok).toBe(true);
    expect(envelope.tool).toBe('BaziLunarAdapter');
    expect(envelope.data.mode).toBe('local-exact');
    expect(envelope.data.pillars.year.stem).toBe('庚');
    expect(envelope.data.timeSource).toEqual({ timeBasis: 'civil-unverified', verification: null, notice: '未完成真太阳时复核' });
    expect(envelope.data.export_snapshot.summary).toContain('未完成真太阳时复核');
  }, 30000);

  it('tools/call dream_interpret 返回解梦结果', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(11, 'dream_interpret', { keyword: '蛇' }),
    ]);
    const call = responses.find((r) => r.id === 11);
    const result = call!.result as { content: Array<{ type: string; text: string }> };
    const envelope = JSON.parse(result.content[0].text) as { ok: boolean; tool: string; data: { hit: boolean; export_snapshot: { summary: string } } };
    expect(envelope.ok).toBe(true);
    expect(envelope.tool).toBe('DreamDictionaryAdapter');
    expect(envelope.data.hit).toBe(true);
    expect(envelope.data.export_snapshot.summary).toContain('蛇');
  }, 30000);

  it('tools/call 无效工具名返回错误', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(12, 'nonexistent_tool', {}),
    ]);
    const call = responses.find((r) => r.id === 12);
    // MCP 对无效工具返回 error
    expect(call!.error || (call!.result as { isError?: boolean }).isError).toBeTruthy();
  }, 30000);
});
