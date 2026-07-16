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

const INIT_MSG = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'vitest', version: '1.0' } },
});
const INITIALIZED_MSG = JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' });
const TOOLS_LIST_MSG = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' });

function toolCallMsg(id: number, name: string, args: unknown): string {
  return JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
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

  it('tools/list 返回 26 个工具（24 计算 + 2 元工具）且 inputSchema 完整', async () => {
    const responses = await runMcpSession([INIT_MSG, INITIALIZED_MSG, TOOLS_LIST_MSG]);
    const list = responses.find((r) => r.id === 2);
    expect(list).toBeDefined();
    const tools = (list!.result as { tools: Array<{ name: string; description: string; inputSchema: { type: string; properties: unknown } }> }).tools;
    expect(tools.length).toBe(26);
    tools.forEach((t) => {
      expect(t.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.inputSchema.type).toBe('object');
      expect(t.inputSchema.properties).toBeDefined();
    });
    // 验证关键工具存在（含元工具）
    const names = tools.map((t) => t.name);
    expect(names).toContain('bazi_calculate');
    expect(names).toContain('ziwei_chart');
    expect(names).toContain('dream_interpret');
    expect(names).toContain('agent_guidance');
    expect(names).toContain('wisdom_dispatch');
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

  it('tools/call wisdom_dispatch 路由"排八字"到 bazi_calculate', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(21, 'wisdom_dispatch', { text: '帮我排个八字，1990年6月15日12时男' }),
    ]);
    const call = responses.find((r) => r.id === 21);
    const result = call!.result as { content: Array<{ type: string; text: string }> };
    const payload = JSON.parse(result.content[0].text) as { tool: string; arguments: { birth: { year: number } }; hit: boolean };
    expect(payload.hit).toBe(true);
    expect(payload.tool).toBe('bazi_calculate');
    expect(payload.arguments.birth.year).toBe(1990);
  }, 30000);

  it('tools/call bazi_calculate 返回 ToolEnvelope 内容', async () => {
    const responses = await runMcpSession([
      INIT_MSG, INITIALIZED_MSG,
      toolCallMsg(10, 'bazi_calculate', { birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } }),
    ]);
    const call = responses.find((r) => r.id === 10);
    expect(call).toBeDefined();
    const result = call!.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result.isError).toBeFalsy();
    expect(result.content[0].type).toBe('text');
    const envelope = JSON.parse(result.content[0].text) as { ok: boolean; tool: string; data: { mode: string; pillars: { year: { stem: string } }; export_snapshot: { summary: string } } };
    expect(envelope.ok).toBe(true);
    expect(envelope.tool).toBe('BaziLunarAdapter');
    expect(envelope.data.mode).toBe('local-exact');
    expect(envelope.data.pillars.year.stem).toBe('庚');
    expect(envelope.data.export_snapshot.summary).toContain('日主');
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
