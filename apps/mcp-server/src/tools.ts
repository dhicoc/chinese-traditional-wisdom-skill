/**
 * tools.ts — MCP 工具定义
 *
 * 把 apps/visual/src/legacy 的 10 个 enveloped 引擎各包成一个 MCP 工具。
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
      method: z.enum(['coin', 'time', 'manual']).optional().describe('起卦方式，默认 coin'),
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
    name: 'cast_meihua',
    description: '梅花易数起卦：上下卦、动爻、互卦、变卦、体用生克、吉凶分级、策略指导、错卦综卦、卦德。支持时间起卦与数字起卦。',
    schema: z.object({
      birth: birthSchema,
      method: z.enum(['time', 'number']).optional().describe('起卦方式，默认 time'),
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
    description: '姓名五维评分：五格数理（30%）+ 三才配置（15%）+ 五行平衡（25%）+ 字义五行（20%）+ 生肖契合（10%）。含康熙笔画、字义出处、生肖喜忌。',
    schema: z.object({
      surname: z.string().min(1).describe('姓氏（如「张」）'),
      givenName: z.string().min(1).describe('名（如「伟」）'),
      birthYear: z.number().int().min(1900).max(2100).optional().describe('出生年（用于生肖契合度）'),
    }),
    handler: (i) => calcNameRatingEnveloped(
      (i as { surname: string }).surname,
      (i as { givenName: string }).givenName,
      (i as { birthYear?: number }).birthYear,
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
];
