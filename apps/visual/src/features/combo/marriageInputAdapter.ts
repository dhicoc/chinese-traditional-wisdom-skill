import type { BaziBirth } from '@/legacy/baziEngine';
import type { ComboMarriageToolInput } from '@/legacy/toolContracts';
import type { BaziTimeStatus } from '@/lib/birthContext';

interface PersonAInput {
  birth: BaziBirth;
  timeStatus: BaziTimeStatus;
  surname?: string;
  givenName?: string;
  label: string;
}

interface PersonBInput {
  birth: BaziBirth;
  civilFallbackConfirmed: boolean;
  surname?: string;
  givenName?: string;
  label: string;
}

interface MarriageAdapterInput {
  personA: PersonAInput;
  personB: PersonBInput;
  scene: NonNullable<ComboMarriageToolInput['scene']>;
  targetYear: number;
}

type MarriageAdapterResult =
  | { ok: true; input: ComboMarriageToolInput }
  | { ok: false; message: string };

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result || undefined;
}

function hasCompleteName(person: { surname?: string; givenName?: string }): boolean {
  return Boolean(trimmed(person.surname) && trimmed(person.givenName));
}

function hasPartialName(person: { surname?: string; givenName?: string }): boolean {
  return Boolean(trimmed(person.surname)) !== Boolean(trimmed(person.givenName));
}

export function toMarriageInputMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('surname') || message.includes('givenName')) {
    return '如需姓名匹配，请完整填写双方的姓与名；否则请清空全部姓名字段。';
  }
  if (message.includes('personA.birth')) return '请检查甲方的出生年月日时与性别是否填写正确。';
  if (message.includes('personB.birth')) return '请检查乙方的出生年月日时与性别是否填写正确。';
  if (message.includes('timeBasis') || message.includes('trueSolarBirth')) {
    return '请确认双方的时间依据，或先完成真太阳时核验。';
  }
  return '请检查双方资料后重试。';
}

export function buildMarriageToolInput(value: MarriageAdapterInput): MarriageAdapterResult {
  const { personA, personB } = value;
  if (personA.timeStatus.status === 'awaiting-agent-verification' || !personB.civilFallbackConfirmed) {
    return { ok: false, message: '请分别确认双方是否按记录的出生时间计算，或先完成真太阳时核验。' };
  }

  if (
    hasPartialName(personA)
    || hasPartialName(personB)
    || hasCompleteName(personA) !== hasCompleteName(personB)
  ) {
    return { ok: false, message: '如需姓名匹配，请完整填写双方的姓与名；否则请清空全部姓名字段。' };
  }

  const personABirth = personA.timeStatus.status === 'true-solar-verified'
    ? personA.timeStatus.resolution.trueSolarBirth
    : personA.timeStatus.civilBirth;
  const personATimeContext = personA.timeStatus.status === 'true-solar-verified'
    ? { timeBasis: 'true-solar-verified' as const, trueSolarResolution: personA.timeStatus.resolution }
    : { timeBasis: 'civil-unverified' as const, civilFallbackConfirmed: true };
  const withName = (person: { surname?: string; givenName?: string }) => hasCompleteName(person)
    ? { surname: trimmed(person.surname), givenName: trimmed(person.givenName) }
    : {};

  return {
    ok: true,
    input: {
      personA: {
        birth: personABirth,
        baziTimeContext: personATimeContext,
        ...withName(personA),
        label: personA.label,
      },
      personB: {
        birth: personB.birth,
        baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
        ...withName(personB),
        label: personB.label,
      },
      scene: value.scene,
      targetYear: value.targetYear,
    },
  };
}
