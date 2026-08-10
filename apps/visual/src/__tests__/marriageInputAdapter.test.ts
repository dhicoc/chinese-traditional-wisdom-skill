import { describe, expect, it } from 'vitest';
import { buildMarriageToolInput, toMarriageInputMessage } from '@/features/combo/marriageInputAdapter';

const civilBirth = { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男' as const, useExactCalendar: true };
const partnerBirth = { year: 1988, month: 3, day: 20, hour: 8, minute: 0, gender: '女' as const, useExactCalendar: true };

describe('buildMarriageToolInput', () => {
  it('uses confirmed civil time and complete names to build the strict tool input', () => {
    expect(buildMarriageToolInput({
      personA: { birth: civilBirth, timeStatus: { status: 'civil-unverified', civilBirth, notice: '未完成真太阳时复核' }, surname: '张', givenName: '伟', label: '男方' },
      personB: { birth: partnerBirth, civilFallbackConfirmed: true, surname: '李', givenName: '娜', label: '女方' },
      scene: '婚恋',
      targetYear: 2026,
    })).toEqual({
      ok: true,
      input: {
        personA: {
          birth: civilBirth,
          baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
          surname: '张',
          givenName: '伟',
          label: '男方',
        },
        personB: {
          birth: partnerBirth,
          baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
          surname: '李',
          givenName: '娜',
          label: '女方',
        },
        scene: '婚恋',
        targetYear: 2026,
      },
    });
  });

  it('uses the verified true-solar birth for person A', () => {
    const trueSolarBirth = { ...civilBirth, hour: 11, minute: 4 };
    const resolution = {
      status: 'resolved' as const,
      source: 'agent-verified' as const,
      civilBirth,
      trueSolarBirth,
      location: { displayName: '北京', longitude: 116.4, ianaTimeZone: 'Asia/Shanghai', utcOffsetMinutes: 480, utcOffsetEvidence: 'fixture' },
      longitudeCorrectionMinutes: 0,
      equationOfTimeMinutes: 0,
      trueSolarCorrectionMinutes: 0,
      crossedDate: false,
      crossedShichen: false,
      crossedZiChu: false,
      evidence: ['fixture'],
    };
    const result = buildMarriageToolInput({
      personA: { birth: civilBirth, timeStatus: { status: 'true-solar-verified', resolution }, label: '甲方' },
      personB: { birth: partnerBirth, civilFallbackConfirmed: true, label: '乙方' },
      scene: '合作',
      targetYear: 2026,
    });

    expect(result).toMatchObject({
      ok: true,
      input: {
        personA: {
          birth: trueSolarBirth,
          baziTimeContext: { timeBasis: 'true-solar-verified', trueSolarResolution: resolution },
        },
        personB: { baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true } },
      },
    });
  });

  it('asks for separate civil-time confirmation before calculating', () => {
    expect(buildMarriageToolInput({
      personA: { birth: civilBirth, timeStatus: { status: 'awaiting-agent-verification', civilBirth }, label: '男方' },
      personB: { birth: partnerBirth, civilFallbackConfirmed: false, label: '女方' },
      scene: '婚恋',
      targetYear: 2026,
    })).toEqual({
      ok: false,
      message: '请分别确认双方是否按记录的出生时间计算，或先完成真太阳时核验。',
    });
  });

  it('asks users to either complete or clear both names', () => {
    expect(buildMarriageToolInput({
      personA: { birth: civilBirth, timeStatus: { status: 'civil-unverified', civilBirth, notice: '未完成真太阳时复核' }, surname: '张', label: '男方' },
      personB: { birth: partnerBirth, civilFallbackConfirmed: true, label: '女方' },
      scene: '婚恋',
      targetYear: 2026,
    })).toEqual({
      ok: false,
      message: '如需姓名匹配，请完整填写双方的姓与名；否则请清空全部姓名字段。',
    });
  });

  it('turns strict contract failures into actionable wording', () => {
    expect(toMarriageInputMessage(new Error('personB.birth不是有效公历日期。'))).toBe('请检查乙方的出生年月日时与性别是否填写正确。');
    expect(toMarriageInputMessage(new Error('personA.surname 与 personA.givenName 必须同时提供。'))).toBe('如需姓名匹配，请完整填写双方的姓与名；否则请清空全部姓名字段。');
  });
});
