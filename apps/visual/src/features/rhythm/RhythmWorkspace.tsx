import { useState } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { InterpretationCard } from '@/components/shared/InterpretationCard';

/**
 * 每日节律工作区
 * 展示十二时辰与经络气血流注的对应关系
 * 提供养生节律参考
 */

interface ShiChen {
  name: string;
  time: string;
  hours: string;
  meridian: string;
  organ: string;
  function: string;
  advice: string;
  wuxing: string;
}

const SHI_CHEN_DATA: ShiChen[] = [
  {
    name: '子时',
    time: '23:00 - 01:00',
    hours: '23-1',
    meridian: '胆经',
    organ: '胆',
    function: '胆汁代谢，阳气初生',
    advice: '深度睡眠，养胆气',
    wuxing: '水',
  },
  {
    name: '丑时',
    time: '01:00 - 03:00',
    hours: '1-3',
    meridian: '肝经',
    organ: '肝',
    function: '肝血回流，解毒修复',
    advice: '熟睡养肝，忌熬夜',
    wuxing: '木',
  },
  {
    name: '寅时',
    time: '03:00 - 05:00',
    hours: '3-5',
    meridian: '肺经',
    organ: '肺',
    function: '气血重新分配',
    advice: '深度睡眠，养肺气',
    wuxing: '金',
  },
  {
    name: '卯时',
    time: '05:00 - 07:00',
    hours: '5-7',
    meridian: '大肠经',
    organ: '大肠',
    function: '排毒排便，阳气上升',
    advice: '起床排便，喝温水',
    wuxing: '金',
  },
  {
    name: '辰时',
    time: '07:00 - 09:00',
    hours: '7-9',
    meridian: '胃经',
    organ: '胃',
    function: '消化吸收，气血旺盛',
    advice: '吃早餐，易消化',
    wuxing: '土',
  },
  {
    name: '巳时',
    time: '09:00 - 11:00',
    hours: '9-11',
    meridian: '脾经',
    organ: '脾',
    function: '运化水谷，生化气血',
    advice: '工作学习，忌久坐',
    wuxing: '土',
  },
  {
    name: '午时',
    time: '11:00 - 13:00',
    hours: '11-13',
    meridian: '心经',
    organ: '心',
    function: '血液循环，阳气最盛',
    advice: '午餐小憩，养心气',
    wuxing: '火',
  },
  {
    name: '未时',
    time: '13:00 - 15:00',
    hours: '13-15',
    meridian: '小肠经',
    organ: '小肠',
    function: '分清泌浊，吸收营养',
    advice: '适度活动，助消化',
    wuxing: '火',
  },
  {
    name: '申时',
    time: '15:00 - 17:00',
    hours: '15-17',
    meridian: '膀胱经',
    organ: '膀胱',
    function: '排毒代谢，精力下降',
    advice: '多喝水，适度运动',
    wuxing: '水',
  },
  {
    name: '酉时',
    time: '17:00 - 19:00',
    hours: '17-19',
    meridian: '肾经',
    organ: '肾',
    function: '藏精蓄锐，准备休养',
    advice: '晚餐清淡，忌过劳',
    wuxing: '水',
  },
  {
    name: '戌时',
    time: '19:00 - 21:00',
    hours: '19-21',
    meridian: '心包经',
    organ: '心包',
    function: '保护心脏，情绪平稳',
    advice: '放松身心，忌激动',
    wuxing: '火',
  },
  {
    name: '亥时',
    time: '21:00 - 23:00',
    hours: '21-23',
    meridian: '三焦经',
    organ: '三焦',
    function: '通调水道，准备入眠',
    advice: '准备睡觉，忌熬夜',
    wuxing: '水',
  },
];

// 获取当前时辰
function getCurrentShiChen(): ShiChen | null {
  const hour = new Date().getHours();
  return SHI_CHEN_DATA.find((sc) => {
    const [start, end] = sc.hours.split('-').map(Number);
    if (start > end) {
      // 跨午夜的情况（如23-1）
      return hour >= start || hour < end;
    }
    return hour >= start && hour < end;
  }) || null;
}

// 五行颜色映射
const WUXING_COLORS: Record<string, string> = {
  '金': '#e5e5e5',
  '木': '#2a9d75',
  '水': '#2f80c8',
  '火': '#dd5836',
  '土': '#c9b27a',
};

export function RhythmWorkspace() {
  const [currentShiChen] = useState(() => getCurrentShiChen());
  const [selectedShiChen, setSelectedShiChen] = useState<ShiChen | null>(null);

  return (
    <div className="space-y-6" data-testid="workspace-rhythm">
      {/* 头部说明 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">每日节律</h2>
            <p className="text-sm text-jade-100/55">十二时辰与经络养生</p>
          </div>
          <span className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-xs text-jade-500">
            养生参考
          </span>
        </div>
      </div>

      {/* 当前时辰 */}
      {currentShiChen && (
        <div className="console-panel rounded-[22px] border border-jade-500/30 bg-jade-500/5 p-4 shadow-instrument">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span className="text-xs text-jade-500">当前时辰</span>
              <h3 className="text-2xl font-bold text-jade-50">{currentShiChen.name}</h3>
            </div>
            <div className="text-right">
              <div className="text-sm text-jade-100/55">{currentShiChen.time}</div>
              <div
                className="mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: `${WUXING_COLORS[currentShiChen.wuxing]}20`,
                  color: WUXING_COLORS[currentShiChen.wuxing],
                }}
              >
                {currentShiChen.wuxing} · {currentShiChen.meridian}
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
              <h4 className="mb-1 text-sm text-jade-100/55">生理活动</h4>
              <p className="text-sm text-jade-100/80">{currentShiChen.function}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
              <h4 className="mb-1 text-sm text-jade-100/55">养生建议</h4>
              <p className="text-sm text-jade-500">{currentShiChen.advice}</p>
            </div>
          </div>
        </div>
      )}

      {/* 时辰选择器 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <h3 className="mb-4 text-base font-semibold text-jade-50">十二时辰</h3>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
          {SHI_CHEN_DATA.map((sc) => (
            <button
              key={sc.name}
              onClick={() => setSelectedShiChen(sc)}
              className={`rounded-lg border p-3 text-left transition-all ${
                selectedShiChen?.name === sc.name
                  ? 'border-jade-500/50 bg-jade-500/10'
                  : 'border-jade-500/20 bg-ink-900/50 hover:border-jade-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-jade-100/80">{sc.name}</span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: WUXING_COLORS[sc.wuxing] }}
                />
              </div>
              <div className="mt-1 text-xs text-jade-100/45">{sc.hours}时</div>
              <div className="mt-1 text-xs" style={{ color: WUXING_COLORS[sc.wuxing] }}>
                {sc.meridian}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 选中时辰详情 */}
      {selectedShiChen && (
        <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-jade-50">{selectedShiChen.name}</h3>
              <p className="text-sm text-jade-100/55">{selectedShiChen.time}</p>
            </div>
            <div
              className="rounded-full px-4 py-2 text-lg font-bold"
              style={{
                backgroundColor: `${WUXING_COLORS[selectedShiChen.wuxing]}20`,
                color: WUXING_COLORS[selectedShiChen.wuxing],
              }}
            >
              {selectedShiChen.wuxing}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
                <h4 className="mb-1 text-sm text-jade-100/55">当令经络</h4>
                <p className="text-lg font-medium text-jade-100/80">{selectedShiChen.meridian}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
                <h4 className="mb-1 text-sm text-jade-100/55">对应脏腑</h4>
                <p className="text-lg font-medium text-jade-100/80">{selectedShiChen.organ}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
                <h4 className="mb-1 text-sm text-jade-100/55">生理功能</h4>
                <p className="text-sm text-jade-100/70">{selectedShiChen.function}</p>
              </div>
              <div className="rounded-lg border border-jade-500/20 bg-jade-500/5 p-3">
                <h4 className="mb-1 text-sm text-jade-500">养生建议</h4>
                <p className="text-sm text-jade-400">{selectedShiChen.advice}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 养生原则 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <h3 className="mb-3 text-base font-semibold text-jade-50">养生节律原则</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-2 text-sm font-medium text-jade-500">顺应天时</h4>
            <p className="text-xs text-jade-100/55">日出而作，日落而息。白天阳气盛宜活动，夜晚阴气盛宜休息。</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-2 text-sm font-medium text-jade-500">因时养生</h4>
            <p className="text-xs text-jade-100/55">不同时辰对应不同脏腑，在当令时辰养护对应脏腑效果最佳。</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-2 text-sm font-medium text-jade-500">平衡作息</h4>
            <p className="text-xs text-jade-100/55">保持规律作息，避免长期熬夜或饮食不节，维护气血正常运行。</p>
          </div>
        </div>
      </div>

      {/* 边界说明 */}
      <InterpretationCard title="使用说明" subtitle="养生参考">
        十二时辰养生理论源自《黄帝内经》经络学说，为传统中医养生参考。个人体质差异较大，如有健康问题请咨询专业医师。本工具仅供养生节律了解，不做医疗诊断。
      </InterpretationCard>
    </div>
  );
}
