/**
 * lunar-javascript ambient 类型声明。
 * lunar-javascript 包本身无 TS 类型，mcp-server 用 tsc --noEmit 严格检查时需要此声明。
 * 这里只声明本项目用到的 Solar 导出（fromYmd/fromYmdHms 返回带 getLunar 的对象）。
 */
declare module 'lunar-javascript' {
  export interface LunarSolarResult {
    getLunar(): unknown;
  }
  export const Solar: {
    fromYmd(year: number, month: number, day: number): LunarSolarResult;
    fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): LunarSolarResult;
  };
}
