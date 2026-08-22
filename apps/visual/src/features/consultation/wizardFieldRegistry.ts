import type { ModuleId } from '@/lib/modules';
import type { LocalToolName } from '@/legacy/localToolRegistry';

export const TOOL_WORKSPACE_MAP = {
  resolve_true_solar_time: 'bazi', bazi_calculate: 'bazi', ziwei_chart: 'ziwei', calc_feixing: 'feixing', calc_bazhai: 'bazhai',
  cast_liuyao: 'liuyao', arrange_qimen: 'qimen', liuren_calculate: 'liuren', taiyi_calculate: 'taiyi', cast_meihua: 'meihua',
  xingxiu_daily: 'xingxiu', calc_yunqi: 'yunqi', calc_chenguz: 'chenguz', get_almanac: 'almanac', get_daily_rhythm: 'rhythm',
  calc_xiyong: 'bazi', dream_interpret: 'dream', analyze_name: 'namewuxing', cast_cezi: 'cezi', huangji_calculate: 'huangji',
  get_constitution_tendency: 'tizhi', assess_constitution: 'tizhi', list_constitution_questionnaire: 'tizhi',
  combo_annual_fortune: 'combo', combo_monthly_fortune: 'combo', combo_daily_wellness: 'combo', combo_decision: 'combo',
  combo_space_time: 'combo', combo_sanshi: 'combo', combo_sanshi_classic: 'combo', combo_zeri: 'combo', combo_marriage: 'combo',
} as const satisfies Record<LocalToolName, ModuleId>;

export const WIZARD_FIELD_LABELS: Record<string, string> = {
  birth: '出生资料', timeBasis: '时间基准', location: '已核验地点与历史时区证据', year: '年份', targetYear: '目标年份',
  currentMonth: '当前月份', targetMonth: '目标月份', date: '日期', queryDate: '查询日期', hour: '小时', now: '当前日期时间',
  question: '咨询问题', keyword: '关键词', surname: '姓氏', givenName: '名字', char: '汉字', answers: '问卷回答',
  birthYear: '出生年份', gender: '性别', baziTimeContext: '八字时间基准', personA: '甲方资料', personB: '乙方资料',
  purpose: '用途', startDate: '起始日期', endDate: '结束日期', dayMasterWuxing: '日主五行', elements: '五行统计',
};
