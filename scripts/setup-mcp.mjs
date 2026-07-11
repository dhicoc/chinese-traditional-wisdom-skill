#!/usr/bin/env node
/**
 * setup-mcp.mjs — 一键自动配置 MCP server 到所有检测到的客户端
 *
 * 解决 MCP "便携性丢失" 问题：用户无需手动编辑各客户端配置文件，
 * 跑这一个脚本即可自动检测并配置所有已安装的 MCP 客户端。
 *
 * 支持的客户端（自动检测，有则配，无则跳过）：
 * - Claude Code（用 claude mcp add 命令，或写 .mcp.json）
 * - Claude Desktop（写 claude_desktop_config.json）
 * - Cursor（写 ~/.cursor/mcp.json 或项目 .cursor/mcp.json）
 * - Cline（写 VS Code settings.json 的 cline.mcpServers）
 *
 * 用法：
 *   node scripts/setup-mcp.mjs            # 检测并配置所有客户端
 *   node scripts/setup-mcp.mjs --check    # 仅检查不写入
 *   node scripts/setup-mcp.mjs --client claude-code  # 只配指定客户端
 *
 * SKILL.md 可引导 AI 在用户说"启用 MCP"时自动跑此脚本。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const MCP_SERVER_ENTRY = join(REPO_ROOT, 'apps', 'mcp-server', 'src', 'index.ts');
const MCP_SERVER_DIR = join(REPO_ROOT, 'apps', 'mcp-server');

const IS_WIN = platform() === 'win32';
const HOME = homedir();

// Windows 下 npx 需要 cmd /c 包裹（参考用户现有 Bazi server 配置）
const NPX_CMD = IS_WIN ? 'cmd' : 'npx';
const NPX_ARGS = IS_WIN ? ['/c', 'npx', 'tsx', MCP_SERVER_ENTRY] : ['tsx', MCP_SERVER_ENTRY];

const SERVER_NAME = 'chinese-wisdom';

// ─── 客户端检测 ───

/** @typedef {{ name, detected, configPath, detect: () => boolean, configure: () => { ok, message } }} ClientConfig */

/** 检测命令是否可用 */
function hasCommand(cmd) {
  try {
    execSync(`${IS_WIN ? 'where' : 'which'} ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** 安全读 JSON（文件不存在或解析失败返回 null） */
function readJson(path) {
  try {
    if (!existsSync(path)) return {};
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

/** 安全写 JSON（自动建目录） */
function writeJson(path, data) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Claude Code ───
const claudeCode = {
  name: 'Claude Code',
  detected: false,
  configPath: join(REPO_ROOT, '.mcp.json'),
  detect: () => hasCommand('claude'),
  configure: () => {
    // 优先用 claude mcp add 命令（项目级 .mcp.json）
    try {
      const addCmd = IS_WIN
        ? `claude mcp add ${SERVER_NAME} -- cmd /c npx tsx "${MCP_SERVER_ENTRY}"`
        : `claude mcp add ${SERVER_NAME} -- npx tsx "${MCP_SERVER_ENTRY}"`;
      execSync(addCmd, { stdio: 'pipe' });
      return { ok: true, message: '已用 claude mcp add 注册（.mcp.json）' };
    } catch {
      // 回退：直接写 .mcp.json
      const cfg = readJson(claudeCode.configPath) || {};
      const servers = (cfg.mcpServers) || {};
      servers[SERVER_NAME] = { command: NPX_CMD, args: NPX_ARGS };
      cfg.mcpServers = servers;
      writeJson(claudeCode.configPath, cfg);
      return { ok: true, message: `已写入 ${claudeCode.configPath}` };
    }
  },
};

// ─── Claude Desktop ───
const claudeDesktopConfigPath = IS_WIN
  ? join(HOME, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json')
  : join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
const claudeDesktop = {
  name: 'Claude Desktop',
  detected: false,
  configPath: claudeDesktopConfigPath,
  detect: () => existsSync(dirname(claudeDesktopConfigPath)),
  configure: () => {
    const cfg = readJson(claudeDesktopConfigPath) || {};
    const servers = (cfg.mcpServers) || {};
    servers[SERVER_NAME] = { command: NPX_CMD, args: NPX_ARGS };
    cfg.mcpServers = servers;
    writeJson(claudeDesktopConfigPath, cfg);
    return { ok: true, message: `已写入 ${claudeDesktopConfigPath}` };
  },
};

// ─── Cursor ───
const cursorConfigPath = join(HOME, '.cursor', 'mcp.json');
const cursor = {
  name: 'Cursor',
  detected: false,
  configPath: cursorConfigPath,
  detect: () => existsSync(join(HOME, '.cursor')) || existsSync(join(REPO_ROOT, '.cursor')),
  configure: () => {
    const cfg = readJson(cursorConfigPath) || {};
    const servers = (cfg.mcpServers) || {};
    servers[SERVER_NAME] = { command: NPX_CMD, args: NPX_ARGS };
    cfg.mcpServers = servers;
    writeJson(cursorConfigPath, cfg);
    return { ok: true, message: `已写入 ${cursorConfigPath}` };
  },
};

// ─── Cline (VS Code) ───
const vscodeSettingsPath = IS_WIN
  ? join(HOME, 'AppData', 'Roaming', 'Code', 'User', 'settings.json')
  : join(HOME, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
const cline = {
  name: 'Cline (VS Code)',
  detected: false,
  configPath: vscodeSettingsPath,
  detect: () => existsSync(dirname(vscodeSettingsPath)),
  configure: () => {
    const cfg = readJson(vscodeSettingsPath) || {};
    const servers = (cfg['cline.mcpServers']) || {};
    servers[SERVER_NAME] = { command: NPX_CMD, args: NPX_ARGS, disabled: false, autoApprove: true };
    cfg['cline.mcpServers'] = servers;
    writeJson(vscodeSettingsPath, cfg);
    return { ok: true, message: `已写入 ${vscodeSettingsPath}（cline.mcpServers）` };
  },
};

const CLIENTS = [claudeCode, claudeDesktop, cursor, cline];

// ─── 主流程 ───

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const clientFilter = args.find((a) => a.startsWith('--client='))?.split('=')[1];

console.log('═══════════════════════════════════════════════════');
console.log('  chinese-wisdom MCP 自动配置');
console.log('═══════════════════════════════════════════════════');
console.log(`仓库路径: ${REPO_ROOT}`);
console.log(`MCP 入口: ${MCP_SERVER_ENTRY}`);
console.log(`平台: ${platform()}${IS_WIN ? ' (用 cmd /c npx 包裹)' : ''}`);
console.log('');

// 前置检查：mcp-server 依赖是否已装
const nodeModulesOk = existsSync(join(MCP_SERVER_DIR, 'node_modules'));
if (!nodeModulesOk) {
  console.log('⚠️  apps/mcp-server/node_modules 不存在，先安装依赖...');
  if (!checkOnly) {
    try {
      execSync('npm install', { cwd: MCP_SERVER_DIR, stdio: 'inherit' });
    } catch {
      console.error('❌ 依赖安装失败，请手动 cd apps/mcp-server && npm install');
      process.exit(1);
    }
  } else {
    console.log('   (check 模式，跳过安装)');
  }
} else {
  console.log('✅ apps/mcp-server 依赖已就绪');
}
console.log('');

// 检测 tsx 是否可用
const tsxOk = (() => {
  try {
    execSync(`${IS_WIN ? 'where' : 'which'} tsx`, { stdio: 'ignore' });
    return true;
  } catch {
    return existsSync(join(MCP_SERVER_DIR, 'node_modules', '.bin', 'tsx'));
  }
})();
if (!tsxOk) {
  console.log('⚠️  tsx 未全局可用（npx 会自动拉取，首次启动稍慢）');
} else {
  console.log('✅ tsx 可用');
}
console.log('');

console.log('─── 客户端检测 ───');
let configured = 0;
for (const client of CLIENTS) {
  if (clientFilter && !client.name.toLowerCase().replace(/\s+/g, '-').includes(clientFilter.toLowerCase().replace(/\s+/g, '-'))) continue;
  client.detected = client.detect();
  const status = client.detected ? '✅ 检测到' : '⬜ 未安装';
  console.log(`${status}  ${client.name}`);
  console.log(`         配置: ${client.configPath}`);
  if (client.detected && !checkOnly) {
    try {
      const result = client.configure();
      console.log(`         → ${result.ok ? '✅' : '❌'} ${result.message}`);
      if (result.ok) configured++;
    } catch (e) {
      console.log(`         → ❌ 配置失败: ${e instanceof Error ? e.message : e}`);
    }
  } else if (client.detected && checkOnly) {
    console.log('         → (check 模式，未写入)');
  }
  console.log('');
}

console.log('═══════════════════════════════════════════════════');
if (checkOnly) {
  console.log(`检测完成：${CLIENTS.filter((c) => c.detected).length} 个客户端可用`);
} else {
  console.log(`配置完成：${configured} 个客户端已写入 ${SERVER_NAME} server`);
  if (configured > 0) {
    console.log('');
    console.log('下一步：重启对应客户端，应能看到 chinese-wisdom server 已连接。');
    console.log('在 AI 对话中可直接说「排个八字」等，AI 会自动调用对应工具。');
  } else {
    console.log('未检测到任何 MCP 客户端。可手动参考 apps/mcp-server/examples/ 配置。');
  }
}
console.log('═══════════════════════════════════════════════════');
