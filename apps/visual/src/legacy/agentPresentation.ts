import type { ToolEnvelope } from './baseTypes';
import type { BaziData } from './baziEngine';
import type { LocalToolName } from './localToolRegistry';
import { LocalToolError } from './localToolErrors';
import { runLocalTool } from './directRunner';
import { verifyLocalToolClaims } from './localClaimVerifier';
import type { BaziPresentationClaim } from './claimVerification/baziClaimVerifier';

type BaziAgentData = BaziData & { timeSource?: { timeBasis?: string; notice?: string } };

export interface AgentPresentation {
  ok: true;
  tool: LocalToolName;
  resultVersion: string;
  verifiedFacts: Array<{ id: string; label: string; value: string | number; sourcePath: string }>;
  interpretations: Array<{ heading: string; body: string; kind: 'traditional-interpretation' | 'cultural-background' }>;
  actions: Array<{ text: string; risk: 'low' | 'review-required' }>;
  limitations: string[];
  disclaimers: string[];
  provenance: Record<string, unknown>;
}

function baziFactCandidates(data: BaziData): Array<{
  claim: BaziPresentationClaim;
  fact: AgentPresentation['verifiedFacts'][number];
}> {
  const pillarLabel: Record<'year' | 'month' | 'day' | 'hour', string> = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' };
  const pillars = (['year', 'month', 'day', 'hour'] as const).map((pillar) => {
    const value = `${data.pillars[pillar].stem}${data.pillars[pillar].branch}`;
    return {
      claim: { tool: 'bazi_calculate', kind: 'pillar', pillar, value } as BaziPresentationClaim,
      fact: { id: `pillar.${pillar}`, label: pillarLabel[pillar], value, sourcePath: `data.pillars.${pillar}` },
    };
  });
  const elements = (['木', '火', '土', '金', '水'] as const).map((element) => ({
    claim: { tool: 'bazi_calculate', kind: 'elementCount', element, value: data.elements[element] } as BaziPresentationClaim,
    fact: { id: `elements.${element}`, label: `${element}计数`, value: data.elements[element], sourcePath: `data.elements.${element}` },
  }));
  return [
    ...pillars,
    {
      claim: { tool: 'bazi_calculate', kind: 'dayMaster', value: data.dayMaster },
      fact: { id: 'dayMaster', label: '日主', value: data.dayMaster, sourcePath: 'data.dayMaster' },
    },
    ...elements,
    {
      claim: { tool: 'bazi_calculate', kind: 'strength', value: data.advancedAnalysis.support.strength },
      fact: { id: 'strength', label: '日主强弱', value: data.advancedAnalysis.support.strength, sourcePath: 'data.advancedAnalysis.support.strength' },
    },
  ];
}

export async function presentLocalTool(tool: LocalToolName, input: unknown): Promise<AgentPresentation> {
  if (tool !== 'bazi_calculate') {
    throw new LocalToolError('UNSUPPORTED_INPUT', `${tool} 的 Agent presentation 将在 typed presentation 阶段接入。`, tool);
  }
  const result = await runLocalTool(tool, input);
  const envelope = result as ToolEnvelope<BaziAgentData>;
  if (!envelope.ok) {
    throw new LocalToolError('ENGINE_FAILURE', envelope.error?.message ?? '本次计算未完成。', tool);
  }
  const candidates = baziFactCandidates(envelope.data);
  const verification = verifyLocalToolClaims(tool, envelope, candidates.map(({ claim }) => claim));
  const validIndexes = new Set(verification.verifiedFacts.map(({ index }) => index));
  const snapshot = envelope.data.export_snapshot;
  return {
    ok: true,
    tool,
    resultVersion: envelope.version,
    verifiedFacts: candidates.filter((_candidate, index) => validIndexes.has(index)).map(({ fact }) => fact),
    interpretations: (snapshot?.sections ?? []).map((section) => ({
      heading: section.heading,
      body: section.body,
      kind: 'traditional-interpretation' as const,
    })),
    actions: [],
    limitations: [
      '结构化事实已与本次本地引擎结果核对；传统解释、建议和现实效果没有被 claims 校验。',
      ...(envelope.data.timeSource?.notice ? [String(envelope.data.timeSource.notice)] : []),
    ],
    disclaimers: ['本分析为传统文化视角的文化参考，非绝对预测，请理性看待。'],
    provenance: {
      resultMeta: envelope.result_meta ?? null,
      warnings: envelope.warnings ?? [],
      timeBasis: envelope.data.timeSource?.timeBasis ?? null,
    },
  };
}
