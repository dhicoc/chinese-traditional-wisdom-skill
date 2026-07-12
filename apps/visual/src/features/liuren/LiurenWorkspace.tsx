import { useMemo, useState } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { useBirth } from '@/lib/birthContext';
import { calcDaliurenEnveloped, type DaliurenResult } from '@/legacy/daliurenEngine';
import { toFourLayer, type LayerReport, type ReadingLike } from '@/legacy/reportLayers';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 大六壬工作区。
 * 天地盘 12 宫方阵 + 四课 + 三传 + 神煞 + 四层报告。
 */

const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 天将简码→全称 */
const JIANG_FULL: Record<string, string> = {
  '贵': '贵人', '蛇': '螣蛇', '雀': '朱雀', '合': '六合',
  '勾': '勾陈', '龙': '青龙', '空': '天空', '虎': '白虎',
  '常': '太常', '玄': '玄武', '阴': '太阴', '后': '天后',
};

/** 关系中文 */
const RELATION_TEXT: Record<string, string> = {
  '上克下': '上克下', '下贼上': '下贼上', '比和': '比和',
  '上生下': '上生下', '下生上': '下生上',
};

export function LiurenWorkspace() {
  const { birth } = useBirth();
  const [legacyReady] = useState(true); // 大六壬是纯 TS，不依赖 legacy 脚本加载

  const result = useMemo<{ envelope: ToolEnvelope<DaliurenResult> | null; loading: boolean }>(() => {
    try {
      const solarEntry = typeof window !== 'undefined' ? (window as unknown as { Solar?: unknown }).Solar : undefined;
      const env = calcDaliurenEnveloped({ birth, solar: solarEntry ?? null });
      return { envelope: env, loading: false };
    } catch {
      return { envelope: null, loading: false };
    }
  }, [birth]);

  const fourLayer = useMemo<LayerReport | null>(() => {
    if (!result.envelope) return null;
    return toFourLayer(result.envelope.data.export_snapshot as ReadingLike);
  }, [result.envelope]);

  const data = result.envelope?.data;

  if (result.loading) {
    return (
      <section className="space-y-4">
        <LoadingSkeleton label="正在排盘" />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-4">
        <InterpretationCard title="暂无结果" subtitle="请确认生辰">
          <p className="text-sm text-jade-100/55">大六壬需完整生辰信息，请在顶部「全局生辰」面板填写。</p>
        </InterpretationCard>
      </section>
    );
  }

  const { basicInfo, tianDiPan, siKe, sanChuan, shenSha } = data;
  const birthSummary = `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')} ${String(birth.hour).padStart(2, '0')}:00`;

  const contextPayload = useMemo(() => ({
    module: 'liuren',
    mode: data.mode,
    birth: { year: birth.year, gender: birth.gender },
    dayGanZhi: basicInfo.dayGanZhi,
    hourGanZhi: basicInfo.hourGanZhi,
    geJu: `${sanChuan.geJu}·${sanChuan.geJuDetail}`,
    sanChuan: `${sanChuan.chuChuan.diZhi}→${sanChuan.zhongChuan.diZhi}→${sanChuan.moChuan.diZhi}`,
  }), [data, birth, basicInfo, sanChuan]);

  return (
    <section className="space-y-4">
      {/* 头部 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">大六壬</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              六壬神课：以月将加占时起天地盘，推四课三传，据九宗门格局断事态吉凶与应期。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="liuren" title="大六壬上下文" payload={contextPayload} />
            <ExportReportButton module="大六壬" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* 左侧：基本信息 + 排盘状态 */}
        <aside className="space-y-4">
          <InterpretationCard
            title="排盘信息"
            badge={data.mode === 'local-exact' ? '真实排盘' : '近似排盘'}
            items={[
              { label: '生辰', value: birthSummary },
              { label: '日干支', value: basicInfo.dayGanZhi },
              { label: '时干支', value: basicInfo.hourGanZhi },
              { label: '昼夜', value: basicInfo.dayNight + '占' },
              { label: '节气', value: basicInfo.jieqi || '—' },
              { label: '月将', value: `${tianDiPan.yueJiangName}（${tianDiPan.yueJiang}）` },
            ]}
          />
          <InterpretationCard
            title="神煞"
            items={[
              { label: '日马', value: shenSha.riMa },
              { label: '月马', value: shenSha.yueMa },
              { label: '丁马', value: shenSha.dingMa },
              { label: '华盖', value: shenSha.huaGai },
              { label: '闪电', value: shenSha.shanDian },
            ]}
          />
          {fourLayer && (
            <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <FourLayerReport report={fourLayer} title="四层报告（总结·亮点·详析·建议）" />
            </div>
          )}
        </aside>

        {/* 右侧：天地盘 + 四课 + 三传 */}
        <div className="space-y-4">
          {/* 天地盘 12 宫方阵 */}
          <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-lg font-semibold text-jade-50">天地盘</h3>
            <p className="mb-3 text-xs text-jade-100/45">
              月将{tianDiPan.yueJiangName}（{tianDiPan.yueJiang}）加{basicInfo.hourGanZhi[1]}时。每格：上为天盘地支+天将，下为地盘地支。
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {DI_ZHI.map((dz) => {
                const tp = tianDiPan.diToTian[dz] ?? '';
                const jiang = tianDiPan.diToJiang[dz] ?? '';
                const isChuan = [sanChuan.chuChuan.diZhi, sanChuan.zhongChuan.diZhi, sanChuan.moChuan.diZhi].includes(dz);
                return (
                  <div
                    key={dz}
                    className={`rounded-card border p-2 text-center ${isChuan ? 'border-gold-500/40 bg-gold-500/10' : 'border-white/8 bg-black/30'}`}
                  >
                    <div className="font-serif text-base text-jade-100">{tp}</div>
                    <div className="text-[10px] text-jade-400/70">{JIANG_FULL[jiang] ?? jiang}</div>
                    <div className="mt-1 text-[10px] text-jade-100/35">— {dz}</div>
                  </div>
                );
              })}
            </div>
            {(() => {
              const chuIdx = DI_ZHI.indexOf(sanChuan.chuChuan.diZhi);
              const zhongIdx = DI_ZHI.indexOf(sanChuan.zhongChuan.diZhi);
              const moIdx = DI_ZHI.indexOf(sanChuan.moChuan.diZhi);
              return (
                <p className="mt-2 text-[11px] text-gold-400/60">
                  ★ 高亮格为三传：初传{sanChuan.chuChuan.diZhi}（{DI_ZHI[chuIdx]}宫）→ 中传{sanChuan.zhongChuan.diZhi}（{DI_ZHI[zhongIdx]}宫）→ 末传{sanChuan.moChuan.diZhi}（{DI_ZHI[moIdx]}宫）
                </p>
              );
            })()}
          </div>

          {/* 四课 */}
          <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-lg font-semibold text-jade-50">四课</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {siKe.list.map((ke) => (
                <div key={ke.position} className="rounded-card border border-white/8 bg-black/30 p-2 text-center">
                  <p className="text-[10px] text-jade-100/45">第{ke.position}课</p>
                  <p className="mt-1 font-serif text-base text-jade-100">{ke.shangShen} <span className="text-[10px] text-jade-100/35">上</span></p>
                  <p className="font-serif text-base text-jade-100/70">{ke.xiaShen} <span className="text-[10px] text-jade-100/35">下</span></p>
                  <p className={`mt-1 text-[10px] ${ke.relation === '下贼上' ? 'text-cinnabar-400' : ke.relation === '上克下' ? 'text-cinnabar-300' : 'text-jade-100/40'}`}>
                    {RELATION_TEXT[ke.relation] ?? ke.relation}
                  </p>
                  <p className="text-[10px] text-jade-400/60">{JIANG_FULL[ke.tianJiang] ?? ke.tianJiang}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 三传 + 格局 */}
          <div className="console-panel rounded-[22px] border border-gold-500/20 bg-gold-500/6 p-4 shadow-instrument">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-jade-50">三传</h3>
              <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs text-gold-400">
                {sanChuan.geJu}·{sanChuan.geJuDetail}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: '初传', chuan: sanChuan.chuChuan },
                { label: '中传', chuan: sanChuan.zhongChuan },
                { label: '末传', chuan: sanChuan.moChuan },
              ].map(({ label, chuan }) => (
                <div key={label} className="rounded-card border border-gold-500/15 bg-black/30 p-3 text-center">
                  <p className="text-[10px] text-gold-400/60">{label}</p>
                  <p className="mt-1 font-serif text-xl text-gold-200">{chuan.diZhi}</p>
                  <p className="mt-1 text-[11px] text-jade-100/55">{JIANG_FULL[chuan.tianJiang] ?? chuan.tianJiang}</p>
                  <p className="text-[10px] text-jade-100/40">{chuan.liuQin}</p>
                  {chuan.xunKong && <p className="text-[10px] text-cinnabar-400/60">空亡</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
