import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tsxCli = require.resolve('tsx/cli');
const fixture = (name: string) => path.join(appRoot, 'src/__fixtures__/local-tools', name);

type NestedWhitelistCase = {
  tool: string;
  inject: (input: Record<string, unknown>, sentinel: string) => void;
};

const nestedWhitelistCases: NestedWhitelistCase[] = [
  {
    tool: 'resolve_true_solar_time',
    inject: (input, sentinel) => {
      (input.birth as Record<string, unknown>).unexpectedBirth = sentinel;
      (input.location as Record<string, unknown>).unexpectedLocation = sentinel;
    },
  },
  {
    tool: 'bazi_calculate',
    inject: (input, sentinel) => {
      const birth = input.birth as Record<string, unknown>;
      birth.unexpectedBirth = sentinel;
      input.timeBasis = 'true-solar-verified';
      input.trueSolarResolution = { trueSolarBirth: { ...birth, unexpectedTrueSolarBirth: sentinel }, unexpectedResolution: sentinel };
    },
  },
  {
    tool: 'ziwei_chart',
    inject: (input, sentinel) => {
      (input.birth as Record<string, unknown>).unexpectedBirth = sentinel;
      (input.transit as Record<string, unknown>).unexpectedTransit = sentinel;
      input.mingGua = { trigram: '离', group: '东四命', unexpectedMingGua: sentinel };
    },
  },
  { tool: 'cast_liuyao', inject: (input, sentinel) => { (input.birth as Record<string, unknown>).unexpectedDivinationBirth = sentinel; } },
  { tool: 'huangji_calculate', inject: (input, sentinel) => { (input.birth as Record<string, unknown>).unexpectedHuangjiBirth = sentinel; } },
  { tool: 'calc_xiyong', inject: (input, sentinel) => { (input.elements as Record<string, unknown>).unexpectedElement = sentinel; } },
  {
    tool: 'calc_chenguz',
    inject: (input, sentinel) => {
      (input.birth as Record<string, unknown>).unexpectedBirth = sentinel;
      (input.baziTimeContext as Record<string, unknown>).unexpectedTimeContext = sentinel;
    },
  },
  {
    tool: 'analyze_name',
    inject: (input, sentinel) => {
      input.birth = { year: 1990, month: 6, day: 15, hour: 12, gender: '男', unexpectedBirth: sentinel };
      input.baziTimeContext = { timeBasis: 'civil-unverified', civilFallbackConfirmed: true, unexpectedTimeContext: sentinel };
    },
  },
  {
    tool: 'cast_cezi',
    inject: (input, sentinel) => {
      input.birth = { year: 1990, month: 6, day: 15, hour: 12, gender: '男', unexpectedBirth: sentinel };
      input.baziTimeContext = { timeBasis: 'civil-unverified', civilFallbackConfirmed: true, unexpectedTimeContext: sentinel };
    },
  },
  {
    tool: 'get_constitution_tendency',
    inject: (input, sentinel) => {
      (input.wuyun as Record<string, unknown>).unexpectedWuyun = sentinel;
      (input.liuqi as Record<string, unknown>).unexpectedLiuqi = sentinel;
    },
  },
  { tool: 'assess_constitution', inject: (input, sentinel) => { ((input.answers as Record<string, unknown>[])[0]).unexpectedAnswer = sentinel; } },
  {
    tool: 'combo_daily_wellness',
    inject: (input, sentinel) => {
      (input.birth as Record<string, unknown>).unexpectedBirth = sentinel;
      (input.baziTimeContext as Record<string, unknown>).unexpectedTimeContext = sentinel;
      (input.now as Record<string, unknown>).unexpectedNow = sentinel;
    },
  },
  {
    tool: 'combo_marriage',
    inject: (input, sentinel) => {
      for (const personKey of ['personA', 'personB']) {
        const person = input[personKey] as Record<string, unknown>;
        person.unexpectedPerson = sentinel;
        (person.birth as Record<string, unknown>).unexpectedBirth = sentinel;
        (person.baziTimeContext as Record<string, unknown>).unexpectedTimeContext = sentinel;
      }
    },
  },
];

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

  it('does not serialize nested sentinel fields from CLI stdin', async () => {
    for (const { tool, inject } of nestedWhitelistCases) {
      const sentinel = `p6-cli-sentinel-${tool}`;
      const input = JSON.parse(await readFile(fixture(`${tool}.success.json`), 'utf8')) as Record<string, unknown>;
      inject(input, sentinel);
      const result = await runEngine([tool, '-'], JSON.stringify(input));

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).not.toContain(sentinel);
    }
  }, 60_000);

  it('does not serialize top-level sentinel fields from every CLI tool', async () => {
    const fixtureNames = [
      'resolve_true_solar_time',
      'bazi_calculate',
      'ziwei_chart',
      'calc_feixing',
      'calc_bazhai',
      'cast_liuyao',
      'arrange_qimen',
      'liuren_calculate',
      'taiyi_calculate',
      'cast_meihua',
      'xingxiu_daily',
      'calc_yunqi',
      'calc_chenguz',
      'get_almanac',
      'get_daily_rhythm',
      'calc_xiyong',
      'dream_interpret',
      'analyze_name',
      'cast_cezi',
      'huangji_calculate',
      'get_constitution_tendency',
      'list_constitution_questionnaire',
      'assess_constitution',
      'combo_annual_fortune',
      'combo_monthly_fortune',
      'combo_daily_wellness',
      'combo_decision',
      'combo_space_time',
      'combo_sanshi',
      'combo_sanshi_classic',
      'combo_zeri',
      'combo_marriage',
    ] as const;

    for (const tool of fixtureNames) {
      const sentinel = `p5-cli-sentinel-${tool}`;
      const input = {
        ...JSON.parse(await readFile(fixture(`${tool}.success.json`), 'utf8')) as Record<string, unknown>,
        unexpected: sentinel,
      };
      const result = await runEngine([tool, '-'], JSON.stringify(input));

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).not.toContain(sentinel);
    }
  }, 60_000);
});
