export type WuxingStats = Record<'木' | '火' | '土' | '金' | '水', number>;

export interface BaziPillars {
  year: { stem: string; branch: string; hidden?: string[] };
  month: { stem: string; branch: string; hidden?: string[] };
  day: { stem: string; branch: string; hidden?: string[] };
  hour: { stem: string; branch: string; hidden?: string[] };
  dayMaster: string;
  gender: string;
}

export interface YunqiData {
  year: number;
  tiangan: string;
  dizhi: string;
  wuyun: {
    dayun: string;
    zhuyun: string[];
    keyun: string[];
  };
  liuqi: {
    sitian: string;
    zaiquan: string;
    zhuke: Array<{ step: string; qi: string; start: string; end: string; zhuqi?: string }>;
    current_step?: unknown;
    kezhujialin?: string;
  };
  disease_tendency?: string;
  engineName?: string;
  mode?: string;
  confidenceNote?: string;
}

export const CONSTITUTION_TYPES = [
  '平和质',
  '气虚质',
  '阳虚质',
  '阴虚质',
  '痰湿质',
  '湿热质',
  '血瘀质',
  '气郁质',
  '特禀质',
] as const;

export type ConstitutionType = (typeof CONSTITUTION_TYPES)[number];
export type ConstitutionScores = Record<ConstitutionType, number>;

export interface ConstitutionData {
  scores: ConstitutionScores;
  dominant: ConstitutionType | '';
}

export interface FlyingStarsData {
  year: number;
}

export interface EightMansionsData {
  year: number;
  gender: '男' | '女';
}

export interface FlyingStarsSummary {
  centerStar: number;
  starName: string;
  wuxing: string;
  luck: string;
}

/** 单个九宫格单元（宫位 + 飞星信息） */
export interface FlyingStarCell {
  palace: string;
  starNum: number;
  starName: string;
  wuxing: string;
  luck: string;
}

/** 3×3 九宫飞星网格（行优先：row0=巽离坤，row1=震中兑，row2=艮坎乾） */
export type FlyingStarGrid = FlyingStarCell[][];

export interface EightMansionsSummary {
  trigram: string;
  group: string;
}
