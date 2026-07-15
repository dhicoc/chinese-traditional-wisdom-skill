/**
 * tools.ts — MCP 工具定义
 *
 * 把 apps/visual/src/legacy 的 22 个 enveloped 引擎各包成一个 MCP 工具。
 * 每个工具：name + description + zod input schema + handler 返回 ToolEnvelope。
 *
 * 需要精确历法的工具（bazi/yunqi/liuyao/meihua）传入 lunar-javascript 的 Solar 入口；
 * Solar 不可用时引擎自动降级为 local-approx（公历近似）。
 */

import { z } from 'zod';
import { Solar } from 'lunar-javascript';

import { searchDreamEnveloped } from '../../visual/src/legacy/envelopeSample';
import { calcXiYongEnveloped, calcNameRatingEnveloped, getConstitutionTendencyEnveloped } from '../../visual/src/legacy/envelopeAdapters';
import { calcMeihuaEnveloped } from '../../visual/src/legacy/meihuaEngine';
import { calcYunqiEnveloped } from '../../visual/src/legacy/yunqiEngine';
import { calcLiuyaoEnveloped } from '../../visual/src/legacy/liuyaoEngine';
import { calcBaziEnveloped } from '../../visual/src/legacy/baziEngine';
import { calcZiweiEnveloped } from '../../visual/src/legacy/ziweiEngine';
import { calcQimenEnveloped } from '../../visual/src/legacy/qimenEngine';
import { calcDaliurenEnveloped } from '../../visual/src/legacy/daliurenEngine';
import { calcXingXiuEnveloped } from '../../visual/src/legacy/xingxiuEngine';
import { calcTaiyiEnveloped } from '../../visual/src/legacy/taiyiEngine';
import { calcHuangjiEnveloped } from '../../visual/src/legacy/huangjiEngine';
import { calcAnnualFortuneCombo, calcDecisionCombo, calcSpaceTimeCombo, calcSanshiCombo, calcSanshiClassicCombo, calcDailyWellnessCombo, calcZeriCombo, calcMonthlyFortuneCombo } from '../../visual/src/legacy/comboEngine';
import { calcMarriageCombo } from '../../visual/src/legacy/marriageCombo';

/** lunar-javascript Solar 入口（供精确历法引擎使用）。加载失败返回 null，引擎自动降级近似。 */
const solarEntry: unknown = (() => {
  try {
    return Solar;
  } catch {
    return null;
  }
})();

// ─── 通用输入 schema 片段 ───

const birthSchema = z.object({
  year: z.number().int().min(1900).max(2100).describe('公历年'),
  month: z.number().int().min(1).max(12).describe('公历月'),
  day: z.number().int().min(1).max(31).describe('公历日'),
  hour: z.number().int().min(0).max(23).describe('公历时（0-23）'),
  minute: z.number().int().min(0).max(59).optional().describe('分钟（可选）'),
  gender: z.enum(['男', '女']).describe('性别'),
});

// ─── 工具定义 ───

export interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  handler: (input: unknown) => unknown;
}

export const TOOLS: ToolDef[] = [
  {
    name: 'bazi_calculate',
    description: '八字排盘：四柱（年月日时）、日主、五行分布、十神、藏干、大运。传入生辰得完整命局。精确历法需 lunar-javascript（已内置）。',
    schema: z.object({ birth: birthSchema }),
    handler: (i) => calcBaziEnveloped({ birth: (i as { birth: unknown }).birth as never, solar: solarEntry }),
  },
  {
    name: 'ziwei_chart',
    description: '紫微斗数排盘：十二宫、十四主星、四化、庙旺利得。基于 iztro v2.5.8 真实排盘。',
    schema: z.object({ birth: birthSchema }),
    handler: (i) => calcZiweiEnveloped({ birth: (i as { birth: unknown }).birth as never }),
  },
  {
    name: 'cast_liuyao',
    description: '六爻起卦（京房八宫纳甲）：纳甲、六亲、六神、世应、用神、变卦、空亡、旺衰、伏神、身爻。支持铜钱法/时间起卦/手动爻值。',
    schema: z.object({
      birth: birthSchema,
      method: z.enum(['coin', 'time', 'manual', 'yarrow']).optional().describe('起卦方式：coin铜钱/time时间/manual手动/yarrow揲蓍法，默认 coin'),
      yaoValues: z.string().regex(/^[6-9]{6}$/).optional().describe('method=manual 时传 6 位 6-9 字符串（初爻到上爻）'),
      question: z.string().optional().describe('求测事项（用于自动选取用神）'),
      seed: z.number().int().optional().describe('铜钱法随机种子（同 seed 同结果）'),
    }),
    handler: (i) => calcLiuyaoEnveloped({ ...(i as Record<string, unknown>), solar: solarEntry } as never),
  },
  {
    name: 'arrange_qimen',
    description: '奇门遁甲排盘（时家奇门，3meta v2.6.0）：三奇六仪、九星、八门、八神、值符值使、空亡、马星、旺相、十二长生、六仪击刑、十干生克、吉凶格局自动检测。',
    schema: z.object({
      birth: birthSchema,
      question: z.string().optional().describe('求测事项'),
    }),
    handler: (i) => calcQimenEnveloped({ ...(i as Record<string, unknown>) } as never),
  },
  {
    name: 'liuren_calculate',
    description: '大六壬排盘：天地盘、四课、三传（九宗门贼克/比用/涉害/遥克/昴星/八专/伏吟/返吟）、神煞、格局。传统三式之一，擅长事件细节与应期推算。',
    schema: z.object({
      birth: birthSchema,
    }),
    handler: (i) => calcDaliurenEnveloped({ birth: (i as { birth: unknown }).birth as never, solar: solarEntry }),
  },
  {
    name: 'xingxiu_daily',
    description: '二十八星宿每日值宿查询：当日值宿、禽星全称、四象分组、五行七曜、吉凶宜忌、歌诀。传统择吉与天文历法基础。',
    schema: z.object({
      birth: birthSchema,
    }),
    handler: (i) => calcXingXiuEnveloped({ birth: (i as { birth: unknown }).birth as never, solar: solarEntry }),
  },
  {
    name: 'taiyi_calculate',
    description: '太乙神数排盘：太乙积年、局数（年/月/日/时计）、太乙落宫、文昌始击定目、主客算与主客将、四神天乙地乙直符、君基臣基民基、五福大游小游、八门分布、格局（掩迫关囚击格对提挟）。传统三式之首，擅推天文异象、国运人事、事件吉凶与应期。',
    schema: z.object({
      birth: birthSchema,
      jiStyle: z.enum(['0', '1', '2', '3', '4']).optional().describe('太乙计式：0年计/1月计/2日计/3時計/4分计，默认年计'),
      acumYear: z.enum(['0', '1', '2', '3']).optional().describe('积年法：0统宗/1金镜/2淘金歌/3太乙局，默认统宗'),
    }),
    handler: (i) => calcTaiyiEnveloped({
      birth: (i as { birth: unknown }).birth as never,
      jiStyle: ((i as { jiStyle?: string }).jiStyle ?? '0') as never,
      acumYear: ((i as { acumYear?: string }).acumYear ?? '0') as never,
      solar: solarEntry,
    }),
  },
  {
    name: 'huangji_calculate',
    description: '皇极经世排盘：邵雍元会运世宇宙周期定位 + 九卦配置（正卦/运卦/世卦/旬卦/年卦/月卦/日卦/时卦/分卦）。积年67017+年分解会/运/世，正卦主一运（360年）大势，世卦主一世（30年）气数。长期/宏观预测视角，与太乙同属高端神数。历法复用lunar-javascript真实干支农历。',
    schema: z.object({
      birth: birthSchema,
    }),
    handler: (i) => calcHuangjiEnveloped({
      birth: (i as { birth: unknown }).birth as never,
      solar: solarEntry,
    }),
  },
  {
    name: 'cast_meihua',
    description: '梅花易数起卦：上下卦、动爻、互卦、变卦、体用生克、吉凶分级、策略指导、错卦综卦、卦德。支持时间起卦与数字起卦。',
    schema: z.object({
      birth: birthSchema,
      method: z.enum(['time', 'number', 'yarrow']).optional().describe('起卦方式：time时间/number数字/yarrow揲蓍法，默认 time'),
      numberA: z.number().int().optional().describe('method=number 时的第一个数字'),
      numberB: z.number().int().optional().describe('method=number 时的第二个数字'),
    }),
    handler: (i) => calcMeihuaEnveloped({ ...(i as Record<string, unknown>), solar: solarEntry } as never),
  },
  {
    name: 'calc_yunqi',
    description: '五运六气推算：岁运、司天在泉、客气六步、客主加临、疾病倾向。精确历法按大寒定年（已内置 lunar-javascript）。',
    schema: z.object({
      year: z.number().int().min(1900).max(2100).describe('公历年'),
      birthMonth: z.number().int().min(1).max(12).optional().describe('生辰月（大寒定年用，判断在大寒前还是后）'),
      birthDay: z.number().int().min(1).max(31).optional().describe('生辰日'),
      currentMonth: z.number().int().min(1).max(12).optional().describe('当前月（1-12，用于当前客气步；不传用系统当前月）'),
    }),
    handler: (i) => calcYunqiEnveloped({ ...(i as Record<string, unknown>), solar: solarEntry } as never),
  },
  {
    name: 'analyze_name',
    description: '姓名五维评分：五格数理（30%）+ 三才配置（15%）+ 五行平衡（25%）+ 字义五行（20%）+ 命理契合（10%）。含康熙笔画、字义出处、生肖喜忌。若提供完整生辰（birth），命理契合维度叠加八字喜用神补强评分（名字字义五行是否补益用神）。',
    schema: z.object({
      surname: z.string().min(1).describe('姓氏（如「张」）'),
      givenName: z.string().min(1).describe('名（如「伟」）'),
      birthYear: z.number().int().min(1900).max(2100).optional().describe('出生年（用于生肖契合度）'),
      birth: birthSchema.optional().describe('完整生辰（年月日时+性别），提供后命理契合维度叠加八字喜用神补强评分'),
    }),
    handler: (i) => calcNameRatingEnveloped(
      (i as { surname: string }).surname,
      (i as { givenName: string }).givenName,
      (i as { birthYear?: number }).birthYear,
      (i as { birth?: { year: number; month: number; day: number; hour: number; minute?: number; gender: string } }).birth,
      solarEntry,
    ),
  },
  {
    name: 'calc_xiyong',
    description: '喜用神推算：日主强弱（身强/身弱/平衡）、同类异类、喜用神五行。需先有八字日主五行与五行计数（可由 bazi_calculate 取得）。',
    schema: z.object({
      dayMasterWuxing: z.enum(['木', '火', '土', '金', '水']).describe('日主五行'),
      elements: z.object({
        木: z.number(), 火: z.number(), 土: z.number(), 金: z.number(), 水: z.number(),
      }).describe('五行计数 {木,火,土,金,水}'),
    }),
    handler: (i) => calcXiYongEnveloped(
      (i as { dayMasterWuxing: string }).dayMasterWuxing,
      (i as { elements: Record<string, number> }).elements,
    ),
  },
  {
    name: 'get_constitution_tendency',
    description: '五运六气体质倾向参考：根据岁运与司天推算体质偏向（九种体质）。辅助参考，不替代问卷。需先有五运六气结果（可由 calc_yunqi 取得 dayun/sitian/zaquan）。',
    schema: z.object({
      wuyun: z.object({ dayun: z.string() }).optional(),
      liuqi: z.object({ sitian: z.string(), zaquan: z.string() }).optional(),
    }),
    handler: (i) => getConstitutionTendencyEnveloped(i as never),
  },
  {
    name: 'dream_interpret',
    description: '周公解梦：按梦象关键词查询吉凶寓意。含现代解读（9548 条）与原版古文断语（952 条）。可指定是否使用全量库。',
    schema: z.object({
      keyword: z.string().min(1).describe('梦象关键词（如「蛇」「水」「棺材」「结婚」）'),
      useFull: z.boolean().optional().describe('是否使用全量库（9548条，需加载；默认 false 用精选 137 条）'),
    }),
    handler: (i) => searchDreamEnveloped(
      (i as { keyword: string }).keyword,
      (i as { useFull?: boolean }).useFull ?? false,
    ),
  },
  // ─── 跨系统联合分析（ROADMAP 功能层增强 Step 1）───
  {
    name: 'combo_annual_fortune',
    description: '年度综合运势联合分析：八字（大运/日主/喜用）+ 五运六气（年运）+ 奇门年盘 + 命卦方位。聚合多系统得年度运势定调 + 一致性检验 + 方位建议。',
    schema: z.object({
      birth: birthSchema,
      targetYear: z.number().int().min(1900).max(2100).optional().describe('欲测年份（默认用出生年）'),
      currentMonth: z.number().int().min(1).max(12).optional().describe('当前月（五运六气用，不传用系统月）'),
    }),
    handler: (i) => calcAnnualFortuneCombo({
      birth: (i as { birth: unknown }).birth as never,
      targetYear: (i as { targetYear?: number }).targetYear,
      currentMonth: (i as { currentMonth?: number }).currentMonth,
      solar: solarEntry,
    }),
  },
  {
    name: 'combo_decision',
    description: '事件决策联合分析（三卜交叉验证）：六爻 + 梅花易数 + 奇门。三卜结论一致→高置信；两同一异→以六爻为主。需提供求测事项。',
    schema: z.object({
      birth: birthSchema,
      question: z.string().min(1).describe('求测事项（如"今年适合换工作吗"）'),
      seed: z.number().int().optional().describe('铜钱法随机种子（可选，同 seed 同结果）'),
    }),
    handler: (i) => calcDecisionCombo({
      birth: (i as { birth: unknown }).birth as never,
      question: (i as { question: string }).question,
      seed: (i as { seed?: number }).seed,
      solar: solarEntry,
    }),
  },
  {
    name: 'combo_space_time',
    description: '空间+时间联合分析：飞星年盘 + 八宅命卦吉方 + 奇门吉门方位。推算某年最佳布局方位（主卧/财位/凶位规避）。',
    schema: z.object({
      birth: birthSchema,
      targetYear: z.number().int().min(1900).max(2100).optional().describe('欲测年份（默认用出生年）'),
      facing: z.string().optional().describe('房屋朝向（可选，八宅宅卦用）'),
    }),
    handler: (i) => calcSpaceTimeCombo({
      birth: (i as { birth: unknown }).birth as never,
      targetYear: (i as { targetYear?: number }).targetYear,
      facing: (i as { facing?: string }).facing,
      solar: solarEntry,
    }),
  },
  {
    name: 'combo_sanshi',
    description: '三式互参联合分析：大六壬 + 奇门遁甲 + 梅花易数。传统三式交叉验证——大六壬主三传四课（事态轨迹+应期），奇门主八门九星（方位时机），梅花主体用生克（快速判断）。需提供求测事项。',
    schema: z.object({
      birth: birthSchema,
      question: z.string().min(1).describe('求测事项'),
    }),
    handler: (i) => calcSanshiCombo({
      birth: (i as { birth: unknown }).birth as never,
      question: (i as { question: string }).question,
      solar: solarEntry,
    }),
  },
  {
    name: 'combo_sanshi_classic',
    description: '三式合一联合分析：奇门遁甲 + 太乙神数 + 大六壬（真正的传统三式）。奇门主八门九星（方位时机），太乙主主客算与格局（吉凶胜负），大六壬主三传四课（事态轨迹+应期）。三式交叉验证某事的吉凶、主客胜负、应期与方位。需提供求测事项。',
    schema: z.object({
      birth: birthSchema,
      question: z.string().min(1).describe('求测事项'),
    }),
    handler: (i) => calcSanshiClassicCombo({
      birth: (i as { birth: unknown }).birth as never,
      question: (i as { question: string }).question,
      solar: solarEntry,
    }),
  },
  {
    name: 'combo_daily_wellness',
    description: '今日养生建议联合分析：体质 + 24节气 + 子午流注时辰经络 + 太岁/飞星方位。把命理排盘延伸到日常养生决策，形成命理+体质+时空养生闭环。体质优先用问卷结果（constitution 入参，如「气虚质」），否则按出生年五运六气倾向推断。输出节气饮食/起居/运动/穴位 + 体质针对性加减 + 当令时辰养生 + 方位借力。可传入 now 指定日期时辰。',
    schema: z.object({
      birth: birthSchema,
      constitution: z.string().optional().describe('体质类型（气虚质/阳虚质/阴虚质/痰湿质/湿热质/血瘀质/气郁质/特禀质/平和质，来自体质问卷；不传则按五运六气倾向推断）'),
      now: z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        day: z.number().int().min(1).max(31),
        hour: z.number().int().min(0).max(23),
      }).optional().describe('当前日期时辰（不传用系统当前时间）'),
      targetYear: z.number().int().min(1900).max(2100).optional().describe('方位推算年份（太岁/飞星，默认取 now 或当前年）'),
    }),
    handler: (i) => calcDailyWellnessCombo({
      birth: (i as { birth: unknown }).birth as never,
      constitution: (i as { constitution?: string }).constitution,
      now: (i as { now?: { year: number; month: number; day: number; hour: number } }).now,
      targetYear: (i as { targetYear?: number }).targetYear,
      solar: solarEntry,
    }),
  },
  {
    name: 'combo_zeri',
    description: '综合择日：在给定公历日期区间内，按用途（开业/结婚/搬家/动土/出行/签约/安葬/祈福）筛选吉日。逐日取 lunar-javascript 真实黄历宜忌+神煞+吉神+冲煞+时辰吉凶，叠加本年太岁/三煞/五黄凶方与命卦吉方，淘汰忌日/冲命主/犯年煞者，按评分排序返回 Top-N 吉日+理由+吉时+方位建议。用途为动土/安葬时自动剔除犯太岁岁破方位之日。',
    schema: z.object({
      birth: birthSchema,
      purpose: z.enum(['开业', '结婚', '搬家', '动土', '出行', '签约', '安葬', '祈福']).describe('择日用途'),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('区间起（yyyy-mm-dd，含）'),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('区间止（yyyy-mm-dd，含）'),
      targetYear: z.number().int().min(1900).max(2100).optional().describe('太岁/飞星推算年份（默认取 startDate 年）'),
      topN: z.number().int().min(1).max(20).optional().describe('返回前 N 个吉日（默认 5）'),
    }),
    handler: (i) => calcZeriCombo({
      birth: (i as { birth: unknown }).birth as never,
      purpose: (i as { purpose: string }).purpose as never,
      startDate: (i as { startDate: string }).startDate,
      endDate: (i as { endDate: string }).endDate,
      targetYear: (i as { targetYear?: number }).targetYear,
      topN: (i as { topN?: number }).topN,
      solar: solarEntry,
    }),
  },
  {
    name: 'combo_monthly_fortune',
    description: '月度运势切片：流月干支 + 五运六气客气步 + 节气调养 + 紫微流月。把年度运势细化到月，形成年-月两级运势。流月干支取 lunar-javascript 月柱（月支冲命主生肖→凶倾向），五运六气取该月客气步，节气调养取该月所处节气+体质针对性加减，紫微流月取 iztro 流月四化（化忌入命→凶，化禄入命→吉）。输出整合结论+四维度+本月建议。',
    schema: z.object({
      birth: birthSchema,
      targetYear: z.number().int().min(1900).max(2100).describe('欲测年份'),
      targetMonth: z.number().int().min(1).max(12).describe('欲测月份（1-12）'),
      constitution: z.string().optional().describe('体质类型（节气调养针对性加减；不传则按通用节气调养）'),
    }),
    handler: (i) => calcMonthlyFortuneCombo({
      birth: (i as { birth: unknown }).birth as never,
      targetYear: (i as { targetYear: number }).targetYear,
      targetMonth: (i as { targetMonth: number }).targetMonth,
      constitution: (i as { constitution?: string }).constitution,
      solar: solarEntry,
    }),
  },
  {
    name: 'combo_marriage',
    description: '合婚/配对分析：输入双方出生信息，整合八字日柱冲合（六冲/六合/三合/相害/相刑/天干五合相冲）、用神互补、紫微命宫对照、姓名匹配（双方姓名五行+五格）、婚房/办公风水方位（双方命卦东四西四宅）、吉日推荐（zeri 嫁娶/开业）。适配婚恋/合伙/合作三类关系。输出综合契合度+五行互补度+逐柱冲合扫描+紫微对照+姓名匹配+风水建议+吉日+四层报告。',
    schema: z.object({
      personA: z.object({
        birth: birthSchema,
        surname: z.string().optional().describe('甲方姓氏（可选，用于姓名匹配）'),
        givenName: z.string().optional().describe('甲方名字（可选）'),
        label: z.string().optional().describe('称谓，如男方/甲方'),
      }),
      personB: z.object({
        birth: birthSchema,
        surname: z.string().optional().describe('乙方姓氏（可选）'),
        givenName: z.string().optional().describe('乙方名字（可选）'),
        label: z.string().optional().describe('称谓，如女方/乙方'),
      }),
      scene: z.enum(['婚恋', '合伙', '合作']).optional().describe('关系类型（默认婚恋）'),
      targetYear: z.number().int().min(1900).max(2100).optional().describe('择吉日年份（默认双方出生较大年）'),
    }),
    handler: (i) => calcMarriageCombo({
      personA: {
        birth: (i as { personA: { birth: unknown } }).personA.birth as never,
        surname: (i as { personA: { surname?: string } }).personA.surname,
        givenName: (i as { personA: { givenName?: string } }).personA.givenName,
        label: (i as { personA: { label?: string } }).personA.label,
        solar: solarEntry,
      },
      personB: {
        birth: (i as { personB: { birth: unknown } }).personB.birth as never,
        surname: (i as { personB: { surname?: string } }).personB.surname,
        givenName: (i as { personB: { givenName?: string } }).personB.givenName,
        label: (i as { personB: { label?: string } }).personB.label,
      },
      scene: (i as { scene?: '婚恋' | '合伙' | '合作' }).scene,
      targetYear: (i as { targetYear?: number }).targetYear,
    }),
  },
];
