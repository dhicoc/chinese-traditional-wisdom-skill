/**
 * solarEntry — lunar-javascript ESM 入口（纯 npm，不依赖 visual/ vendor 或 window 全局）
 *
 * React / MCP 共用：需要精确历法时传入 getSolarEntry() / getLunarEntry()。
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error lunar-javascript 无完整类型定义
import { Solar, Lunar } from 'lunar-javascript';

export type SolarEntry = typeof Solar;
export type LunarEntry = typeof Lunar;

/** 公历 Solar 构造入口（fromYmd / fromYmdHms） */
export function getSolarEntry(): SolarEntry {
  return Solar as SolarEntry;
}

/** 农历 Lunar 构造入口（fromYmd） */
export function getLunarEntry(): LunarEntry {
  return Lunar as LunarEntry;
}
