# 五运六气集成指南

> 本文件指导如何集成 wuyun-liuqi 项目的 calculate_yunqi_api.py，用于"中医"维度的气候-体质-疾病趋势分析。

---

## 概览

**项目地址**：https://github.com/dhicoc/wuyun-liuqi-skills

**核心脚本**：`calculate_yunqi_api.py`（Python，依赖 lunar-python 库）

**能力**：推算任意日期的五运六气参数，包括岁运、司天、在泉、主气、客气、客主加临等。

---

## 集成方式

### 前置条件

```bash
pip install lunar-python
```

### 调用方式

```python
import sys
sys.path.insert(0, '/path/to/wuyun-liuqi-skills/scripts')
from calculate_yunqi_api import calculate_yunqi

# 输入：日期字符串
result = calculate_yunqi('2026-06-28')

# 输出（JSON 字典）：
# {
#   "date": "2026-06-28",
#   "year_gan_zhi": "丙午",
#   "suiyun": {"yun": "水运太过", "wuxing": "水", "excess_deficit": "太过"},
#   "sitian": "少阴君火",
#   "zaiquan": "阳明燥金",
#   "current_step": {  # 当前步气
#     "step_index": 3,  # 三之气
#     "keqi": "少阳相火",
#     "zhuqi": "少阳相火",
#     "relation": "同气"  # 客主加临关系
#   },
#   "disease_tendency": "肾病、心系疾病高发",  # 疾病倾向
#   "health_advice": "宜温阳利水，慎寒凉..."  # 养生建议
# }
```

### 从非 Python 环境调用

如需从 Node.js/其他环境调用，可用 subprocess：

```bash
python /path/to/calculate_yunqi_api.py --date 2026-06-28
# 输出 JSON 到 stdout
```

Windows 中文输出需设置：
```bash
set PYTHONIOENCODING=utf-8
python -X utf8 /path/to/calculate_yunqi_api.py --date 2026-06-28
```

---

## 关键概念速查

### 五运（岁运）

| 天干 | 五运 | 过/不及 |
|------|------|---------|
| 甲己 | 土运 | 甲太过，己不及 |
| 乙庚 | 金运 | 庚太过，乙不及 |
| 丙辛 | 水运 | 丙太过，辛不及 |
| 丁壬 | 木运 | 壬太过，丁不及 |
| 戊癸 | 火运 | 戊太过，癸不及 |

阳干为太过（力量过盛），阴干为不及（力量不足）。

### 六气（司天在泉）

| 地支 | 司天（上半年） | 在泉（下半年） |
|------|--------------|--------------|
| 子午 | 少阴君火 | 阳明燥金 |
| 丑未 | 太阴湿土 | 太阳寒水 |
| 寅申 | 少阳相火 | 厥阴风木 |
| 卯酉 | 阳明燥金 | 少阴君火 |
| 辰戌 | 太阳寒水 | 太阴湿土 |
| 巳亥 | 厥阴风木 | 少阳相火 |

### 六步主气（固定不变）

| 步次 | 时间 | 主气 |
|------|------|------|
| 初之气 | 大寒～春分 | 厥阴风木 |
| 二之气 | 春分～小满 | 少阴君火 |
| 三之气 | 小满～大暑 | 少阳相火 |
| 四之气 | 大暑～秋分 | 太阴湿土 |
| 五之气 | 秋分～小雪 | 阳明燥金 |
| 终之气 | 小雪～大寒 | 太阳寒水 |

---

## 大寒定年规则

**重要**：五运六气的"年"以大寒为界，不是立春或元旦。

- 查询日期在 1 月 1 日～大寒（约 1 月 20 日）之间的，应使用**前一年**的天干地支
- 大寒之后才使用当年的天干地支
- lunar-python 的 JieQiTable 中大寒返回的是 Solar 对象，需用 isinstance 判断

```python
from lunar_python import Solar, Lunar
# 获取某年的大寒节气日期
lunar = Lunar.fromSolar(Solar.fromYmd(2026, 1, 15), 1)
# 需要查询 2025 年的 JieQiTable 来获取大寒日期
```

---

## RAG 资产集成

wuyun-liuqi 项目包含 7 个 RAG asset JSON 文件，可与五运六气推算结果配合使用：

| Asset | 文件名 | 用途 |
|-------|--------|------|
| asset1 | suiyun_disease_mechanism | 岁运病机分析 |
| asset2 | liuqi_six_step_disease | 六气六步病机 |
| asset3 | kezhujialin_prognosis | 客主加临预后 |
| asset4 | sitian_zaiquan | 司天在泉影响 |
| asset5 | zangfu_correspondence | 脏腑对应 |
| asset6 | treatment_principle | 治法方剂 |
| asset7 | suiyun_constitution_guide | 岁运体质调养 |

检索键格式：
- 岁运：`{suiyun_code}`（如 `water_excess`）
- 体质调养：`{suiyun_code}_constitution_guide`
- 客主加临：`{keqi}_{zhuqi}`（如 `shaoyang_xianghuo_shaoyang_xianghuo`）

---

## 在咨询中的使用

### 健康养生（场景 A）

1. 调用 calculate_yunqi 获取当日五运六气
2. 根据 suiyun（岁运）判断全年体质偏颇趋势
3. 根据 current_step（当前步气）判断近期疾病倾向
4. 查 RAG asset 获取对应的病机分析和调养建议
5. 结合用户体质，给出个性化建议

### 事业决策（场景 B）

- 五运六气主要影响健康维度，对事业决策的直接影响较小
- 但可从"天人合一"角度，分析当前气候对身心状态的影响
- 大运转换期可参考运气变化做择时建议

### 婚恋合婚（场景 C）

- 双方出生年的五运六气可作为体质互补的参考维度
- 水运太过者偏寒，火运太过者偏热，寒热互补为佳

---

## 验证脚本

```bash
cd /path/to/wuyun-liuqi-skills
python verify_expansion.py
# 预期输出：67/67 全通过
```

验证内容包括大寒边界回归测试、RAG 检索键匹配、客主加临关系判定等。

---

## 注意事项

- 五运六气提供的是气候-疾病趋势参考，非个体化医疗诊断
- 岁运判断全年趋势，六气细分到每步约 60 天
- 大寒定年是关键技术点，务必正确处理边界
- lunar-python 的 JieQiTable 值是 Solar 对象不是字符串，需 isinstance 判断
- 所有健康建议必须遵守 RULES.md 医疗红线：先建议就医，再谈养生
