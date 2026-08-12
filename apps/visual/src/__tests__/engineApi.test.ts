import { describe, expect, it } from 'vitest';
import {
  buildBaziDynamicLayer,
  calcBaziEnveloped,
  calculateBazi,
} from '@/engine-api/bazi';
import {
  DALIUREN_SCHOOLS,
  calcAnnualFortuneCombo,
  calcDecisionCombo,
} from '@/engine-api/combo';
import { calcMarriageCombo } from '@/engine-api/marriage';
import {
  buildBaziDynamicLayer as buildBaziDynamicLayerLegacy,
  calcBaziEnveloped as calcBaziEnvelopedLegacy,
  calculateBazi as calculateBaziLegacy,
} from '@/legacy/baziEngine';
import {
  calcAnnualFortuneCombo as calcAnnualFortuneComboLegacy,
  calcDecisionCombo as calcDecisionComboLegacy,
} from '@/legacy/comboEngine';
import { DALIUREN_SCHOOLS as DALIUREN_SCHOOLS_LEGACY } from '@/legacy/daliurenEngine';
import { calcMarriageCombo as calcMarriageComboLegacy } from '@/legacy/marriageCombo';

describe('engine-api', () => {
  it('公开八字 API 仅转发既有纯引擎函数', () => {
    expect(calculateBazi).toBe(calculateBaziLegacy);
    expect(calcBaziEnveloped).toBe(calcBaziEnvelopedLegacy);
    expect(buildBaziDynamicLayer).toBe(buildBaziDynamicLayerLegacy);
  });

  it('公开组合 API 仅转发既有纯引擎函数和选项', () => {
    expect(calcAnnualFortuneCombo).toBe(calcAnnualFortuneComboLegacy);
    expect(calcDecisionCombo).toBe(calcDecisionComboLegacy);
    expect(DALIUREN_SCHOOLS).toBe(DALIUREN_SCHOOLS_LEGACY);
  });

  it('公开合婚 API 保持既有异步组合函数', () => {
    expect(calcMarriageCombo).toBe(calcMarriageComboLegacy);
  });
});
