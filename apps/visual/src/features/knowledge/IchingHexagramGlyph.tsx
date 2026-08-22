import type { CanonicalHexagram, YaoPolarity } from '@/legacy/ichingTexts';

interface YaoBarProps {
  polarity: YaoPolarity;
  isChanging?: boolean;
  compact?: boolean;
}

export function YaoBar({ polarity, isChanging = false, compact = false }: YaoBarProps) {
  const height = compact ? 'h-1.5' : 'h-2.5';
  const color = isChanging ? 'bg-cinnabar-400' : 'bg-jade-100/75';
  return (
    <span aria-hidden="true" className={['flex items-center justify-center', compact ? 'w-8 gap-1' : 'w-32 gap-3'].join(' ')}>
      {polarity === 'yin' ? (
        <>
          <span className={[height, color, 'flex-1 rounded-sm'].join(' ')} />
          <span className={[height, color, 'flex-1 rounded-sm'].join(' ')} />
        </>
      ) : (
        <span className={[height, color, 'w-full rounded-sm'].join(' ')} />
      )}
    </span>
  );
}

interface HexagramGlyphProps {
  hexagram: CanonicalHexagram;
  changingLines?: readonly number[];
  compact?: boolean;
}

export function HexagramGlyph({ hexagram, changingLines = [], compact = false }: HexagramGlyphProps) {
  const renderLines = hexagram.linesBottomUp
    .map((polarity, index) => ({ polarity, line: index + 1 }))
    .reverse();
  return (
    <div
      role="img"
      aria-label={`第${hexagram.number}卦 ${hexagram.fullName}，上${hexagram.upperTrigram}下${hexagram.lowerTrigram}`}
      className={['flex flex-col items-center justify-center', compact ? 'gap-1' : 'gap-2.5'].join(' ')}
    >
      {renderLines.map(({ polarity, line }) => (
        <YaoBar key={line} polarity={polarity} isChanging={changingLines.includes(line)} compact={compact} />
      ))}
    </div>
  );
}
