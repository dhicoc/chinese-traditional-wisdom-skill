import { useState } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { InterpretationCard } from '@/components/shared/InterpretationCard';

/**
 * 梦境意象工作区
 * 基于传统解梦词库提供意象联想参考
 * 注意：用于自我观察，不做预言判断
 */

interface DreamSymbol {
  symbol: string;
  category: string;
  meanings: string[];
  emotion: string;
  context: string;
}

// 简化解梦词库（实际应用可扩展为完整数据库）
const DREAM_SYMBOLS: Record<string, DreamSymbol> = {
  '水': {
    symbol: '水',
    category: '自然',
    meanings: ['情感流动', '潜意识', '变化', '净化', '阻碍'],
    emotion: '平静/焦虑',
    context: '水的状态（清澈/浑浊/湍急）反映内心情绪状态',
  },
  '火': {
    symbol: '火',
    category: '自然',
    meanings: ['热情', '愤怒', '转变', '毁灭', '光明'],
    emotion: '激动/恐惧',
    context: '火的大小与可控性反映情绪的强度与管理',
  },
  '山': {
    symbol: '山',
    category: '自然',
    meanings: ['阻碍', '目标', '稳定', '挑战', '高度'],
    emotion: '敬畏/压力',
    context: '登山或遇山反映面对困难的态度',
  },
  '路': {
    symbol: '路',
    category: '场景',
    meanings: ['人生方向', '选择', '旅程', '未知', '目标'],
    emotion: '期待/迷茫',
    context: '路的宽窄、平坦与否反映对前途的感受',
  },
  '门': {
    symbol: '门',
    category: '场景',
    meanings: ['机会', '界限', '过渡', '选择', '未知'],
    emotion: '好奇/犹豫',
    context: '开门或关门反映对新事物的态度',
  },
  '飞': {
    symbol: '飞行',
    category: '动作',
    meanings: ['自由', '超越', '逃避', '理想', '失控'],
    emotion: '兴奋/恐惧',
    context: '飞行的高度与控制反映对自由的渴望或失控感',
  },
  '坠落': {
    symbol: '坠落',
    category: '动作',
    meanings: ['失控', '恐惧', '失败', '放下', '转变'],
    emotion: '恐惧/释然',
    context: '坠落的速度与结局反映对失去控制的态度',
  },
  '蛇': {
    symbol: '蛇',
    category: '动物',
    meanings: ['智慧', '危险', '转变', '诱惑', '治愈'],
    emotion: '恐惧/敬畏',
    context: '蛇在传统文化中既是危险也是智慧的象征',
  },
  '龙': {
    symbol: '龙',
    category: '动物',
    meanings: ['力量', '权威', '变化', '吉祥', '潜能'],
    emotion: '敬畏/兴奋',
    context: '龙为祥瑞之兽，象征内在潜能与变化力量',
  },
  '鱼': {
    symbol: '鱼',
    category: '动物',
    meanings: ['富足', '机遇', '灵动', '潜意识', '繁衍'],
    emotion: '愉悦/期待',
    context: '鱼游水中，常象征机遇与财富的流动',
  },
};

// 搜索梦境意象
function searchDreamSymbols(keyword: string): DreamSymbol[] {
  if (!keyword) return [];

  const results: DreamSymbol[] = [];
  const lowerKeyword = keyword.toLowerCase();

  Object.values(DREAM_SYMBOLS).forEach((symbol) => {
    if (
      symbol.symbol.includes(keyword) ||
      symbol.meanings.some((m) => m.includes(keyword)) ||
      symbol.category.includes(keyword)
    ) {
      results.push(symbol);
    }
  });

  return results;
}

// 获取随机推荐
function getRandomSymbols(count: number): DreamSymbol[] {
  const symbols = Object.values(DREAM_SYMBOLS);
  const shuffled = [...symbols].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function DreamWorkspace() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<DreamSymbol[]>([]);
  const [recommendations] = useState(() => getRandomSymbols(4));

  const handleSearch = () => {
    setResults(searchDreamSymbols(searchTerm));
  };

  return (
    <div className="space-y-6" data-testid="workspace-dream">
      {/* 头部说明 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">梦境意象</h2>
            <p className="text-sm text-jade-100/55">自我观察 · 非预言判断</p>
          </div>
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-500">
            民俗体验
          </span>
        </div>
      </div>

      {/* 搜索区 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <ControlField label="搜索梦境意象">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="输入梦境中的事物（如：水、山、飞行...）"
              className="flex-1 rounded-lg border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="rounded-lg bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-500 transition-colors hover:bg-purple-500/30"
            >
              搜索
            </button>
          </div>
        </ControlField>

        {/* 热门推荐 */}
        <div className="mt-4">
          <span className="text-xs text-jade-100/45">热门意象：</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.keys(DREAM_SYMBOLS).slice(0, 8).map((symbol) => (
              <button
                key={symbol}
                onClick={() => {
                  setSearchTerm(symbol);
                  setResults(searchDreamSymbols(symbol));
                }}
                className="rounded-full border border-jade-500/20 bg-ink-900/50 px-3 py-1 text-sm text-jade-100/55 transition-colors hover:border-jade-500/50 hover:text-jade-100/80"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 搜索结果 */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-jade-50">搜索结果</h3>
          {results.map((symbol) => (
            <div
              key={symbol.symbol}
              className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-purple-500">{symbol.symbol}</span>
                  <span className="rounded-full border border-jade-500/20 bg-ink-900/50 px-2 py-0.5 text-xs text-jade-100/55">
                    {symbol.category}
                  </span>
                </div>
                <span className="text-sm text-jade-100/45">情绪：{symbol.emotion}</span>
              </div>

              <div className="mb-3">
                <h4 className="mb-2 text-sm text-jade-100/55">可能含义</h4>
                <div className="flex flex-wrap gap-2">
                  {symbol.meanings.map((meaning) => (
                    <span
                      key={meaning}
                      className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-500"
                    >
                      {meaning}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
                <h4 className="mb-1 text-sm text-jade-100/55">解梦语境</h4>
                <p className="text-sm text-jade-100/70">{symbol.context}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 推荐意象 */}
      {!results.length && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-jade-50">推荐意象</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((symbol) => (
              <div
                key={symbol.symbol}
                className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xl font-bold text-purple-500">{symbol.symbol}</span>
                  <span className="text-xs text-jade-100/45">{symbol.category}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {symbol.meanings.slice(0, 3).map((meaning) => (
                    <span
                      key={meaning}
                      className="text-xs text-jade-100/55"
                    >
                      {meaning}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 解梦方法说明 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <h3 className="mb-3 text-base font-semibold text-jade-50">如何理解梦境</h3>
        <div className="grid gap-3 text-sm text-jade-100/55 md:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-1 text-jade-100/70">1. 记录细节</h4>
            <p>醒来立即记录梦境中的关键事物、情绪和场景</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-1 text-jade-100/70">2. 联想个人</h4>
            <p>意象含义因人而异，结合自身经历理解</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-1 text-jade-100/70">3. 关注情绪</h4>
            <p>梦中的情绪往往比内容本身更重要</p>
          </div>
        </div>
      </div>

      {/* 边界说明 */}
      <InterpretationCard title="使用说明" subtitle="自我观察">
        梦境意象分析基于传统文化中的象征体系，用于自我观察和情绪觉察。梦境解读具有高度主观性，不应作为决策依据或预言判断。如有持续困扰的梦境，建议咨询专业心理工作者。
      </InterpretationCard>
    </div>
  );
}
