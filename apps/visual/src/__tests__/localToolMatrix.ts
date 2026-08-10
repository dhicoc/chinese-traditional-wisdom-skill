import { LOCAL_TOOL_NAMES, type LocalToolName } from '@/legacy/toolContracts';

export type LocalToolFixtureCase = {
  tool: LocalToolName;
  name: `${LocalToolName}.success.json`;
};

export type NestedWhitelistCase = {
  tool: LocalToolName;
  inject: (input: Record<string, unknown>, sentinel: string) => void;
};

export const SUCCESS_TOOL_FIXTURES: readonly LocalToolFixtureCase[] = LOCAL_TOOL_NAMES.map((tool) => ({
  tool,
  name: `${tool}.success.json` as LocalToolFixtureCase['name'],
}));

export const NESTED_WHITELIST_CASES: readonly NestedWhitelistCase[] = [
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
