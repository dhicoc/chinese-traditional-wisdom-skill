/**
 * bazhaiHouse — 八宅宅卦 + 命宅相配。
 *
 * 数据与规则提炼自 Sudo-Biao/suangua（MIT）core/fengshui/calculator.py 的
 * get_house_gua / check_compatibility / get_sector_direction，对齐本项目
 * core.js trigramDirection 卦—方位映射。
 *
 * 约定：宅卦按房屋「朝向方」定（朝南=离宅），与 suangua 一致。
 * 命宅相配：东四命住东四宅、西四命住西四宅为相配；否则不相配，建议
 * 重点布局个人生气位弥补。引文出自《八宅明镜》。
 */

/** 卦数 → 卦名（洛书序：1坎 2坤 3震 4巽 6乾 7兑 8艮 9离） */
const GUA_NUM_TO_NAME: Record<number, string> = {
  1: '坎', 2: '坤', 3: '震', 4: '巽',
  6: '乾', 7: '兑', 8: '艮', 9: '离',
};

/** 卦名 → 卦数 */
const GUA_NAME_TO_NUM: Record<string, number> = {
  坎: 1, 坤: 2, 震: 3, 巽: 4, 乾: 6, 兑: 7, 艮: 8, 离: 9,
};

/** 朝向方位 → 宅卦数（对齐 suangua DIRECTION_GUA） */
const DIRECTION_GUA: Record<string, number> = {
  南: 9, 北: 1, 东: 3, 西: 7,
  东南: 4, 西北: 6, 东北: 8, 西南: 2,
};

const EAST_FOUR = [1, 3, 4, 9]; // 坎离震巽
const WEST_FOUR = [2, 6, 7, 8]; // 乾坤艮兑

/** 宅卦名（含方位标注） */
const HOUSE_NAME: Record<number, string> = {
  1: '坎宅（坐北朝南）',
  2: '坤宅（坐西南朝东北）',
  3: '震宅（坐东朝西）',
  4: '巽宅（坐东南朝西北）',
  6: '乾宅（坐西北朝东南）',
  7: '兑宅（坐西朝东）',
  8: '艮宅（坐东北朝西南）',
  9: '离宅（坐南朝北）',
};

/** 卦五行（用于命宅生克细化） */
const GUA_WUXING: Record<string, string> = {
  坎: '水', 坤: '土', 震: '木', 巽: '木',
  乾: '金', 兑: '金', 艮: '土', 离: '火',
};

export interface HouseGua {
  /** 朝向方位 */
  facing: string;
  /** 宅卦名 */
  trigram: string;
  /** 宅卦数 */
  num: number;
  /** 宅卦全称 */
  name: string;
  /** 东四宅 / 西四宅 */
  group: string;
}

export interface MingZhaiCompatibility {
  level: '相配' | '不相配';
  /** 命卦名 */
  mingGua: string;
  /** 命卦组（东四命/西四命） */
  mingGroup: string;
  /** 宅卦名 */
  houseGua: string;
  /** 宅卦组（东四宅/西四宅） */
  houseGroup: string;
  /** 命卦五行 */
  mingWuxing: string;
  /** 宅卦五行 */
  houseWuxing: string;
  /** 命宅五行生克关系（比和/相生/相克） */
  wuxingRelation: string;
  /** 详判含《八宅明镜》引文 */
  detail: string;
  /** 不相配时的弥补建议方位（个人生气位方向），相配时为空 */
  remedyDirection: string;
}

/** 按朝向方位定宅卦。 */
export function getHouseGua(facing: string): HouseGua | null {
  const num = DIRECTION_GUA[facing];
  if (!num) return null;
  const trigram = GUA_NUM_TO_NAME[num];
  const group = EAST_FOUR.includes(num) ? '东四宅' : '西四宅';
  return { facing, trigram, num, name: HOUSE_NAME[num], group };
}

/** 命宅相配判断（含五行生克与引文）。 */
export function checkMingZhaiCompatibility(
  mingGua: string,
  houseGua: HouseGua,
): MingZhaiCompatibility | null {
  const mingNum = GUA_NAME_TO_NUM[mingGua];
  if (!mingNum) return null;
  const mingGroup = EAST_FOUR.includes(mingNum) ? '东四命' : '西四命';
  const houseGroup = houseGua.group;
  const mingWuxing = GUA_WUXING[mingGua] ?? '';
  const houseWuxing = GUA_WUXING[houseGua.trigram] ?? '';
  const wuxingRelation = relateWuxing(mingWuxing, houseWuxing);

  if (mingGroup[0] === houseGroup[0]) {
    return {
      level: '相配',
      mingGua,
      mingGroup,
      houseGua: houseGua.name,
      houseGroup,
      mingWuxing,
      houseWuxing,
      wuxingRelation,
      detail: `命卦${mingGua}（${mingWuxing}）与${houseGua.name}（${houseWuxing}）同属${mingGroup.slice(0, 1)}四宅。《八宅明镜》云：东四命住东四宅，西四命住西四宅，同类相得则吉。`,
      remedyDirection: '',
    };
  }
  // 不相配：找个人生气位方向作为弥补
  const remedy = getPersonalDirection(mingGua, '生气');
  return {
    level: '不相配',
    mingGua,
    mingGroup,
    houseGua: houseGua.name,
    houseGroup,
    mingWuxing,
    houseWuxing,
    wuxingRelation,
    detail: `命卦${mingGua}（${mingWuxing}）与${houseGua.name}（${houseWuxing}）不同类。《八宅明镜》云：东命住西宅，或西命住东宅，命宅相克则凶。建议重点布局个人生气位（${remedy}）弥补。`,
    remedyDirection: remedy,
  };
}

/** 五行生克关系描述。 */
function relateWuxing(a: string, b: string): string {
  if (!a || !b) return '';
  if (a === b) return '比和';
  const sheng: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const ke: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  if (sheng[a] === b) return `${a}生${b}`;
  if (sheng[b] === a) return `${b}生${a}`;
  if (ke[a] === b) return `${a}克${b}`;
  if (ke[b] === a) return `${b}克${a}`;
  return '';
}

/**
 * 取个人某游年星所在方位。依赖运行时 CORE.eightMansionsData（由 fengshui.js
 * 暴露）。CORE 未加载时返回 '未知'。
 */
function getPersonalDirection(mingGua: string, star: string): string {
  try {
    const w = window as unknown as {
      CORE?: { eightMansionsData?: Record<string, Record<string, string>> };
    };
    const map = w.CORE?.eightMansionsData?.[mingGua];
    if (!map) return '未知';
    for (const [dir, name] of Object.entries(map)) {
      if (name === star) return dir;
    }
    return '未知';
  } catch {
    return '未知';
  }
}

/** 取个人四吉方 / 四凶方速查（依赖运行时 CORE.eightMansionsData）。 */
export function getPersonalDirections(
  mingGua: string,
): { auspicious: { star: string; direction: string }[]; inauspicious: { star: string; direction: string }[] } | null {
  try {
    const w = window as unknown as {
      CORE?: { eightMansionsData?: Record<string, Record<string, string>> };
    };
    const map = w.CORE?.eightMansionsData?.[mingGua];
    if (!map) return null;
    const auspiciousStars = ['生气', '天医', '延年', '伏位'];
    const inauspiciousStars = ['绝命', '五鬼', '六煞', '祸害'];
    const pick = (stars: string[]) =>
      stars.map((star) => {
        const direction = Object.entries(map).find(([, name]) => name === star)?.[0] ?? '未知';
        return { star, direction };
      });
    return { auspicious: pick(auspiciousStars), inauspicious: pick(inauspiciousStars) };
  } catch {
    return null;
  }
}

/** 八方位选项（朝向下拉用）。 */
export const FACING_OPTIONS = ['南', '北', '东', '西', '东南', '西北', '东北', '西南'] as const;
