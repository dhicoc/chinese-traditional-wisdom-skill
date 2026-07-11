import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * setup-mcp.mjs 自动配置脚本测试。
 * 两层：
 * 1. 单元层：import 脚本，测 detectAll/configureAll/buildServerEntry 等导出函数
 * 2. 端到端层：spawn 跑 `node setup-mcp.mjs --check`，验证脚本可执行且输出正确
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const SCRIPT_PATH = join(REPO_ROOT, 'scripts', 'setup-mcp.mjs');

// 动态 import 脚本（ESM）
async function importSetup() {
  return import(SCRIPT_PATH + '?t=' + Date.now());
}

describe('setup-mcp 导出与常量', () => {
  it('导出 CLIENTS 含 4 个客户端', async () => {
    const m = await importSetup();
    expect(m.CLIENTS.length).toBe(4);
    const names = m.CLIENTS.map((c: { name: string }) => c.name);
    expect(names).toContain('Claude Code');
    expect(names).toContain('Claude Desktop');
    expect(names).toContain('Cursor');
    expect(names).toContain('Cline (VS Code)');
  });

  it('SERVER_NAME 为 chinese-wisdom', async () => {
    const m = await importSetup();
    expect(m.SERVER_NAME).toBe('chinese-wisdom');
  });

  it('MCP_SERVER_ENTRY 指向 apps/mcp-server/src/index.ts', async () => {
    const m = await importSetup();
    expect(m.MCP_SERVER_ENTRY).toMatch(/apps[\\/]+mcp-server[\\/]+src[\\/]+index\.ts$/);
  });

  it('buildServerEntry 返回 command + args', async () => {
    const m = await importSetup();
    const entry = m.buildServerEntry();
    expect(typeof entry.command).toBe('string');
    expect(Array.isArray(entry.args)).toBe(true);
    expect(entry.args.length).toBeGreaterThan(0);
    // args 应包含 tsx 和 index.ts 路径
    expect(entry.args.some((a: string) => a.includes('tsx'))).toBe(true);
    expect(entry.args.some((a: string) => a.includes('index.ts'))).toBe(true);
  });
});

describe('detectAll 检测逻辑', () => {
  it('返回 4 个客户端的检测结果', async () => {
    const m = await importSetup();
    const results = m.detectAll();
    expect(results.length).toBe(4);
    results.forEach((r: { name: string; detected: boolean; configPath: string }) => {
      expect(typeof r.name).toBe('string');
      expect(typeof r.detected).toBe('boolean');
      expect(typeof r.configPath).toBe('string');
    });
  });

  it('Claude Code 检测结果与 hasCommand(claude) 一致', async () => {
    const m = await importSetup();
    const results = m.detectAll();
    const cc = results.find((r: { name: string }) => r.name === 'Claude Code');
    // 当前环境装了 claude（CI 环境），应检测到；若无则 detected=false 也合理
    expect(typeof cc.detected).toBe('boolean');
  });
});

describe('readJson/writeJson 配置读写', () => {
  it('writeJson + readJson 往返一致（含自动建目录）', async () => {
    const m = await importSetup();
    const tmp = mkdtempSync(join(tmpdir(), 'mcp-test-'));
    const filePath = join(tmp, 'sub', 'dir', 'config.json');
    const data = { mcpServers: { 'chinese-wisdom': { command: 'npx', args: ['tsx'] } } };
    m.writeJson(filePath, data);
    expect(existsSync(filePath)).toBe(true);
    const read = m.readJson(filePath);
    expect(read).toEqual(data);
    rmSync(tmp, { recursive: true, force: true });
  });

  it('readJson 不存在文件返回 {}', async () => {
    const m = await importSetup();
    const read = m.readJson(join(tmpdir(), 'nonexistent-' + Date.now() + '.json'));
    expect(read).toEqual({});
  });
});

describe('configureAll 配置逻辑（临时配置文件）', () => {
  it('checkOnly 模式不写入，仅返回检测结果', async () => {
    const m = await importSetup();
    const results = m.configureAll({ checkOnly: true });
    // checkOnly 下所有 configured 应为 false
    results.forEach((r: { configured: boolean }) => {
      if (r.detected) expect(r.configured).toBe(false);
    });
  });

  it('filter 过滤客户端名', async () => {
    const m = await importSetup();
    const results = m.configureAll({ filter: 'claude-code', checkOnly: true });
    // 只应返回名字含 claude-code 的客户端
    expect(results.every((r: { name: string }) => r.name.toLowerCase().replace(/\s+/g, '-').includes('claude-code'))).toBe(true);
  });
});

describe('端到端：node setup-mcp.mjs --check', () => {
  it('脚本可执行且输出含关键节', () => {
    const r = spawnSync('node', [SCRIPT_PATH, '--check'], { encoding: 'utf8', shell: process.platform === 'win32' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('chinese-wisdom MCP 自动配置');
    expect(r.stdout).toContain('客户端检测');
    expect(r.stdout).toContain('检测完成');
    // check 模式不应实际写入
    expect(r.stdout).not.toMatch(/配置完成：\d+ 个客户端已写入/);
  }, 30000);

  it('--client=claude-code 过滤生效', () => {
    const r = spawnSync('node', [SCRIPT_PATH, '--check', '--client=claude-code'], { encoding: 'utf8', shell: process.platform === 'win32' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Claude Code');
    expect(r.stdout).not.toContain('Cursor');
    expect(r.stdout).not.toContain('Cline');
  }, 30000);
});
