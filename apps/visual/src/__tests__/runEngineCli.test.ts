import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tsxCli = require.resolve('tsx/cli');
const fixture = (name: string) => path.join(appRoot, 'src/__fixtures__/local-tools', name);

type CliResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

function runEngine(args: string[], input?: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, 'scripts/run-engine.ts', ...args], {
      cwd: appRoot,
      stdio: 'pipe',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

describe('run-engine CLI', () => {
  it('returns a JSON envelope from an input file', async () => {
    const result = await runEngine(['list_constitution_questionnaire', fixture('list_constitution_questionnaire.success.json')]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      tool: 'list_constitution_questionnaire',
      data: { groups: expect.any(Array) },
    });
  });

  it('accepts JSON from stdin', async () => {
    const result = await runEngine(['list_constitution_questionnaire', '-'], '{}');

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      tool: 'list_constitution_questionnaire',
    });
  });

  it('returns a non-zero exit code for a contract failure', async () => {
    const result = await runEngine(['calc_chenguz', fixture('calc_chenguz.failure.json')]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('version 必须是 standard、folk 或 full。');
  });

  it('returns a non-zero exit code for invalid JSON', async () => {
    const result = await runEngine(['list_constitution_questionnaire', '-'], '{');

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/JSON/);
  });

  it('does not serialize sentinel fields from CLI stdin', async () => {
    const cases = [
      ['bazi_calculate', {
        birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
        timeBasis: 'true-solar-verified',
        trueSolarResolution: {
          trueSolarBirth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
          unexpectedResolution: 'cli-sentinel-bazi',
        },
      }],
      ['resolve_true_solar_time', {
        birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
        location: {
          displayName: '北京市，中国',
          longitude: 116.4074,
          ianaTimeZone: 'Asia/Shanghai',
          utcOffsetMinutes: 480,
          utcOffsetEvidence: 'IANA 时区历史规则核验：当地 UTC+08:00',
          unexpected: 'cli-sentinel-location',
        },
      }],
      ['calc_yunqi', {
        year: 2026,
        birthMonth: 6,
        birthDay: 15,
        currentMonth: 8,
        unexpected: 'cli-sentinel-yunqi',
      }],
      ['combo_marriage', {
        personA: {
          birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
          baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
          unexpected: 'cli-sentinel-person-a',
        },
        personB: {
          birth: { year: 1988, month: 3, day: 20, hour: 8, gender: '女' },
          baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
          unexpected: 'cli-sentinel-person-b',
        },
        unexpected: 'cli-sentinel-marriage',
      }],
    ] as const;

    for (const [tool, input] of cases) {
      const result = await runEngine([tool, '-'], JSON.stringify(input));
      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).not.toContain('cli-sentinel');
    }
  });
});
