/**
 * tools.ts — MCP 工具定义
 *
 * 把 apps/visual/src/legacy 的 25 个 enveloped 引擎各包成一个 MCP 工具。
 * 每个工具：name + description + zod input schema + handler 返回 ToolEnvelope。
 *
 * 需要精确历法的工具（bazi/yunqi/liuyao/meihua）传入 lunar-javascript 的 Solar 入口；
 * Solar 不可用时引擎自动降级为 local-approx（公历近似）。
 */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { TrueSolarTimeResolution } from '../../visual/src/legacy/trueSolarTime';
import { registerBaziPresentation } from './baziClaimVerifier.js';
import { registerBazhaiPresentation } from './bazhaiClaimVerifier.js';
import { registerCalendarPresentation } from './calendarClaimVerifier.js';
import { registerFeixingPresentation } from './feixingClaimVerifier.js';
import { registerZiweiPresentation } from './ziweiClaimVerifier.js';

function lazyModule<T>(load: () => Promise<T>): () => Promise<T> {
  let modulePromise: Promise<T> | undefined;
  return () => modulePromise ??= load();
}

const loadSolar = lazyModule(() => import('lunar-typescript').then(({ Solar }) => Solar).catch(() => null));
const loadDream = lazyModule(() => import('../../visual/src/legacy/envelopeSample'));
const loadEnvelopeAdapters = lazyModule(() => import('../../visual/src/legacy/envelopeAdapters'));
const loadMeihua = lazyModule(() => import('../../visual/src/legacy/meihuaEngine'));
const loadYunqi = lazyModule(() => import('../../visual/src/legacy/yunqiEngine'));
const loadLiuyao = lazyModule(() => import('../../visual/src/legacy/liuyaoEngine'));
const loadBazi = lazyModule(() => import('../../visual/src/legacy/baziEngine'));
const loadZiwei = lazyModule(() => import('../../visual/src/legacy/ziweiEngine'));
const loadQimen = lazyModule(() => import('../../visual/src/legacy/qimenEngine'));
const loadDaliuren = lazyModule(() => import('../../visual/src/legacy/daliurenEngine'));
const loadXingxiu = lazyModule(() => import('../../visual/src/legacy/xingxiuEngine'));
const loadTaiyi = lazyModule(() => import('../../visual/src/legacy/taiyiEngine'));
const loadHuangji = lazyModule(() => import('../../visual/src/legacy/huangjiEngine'));
const loadCombo = lazyModule(() => import('../../visual/src/legacy/comboEngine'));
const loadMarriageCombo = lazyModule(() => import('../../visual/src/legacy/marriageCombo'));
const loadCezi = lazyModule(() => import('../../visual/src/legacy/ceziEngine'));
const loadChenguz = lazyModule(() => import('../../visual/src/legacy/chenguzEngine'));
const loadAlmanac = lazyModule(() => import('../../visual/src/legacy/almanacData'));
const loadFeixing = lazyModule(() => import('../../visual/src/legacy/feixingEngine'));
const loadBazhai = lazyModule(() => import('../../visual/src/legacy/bazhaiEngine'));
const loadRhythm = lazyModule(() => import('../../visual/src/legacy/rhythmEngine'));
const loadConstitution = lazyModule(() => import('../../visual/src/legacy/constitutionAssessEngine'));
const loadTrueSolarTime = lazyModule(() => import('../../visual/src/legacy/trueSolarTime'));

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
  handler: (input: unknown) => unknown | Promise<unknown>;
}

type BaziTimeBasis = 'true-solar-verified' | 'civil-unverified';

type BaziTimeContext = {
  timeBasis: BaziTimeBasis;
  calibrationToken?: string;
  civilFallbackConfirmed?: true;
};

interface TrueSolarCalibration {
  resolution: TrueSolarTimeResolution;
}

const baziTimeContextSchema = z.object({
  timeBasis: z.enum(['true-solar-verified', 'civil-unverified']),
  calibrationToken: z.string().uuid().optional().describe('resolve_true_solar_time 在当前 MCP 进程签发的真太阳时校准令牌'),
  civilFallbackConfirmed: z.literal(true).optional().describe('民用时间降级须为 true，表示用户已确认未完成真太阳时复核'),
});

const trueSolarCalibrations = new Map<string, TrueSolarCalibration>();

function assertSameBirth(left: Record<string, unknown>, right: object) {
  const verifiedBirth = right as Record<string, unknown>;
  for (const field of ['year', 'month', 'day', 'hour', 'minute', 'gender']) {
    if ((left[field] ?? 0) !== (verifiedBirth[field] ?? 0)) {
      throw new Error(`校准令牌对应的 trueSolarBirth 与 birth.${field} 不一致。请使用 resolve_true_solar_time 返回的 trueSolarBirth 原样调用。`);
    }
  }
}

function resolveBaziTimeSource(birth: Record<string, unknown>, context: BaziTimeContext) {
  if (context.timeBasis === 'true-solar-verified') {
    if (!context.calibrationToken) {
      throw new Error('timeBasis=true-solar-verified 必须提供 resolve_true_solar_time 签发的 calibrationToken。');
    }
    const calibration = trueSolarCalibrations.get(context.calibrationToken);
    if (!calibration) {
      throw new Error('calibrationToken 无效、已失效或不属于当前 MCP 进程。请重新调用 resolve_true_solar_time。');
    }
    assertSameBirth(birth, calibration.resolution.trueSolarBirth);
    return { timeBasis: context.timeBasis, verification: calibration.resolution };
  }

  if (context.civilFallbackConfirmed !== true) {
    throw new Error('timeBasis=civil-unverified 必须显式传 civilFallbackConfirmed=true，并向用户说明“未完成真太阳时复核”。');
  }
  return { timeBasis: context.timeBasis, verification: null, notice: '未完成真太阳时复核' };
}

function withBaziTimeSource(result: unknown, timeSource: ReturnType<typeof resolveBaziTimeSource>) {
  const envelope = result as {
    data: Record<string, unknown>;
    result_meta?: { calculationConfig?: Record<string, unknown> };
  };
  const snapshot = envelope.data.export_snapshot as { summary: string; sections: Array<{ heading: string; body: string }> } | undefined;
  const notice = 'notice' in timeSource ? '未完成真太阳时复核：本次涉及八字的部分按用户确认的民用出生记录计算。' : '已核验真太阳时：本次涉及八字的部分使用经校准令牌验证的 trueSolarBirth 计算。';

  return {
    ...envelope,
    data: {
      ...envelope.data,
      timeSource,
      export_snapshot: snapshot ? {
        ...snapshot,
        summary: 'notice' in timeSource ? `未完成真太阳时复核；${snapshot.summary}` : snapshot.summary,
        sections: [...snapshot.sections, { heading: '八字时间来源', body: notice }],
      } : snapshot,
    },
    result_meta: envelope.result_meta ? {
      ...envelope.result_meta,
      calculationConfig: {
        ...envelope.result_meta.calculationConfig,
        timeBasis: timeSource.timeBasis,
      },
    } : undefined,
  };
}

export const TOOLS: ToolDef[] = [
  {
    name: 'resolve_true_solar_time',
    description: '真太阳时校准：对 Agent 已核验的出生地点经度、IANA 时区与历史 UTC 偏移进行确定性计算，返回经度校正、均时差、真太阳时、跨时辰/日期/子初边界与证据。不会解析地点、猜测历史时区或夏令时；调用前必须核验并提供 utcOffsetEvidence。仅供八字排盘预处理使用。',
    schema: z.object({
      birth: birthSchema,
      location: z.object({
        displayName: z.string().min(1).describe('经 Agent 核验后的出生地点名称'),
        longitude: z.number().min(-180).max(180).describe('经 Agent 核验后的地理经度，东经为正'),
        ianaTimeZone: z.string().min(1).describe('经 Agent 核验后的 IANA 时区，如 America/New_York'),
        utcOffsetMinutes: z.number().int().min(-720).max(840).describe('出生时当地实际 UTC 偏移分钟数，已包含历史夏令时'),
        utcOffsetEvidence: z.string().min(1).describe('历史时区与夏令时核验依据；禁止仅凭模型记忆填写'),
      }),
    }),
    handler: async (i) => {
      const input = i as {
        birth: { year: number; month: number; day: number; hour: number; minute?: number; gender: '男' | '女' };
        location: { displayName: string; longitude: number; ianaTimeZone: string; utcOffsetMinutes: number; utcOffsetEvidence: string };
      };
      const { resolveTrueSolarTime } = await loadTrueSolarTime();
      const resolution = resolveTrueSolarTime({ ...input.birth, minute: input.birth.minute ?? 0, useExactCalendar: true }, input.location);
      const calibrationToken = randomUUID();
      trueSolarCalibrations.set(calibrationToken, { resolution });
      return { ...resolution, calibrationToken };
    },
  },
  {
    name: 'bazi_calculate',
    description: '八字排盘：必须声明时间来源。timeBasis=true-solar-verified 时须先调用 resolve_true_solar_time，并传回同一 MCP 进程签发的 calibrationToken 与原样 trueSolarBirth；timeBasis=civil-unverified 时须显式确认 civilFallbackConfirmed=true，结果将标注“未完成真太阳时复核”。',
    schema: z.object({
      birth: birthSchema,
      timeBasis: z.enum(['true-solar-verified', 'civil-unverified']).describe('排盘时间来源：已核验真太阳时或已确认民用时间降级'),
      calibrationToken: z.string().uuid().optional().describe('resolve_true_solar_time 在当前 MCP 进程签发的真太阳时校准令牌'),
      civilFallbackConfirmed: z.literal(true).optional().describe('timeBasis=civil-unverified 时必须为 true，表示用户知情确认未完成真太阳时复核'),
      shenShaTrineSource: z.enum(['year', 'day']).optional().describe('神煞三合局查取口径：year 按年支查（传统主流，默认）/ day 按日支查'),
    }),
    handler: async (i) => {
      const input = i as {
        birth: Record<string, unknown>;
        timeBasis: BaziTimeBasis;
        calibrationToken?: string;
        civilFallbackConfirmed?: true;
        shenShaTrineSource?: 'year' | 'day';
      };
      const timeSource = resolveBaziTimeSource(input.birth, input);
      const [{ calcBaziEnveloped }, solar] = await Promise.all([loadBazi(), loadSolar()]);

      const envelope = calcBaziEnveloped({
        birth: input.birth as never,
        solar: solar as never,
        shenShaTrineSource: input.shenShaTrineSource,
      });
      const data = envelope.data as unknown as Record<string, unknown>;
      const exportSnapshot = data.export_snapshot as { summary: string; sections: Array<{ heading: string; body: string }> };
      const timeSourceSection = input.timeBasis === 'true-solar-verified'
        ? { heading: '时间来源', body: '已核验真太阳时：使用 resolve_true_solar_time 返回并经校准令牌验证的 trueSolarBirth 排盘。' }
        : { heading: '时间来源', body: '未完成真太阳时复核：本次按用户确认的民用出生记录排盘。' };

      const presentationToken = randomUUID();
      registerBaziPresentation(envelope.data, presentationToken);

      return {
        ...envelope,
        data: {
          ...data,
          timeSource,
          export_snapshot: {
            ...exportSnapshot,
            summary: input.timeBasis === 'civil-unverified'
              ? `未完成真太阳时复核；${exportSnapshot.summary}`
              : exportSnapshot.summary,
            sections: [...exportSnapshot.sections, timeSourceSection],
          },
        },
        result_meta: envelope.result_meta ? {
          ...envelope.result_meta,
          calculationConfig: {
            ...envelope.result_meta.calculationConfig,
            timeBasis: timeSource.timeBasis,
          },
          presentationToken,
        } : undefined,
      };
    },
  },
  {
    name: 'ziwei_chart',
    description: '紫微斗数排盘：十二宫、十四主星、四化、庙旺利得。可选指定动态层的目标年月；不传时按当前年月查询。基于 iztro v2.5.8 真实排盘。',
    schema: z.object({
      birth: birthSchema,
      transit: z.object({
        year: z.number().int().min(1900).max(2100).describe('动态层目标公历年'),
        month: z.number().int().min(1).max(12).describe('动态层目标月份'),
      }).optional(),
    }),
    handler: async (i) => {
      const input = i as { birth: never; transit?: { year: number; month: number } };
      const { calcZiweiEnveloped } = await loadZiwei();
      const envelope = calcZiweiEnveloped(input);
      if (!envelope.ok) return envelope;

      const presentationToken = randomUUID();
      registerZiweiPresentation(envelope.data, input, presentationToken);
      return {
        ...envelope,
        result_meta: {
          ...envelope.result_meta,
          presentationToken,
        },
      };
    },
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
    handler: async (i) => {
      const [{ calcLiuyaoEnveloped }, solar] = await Promise.all([loadLiuyao(), loadSolar()]);
      return calcLiuyaoEnveloped({ ...(i as Record<string, unknown>), solar } as never);
    },
  },
  {
    name: 'arrange_qimen',
    description: '奇门遁甲排盘（时家奇门，3meta v2.6.0）：三奇六仪、九星、八门、八神、值符值使、空亡、马星、旺相、十二长生、六仪击刑、十干生克、吉凶格局自动检测。',
    schema: z.object({
      birth: birthSchema,
      question: z.string().optional().describe('求测事项'),
    }),
    handler: async (i) => {
      const { calcQimenEnveloped } = await loadQimen();
      return calcQimenEnveloped({ ...(i as Record<string, unknown>) } as never);
    },
  },
  {
    name: 'liuren_calculate',
    description: '大六壬排盘：天地盘、四课、三传（九宗门贼克/比用/涉害/遥克/昴星/八专/伏吟/返吟）、神煞、格局。传统三式之一，擅长事件细节与应期推算。',
    schema: z.object({
      birth: birthSchema,
    }),
    handler: async (i) => {
      const [{ calcDaliurenEnveloped }, solar] = await Promise.all([loadDaliuren(), loadSolar()]);
      return calcDaliurenEnveloped({ birth: (i as { birth: unknown }).birth as never, solar: solar as never });
    },
  },
  {
    name: 'xingxiu_daily',
    description: '二十八星宿每日值宿查询：当日值宿、禽星全称、四象分组、五行七曜、吉凶宜忌、歌诀。传 queryDate 可查询并复现指定日期的值宿。传统择吉与天文历法基础。',
    schema: z.object({
      birth: birthSchema,
      queryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('显式查询日 yyyy-mm-dd；不传默认系统当天，且不签发呈现校验凭证'),
    }),
    handler: async (i) => {
      const [{ calcXingXiuEnveloped }, solar] = await Promise.all([loadXingxiu(), loadSolar()]);
      const input = i as { birth: unknown; queryDate?: string };
      const envelope = calcXingXiuEnveloped({ birth: input.birth as never, queryDate: input.queryDate, solar: solar as never });
      if (!envelope.ok || !input.queryDate) return envelope;

      const presentationToken = randomUUID();
      registerCalendarPresentation('xingxiu', envelope.data, presentationToken);
      return {
        ...envelope,
        result_meta: { ...envelope.result_meta, presentationToken },
      };
    },
  },
  {
    name: 'taiyi_calculate',
    description: '太乙神数排盘：太乙积年、局数（年/月/日/时计）、太乙落宫、文昌始击定目、主客算与主客将、四神天乙地乙直符、君基臣基民基、五福大游小游、八门分布、格局（掩迫关囚击格对提挟）。传统三式之首，擅推天文异象、国运人事、事件吉凶与应期。',
    schema: z.object({
      birth: birthSchema,
      jiStyle: z.enum(['0', '1', '2', '3', '4']).optional().describe('太乙计式：0年计/1月计/2日计/3時計/4分计，默认年计'),
      acumYear: z.enum(['0', '1', '2', '3']).optional().describe('积年法：0统宗/1金镜/2淘金歌/3太乙局，默认统宗'),
    }),
    handler: async (i) => {
      const [{ calcTaiyiEnveloped }, solar] = await Promise.all([loadTaiyi(), loadSolar()]);
      return calcTaiyiEnveloped({
        birth: (i as { birth: unknown }).birth as never,
        jiStyle: ((i as { jiStyle?: string }).jiStyle ?? '0') as never,
        acumYear: ((i as { acumYear?: string }).acumYear ?? '0') as never,
        solar: solar as never,
      });
    },
  },
  {
    name: 'huangji_calculate',
    description: '皇极经世排盘：邵雍元会运世宇宙周期定位 + 九卦配置（正卦/运卦/世卦/旬卦/年卦/月卦/日卦/时卦/分卦）。积年67017+年分解会/运/世，正卦主一运（360年）大势，世卦主一世（30年）气数。长期/宏观预测视角，与太乙同属高端神数。历法复用lunar-javascript真实干支农历。',
    schema: z.object({
      birth: birthSchema,
    }),
    handler: async (i) => {
      const [{ calcHuangjiEnveloped }, solar] = await Promise.all([loadHuangji(), loadSolar()]);
      return calcHuangjiEnveloped({
        birth: (i as { birth: unknown }).birth as never,
        solar: solar as never,
      });
    },
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
    handler: async (i) => {
      const [{ calcMeihuaEnveloped }, solar] = await Promise.all([loadMeihua(), loadSolar()]);
      return calcMeihuaEnveloped({ ...(i as Record<string, unknown>), solar } as never);
    },
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
    handler: async (i) => {
      const [{ calcYunqiEnveloped }, solar] = await Promise.all([loadYunqi(), loadSolar()]);
      const envelope = calcYunqiEnveloped({ ...(i as Record<string, unknown>), solar } as never);
      if (!envelope.ok) return envelope;

      const presentationToken = randomUUID();
      registerCalendarPresentation('yunqi', envelope.data, presentationToken);
      return {
        ...envelope,
        result_meta: { ...envelope.result_meta, presentationToken },
      };
    },
  },
  {
    name: 'analyze_name',
    description: '姓名五维评分：五格数理（30%）+ 三才配置（15%）+ 五行平衡（25%）+ 字义五行（20%）+ 命理契合（10%）。含康熙笔画、字义出处、生肖喜忌。若提供完整生辰（birth），命理契合维度叠加八字喜用神补强评分（名字字义五行是否补益用神）。',
    schema: z.object({
      surname: z.string().min(1).describe('姓氏（如「张」）'),
      givenName: z.string().min(1).describe('名（如「伟」）'),
      birthYear: z.number().int().min(1900).max(2100).optional().describe('出生年（用于生肖契合度）'),
      birth: birthSchema.optional().describe('完整生辰（年月日时+性别），提供后命理契合维度叠加八字喜用神补强评分'),
      baziTimeContext: baziTimeContextSchema.optional().describe('仅提供完整生辰时必填：八字喜用神补强的时间来源'),
    }),
    handler: async (i) => {
      const input = i as { surname: string; givenName: string; birthYear?: number; birth?: Record<string, unknown>; baziTimeContext?: BaziTimeContext };
      const timeSource = input.birth ? resolveBaziTimeSource(input.birth, input.baziTimeContext!) : null;
      const [{ calcNameRatingEnveloped }, solar] = await Promise.all([loadEnvelopeAdapters(), loadSolar()]);
      const result = await calcNameRatingEnveloped(
        input.surname,
        input.givenName,
        input.birthYear,
        input.birth as never,
        solar,
      );
      return timeSource ? withBaziTimeSource(result, timeSource) : result;
    },
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
    handler: async (i) => {
      const { calcXiYongEnveloped } = await loadEnvelopeAdapters();
      return calcXiYongEnveloped(
        (i as { dayMasterWuxing: string }).dayMasterWuxing,
        (i as { elements: Record<string, number> }).elements,
      );
    },
  },
  {
    name: 'get_constitution_tendency',
    description: '五运六气体质倾向参考：根据岁运与司天推算体质偏向（九种体质）。辅助参考，不替代问卷。需先有五运六气结果（可由 calc_yunqi 取得 dayun/sitian/zaquan）。',
    schema: z.object({
      wuyun: z.object({ dayun: z.string() }).optional(),
      liuqi: z.object({ sitian: z.string(), zaquan: z.string() }).optional(),
    }),
    handler: async (i) => {
      const { getConstitutionTendencyEnveloped } = await loadEnvelopeAdapters();
      return getConstitutionTendencyEnveloped(i as never);
    },
  },
  {
    name: 'dream_interpret',
    description: '周公解梦：按梦象关键词查询吉凶寓意。含现代解读（9548 条）与原版古文断语（952 条）。可指定是否使用全量库。',
    schema: z.object({
      keyword: z.string().min(1).describe('梦象关键词（如「蛇」「水」「棺材」「结婚」）'),
      useFull: z.boolean().optional().describe('是否使用全量库（9548条，需加载；默认 false 用精选 137 条）'),
    }),
    handler: async (i) => {
      const { searchDreamEnveloped } = await loadDream();
      return searchDreamEnveloped(
        (i as { keyword: string }).keyword,
        (i as { useFull?: boolean }).useFull ?? false,
      );
    },
  },
  // ─── 跨系统联合分析（ROADMAP 功能层增强 Step 1）───
  {
    name: 'combo_annual_fortune',
    description: '年度综合运势联合分析：八字（大运/日主/喜用）+ 五运六气（年运）+ 奇门年盘 + 命卦方位。聚合多系统得年度运势定调 + 一致性检验 + 方位建议。',
    schema: z.object({
      birth: birthSchema,
      baziTimeContext: baziTimeContextSchema.describe('年度运势包含八字分析，必须声明真太阳时核验或民用时间降级'),
      targetYear: z.number().int().min(1900).max(2100).optional().describe('欲测年份（默认用出生年）'),
      currentMonth: z.number().int().min(1).max(12).optional().describe('当前月（五运六气用，不传用系统月）'),
    }),
    handler: async (i) => {
      const input = i as { birth: Record<string, unknown>; baziTimeContext: BaziTimeContext; targetYear?: number; currentMonth?: number };
      const timeSource = resolveBaziTimeSource(input.birth, input.baziTimeContext);
      const [{ calcAnnualFortuneCombo }, solar] = await Promise.all([loadCombo(), loadSolar()]);
      return withBaziTimeSource(calcAnnualFortuneCombo({
        birth: input.birth as never,
        targetYear: input.targetYear,
        currentMonth: input.currentMonth,
        solar: solar as never,
      }), timeSource);
    },
  },
  {
    name: 'combo_decision',
    description: '事件决策联合分析（三卜交叉验证）：六爻 + 梅花易数 + 奇门。三卜结论一致→高置信；两同一异→以六爻为主。需提供求测事项。',
    schema: z.object({
      birth: birthSchema,
      question: z.string().min(1).describe('求测事项（如"今年适合换工作吗"）'),
      seed: z.number().int().optional().describe('铜钱法随机种子（可选，同 seed 同结果）'),
    }),
    handler: async (i) => {
      const [{ calcDecisionCombo }, solar] = await Promise.all([loadCombo(), loadSolar()]);
      return calcDecisionCombo({
        birth: (i as { birth: unknown }).birth as never,
        question: (i as { question: string }).question,
        seed: (i as { seed?: number }).seed,
        solar: solar as never,
      });
    },
  },
  {
    name: 'combo_space_time',
    description: '空间+时间联合分析：飞星年盘 + 八宅命卦吉方 + 奇门吉门方位。推算某年最佳布局方位（主卧/财位/凶位规避）。',
    schema: z.object({
      birth: birthSchema,
      targetYear: z.number().int().min(1900).max(2100).optional().describe('欲测年份（默认用出生年）'),
      facing: z.string().optional().describe('房屋朝向（可选，八宅宅卦用）'),
    }),
    handler: async (i) => {
      const [{ calcSpaceTimeCombo }, solar] = await Promise.all([loadCombo(), loadSolar()]);
      return calcSpaceTimeCombo({
        birth: (i as { birth: unknown }).birth as never,
        targetYear: (i as { targetYear?: number }).targetYear,
        facing: (i as { facing?: string }).facing,
        solar: solar as never,
      });
    },
  },
  {
    name: 'combo_sanshi',
    description: '三式互参联合分析：大六壬 + 奇门遁甲 + 梅花易数。传统三式交叉验证——大六壬主三传四课（事态轨迹+应期），奇门主八门九星（方位时机），梅花主体用生克（快速判断）。需提供求测事项。',
    schema: z.object({
      birth: birthSchema,
      question: z.string().min(1).describe('求测事项'),
    }),
    handler: async (i) => {
      const [{ calcSanshiCombo }, solar] = await Promise.all([loadCombo(), loadSolar()]);
      return calcSanshiCombo({
        birth: (i as { birth: unknown }).birth as never,
        question: (i as { question: string }).question,
        solar: solar as never,
      });
    },
  },
  {
    name: 'combo_sanshi_classic',
    description: '三式合一联合分析：奇门遁甲 + 太乙神数 + 大六壬（真正的传统三式）。奇门主八门九星（方位时机），太乙主主客算与格局（吉凶胜负），大六壬主三传四课（事态轨迹+应期）。三式交叉验证某事的吉凶、主客胜负、应期与方位。需提供求测事项。',
    schema: z.object({
      birth: birthSchema,
      question: z.string().min(1).describe('求测事项'),
    }),
    handler: async (i) => {
      const [{ calcSanshiClassicCombo }, solar] = await Promise.all([loadCombo(), loadSolar()]);
      return calcSanshiClassicCombo({
        birth: (i as { birth: unknown }).birth as never,
        question: (i as { question: string }).question,
        solar: solar as never,
      });
    },
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
    handler: async (i) => {
      const [{ calcDailyWellnessCombo }, solar] = await Promise.all([loadCombo(), loadSolar()]);
      return calcDailyWellnessCombo({
        birth: (i as { birth: unknown }).birth as never,
        constitution: (i as { constitution?: string }).constitution,
        now: (i as { now?: { year: number; month: number; day: number; hour: number } }).now,
        targetYear: (i as { targetYear?: number }).targetYear,
        solar: solar as never,
      });
    },
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
    handler: async (i) => {
      const [{ calcZeriCombo }, solar] = await Promise.all([loadCombo(), loadSolar()]);
      return calcZeriCombo({
        birth: (i as { birth: unknown }).birth as never,
        purpose: (i as { purpose: string }).purpose as never,
        startDate: (i as { startDate: string }).startDate,
        endDate: (i as { endDate: string }).endDate,
        targetYear: (i as { targetYear?: number }).targetYear,
        topN: (i as { topN?: number }).topN,
        solar: solar as never,
      });
    },
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
    handler: async (i) => {
      const [{ calcMonthlyFortuneCombo }, solar] = await Promise.all([loadCombo(), loadSolar()]);
      return calcMonthlyFortuneCombo({
        birth: (i as { birth: unknown }).birth as never,
        targetYear: (i as { targetYear: number }).targetYear,
        targetMonth: (i as { targetMonth: number }).targetMonth,
        constitution: (i as { constitution?: string }).constitution,
        solar: solar as never,
      });
    },
  },
  {
    name: 'combo_marriage',
    description: '合婚/配对分析：输入双方出生信息，整合八字日柱冲合（六冲/六合/三合/相害/相刑/天干五合相冲）、用神互补、紫微命宫对照、姓名匹配（双方姓名五行+五格）、婚房/办公风水方位（双方命卦东四西四宅）、吉日推荐（zeri 嫁娶/开业）。适配婚恋/合伙/合作三类关系。输出综合契合度+五行互补度+逐柱冲合扫描+紫微对照+姓名匹配+风水建议+吉日+四层报告。',
    schema: z.object({
      personA: z.object({
        birth: birthSchema,
        baziTimeContext: baziTimeContextSchema.describe('甲方八字分析的时间来源：必须声明真太阳时核验或民用时间降级'),
        surname: z.string().optional().describe('甲方姓氏（可选，用于姓名匹配）'),
        givenName: z.string().optional().describe('甲方名字（可选）'),
        label: z.string().optional().describe('称谓，如男方/甲方'),
      }),
      personB: z.object({
        birth: birthSchema,
        baziTimeContext: baziTimeContextSchema.describe('乙方八字分析的时间来源：必须声明真太阳时核验或民用时间降级'),
        surname: z.string().optional().describe('乙方姓氏（可选）'),
        givenName: z.string().optional().describe('乙方名字（可选）'),
        label: z.string().optional().describe('称谓，如女方/乙方'),
      }),
      scene: z.enum(['婚恋', '合伙', '合作']).optional().describe('关系类型（默认婚恋）'),
      targetYear: z.number().int().min(1900).max(2100).optional().describe('择吉日年份（默认双方出生较大年）'),
    }),
    handler: async (i) => {
      const input = i as {
        personA: { birth: Record<string, unknown>; baziTimeContext: BaziTimeContext; surname?: string; givenName?: string; label?: string };
        personB: { birth: Record<string, unknown>; baziTimeContext: BaziTimeContext; surname?: string; givenName?: string; label?: string };
        scene?: '婚恋' | '合伙' | '合作';
        targetYear?: number;
      };
      const personATimeSource = resolveBaziTimeSource(input.personA.birth, input.personA.baziTimeContext);
      const personBTimeSource = resolveBaziTimeSource(input.personB.birth, input.personB.baziTimeContext);
      const [{ calcMarriageCombo }, solar] = await Promise.all([loadMarriageCombo(), loadSolar()]);
      const envelope = withBaziTimeSource(withBaziTimeSource(calcMarriageCombo({
        personA: {
          birth: input.personA.birth as never,
          surname: input.personA.surname,
          givenName: input.personA.givenName,
          label: input.personA.label,
          solar: solar as never,
        },
        personB: {
          birth: input.personB.birth as never,
          surname: input.personB.surname,
          givenName: input.personB.givenName,
          label: input.personB.label,
        },
        scene: input.scene,
        targetYear: input.targetYear,
      }), personATimeSource), personBTimeSource);

      return {
        ...envelope,
        data: {
          ...envelope.data,
          timeSource: { personA: personATimeSource, personB: personBTimeSource },
        },
      };
    },
  },
  {
    name: 'cast_cezi',
    description: '测字/字占：输入一个汉字，分析康熙笔画数理（81 数理吉凶）、字义五行、字义本义（说文/形声）、字形结构（上下/左右/包围/独体）与偏旁象义，可选结合八字用神判断该字对日主的补益。输出吉凶定调+性格预示+事业/感情影响+改字起名建议。象数+字义占卜，门槛最低。',
    schema: z.object({
      char: z.string().min(1).max(4).describe('所测汉字（取首字）'),
      aspect: z.enum(['事业', '感情', '财利', '健康', '综合']).optional().describe('问题方向（默认综合）'),
      birth: birthSchema.optional().describe('可选生辰，结合八字用神补益判断'),
      baziTimeContext: baziTimeContextSchema.optional().describe('仅提供 birth 时必填：八字用神补益判断的时间来源'),
    }),
    handler: async (i) => {
      const input = i as {
        char: string;
        aspect?: '事业' | '感情' | '财利' | '健康' | '综合';
        birth?: Record<string, unknown>;
        baziTimeContext?: BaziTimeContext;
      };
      if (input.birth && !input.baziTimeContext) {
        throw new Error('提供 birth 时必须提供 baziTimeContext，以声明真太阳时核验或民用时间降级。');
      }
      const timeSource = input.birth ? resolveBaziTimeSource(input.birth, input.baziTimeContext!) : null;
      const [{ calcCeziEnveloped }, solar] = await Promise.all([loadCezi(), loadSolar()]);
      const envelope = calcCeziEnveloped({
        char: input.char,
        aspect: input.aspect,
        birth: input.birth as never,
        solar: solar as never,
      });
      return timeSource ? withBaziTimeSource(envelope, timeSource) : envelope;
    },
  },
  {
    name: 'calc_chenguz',
    description: '袁天罡称骨算命：按出生年月日时查四柱骨重（年按60甲子干支、月按农历月、日按农历日、时按时支），总重（两+钱）对应称骨歌一段，定命格轻重。骨越重命越贵，骨轻则多劳。称骨法无唯一正本，可通过 version 切换三个民间传抄版本：standard 通行工整本（52首完整，默认）/ folk 民间传抄本（51首，缺七两二）/ full 全本异文（52首，异文最多）。输出四柱骨重+总重+称骨歌+白话解读+版本信息。民间算命，门槛低。',
    schema: z.object({
      birth: birthSchema,
      version: z.enum(['standard', 'folk', 'full']).optional().describe('称骨歌版本：standard 通行工整本（默认）/ folk 民间传抄本 / full 全本异文'),
    }),
    handler: async (i) => {
      const [{ calcChenguzEnveloped }, solar] = await Promise.all([loadChenguz(), loadSolar()]);
      return calcChenguzEnveloped({
        birth: (i as { birth: unknown }).birth as never,
        solar: solar as never,
        version: (i as { version?: 'standard' | 'folk' | 'full' }).version,
      });
    },
  },
  {
    name: 'get_almanac',
    description: '每日黄历：按公历日期返回完整黄历——干支纳音、宜忌、吉神凶煞、彭祖百忌、喜福财神方位、冲煞、十二时辰吉凶、节气节日。基于内置 lunar-javascript 真实历法推算，民俗参考。不传 date 默认今天。',
    schema: z.object({
      date: z.string().optional().describe('公历日期 yyyy-mm-dd，不传默认今天'),
    }),
    handler: async (i) => {
      const [{ getAlmanacEnveloped }, solar] = await Promise.all([loadAlmanac(), loadSolar()]);
      const input = i as { date?: string };
      const envelope = getAlmanacEnveloped({ date: input.date, solar: solar as never });
      if (!envelope.ok || !input.date) return envelope;

      const presentationToken = randomUUID();
      registerCalendarPresentation('almanac', envelope.data, presentationToken);
      return {
        ...envelope,
        result_meta: { ...envelope.result_meta, presentationToken },
      };
    },
  },
  {
    name: 'calc_feixing',
    description: '流年飞星：按年份推算九宫飞星盘（中宫飞星+八方飞星）、元运旺衰、九星状态、凶位化解。可传 gender+birthYear 附个人命卦八方吉凶（生气/天医/延年/伏位/绝命/五鬼/六煞/祸害）。玄空风水民俗参考。不传 year 默认今年。',
    schema: z.object({
      year: z.number().int().min(1900).max(2100).optional().describe('公历年，不传默认今年'),
      gender: z.enum(['男', '女']).optional().describe('性别，用于推算命卦方位'),
      birthYear: z.number().int().min(1900).max(2100).optional().describe('出生年（推命卦用，不传则用 year'),
    }),
    handler: async (i) => {
      const { calcFeixingEnveloped } = await loadFeixing();
      const envelope = calcFeixingEnveloped({
        year: (i as { year?: number }).year,
        gender: (i as { gender?: '男' | '女' }).gender,
        birthYear: (i as { birthYear?: number }).birthYear,
      });
      if (!envelope.ok) return envelope;

      const presentationToken = randomUUID();
      registerFeixingPresentation(envelope.data, presentationToken);
      return {
        ...envelope,
        result_meta: {
          ...envelope.result_meta,
          presentationToken,
        },
      };
    },
  },
  {
    name: 'calc_bazhai',
    description: '八宅大游年：按出生年+性别推命卦（东四/西四命）+ 个人八方吉凶（生气/天医/延年/伏位/绝命/五鬼/六煞/祸害）+ 太岁三煞。可选传 door/bedroom/kitchen 方位算门主灶配合。阳宅风水民俗参考。',
    schema: z.object({
      birthYear: z.number().int().min(1900).max(2100).describe('出生年（推命卦，必填）'),
      gender: z.enum(['男', '女']).describe('性别（推命卦，必填）'),
      door: z.string().optional().describe('大门方位（北/东北/东/东南/南/西南/西/西北，传则算门主灶）'),
      bedroom: z.string().optional().describe('主卧方位'),
      kitchen: z.string().optional().describe('厨房灶位方位'),
      year: z.number().int().min(1900).max(2100).optional().describe('查太岁三煞的年份，默认今年'),
    }),
    handler: async (i) => {
      const { calcBazhaiEnveloped } = await loadBazhai();
      const envelope = calcBazhaiEnveloped({
        birthYear: (i as { birthYear: number }).birthYear,
        gender: (i as { gender: '男' | '女' }).gender,
        door: (i as { door?: string }).door,
        bedroom: (i as { bedroom?: string }).bedroom,
        kitchen: (i as { kitchen?: string }).kitchen,
        year: (i as { year?: number }).year,
      });
      if (!envelope.ok) return envelope;

      const presentationToken = randomUUID();
      registerBazhaiPresentation(envelope.data, presentationToken);
      return {
        ...envelope,
        result_meta: {
          ...envelope.result_meta,
          presentationToken,
        },
      };
    },
  },
  {
    name: 'get_daily_rhythm',
    description: '每日节律：按日期返回当前节气调养（饮食/起居/运动/穴位）+ 体质针对性建议 + 当前时辰经络当令（子午流注）。可传 constitution 命中节气体质加减。中医民俗养生参考。',
    schema: z.object({
      date: z.string().optional().describe('公历日期 yyyy-mm-dd，不传默认今天'),
      hour: z.number().int().min(0).max(23).optional().describe('时辰 0-23，不传默认当前小时'),
      constitution: z.string().optional().describe('体质类型（如气虚质），命中节气针对性建议'),
    }),
    handler: async (i) => {
      const [{ getDailyRhythmEnveloped }, solar] = await Promise.all([loadRhythm(), loadSolar()]);
      return getDailyRhythmEnveloped({
        date: (i as { date?: string }).date,
        hour: (i as { hour?: number }).hour,
        constitution: (i as { constitution?: string }).constitution,
        solar: solar as never,
      });
    },
  },
  {
    name: 'assess_constitution',
    description: '中医九种体质问卷自评：传入用户答题（answers: {type, score}[]，score 1-5）算九种体质转化分 + 主体质 + 调养建议（方向/食疗/穴位）。与 get_constitution_tendency（按出生年推断）互补，本工具按实际答题更贴近真实体质。答题前可调 list_constitution_questionnaire 取题目问用户。',
    schema: z.object({
      answers: z.array(z.object({
        type: z.string().describe('体质类型（如气虚质/阳虚质等，对应题目分组）'),
        score: z.number().int().min(1).max(5).describe('该题得分 1-5（1没有/2很少/3有时/4经常/5总是）'),
      })).describe('用户答题数组'),
    }),
    handler: async (i) => {
      const { assessConstitutionEnveloped } = await loadConstitution();
      return assessConstitutionEnveloped({
        answers: (i as { answers: Array<{ type: string; score: number }> }).answers,
      });
    },
  },
  {
    name: 'list_constitution_questionnaire',
    description: '列出中医九种体质问卷全部题目（按体质分组），供 AI 取题问用户后调 assess_constitution 自评。无入参。',
    schema: z.object({}),
    handler: async () => {
      const { listConstitutionQuestionnaire } = await loadConstitution();
      const list = listConstitutionQuestionnaire();
      return {
        ok: true,
        tool: 'list_constitution_questionnaire',
        version: '1.0.0',
        input_normalized: {},
        data: { groups: list },
        summary: [`九种体质问卷共 ${list.length} 组、${list.reduce((s, g) => s + g.questions.length, 0)} 题`],
      } as never;
    },
  },
];
