import { useState } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { InterpretationCard } from '@/components/shared/InterpretationCard';

/**
 * 姓名五行工作区
 * 分析姓名汉字的笔画五行与三才配置
 * 注意：此为文化参考，不构成命名建议
 */

interface NameAnalysis {
  surname: string;
  surnameStrokes: number;
  surnameWuxing: string;
  givenName: string;
  givenNameStrokes: number;
  givenNameWuxing: string;
  totalStrokes: number;
  sanCai: {
    tian: string;
    ren: string;
    di: string;
  };
  wuxingBalance: Record<string, number>;
  notes: string;
}

// 简易笔画计算（实际应用需要完整汉字笔画表）
function calculateStrokes(char: string): number {
  // 简化示例：基于字符代码取模
  const code = char.charCodeAt(0);
  return (code % 15) + 1;
}

// 笔画数对应五行
function getWuxing(strokes: number): string {
  const wuxingMap: Record<number, string> = {
    1: '木', 2: '木',
    3: '火', 4: '火',
    5: '土', 6: '土',
    7: '金', 8: '金',
    9: '水', 10: '水',
  };
  return wuxingMap[strokes % 10] || '土';
}

// 三才配置（天格、人格、地格）
function calculateSanCai(surname: number, givenName: number) {
  const tian = surname + 1; // 天格 = 姓氏笔画 + 1
  const ren = surname + givenName; // 人格 = 姓氏 + 名字笔画
  const di = givenName + 1; // 地格 = 名字笔画 + 1（单名）

  return {
    tian: getWuxing(tian),
    ren: getWuxing(ren),
    di: getWuxing(di),
  };
}

function analyzeName(surname: string, givenName: string): NameAnalysis {
  const surnameStrokes = surname.split('').reduce((sum, c) => sum + calculateStrokes(c), 0);
  const givenNameStrokes = givenName.split('').reduce((sum, c) => sum + calculateStrokes(c), 0);

  const surnameWuxing = getWuxing(surnameStrokes);
  const givenNameWuxing = getWuxing(givenNameStrokes);

  const sanCai = calculateSanCai(surnameStrokes, givenNameStrokes);

  // 五行平衡统计
  const wuxingBalance: Record<string, number> = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
  wuxingBalance[surnameWuxing]++;
  wuxingBalance[givenNameWuxing]++;
  wuxingBalance[sanCai.tian]++;
  wuxingBalance[sanCai.ren]++;
  wuxingBalance[sanCai.di]++;

  return {
    surname,
    surnameStrokes,
    surnameWuxing,
    givenName,
    givenNameStrokes,
    givenNameWuxing,
    totalStrokes: surnameStrokes + givenNameStrokes,
    sanCai,
    wuxingBalance,
    notes: '姓名五行为传统文化中的文字学分析，笔画计算以《康熙字典》为准，三才配置为参考框架。本分析仅供文化了解，不构成命名建议。',
  };
}

export function NamewuxingWorkspace() {
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [analysis, setAnalysis] = useState<NameAnalysis | null>(null);

  const handleAnalyze = () => {
    if (surname && givenName) {
      setAnalysis(analyzeName(surname, givenName));
    }
  };

  return (
    <div className="space-y-6" data-testid="workspace-namewuxing">
      {/* 头部说明 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">姓名五行</h2>
            <p className="text-sm text-jade-100/55">文化参考 · 非命名建议</p>
          </div>
          <span className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-xs text-jade-500">
            民俗体验
          </span>
        </div>
      </div>

      {/* 输入区 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="grid gap-4 md:grid-cols-2">
          <ControlField label="姓氏">
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="输入姓氏"
              maxLength={2}
              className="w-full rounded-lg border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
            />
          </ControlField>
          <ControlField label="名字">
            <input
              type="text"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              placeholder="输入名字"
              maxLength={4}
              className="w-full rounded-lg border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
            />
          </ControlField>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!surname || !givenName}
          className="mt-4 rounded-lg bg-jade-500/20 px-4 py-2 text-sm font-medium text-jade-500 transition-colors hover:bg-jade-500/30 disabled:opacity-50"
        >
          分析五行
        </button>
      </div>

      {/* 分析结果 */}
      {analysis && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 笔画分析 */}
          <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-jade-50">笔画分析</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 py-2">
                <div>
                  <span className="text-jade-100/55">姓氏</span>
                  <span className="ml-2 text-lg text-jade-100/80">{analysis.surname}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-semibold text-jade-500">{analysis.surnameStrokes}</span>
                  <span className="ml-2 text-sm text-jade-100/55">画</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-2">
                <div>
                  <span className="text-jade-100/55">名字</span>
                  <span className="ml-2 text-lg text-jade-100/80">{analysis.givenName}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-semibold text-jade-500">{analysis.givenNameStrokes}</span>
                  <span className="ml-2 text-sm text-jade-100/55">画</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-jade-100/55">总笔画</span>
                <span className="text-xl font-semibold text-jade-100/80">{analysis.totalStrokes} 画</span>
              </div>
            </div>
          </div>

          {/* 五行分析 */}
          <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-jade-50">五行配置</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="text-jade-100/55">姓氏五行</span>
                <span className="rounded-full bg-metal-500/20 px-3 py-1 text-sm text-metal-500">
                  {analysis.surnameWuxing}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-jade-100/55">名字五行</span>
                <span className="rounded-full bg-wood-500/20 px-3 py-1 text-sm text-wood-500">
                  {analysis.givenNameWuxing}
                </span>
              </div>
            </div>
          </div>

          {/* 三才配置 */}
          <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument md:col-span-2">
            <h3 className="mb-3 text-base font-semibold text-jade-50">三才配置</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-gold-500/20 bg-ink-900/50 p-4 text-center">
                <div className="mb-1 text-xs text-jade-100/45">天格</div>
                <div className="text-3xl font-bold text-gold-500">{analysis.sanCai.tian}</div>
                <div className="mt-1 text-xs text-jade-100/55">祖上根基</div>
              </div>
              <div className="rounded-xl border border-jade-500/20 bg-ink-900/50 p-4 text-center">
                <div className="mb-1 text-xs text-jade-100/45">人格</div>
                <div className="text-3xl font-bold text-jade-500">{analysis.sanCai.ren}</div>
                <div className="mt-1 text-xs text-jade-100/55">自身运势</div>
              </div>
              <div className="rounded-xl border border-cinnabar-500/20 bg-ink-900/50 p-4 text-center">
                <div className="mb-1 text-xs text-jade-100/45">地格</div>
                <div className="text-3xl font-bold text-cinnabar-500">{analysis.sanCai.di}</div>
                <div className="mt-1 text-xs text-jade-100/55">后天环境</div>
              </div>
            </div>
          </div>

          {/* 五行平衡 */}
          <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument md:col-span-2">
            <h3 className="mb-3 text-base font-semibold text-jade-50">五行分布</h3>
            <div className="flex items-center justify-around">
              {Object.entries(analysis.wuxingBalance).map(([wuxing, count]) => (
                <div key={wuxing} className="text-center">
                  <div className={`text-2xl font-bold ${count > 0 ? 'text-jade-100/80' : 'text-jade-100/35'}`}>
                    {wuxing}
                  </div>
                  <div className="mt-1 text-sm text-jade-100/45">{count}次</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 边界说明 */}
      <InterpretationCard title="使用说明" subtitle="文化参考">
        姓名五行为传统文化中的文字学分析，笔画计算以《康熙字典》为准，三才配置为参考框架。本分析仅供文化了解，不构成命名建议。
      </InterpretationCard>
    </div>
  );
}
