/**
 * ziweiEngine — 紫微斗数纯 TS 引擎（C 类迁移第五步）
 *
 * 从 engine-adapters.js 的 ZiweiIztroAdapter 移植为纯 TS，
 * 用 ESM `import { astro } from 'iztro'` 替代 window.iztro 全局。
 *
 * - iztro v2.5.8（MIT）npm 包导出 { data, star, util, astro }，astro.bySolar 与
 *   vendor 全局版 window.iztro.astro.bySolar 调用方式一致。
 * - 输出结构与旧 adapter 完全一致（palaces/sihua/mainStars/birthInfo/mingGua/chart），
 *   ZiweiPalaceGrid/渲染器可直接消费。
 * - 旧 JS ZiweiIztroAdapter 保留作 EngineAdapterRegistry fallback，零回归。
 *
 * MCP 端：import { calcZiweiEnveloped } from './ziweiEngine' 即可直接调用，
 * 无需 window、无需 vendor script loader。
 */

import { astro } from 'iztro';
import type { ToolEnvelope, ExportSnapshot } from './baseTypes';

/** iztro palace 名称映射：iztro 中文输出 → 本项目渲染器宫名（仆役→交友） */
const IZTRO_PALACE_MAP: Record<string, string> = {
  命宫: '命宫', 兄弟: '兄弟', 夫妻: '夫妻', 子女: '子女',
  财帛: '财帛', 疾厄: '疾厄', 迁移: '迁移', 仆役: '交友',
  官禄: '官禄', 田宅: '田宅', 福德: '福德', 父母: '父母',
};

/** 天干 → 四化星名（对齐 engine-adapters getStarName） */
const STEM_STAR_MAP: Record<string, string> = {
  甲: '廉贞', 乙: '破军', 丙: '武曲', 丁: '太阳', 戊: '天同',
  己: '廉贞', 庚: '天府', 辛: '太阴', 壬: '武曲', 癸: '贪狼',
};

const BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

export interface ZiweiBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: '男' | '女';
}

export interface ZiweiMingGua {
  trigram: string;
  group: string;
}

export interface ZiweiPalace {
  stars: string[];
  position: string;
  miaoxian: string;
  earthlyBranch?: string;
}

export interface ZiweiResult {
  engineName: string;
  mode: 'local-exact' | 'demo';
  version: string;
  birthInfo: { year: number; month: number; day: number; hour: number; gender: string };
  mingGua: ZiweiMingGua;
  palaces: Record<string, ZiweiPalace>;
  sihua: Record<string, string>;
  mainStars: string[];
  chart: unknown; // iztro 原始 chart（供高级消费，渲染器不读）
  confidenceNote?: string;
}

interface IztroStar { name: string; brightness?: string; type?: string; mutagen?: string }
interface IztroPalace {
  name: string;
  majorStars?: IztroStar[];
  minorStars?: IztroStar[];
  adjectiveStars?: IztroStar[];
  earthlyBranch?: string;
}

/** 将 iztro palaces 数组转换为本项目渲染器格式（对齐 transformIztroPalaces） */
function transformIztroPalaces(iztroPalaces: IztroPalace[]): Record<string, ZiweiPalace> {
  const result: Record<string, ZiweiPalace> = {};
  if (!Array.isArray(iztroPalaces)) return result;
  let brIdx = 0;
  iztroPalaces.forEach((p) => {
    if (!p) return;
    const pName = IZTRO_PALACE_MAP[p.name];
    if (!pName) return;
    const majorStars: string[] = [];
    const minorStars: string[] = [];
    let brightness = '';
    if (p.majorStars && Array.isArray(p.majorStars)) {
      p.majorStars.forEach((s) => {
        if (s && s.name) {
          majorStars.push(s.name);
          if (s.brightness && !brightness) brightness = s.brightness;
        }
      });
    }
    if (p.minorStars && Array.isArray(p.minorStars)) {
      p.minorStars.forEach((s) => {
        if (s && s.name && s.type === 'helpful') minorStars.push(s.name);
      });
    }
    let branchIndex = p.earthlyBranch ? BRANCHES.indexOf(p.earthlyBranch.substring(0, 1)) : brIdx % 12;
    if (branchIndex < 0) branchIndex = brIdx % 12;
    const branch = BRANCHES[branchIndex] || BRANCHES[brIdx % 12];
    result[pName] = {
      stars: majorStars.concat(minorStars),
      position: branch,
      miaoxian: brightness || '平',
      earthlyBranch: p.earthlyBranch || '',
    };
    brIdx++;
  });
  return result;
}

/** 从 iztro chart 提取四化映射 { 星名: 禄/权/科/忌 }。
 *  iztro ESM 版四化标在每颗星的 mutagen 字段上（非顶层 sihua 对象），
 *  遍历所有宫位的所有星，找 mutagen 非空的即为四化星。
 */
function extractSihuaFromChart(palaces: IztroPalace[]): Record<string, string> {
  const result: Record<string, string> = {};
  if (!Array.isArray(palaces)) return result;
  palaces.forEach((p) => {
    (['majorStars', 'minorStars', 'adjectiveStars'] as const).forEach((k) => {
      const stars = (p as Record<string, IztroStar[] | undefined>)[k];
      if (Array.isArray(stars)) {
        stars.forEach((s) => {
          if (s && s.name && (s as Record<string, unknown>).mutagen) {
            result[s.name] = String((s as Record<string, unknown>).mutagen);
          }
        });
      }
    });
  });
  return result;
}

/** 提取所有主星列表（对齐 extractMainStars） */
function extractMainStars(iztroPalaces: IztroPalace[]): string[] {
  const stars: string[] = [];
  if (!Array.isArray(iztroPalaces)) return stars;
  iztroPalaces.forEach((p) => {
    if (p && p.majorStars && Array.isArray(p.majorStars)) {
      p.majorStars.forEach((s) => {
        if (s && s.name && !stars.includes(s.name)) stars.push(s.name);
      });
    }
  });
  return stars;
}

export interface ZiweiInput {
  birth: ZiweiBirth;
  mingGua?: ZiweiMingGua;
}

/**
 * 紫微斗数计算 —— 纯 TS 版（ESM import iztro）。
 * 失败时返回 demo 模式结果（与旧 adapter fallback 一致，但这里不引入演示 RNG，
 * 而是返回空 palaces + demo 标记，由上层决定是否用 buildFallbackZiweiData）。
 */
export function calculateZiwei(input: ZiweiInput): ZiweiResult {
  const birth = input.birth;
  const mingGua = input.mingGua ?? { trigram: '?', group: '?' };

  // hour → timeIndex：0=早子时(23-1)...12=晚子时(23-1)
  let timeIndex = Math.floor((birth.hour + 1) / 2);
  if (timeIndex === 12) timeIndex = 0; // 23:00-23:59 → 早子时
  const genderKey = birth.gender === '男' ? '男' : '女';
  const solarDateStr = `${birth.year}-${birth.month}-${birth.day}`;

  const chart = astro.bySolar(solarDateStr, timeIndex, genderKey) as { palaces: IztroPalace[]; sihua: Record<string, string> };
  if (!chart || !chart.palaces || !Array.isArray(chart.palaces)) {
    return {
      engineName: 'ZiweiIztroAdapter',
      mode: 'demo',
      version: 'iztro@2.5.8',
      birthInfo: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender },
      mingGua,
      palaces: {},
      sihua: {},
      mainStars: [],
      chart: null,
      confidenceNote: 'iztro 排盘返回空，已降级为 demo。',
    };
  }

  return {
    engineName: 'ZiweiIztroAdapter',
    mode: 'local-exact',
    version: 'iztro@2.5.8',
    birthInfo: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender },
    mingGua,
    palaces: transformIztroPalaces(chart.palaces),
    sihua: extractSihuaFromChart(chart.palaces),
    mainStars: extractMainStars(chart.palaces),
    chart,
    confidenceNote: '紫微斗数排盘采用 SylarLong/iztro (v2.5.8) 引擎；紫微流派存在差异，采用 iztro 默认配置。',
  };
}

// ─── ToolEnvelope 适配 ───
export interface ZiweiData extends ZiweiResult {
  export_snapshot: ExportSnapshot;
}

export function calcZiweiEnveloped(input: ZiweiInput): ToolEnvelope<ZiweiData> {
  const result = calculateZiwei(input);
  const palaceNames = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
  const ming = result.palaces['命宫'];
  const mainStarsSummary = result.mainStars.slice(0, 14).join('、');
  const sihuaSummary = Object.keys(result.sihua).map((star) => `${star}${result.sihua[star]}`).join('、');

  const sections: Array<{ heading: string; body: string }> = [];
  if (ming) {
    sections.push({ heading: '命宫', body: `命宫在${ming.position}方，主星：${ming.stars.join('、') || '无'}，庙旺：${ming.miaoxian}。` });
  }
  palaceNames.forEach((name) => {
    const p = result.palaces[name];
    if (p && name !== '命宫') {
      sections.push({ heading: name, body: `${name}在${p.position}方，星曜：${p.stars.join('、') || '无'}，庙旺：${p.miaoxian}。` });
    }
  });
  if (sihuaSummary) sections.push({ heading: '四化', body: sihuaSummary + '。' });

  const snapshot: ExportSnapshot = {
    summary: result.mode === 'local-exact'
      ? `紫微斗数${result.birthInfo.year}年${result.birthInfo.month}月${result.birthInfo.day}日${result.birthInfo.hour}时${result.birthInfo.gender}命，命宫主星：${ming?.stars.join('、') || '未知'}，四化：${sihuaSummary || '未知'}。`
      : 'iztro 排盘失败，已降级为 demo。',
    tags: ['紫微斗数', result.mode === 'local-exact' ? '真实排盘' : '演示', `iztro@2.5.8`, ...(ming?.stars || [])],
    sections: sections.length ? sections : [{ heading: '说明', body: result.confidenceNote || '' }],
    sourceNotes: result.confidenceNote || 'iztro v2.5.8',
  };

  const env: ToolEnvelope<ZiweiData> = {
    ok: result.mode === 'local-exact',
    tool: result.engineName,
    version: result.version,
    input_normalized: input as unknown as Record<string, unknown>,
    data: { ...result, export_snapshot: snapshot },
    warnings: [result.confidenceNote || ''],
  };
  if (result.mode !== 'local-exact') {
    env.error = { code: 'demo_fallback', message: 'iztro 排盘返回空，降级为 demo' };
  }
  return env;
}
