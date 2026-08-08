export type ShenShaTrineSource = 'year' | 'day';

export interface ResolvedBaziEngineConfig {
  calendarMode: 'exact' | 'approx';
  shenShaTrineSource: ShenShaTrineSource;
  dayBoundaryRule: 'zi-chu-next-day';
  luckStartMethod: 'lunar-solar-terms' | 'three-years-approx';
}

export interface ResolvedZiweiEngineConfig {
  provider: 'iztro@2.5.8';
  transit: { year: number; month: number; day: 15 };
  hourRule: '23:00-23:59=>early-zi';
  palaceNameNormalization: '仆役→交友';
  enabledDynamicLayers: ['decadal', 'yearly', 'monthly', 'age'];
}

export function resolveBaziEngineConfig(input: {
  mode: 'local-exact' | 'local-approx';
  shenShaTrineSource?: ShenShaTrineSource;
  hasExactLuck: boolean;
}): ResolvedBaziEngineConfig {
  return {
    calendarMode: input.mode === 'local-exact' ? 'exact' : 'approx',
    shenShaTrineSource: input.shenShaTrineSource ?? 'year',
    dayBoundaryRule: 'zi-chu-next-day',
    luckStartMethod: input.hasExactLuck ? 'lunar-solar-terms' : 'three-years-approx',
  };
}

export function resolveZiweiEngineConfig(transit: { year: number; month: number }): ResolvedZiweiEngineConfig {
  return {
    provider: 'iztro@2.5.8',
    transit: { ...transit, day: 15 },
    hourRule: '23:00-23:59=>early-zi',
    palaceNameNormalization: '仆役→交友',
    enabledDynamicLayers: ['decadal', 'yearly', 'monthly', 'age'],
  };
}
