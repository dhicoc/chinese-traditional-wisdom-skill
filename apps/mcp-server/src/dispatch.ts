/**
 * dispatch.ts — 自然语言意图路由（借鉴 horosa horosa_dispatch）
 *
 * 从用户文本提取关键词，匹配对应计算工具，并自动填充能确定的参数。
 * 不能确定的参数（如缺时辰/性别）留给 AI 追问用户。
 *
 * 路由规则：按工具关键词匹配，优先级高的工具先匹配。
 * 借鉴 horosa 字段设计思想（AGPL 仅思想不复制代码）。
 */

import { validateToolInput } from './guidance';

export interface DispatchResult {
  /** 匹配到的工具名（未匹配为 null） */
  tool: string | null;
  /** 自动填充的参数 */
  arguments: Record<string, unknown>;
  /** 仍缺失的必填参数追问（供 AI 转发给用户） */
  missingPrompts: string[];
  /** 路由原因 */
  reason: string;
  /** 是否命中 */
  hit: boolean;
}

interface RouteRule {
  tool: string;
  /** 命中关键词（任一命中即匹配该工具） */
  keywords: string[];
  /** 优先级（数字越大越优先） */
  priority: number;
}

// 按优先级排序的路由规则（combo 联合分析优先级最高，明确联合意图时优先匹配）
const ROUTE_RULES: RouteRule[] = [
  { tool: 'combo_annual_fortune', keywords: ['综合运势', '年度运势', '今年运势', '全年运势', '运势总览', '综合看', '多角度'], priority: 95 },
  { tool: 'combo_decision', keywords: ['三卜', '交叉验证', '综合测算', '多法验证', '帮我决', '该不该', '能否成功'], priority: 95 },
  { tool: 'combo_sanshi', keywords: ['三式', '三式互参', '大六壬+奇门', '六壬奇门梅花', '六壬+奇门'], priority: 96 },
  { tool: 'combo_sanshi_classic', keywords: ['三式合一', '奇门+太乙+大六壬', '太乙+奇门+六壬', '传统三式', '奇门太乙六壬'], priority: 97 },
  { tool: 'combo_daily_wellness', keywords: ['今日养生', '今天养生', '每日养生', '养生建议', '节气养生', '现在适合做什么', '当下养生', '今日调养', '一天养生'], priority: 96 },
  { tool: 'combo_space_time', keywords: ['风水布局', '布局建议', '空间布局', '综合布局', '主卧财位', '办公室布局'], priority: 95 },
  { tool: 'combo_zeri', keywords: ['择日', '择吉', '择吉日', '选日子', '选个好日子', '好日子', '黄道吉日', '开业吉日', '结婚吉日', '搬家吉日', '动土吉日', '找个好日子', '哪天适合', '哪天好'], priority: 96 },
  { tool: 'combo_monthly_fortune', keywords: ['月度运势', '某月运势', '这个月运势', '下个月运势', '本月运势', '月运', '流月运势', '月运势'], priority: 94 },
  { tool: 'dream_interpret', keywords: ['梦见', '做梦', '梦境', '梦到', '解梦', '周公'], priority: 90 },
  { tool: 'analyze_name', keywords: ['姓名', '起名', '取名', '名字', '打分', '改名', '测名'], priority: 85 },
  { tool: 'ziwei_chart', keywords: ['紫微', '紫微斗数', '命盘', '主星', '十二宫', '斗数'], priority: 80 },
  { tool: 'arrange_qimen', keywords: ['奇门', '奇门遁甲', '起局', '排局', '八门', '九星'], priority: 80 },
  { tool: 'liuren_calculate', keywords: ['大六壬', '六壬', '六壬神课', '三传', '四课', '天地盘'], priority: 80 },
  { tool: 'taiyi_calculate', keywords: ['太乙', '太乙神数', '太乙神數', '年计', '月计', '日计', '時計', '积年', '主客算', '太乙局'], priority: 80 },
  { tool: 'huangji_calculate', keywords: ['皇极', '皇極', '皇极经世', '皇極經世', '元会运世', '元會運世', '邵雍', '康节', '正卦', '世卦', '运卦'], priority: 80 },
  { tool: 'xingxiu_daily', keywords: ['二十八宿', '二十八星宿', '星宿', '值宿', '禽星', '四象'], priority: 78 },
  { tool: 'cast_liuyao', keywords: ['六爻', '起卦', '纳甲', '卜卦', '占卦', '铜钱', '摇卦'], priority: 75 },
  { tool: 'cast_meihua', keywords: ['梅花', '梅花易数', '体用', '数字起卦'], priority: 75 },
  { tool: 'calc_yunqi', keywords: ['五运六气', '岁运', '司天', '在泉', '运气', '六气'], priority: 70 },
  { tool: 'calc_xiyong', keywords: ['喜用神', '用神', '喜神', '身强身弱', '强弱'], priority: 65 },
  { tool: 'get_constitution_tendency', keywords: ['体质', '九种体质', '体质倾向', '中医体质'], priority: 60 },
  { tool: 'assess_constitution', keywords: ['体质自评', '体质问卷', '测体质', '体质测试', '我做题测体质', '自测体质'], priority: 62 },
  { tool: 'bazi_calculate', keywords: ['八字', '四柱', '排盘', '命理', '生辰', '算命', '大运', '日主', '五行'], priority: 50 },
  { tool: 'get_almanac', keywords: ['黄历', '每日黄历', '今天宜', '今日宜', '宜忌', '吉时', '老黄历', '万年历'], priority: 55 },
  { tool: 'calc_feixing', keywords: ['飞星', '流年飞星', '九星', '九宫飞星', '玄空', '中宫', '五黄', '财位在哪', '文昌位', '今年风水'], priority: 58 },
  { tool: 'calc_bazhai', keywords: ['八宅', '大游年', '命卦', '东四命', '西四命', '生气方', '天医方', '延年方', '门主灶', '宅卦', '我适合住'], priority: 60 },
  { tool: 'get_daily_rhythm', keywords: ['节气', '经络', '子午流注', '时辰养生', '现在养生', '今日调养', '当令', '生物钟', '几点养'], priority: 52 },
];

/** 从文本提取生辰 */
function extractBirth(text: string): { birth?: Record<string, unknown>; raw?: string } {
  // 匹配 "1990年6月15日12时" 或 "1990-6-15 12时" 或 "1990年6月15日 中午"
  const m = text.match(/(\d{4})\s*[年\-\/.]\s*(\d{1,2})\s*[月\-\/.]\s*(\d{1,2})\s*[日]?\s*(?:[上中下]午)?\s*(?:(\d{1,2})\s*[时:：点])?/);
  if (!m) return {};
  const birth: Record<string, unknown> = {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
  };
  if (m[4]) {
    birth.hour = Number(m[4]);
  }
  // 性别
  if (/男|乾/.test(text)) birth.gender = '男';
  else if (/女|坤/.test(text)) birth.gender = '女';
  return { birth, raw: m[0] };
}

/** 从文本提取年份（用于 calc_yunqi） */
function extractYear(text: string): number | undefined {
  const m = text.match(/(\d{4})\s*年/);
  return m ? Number(m[1]) : undefined;
}

/** 从文本提取姓 + 名 */
function extractName(text: string): { surname?: string; givenName?: string } {
  // 匹配 "张伟" "张三丰" "名字叫张伟" "姓名张伟"
  const m = text.match(/(?:名字叫?|姓名|名叫|叫)\s*([一-龥]{2,4})|([一-龥]{2,4})\s*这个?名字/);
  const name = m?.[1] || m?.[2];
  if (!name) return {};
  // 第一个字为姓，其余为名
  return { surname: name.charAt(0), givenName: name.slice(1) };
}

/** 从文本提取梦象关键词 */
function extractDreamKeyword(text: string): string | undefined {
  // "梦见蛇" "梦见水" "做梦梦到棺材" "梦见蛇是什么意思" → 只取梦象事物，截到"是什么/意思/代表/预示"等停用词
  const m = text.match(/梦[见到]([一-龥]{1,6}?)(?:是什么|意思|代表|预示|说明|怎么了|怎么办|[，。！？]|$)/);
  if (m) return m[1].trim();
  // "解梦 蛇"
  const m2 = text.match(/解梦\s*([一-龥]{1,6})/);
  if (m2) return m2[1];
  return undefined;
}

/** 从文本提取起卦方式偏好 */
function extractLiuyaoMethod(text: string): 'coin' | 'time' | 'manual' | undefined {
  if (/铜钱|摇卦|三枚/.test(text)) return 'coin';
  if (/时间起卦|时间卦/.test(text)) return 'time';
  if (/手动|手动爻|爻值/.test(text)) return 'manual';
  return undefined;
}

/** 从文本提取求测事项 */
function extractQuestion(text: string): string | undefined {
  // 去掉命理关键词后剩下的当作事项
  const cleaned = text.replace(/(?:帮我|请帮|想|问|测|看|查|算|今年|我|的|了|吗|呢|啊|呀|。|，|！|？)/g, '').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 50) : undefined;
}

/** 从文本提取目标月份（1-12）：取所有「M月」中与出生月份不同的，否则取第一个。
 *  避免把生辰「1990年6月15日」里的「6月」误当目标月。 */
function extractTargetMonth(text: string, birthMonth?: number): number | undefined {
  const matches = text.match(/(\d{1,2})\s*月/g);
  if (!matches || matches.length === 0) return undefined;
  const months = matches.map((m) => Number(m.match(/(\d{1,2})/)![1])).filter((n) => n >= 1 && n <= 12);
  if (months.length === 0) return undefined;
  // 优先取与出生月不同的
  const diff = months.filter((m) => m !== birthMonth);
  if (diff.length > 0) return diff[diff.length - 1];
  return months[months.length - 1];
}

/** 从文本提取目标年份：取所有「XXXX年」中与出生年不同的，否则取最后一个。 */
function extractTargetYear(text: string, birthYear?: number): number | undefined {
  const matches = text.match(/(\d{4})\s*年/g);
  if (!matches || matches.length === 0) return undefined;
  const years = matches.map((m) => Number(m.match(/(\d{4})/)![1])).filter((n) => n >= 1900 && n <= 2100);
  if (years.length === 0) return undefined;
  const diff = years.filter((y) => y !== birthYear);
  if (diff.length > 0) return diff[diff.length - 1];
  return years[years.length - 1];
}

/** 从文本提取择日用途（八种） */
function extractZeriPurpose(text: string): string | undefined {
  const map: Array<[string, string[]]> = [
    ['开业', ['开业', '开市', '开张', '新店', '门店开业']],
    ['结婚', ['结婚', '嫁娶', '婚嫁', '办婚礼', '领证']],
    ['搬家', ['搬家', '入宅', '乔迁', '搬新家', '入伙']],
    ['动土', ['动土', '装修', '修造', '开工', '建房', '破土']],
    ['出行', ['出行', '出差', '远行', '旅游', '出门']],
    ['签约', ['签约', '签合同', '合同', '下单', '交易']],
    ['安葬', ['安葬', '下葬', '落葬', '迁坟', '造墓']],
    ['祈福', ['祈福', '还愿', '上香', '祭祀', '法事']],
  ];
  for (const [purpose, kws] of map) {
    if (kws.some((k) => text.includes(k))) return purpose;
  }
  return undefined;
}

/** 从文本提取日期区间（yyyy-mm-dd）。支持「X到Y」「X至Y」「X~Y」。
 *  若用户只给月份（如「2026年8月」），自动展开为该月 1 日至月末。 */
function extractDateRange(text: string): { startDate?: string; endDate?: string } {
  // 两个完整日期
  const m = text.match(/(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*[日]?\s*[到至~—–-]\s*(\d{4})?\s*[-/.年]?\s*(\d{1,2})?\s*[-/.月]?\s*(\d{1,2})?\s*[日]?/);
  if (m) {
    const startYear = Number(m[1]);
    const startMonth = Number(m[2]);
    const startDay = Number(m[3]);
    const endYear = m[4] ? Number(m[4]) : startYear;
    const endMonth = m[5] ? Number(m[5]) : startMonth;
    const endDay = m[6] ? Number(m[6]) : startDay;
    return {
      startDate: `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      endDate: `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    };
  }
  // 单个月份「2026年8月」或「2026-08」——必须带「月」字或纯 YYYY-MM 且后面不跟「-日」，
  // 否则会把生辰「1990年6月15日」里的「1990年6」误当区间。
  const mm = text.match(/(\d{4})\s*[年\-/.]\s*(\d{1,2})\s*月(?!\s*\d{1,2}\s*[日])/);
  if (mm) {
    const y = Number(mm[1]);
    const mo = Number(mm[2]);
    if (mo >= 1 && mo <= 12) {
      const lastDay = new Date(y, mo, 0).getDate();
      return {
        startDate: `${y}-${String(mo).padStart(2, '0')}-01`,
        endDate: `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      };
    }
  }
  return {};
}

/** 从文本提取体质类型（九种体质） */
function extractConstitution(text: string): string | undefined {
  const types = ['平和质', '气虚质', '阳虚质', '阴虚质', '痰湿质', '湿热质', '血瘀质', '气郁质', '特禀质'];
  for (const t of types) {
    if (text.includes(t)) return t;
  }
  return undefined;
}

/**
 * 自然语言意图路由。
 * @param text 用户自然语言输入
 * @returns 路由结果（匹配工具 + 自动填充参数 + 缺参追问）
 */
export function dispatchIntent(text: string): DispatchResult {
  const matched = ROUTE_RULES
    .filter((r) => r.keywords.some((kw) => text.includes(kw)))
    .sort((a, b) => b.priority - a.priority);

  if (matched.length === 0) {
    return {
      tool: null,
      arguments: {},
      missingPrompts: [],
      reason: '未匹配到任何工具。请说明想做的事（如"排八字""解梦""紫微排盘""姓名打分"）。',
      hit: false,
    };
  }

  const tool = matched[0].tool;
  const birth = extractBirth(text);
  const year = extractYear(text);
  const name = extractName(text);
  const dreamKw = extractDreamKeyword(text);
  const method = extractLiuyaoMethod(text);
  const question = extractQuestion(text);
  const zeriPurpose = extractZeriPurpose(text);
  const dateRange = extractDateRange(text);
  const targetMonth = extractTargetMonth(text, birth.birth ? birth.birth.month as number : undefined);
  const targetYearExplicit = extractTargetYear(text, birth.birth ? birth.birth.year as number : undefined);

  // 按工具组装参数
  let args: Record<string, unknown> = {};
  switch (tool) {
    case 'bazi_calculate':
    case 'ziwei_chart':
    case 'arrange_qimen':
    case 'liuren_calculate':
    case 'taiyi_calculate':
    case 'huangji_calculate':
    case 'xingxiu_daily':
      if (birth.birth) args.birth = birth.birth;
      break;
    case 'combo_annual_fortune':
    case 'combo_space_time':
      if (birth.birth) args.birth = birth.birth;
      // targetYear 不自动填（易与出生年混淆），由 AI 据 guidance 追问或用户明确年份时填
      break;
    case 'combo_decision':
    case 'combo_sanshi':
    case 'combo_sanshi_classic':
      if (birth.birth) args.birth = birth.birth;
      if (question) args.question = question;
      break;
    case 'combo_daily_wellness': {
      if (birth.birth) args.birth = birth.birth;
      const constitution = extractConstitution(text);
      if (constitution) args.constitution = constitution;
      break;
    }
    case 'combo_zeri': {
      if (birth.birth) args.birth = birth.birth;
      if (zeriPurpose) args.purpose = zeriPurpose;
      if (dateRange.startDate) args.startDate = dateRange.startDate;
      if (dateRange.endDate) args.endDate = dateRange.endDate;
      break;
    }
    case 'combo_monthly_fortune': {
      if (birth.birth) args.birth = birth.birth;
      if (targetYearExplicit) args.targetYear = targetYearExplicit;
      if (targetMonth) args.targetMonth = targetMonth;
      const c = extractConstitution(text);
      if (c) args.constitution = c;
      break;
    }
    case 'cast_meihua':
      if (birth.birth) args.birth = birth.birth;
      if (method) args.method = method === 'manual' ? 'time' : method; // meihua 只支持 time/number
      if (/数字起卦/.test(text)) {
        const nums = text.match(/(\d+)\D+(\d+)/);
        if (nums) { args.method = 'number'; args.numberA = Number(nums[1]); args.numberB = Number(nums[2]); }
      }
      break;
    case 'cast_liuyao':
      if (birth.birth) args.birth = birth.birth;
      if (method) args.method = method;
      if (question) args.question = question;
      break;
    case 'calc_yunqi':
      if (year) args.year = year;
      break;
    case 'analyze_name':
      if (name.surname) args.surname = name.surname;
      if (name.givenName) args.givenName = name.givenName;
      if (year) args.birthYear = year;
      // 完整生辰（含时辰+性别）时填 birth，启用八字喜用神补强
      if (birth.birth && birth.birth.hour && birth.birth.gender) {
        args.birth = birth.birth;
      }
      break;
    case 'dream_interpret':
      if (dreamKw) args.keyword = dreamKw;
      break;
    case 'calc_xiyong':
    case 'get_constitution_tendency':
      // 需前置工具结果，dispatch 无法自动填
      break;
  }

  // 校验缺参
  const { prompts } = validateToolInput(tool, args);
  const reason = `命中工具 ${tool}（关键词：${matched[0].keywords.filter((k) => text.includes(k)).join('、')}）。` +
    (prompts.length ? `仍缺 ${prompts.length} 个必填参数，需追问用户。` : '参数齐全，可直接调用。');

  return { tool, arguments: args, missingPrompts: prompts, reason, hit: true };
}
