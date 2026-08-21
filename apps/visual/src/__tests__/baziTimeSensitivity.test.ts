import { Solar } from 'lunar-typescript';
import { describe, expect, it } from 'vitest';
import { analyzeBaziTimeSensitivity, hourToShichen, parseBaziTimeSensitivityInput } from '@/legacy/baziTimeSensitivity';

const BIRTH = { year: 1990, month: 6, day: 15, gender: '男' as const, isLunar: false };

describe('Bazi birth-time sensitivity', () => {
  it('compares all 12 shichen without selecting a unique birth time', () => {
    const result = analyzeBaziTimeSensitivity({ birth: BIRTH, startHour: 0, endHour: 23, solar: Solar });
    expect(result.candidates).toHaveLength(12);
    expect(result.candidates.every((item) => item.mode === 'local-exact')).toBe(true);
    expect(result.stableFacts.map((item) => item.field)).toEqual(expect.arrayContaining(['yearPillar', 'monthPillar']));
    expect(result.variableFacts.map((item) => item.field)).toContain('hourPillar');
    expect(result).not.toHaveProperty('selectedHour');
    expect(result.limitations.join(' ')).toContain('不校时、不反推');
  });

  it('handles a midnight-wrapping range across Zi and Chou', () => {
    const result = analyzeBaziTimeSensitivity({ birth: BIRTH, startHour: 23, endHour: 1, solar: Solar });
    expect(result.range.wrapsMidnight).toBe(true);
    expect(result.candidates.map((item) => item.shichen)).toEqual(['子', '丑']);
  });

  it('deduplicates civil hours into shichen candidates', () => {
    const result = analyzeBaziTimeSensitivity({ birth: BIRTH, startHour: 9, endHour: 12, solar: Solar });
    expect(result.candidates.map((item) => item.shichen)).toEqual(['巳', '午']);
    expect(hourToShichen(23)).toBe('子');
    expect(hourToShichen(1)).toBe('丑');
  });

  it('validates the public analysis input', () => {
    expect(parseBaziTimeSensitivityInput({ birth: BIRTH, startHour: 0, endHour: 23 })).toMatchObject({ startHour: 0, endHour: 23 });
    expect(() => parseBaziTimeSensitivityInput({ birth: BIRTH, startHour: -1, endHour: 23 })).toThrow('startHour');
    expect(() => parseBaziTimeSensitivityInput({ birth: { ...BIRTH, gender: '未知' }, startHour: 0, endHour: 23 })).toThrow('gender');
  });
});
