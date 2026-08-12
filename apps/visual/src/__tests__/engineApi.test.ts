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
  calcDaliurenEnveloped,
  calcLiuyaoEnveloped,
  calcQimenEnveloped,
  calcTaiyiEnveloped,
  DALIUREN_SCHOOLS as DALIUREN_SCHOOLS_DIVINATION,
} from '@/engine-api/divination';
import {
  calcMenZhuZao,
  calcTaisui,
  combineBazhaiFeixing,
  getBazhaiGrid,
  getBazhaiSummary,
} from '@/engine-api/bazhai';
import {
  calculateScoresFromAnswers,
  deriveDominantConstitution,
  getConstitutionTendency,
} from '@/engine-api/daily';
import {
  calcYunqiEnveloped,
  calculateYunqi,
} from '@/engine-api/yunqi';
import {
  calcZiweiEnveloped,
  calculateZiwei,
  getZiweiTransitSnapshot,
} from '@/engine-api/ziwei';
import {
  buildBaziDynamicLayer as buildBaziDynamicLayerLegacy,
  calcBaziEnveloped as calcBaziEnvelopedLegacy,
  calculateBazi as calculateBaziLegacy,
} from '@/legacy/baziEngine';
import {
  calcAnnualFortuneCombo as calcAnnualFortuneComboLegacy,
  calcDecisionCombo as calcDecisionComboLegacy,
} from '@/legacy/comboEngine';
import {
  calcDaliurenEnveloped as calcDaliurenEnvelopedLegacy,
  DALIUREN_SCHOOLS as DALIUREN_SCHOOLS_LEGACY,
} from '@/legacy/daliurenEngine';
import { calcLiuyaoEnveloped as calcLiuyaoEnvelopedLegacy } from '@/legacy/liuyaoEngine';
import { calcMarriageCombo as calcMarriageComboLegacy } from '@/legacy/marriageCombo';
import { calcMenZhuZao as calcMenZhuZaoLegacy } from '@/legacy/menZhuZaoEngine';
import { calcQimenEnveloped as calcQimenEnvelopedLegacy } from '@/legacy/qimenEngine';
import { calcTaiyiEnveloped as calcTaiyiEnvelopedLegacy } from '@/legacy/taiyiEngine';
import { calcTaisui as calcTaisuiLegacy } from '@/legacy/taisuiEngine';
import { calcYunqiEnveloped as calcYunqiEnvelopedLegacy, calculateYunqi as calculateYunqiLegacy } from '@/legacy/yunqiEngine';
import { calcZiweiEnveloped as calcZiweiEnvelopedLegacy, calculateZiwei as calculateZiweiLegacy, getZiweiTransitSnapshot as getZiweiTransitSnapshotLegacy } from '@/legacy/ziweiEngine';
import { combineBazhaiFeixing as combineBazhaiFeixingLegacy } from '@/legacy/bazhaiHouse';
import { getBazhaiGrid as getBazhaiGridLegacy, getBazhaiSummary as getBazhaiSummaryLegacy, deriveDominantConstitution as deriveDominantConstitutionLegacy } from '@/legacy/canvasRenderers';
import { calculateScoresFromAnswers as calculateScoresFromAnswersLegacy } from '@/legacy/constitutionQuestionnaire';
import { getConstitutionTendency as getConstitutionTendencyLegacy } from '@/legacy/constitutionTendency';

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

  it('公开紫微与五运六气 API 仅转发既有纯引擎函数', () => {
    expect(calculateZiwei).toBe(calculateZiweiLegacy);
    expect(calcZiweiEnveloped).toBe(calcZiweiEnvelopedLegacy);
    expect(getZiweiTransitSnapshot).toBe(getZiweiTransitSnapshotLegacy);
    expect(calculateYunqi).toBe(calculateYunqiLegacy);
    expect(calcYunqiEnveloped).toBe(calcYunqiEnvelopedLegacy);
  });

  it('公开三式与六爻 API 仅转发既有纯引擎函数和选项', () => {
    expect(calcQimenEnveloped).toBe(calcQimenEnvelopedLegacy);
    expect(calcLiuyaoEnveloped).toBe(calcLiuyaoEnvelopedLegacy);
    expect(calcDaliurenEnveloped).toBe(calcDaliurenEnvelopedLegacy);
    expect(DALIUREN_SCHOOLS_DIVINATION).toBe(DALIUREN_SCHOOLS_LEGACY);
    expect(calcTaiyiEnveloped).toBe(calcTaiyiEnvelopedLegacy);
  });

  it('公开八宅 API 仅转发既有本地计算函数', () => {
    expect(getBazhaiGrid).toBe(getBazhaiGridLegacy);
    expect(getBazhaiSummary).toBe(getBazhaiSummaryLegacy);
    expect(combineBazhaiFeixing).toBe(combineBazhaiFeixingLegacy);
    expect(calcTaisui).toBe(calcTaisuiLegacy);
    expect(calcMenZhuZao).toBe(calcMenZhuZaoLegacy);
  });

  it('公开日常参考 API 仅转发既有本地计算函数', () => {
    expect(deriveDominantConstitution).toBe(deriveDominantConstitutionLegacy);
    expect(calculateScoresFromAnswers).toBe(calculateScoresFromAnswersLegacy);
    expect(getConstitutionTendency).toBe(getConstitutionTendencyLegacy);
  });
});
