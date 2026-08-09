import type { DaliurenData } from '../../visual/src/legacy/daliurenEngine';
import type { HuangjiData } from '../../visual/src/legacy/huangjiEngine';
import type { LiuyaoData } from '../../visual/src/legacy/liuyaoEngine';
import type { MeihuaData } from '../../visual/src/legacy/meihuaEngine';
import type { QimenData } from '../../visual/src/legacy/qimenEngine';
import type { TaiyiData } from '../../visual/src/legacy/taiyiEngine';

export type DivinationPresentationTool = 'cast_liuyao' | 'cast_meihua' | 'arrange_qimen' | 'liuren_calculate' | 'taiyi_calculate' | 'huangji_calculate';

type DivinationData = LiuyaoData | MeihuaData | QimenData | DaliurenData | TaiyiData | HuangjiData;

export type DivinationPresentationClaim =
  | { tool: 'cast_liuyao'; kind: 'hexagram'; field: 'name' | 'changedName' | 'palace' | 'palaceElement' | 'dayGanZhi' | 'monthGanZhi'; value: string }
  | { tool: 'cast_liuyao'; kind: 'yao'; field: 'shiYao' | 'yingYao'; value: number }
  | { tool: 'cast_liuyao'; kind: 'yao'; field: 'changingYao'; value: string }
  | { tool: 'cast_meihua'; kind: 'hexagram'; field: 'name' | 'changedName' | 'bodyTrigram' | 'useTrigram' | 'bodyUseRelation'; value: string }
  | { tool: 'cast_meihua'; kind: 'yao'; field: 'changingLine'; value: number }
  | { tool: 'cast_meihua'; kind: 'trigram'; position: 'upper' | 'lower'; field: 'name' | 'nature' | 'element'; value: string }
  | { tool: 'arrange_qimen'; kind: 'basic'; field: 'dun' | 'ju' | 'yuan' | 'season' | 'monthElement'; value: string }
  | { tool: 'arrange_qimen'; kind: 'zhiFu'; field: 'star' | 'heavenlyStem'; value: string }
  | { tool: 'arrange_qimen'; kind: 'zhiFu'; field: 'position'; value: number }
  | { tool: 'arrange_qimen'; kind: 'zhiShi'; field: 'gate'; value: string }
  | { tool: 'arrange_qimen'; kind: 'zhiShi'; field: 'position'; value: number }
  | { tool: 'arrange_qimen'; kind: 'palace'; position: number; field: 'trigram' | 'gate' | 'star' | 'deity' | 'heavenlyStem' | 'earthlyStem' | 'earthBranch'; value: string }
  | { tool: 'liuren_calculate'; kind: 'basic'; field: 'jieqi' | 'dayGanZhi' | 'hourGanZhi' | 'dayNight' | 'yueJiang' | 'yueJiangName'; value: string }
  | { tool: 'liuren_calculate'; kind: 'sike'; position: 1 | 2 | 3 | 4; field: 'shangShen' | 'xiaShen' | 'tianJiang' | 'relation'; value: string }
  | { tool: 'liuren_calculate'; kind: 'sanchuan'; stage: 'chuChuan' | 'zhongChuan' | 'moChuan'; field: 'diZhi' | 'tianJiang' | 'liuQin'; value: string }
  | { tool: 'liuren_calculate'; kind: 'sanchuan'; stage: 'chuChuan' | 'zhongChuan' | 'moChuan'; field: 'xunKong'; value: string | null }
  | { tool: 'taiyi_calculate'; kind: 'basic'; field: 'yearGz' | 'monthGz' | 'dayGz' | 'hourGz' | 'jieqi' | 'jiStyleName' | 'acumYearName'; value: string }
  | { tool: 'taiyi_calculate'; kind: 'kook'; field: 'wen' | 'nian' | 'dun'; value: string }
  | { tool: 'taiyi_calculate'; kind: 'kook'; field: 'num'; value: number }
  | { tool: 'taiyi_calculate'; kind: 'position'; subject: 'taiyi' | 'wenchang' | 'shiji' | 'dingmu'; field: 'gong'; value: string }
  | { tool: 'taiyi_calculate'; kind: 'position'; subject: 'taiyi'; field: 'num'; value: number }
  | { tool: 'taiyi_calculate'; kind: 'calculation'; side: 'home' | 'away'; field: 'cal' | 'general' | 'vgen'; value: number }
  | { tool: 'huangji_calculate'; kind: 'ganZhi'; pillar: 'year' | 'month' | 'day' | 'hour'; value: string }
  | { tool: 'huangji_calculate'; kind: 'lunarMonth'; value: number }
  | { tool: 'huangji_calculate'; kind: 'cycle'; field: 'acumYear' | 'hui' | 'yun' | 'shi'; value: number }
  | { tool: 'huangji_calculate'; kind: 'gua'; layer: 'zheng' | 'yun' | 'shi' | 'xun' | 'year' | 'month' | 'day' | 'hour' | 'minute'; value: string }
  | { tool: 'huangji_calculate'; kind: 'movingLine'; layer: 'yun' | 'shi' | 'xun'; value: number };

export interface DivinationClaimViolation {
  index: number;
  tool: DivinationPresentationClaim['tool'];
  kind: DivinationPresentationClaim['kind'];
  message: string;
  expected?: string | number | null;
  actual: string | number | null;
}

export interface DivinationClaimValidation {
  valid: boolean;
  violations: DivinationClaimViolation[];
}

const presentationResults = new Map<string, { tool: DivinationPresentationTool; data: DivinationData }>();

export function registerDivinationPresentation(tool: DivinationPresentationTool, data: DivinationData, token: string) {
  presentationResults.set(token, { tool, data });
}

export function validateDivinationPresentation(token: string, claims: DivinationPresentationClaim[]): DivinationClaimValidation | null {
  const entry = presentationResults.get(token);
  return entry ? validateDivinationClaims(entry.tool, entry.data, claims) : null;
}

export function validateDivinationClaims(
  tool: DivinationPresentationTool,
  data: DivinationData,
  claims: DivinationPresentationClaim[],
): DivinationClaimValidation {
  const violations: DivinationClaimViolation[] = [];

  claims.forEach((claim, index) => {
    const expected = claim.tool === tool ? getExpectedValue(data, claim) : undefined;
    if (claim.value !== expected) {
      violations.push({
        index,
        tool: claim.tool,
        kind: claim.kind,
        message: claim.tool === tool ? `${claim.kind} 与本次${tool}盘面结果不一致。` : `该凭证不属于 ${claim.tool}，不能校验此断言。`,
        expected,
        actual: claim.value,
      });
    }
  });

  return { valid: violations.length === 0, violations };
}

function getExpectedValue(data: DivinationData, claim: DivinationPresentationClaim): string | number | null | undefined {
  switch (claim.tool) {
    case 'cast_liuyao': {
      const result = data as LiuyaoData;
      if (claim.kind === 'hexagram') {
        if (claim.field === 'name') return result.hexagramName;
        if (claim.field === 'changedName') return result.changingHexagramName;
        return result[claim.field];
      }
      if (claim.field === 'changingYao') return result.changingYao.join('、');
      return result[claim.field];
    }
    case 'cast_meihua': {
      const result = data as MeihuaData;
      if (claim.kind === 'hexagram') {
        if (claim.field === 'name') return result.hexagramName;
        if (claim.field === 'changedName') return result.changingHexagramName;
        return result[claim.field];
      }
      if (claim.kind === 'yao') return result.changingLine;
      return (claim.position === 'upper' ? result.upperTrigram : result.lowerTrigram)[claim.field];
    }
    case 'arrange_qimen': {
      const result = data as QimenData;
      if (claim.kind === 'basic') return result[claim.field];
      if (claim.kind === 'zhiFu') return result.zhiFu?.[claim.field];
      if (claim.kind === 'zhiShi') return result.zhiShi?.[claim.field];
      return result.palaces.find((palace) => palace.position === claim.position)?.[claim.field];
    }
    case 'liuren_calculate': {
      const result = data as DaliurenData;
      if (claim.kind === 'basic') return result.basicInfo[claim.field];
      if (claim.kind === 'sike') return result.siKe.list.find((item) => item.position === claim.position)?.[claim.field];
      return result.sanChuan[claim.stage][claim.field];
    }
    case 'taiyi_calculate': {
      const result = data as TaiyiData;
      if (claim.kind === 'basic') return result.basicInfo[claim.field];
      if (claim.kind === 'kook') return result.kook[claim.field];
      if (claim.kind === 'position') {
        if (claim.subject === 'taiyi') return result.taiyi[claim.field];
        return result[claim.subject].gong;
      }
      return result[claim.side][claim.field];
    }
    case 'huangji_calculate': {
      const result = data as HuangjiData;
      if (claim.kind === 'ganZhi') return result.ganZhi[claim.pillar];
      if (claim.kind === 'lunarMonth') return result.lunarMonth;
      if (claim.kind === 'cycle') return result.cycles[claim.field];
      if (claim.kind === 'gua') return result.gua[claim.layer];
      return result.movingLines[claim.layer];
    }
  }
}
