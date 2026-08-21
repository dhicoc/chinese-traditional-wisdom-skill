import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCAL_TOOL_NAMES } from '@/legacy/localToolRegistry';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tsxCli = require.resolve('tsx/cli');
type CliResult = { code: number | null; stdout: string; stderr: string };

function runAgent(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, 'scripts/run-engine-agent.ts', ...args], { cwd: appRoot, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function fixture(name: string): string {
  return path.join(appRoot, 'src/__fixtures__/analysis', name);
}

describe('Agent parameter planner CLI', () => {
  it('supports the documented --query command without adding a registry tool', async () => {
    const result = await runAgent(['plan', '--query', '我想看今年事业']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: '1.0.0',
      routeKind: 'calculation',
      routeTarget: { module: 'bazi' },
      candidates: [{ tool: 'bazi_calculate', inputReady: false }],
    });
    expect(LOCAL_TOOL_NAMES).toHaveLength(32);
  }, 15_000);

  it('accepts privacy-safe --provided presence hints', async () => {
    const result = await runAgent(['plan', '--query', '八字事业', '--provided', 'birth,timeBasis']);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).candidates[0]).toMatchObject({ tool: 'bazi_calculate', inputReady: true, missingInputs: [] });
  }, 15_000);

  it('supports success and boundary JSON fixtures through --input', async () => {
    const success = await runAgent(['plan', '--input', fixture('agent-plan.success.json')]);
    expect(success.code).toBe(0);
    expect(JSON.parse(success.stdout)).toMatchObject({ routeTarget: { module: 'bazi' }, executionPolicy: 'plan-only' });

    const boundary = await runAgent(['plan', '--input', fixture('agent-plan.boundary.json')]);
    expect(boundary.code).toBe(0);
    expect(JSON.parse(boundary.stdout)).toMatchObject({
      routeKind: 'unrecognized', executionPolicy: 'no-traditional-calculation', candidates: [],
    });
  }, 20_000);

  it('returns INVALID_INPUT for failure fixture and malformed flags', async () => {
    for (const args of [
      ['plan', '--input', fixture('agent-plan.failure.json')],
      ['plan', '--query'],
      ['plan', '--query', '八字', '--unknown', 'birth'],
    ]) {
      const result = await runAgent(args);
      expect(result.code).toBe(1);
      expect(result.stdout).toBe('');
      expect(JSON.parse(result.stderr)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    }
  }, 20_000);

  it('does not echo the raw consultation query', async () => {
    const sentinel = '八字事业-raw-private-sentinel-8372';
    const result = await runAgent(['plan', '--query', sentinel]);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain(sentinel);
  }, 15_000);
});
