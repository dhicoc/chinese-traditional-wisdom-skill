import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runLocalTool } from '@/legacy/directRunner';

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../__fixtures__/local-tools',
);

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(fixtureDir, name), 'utf8'));
}

type SuccessCase = {
  tool: string;
  name: string;
  assert: (result: any) => void;
};

const successCases: SuccessCase[] = [
  {
    tool: 'resolve_true_solar_time',
    name: 'resolve_true_solar_time.success.json',
    assert: (result) => expect(result).toMatchObject({ status: 'resolved', source: 'agent-verified', trueSolarBirth: { hour: 11, minute: 4 } }),
  },
  {
    tool: 'resolve_true_solar_time',
    name: 'resolve_true_solar_time.boundary.json',
    assert: (result) => expect(result).toMatchObject({ crossedShichen: true, crossedZiChu: true }),
  },
  {
    tool: 'bazi_calculate',
    name: 'bazi_calculate.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'bazi_calculate',
    name: 'bazi_calculate.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { shenShaTrineSource: 'day', pillars: { hour: { branch: '子' } } } }),
  },
  {
    tool: 'ziwei_chart',
    name: 'ziwei_chart.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { mode: 'local-exact', birthInfo: { gender: '男' } } }),
  },
  {
    tool: 'ziwei_chart',
    name: 'ziwei_chart.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { mode: 'local-exact', birthInfo: { hour: 23, gender: '女' } } }),
  },
  {
    tool: 'calc_feixing',
    name: 'calc_feixing.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { year: 2025, mingGua: { trigram: expect.any(String) } } }),
  },
  {
    tool: 'calc_feixing',
    name: 'calc_feixing.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { year: 1 } }),
  },
  {
    tool: 'calc_bazhai',
    name: 'calc_bazhai.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { mingGua: { trigram: expect.any(String) }, menZhuZao: expect.any(Object) } }),
  },
  {
    tool: 'calc_bazhai',
    name: 'calc_bazhai.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { taisui: expect.any(Object) } }),
  },
];

describe('first-batch local tool fixtures', () => {
  successCases.forEach(({ tool, name, assert }) => {
    it(`${tool} executes ${name}`, async () => {
      assert(await runLocalTool(tool, await fixture(name)));
    });
  });

  [
    ['resolve_true_solar_time', 'resolve_true_solar_time.failure.json'],
    ['bazi_calculate', 'bazi_calculate.failure.json'],
    ['ziwei_chart', 'ziwei_chart.failure.json'],
    ['calc_feixing', 'calc_feixing.failure.json'],
    ['calc_bazhai', 'calc_bazhai.failure.json'],
  ].forEach(([tool, name]) => {
    it(`${tool} rejects ${name}`, async () => {
      await expect(runLocalTool(tool, await fixture(name))).rejects.toThrow();
    });
  });
});
