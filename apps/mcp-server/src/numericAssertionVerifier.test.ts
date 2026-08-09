import { describe, expect, it } from 'vitest';
import { registerNumericAssertions, validateNumericAssertions } from './numericAssertionVerifier';

describe('数值断言校验', () => {
  it('接受当次 ToolEnvelope 中的嵌套数值断言', () => {
    registerNumericAssertions('token', 'bazi_calculate', {
      ok: true,
      data: { elements: { 木: 2 }, luck: [{ ageStart: 7 }] },
    });

    expect(validateNumericAssertions('token', [
      { path: 'data.elements.木', value: 2 },
      { path: 'data.luck.0.ageStart', value: 7 },
    ])).toEqual({ valid: true, violations: [] });
  });

  it('拒绝伪造数值、跨工具断言与非数值路径', () => {
    registerNumericAssertions('token', 'bazi_calculate', {
      ok: true,
      data: { elements: { 木: 2 }, dayMaster: '甲' },
    });

    const validation = validateNumericAssertions('token', [
      { path: 'data.elements.木', value: 3 },
      { tool: 'ziwei_chart', path: 'data.elements.木', value: 2 },
      { path: 'data.dayMaster', value: 2 },
    ]);

    expect(validation).toMatchObject({ valid: false });
    expect(validation!.violations).toHaveLength(3);
  });

  it('对无效 token 返回 null', () => {
    expect(validateNumericAssertions('missing', [{ path: 'data.value', value: 1 }])).toBeNull();
  });
});
