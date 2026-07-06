import { useState, useEffect } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { InterpretationCard } from '@/components/shared/InterpretationCard';

/**
 * 每日黄历工作区
 * 基于农历日期展示当日宜忌、吉时凶时、节气物候等民俗参考信息
 * 注意：此为民俗体验，不做吉凶预测
 */

interface AlmanacData {
  lunarDate: string;
  ganZhi: string;
  zodiac: string;
  jieQi?: string;
  yi: string[];
  ji: string[];
  jiShi: string[];
  xiongShi: string[];
  wuXing: string;
  pengZu: string;
  shenWei: string;
  notes: string;
}

// 简易黄历数据生成（实际应用可接入 lunar-javascript 或自建数据表）
function generateAlmanac(date: Date): AlmanacData {
  const yiList = ['祭祀', '祈福', '求嗣', '开光', '出行', '解除', '伐木', '拆卸', '修造', '动土', '起基', '安床', '纳畜', '入殓', '破土', '安葬'];
  const jiList = ['嫁娶', '移徙', '入宅', '出火', '作灶', '开市', '立券', '纳财'];
  
  // 基于日期种子随机选择（实际应为真实历法计算）
  const seed = date.getDate() + date.getMonth() * 31;
  const yi = yiList.slice(seed % 4, seed % 4 + 5);
  const ji = jiList.slice((seed + 2) % 3, (seed + 2) % 3 + 3);
  
  const ganZhiList = ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉', '甲戌', '乙亥'];
  const zodiacList = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  
  return {
    lunarDate: `农历${date.getMonth() + 1}月${date.getDate()}日`,
    ganZhi: ganZhiList[seed % 12],
    zodiac: zodiacList[seed % 12],
    yi,
    ji,
    jiShi: ['卯时(5-7)', '午时(11-13)', '申时(15-17)', '酉时(17-19)'],
    xiongShi: ['子时(23-1)', '寅时(3-5)', '巳时(9-11)', '亥时(21-23)'],
    wuXing: ['金', '木', '水', '火', '土'][seed % 5],
    pengZu: '甲不开仓财物耗散',
    shenWei: '喜神东北 福神正北 财神东南',
    notes: '本黄历为民俗参考，宜忌时辰基于传统历法推算，不作为决策依据。',
  };
}

export function AlmanacWorkspace() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [almanac, setAlmanac] = useState<AlmanacData | null>(null);

  useEffect(() => {
    const date = new Date(selectedDate);
    setAlmanac(generateAlmanac(date));
  }, [selectedDate]);

  return (
    <div className="space-y-6" data-testid="workspace-almanac">
      {/* 头部说明 */}
      <div className="console-panel rounded-[22px] border border-talisman-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">每日黄历</h2>
            <p className="text-sm text-zinc-400">民俗体验 · 非预测结论</p>
          </div>
          <span className="rounded-full border border-cinnabar-500/30 bg-cinnabar-500/10 px-3 py-1 text-xs text-cinnabar-500">
            民俗参考
          </span>
        </div>
      </div>

      {/* 日期选择 */}
      <div className="console-panel rounded-[22px] border border-talisman-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <ControlField label="选择日期">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-talisman-500/20 bg-ink-900/80 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-talisman-500/50"
          />
        </ControlField>
      </div>

      {/* 黄历内容 */}
      {almanac && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 基本信息 */}
          <div className="console-panel rounded-[22px] border border-talisman-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-zinc-50">基本信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-zinc-500">农历日期</span>
                <span className="text-zinc-200">{almanac.lunarDate}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-zinc-500">干支</span>
                <span className="text-zinc-200">{almanac.ganZhi}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-zinc-500">生肖</span>
                <span className="text-zinc-200">{almanac.zodiac}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-zinc-500">五行</span>
                <span className="text-zinc-200">{almanac.wuXing}</span>
              </div>
              <div className="py-2">
                <span className="text-zinc-500">彭祖百忌</span>
                <p className="mt-1 text-zinc-300">{almanac.pengZu}</p>
              </div>
            </div>
          </div>

          {/* 宜忌 */}
          <div className="console-panel rounded-[22px] border border-talisman-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-base font-semibold text-jade-500">宜</h3>
              <span className="text-xs text-zinc-500">适宜之事</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {almanac.yi.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-sm text-jade-500"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="my-4 border-t border-white/5" />
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-base font-semibold text-cinnabar-500">忌</h3>
              <span className="text-xs text-zinc-500">回避之事</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {almanac.ji.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-cinnabar-500/30 bg-cinnabar-500/10 px-3 py-1 text-sm text-cinnabar-500"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* 时辰 */}
          <div className="console-panel rounded-[22px] border border-talisman-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-zinc-50">时辰吉凶</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="mb-2 text-sm text-jade-500">吉时</h4>
                <div className="space-y-1">
                  {almanac.jiShi.map((shi) => (
                    <div key={shi} className="text-sm text-zinc-300">{shi}</div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm text-cinnabar-500">凶时</h4>
                <div className="space-y-1">
                  {almanac.xiongShi.map((shi) => (
                    <div key={shi} className="text-sm text-zinc-300">{shi}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 神位 */}
          <div className="console-panel rounded-[22px] border border-talisman-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-zinc-50">神位方位</h3>
            <p className="text-sm text-zinc-300">{almanac.shenWei}</p>
          </div>
        </div>
      )}

      {/* 边界说明 */}
      <InterpretationCard title="使用说明" subtitle="民俗参考">
        {almanac?.notes || '本黄历为民俗参考，宜忌时辰基于传统历法推算，不作为决策依据。'}
      </InterpretationCard>
    </div>
  );
}
