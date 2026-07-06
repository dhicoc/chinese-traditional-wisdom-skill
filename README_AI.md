# Chinese Traditional Wisdom AI Agent Workflow

> **这是 AI Agent 的配置引导文件。如果你是 AI Agent，严格按以下流程执行。**

## 0. 安装与核心执行流程

> **AI Agent 请严格按以下流程执行。人类用户可参考「安装说明」手动操作。**

---

### 0.1 安装说明（人类用户手动安装用）

=== Chinese Traditional Wisdom AI Agent Workflow - Setup ===

[1/3] Installing Python dependencies...
Defaulting to user installation because normal site-packages is not writeable
Requirement already satisfied: lunar-python>=1.0.11 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from -r requirements.txt (line 5)) (1.4.8)
Requirement already satisfied: iztro-py>=0.1.0 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from -r requirements.txt (line 8)) (0.3.4)
Collecting ichingshifa>=0.1.0 (from -r requirements.txt (line 9))
  Downloading ichingshifa-3.1.9-py3-none-any.whl.metadata (13 kB)
Requirement already satisfied: requests>=2.28.0 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from -r requirements.txt (line 12)) (2.32.5)
Requirement already satisfied: pydantic>=2.0.0 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from iztro-py>=0.1.0->-r requirements.txt (line 8)) (2.12.5)
Requirement already satisfied: python-dateutil>=2.8.0 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from iztro-py>=0.1.0->-r requirements.txt (line 8)) (2.9.0.post0)
Requirement already satisfied: lunarcalendar>=0.0.9 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from iztro-py>=0.1.0->-r requirements.txt (line 8)) (0.0.9)
Requirement already satisfied: charset_normalizer<4,>=2 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from requests>=2.28.0->-r requirements.txt (line 12)) (3.4.3)
Requirement already satisfied: idna<4,>=2.5 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from requests>=2.28.0->-r requirements.txt (line 12)) (3.10)
Requirement already satisfied: urllib3<3,>=1.21.1 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from requests>=2.28.0->-r requirements.txt (line 12)) (2.5.0)
Requirement already satisfied: certifi>=2017.4.17 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from requests>=2.28.0->-r requirements.txt (line 12)) (2025.8.3)
Requirement already satisfied: ephem>=3.7.5.3 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from lunarcalendar>=0.0.9->iztro-py>=0.1.0->-r requirements.txt (line 8)) (4.2.1)
Requirement already satisfied: pytz in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from lunarcalendar>=0.0.9->iztro-py>=0.1.0->-r requirements.txt (line 8)) (2026.2)
Requirement already satisfied: annotated-types>=0.6.0 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from pydantic>=2.0.0->iztro-py>=0.1.0->-r requirements.txt (line 8)) (0.7.0)
Requirement already satisfied: pydantic-core==2.41.5 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from pydantic>=2.0.0->iztro-py>=0.1.0->-r requirements.txt (line 8)) (2.41.5)
Requirement already satisfied: typing-extensions>=4.14.1 in C:\Python313\Lib\site-packages (from pydantic>=2.0.0->iztro-py>=0.1.0->-r requirements.txt (line 8)) (4.15.0)
Requirement already satisfied: typing-inspection>=0.4.2 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from pydantic>=2.0.0->iztro-py>=0.1.0->-r requirements.txt (line 8)) (0.4.2)
Requirement already satisfied: six>=1.5 in C:\Users\DELL\AppData\Roaming\Python\Python313\site-packages (from python-dateutil>=2.8.0->iztro-py>=0.1.0->-r requirements.txt (line 8)) (1.17.0)
Downloading ichingshifa-3.1.9-py3-none-any.whl (38 kB)
Installing collected packages: ichingshifa
Successfully installed ichingshifa-3.1.9

[2/3] Setup complete!

Quick start:
  python scripts/bazi_calc.py 1990-05-15 --gender male --hour 15
  python scripts/yunqi_calc.py 2026
  python scripts/full_consultation.py 1990-05-15

Or open visual/index.html for the Web Dashboard



---

### 0.2 AI Agent 自动安装与配置（AI 读完本文件后立即执行）

> **AI Agent 执行以下流程，用户无需手动操作。**

```text
0. 检测本包实际路径：由当前文件所在目录推导，记为 <SKILL_ROOT>
1. 验证包结构完整性：
   - 必须存在：SKILL.md, RULES.md, tool-index.md
   - 必须存在：bootstrap/ 目录及至少 3 个引擎引导文件
   - 必须存在：visual/index.html 和 visual/test-runner.html
2. 读取 SKILL.md → 理解三层路由（问题类型 → 学科 → 融合深度）
3. 读取 RULES.md → 理解行为规则（§9 Fail-Two / §10 输入完整性）
4. 读取 tool-index.md → 确认各引擎安装状态
5. 读取用户问题 → 匹配最佳路由路径
6. 如需可视化 → 询问用户选择模式 A（静态 HTML 报告）或模式 B（Web Dashboard）
7. 开始执行任务
```

## 1. 三层路由矩阵

| 维度 | 分类 | 路由逻辑 |
|------|------|---------|
| 问题类型 | 健康 / 事业 / 婚恋 / 占卜 / 综合 | 匹配最佳咨询场景模板 |
| 学科 | 八字 / 紫微 / 六爻 / 梅花 / 五运六气 / 体质 / 风水 | 调用对应推算引擎 |
| 融合深度 | 单一学科 / 跨学科交叉 / 儒释道整体智慧 | 决定知识引用范围 |

### 路由决策逻辑

```
if 用户明确学科 → 直接进入该学科引擎
elif 用户提到问题类型 → 匹配场景 → 推荐学科组合
elif 综合咨询 → 八字 + 紫微 + 体质 + 五运六气（全量）
else → 提示用户提供更多信息（参照 §10 输入完整性）
```

## 2. 六引擎架构

| 引擎 | 类型 | 安装方式 | 用途 |
|------|------|---------|------|
| 八字 | npm | `npm install bazi-ziwei-skill` | 四柱/十神/大运/流年 |
| 紫微斗数 | PyPI | `pip install iztro-py` | 十二宫/主星/四化 |
| 六爻 | 内置本地引擎 / 可选 PyPI | Dashboard 已内置 `liuyao-engine.js`；命令行可选 `pip install ichingshifa` | 纳甲/六亲/世应/六神 |
| 梅花易数 | GitHub | 克隆 meihua-yishu 仓库 | 体用/生克/卦气 |
| 五运六气 | API | 大寒 API 调用 | 岁运/客气/司天在泉 |
| 体质 | 问卷 | N/A | 九种体质辨识 |

### 引擎调用优先级

1. **纯 JS 本地引擎**（visual/js/engines/）：双击 visual/index.html 即可运行，零依赖
2. **系统已安装引擎**：查 tool-index.md 确认本地可用
3. **引擎缺失**：按 bootstrap/ 目录下引导文件接入，询问用户是否安装


## 2.1 能力边界声明

AI Agent 输出结论时必须区分以下四类状态：

| 状态 | 说明 | 当前模块 |
|------|------|----------|
| 本地规则计算 | 浏览器内确定性规则，可复现 | 流年飞星、八宅、风水罗盘 |
| 本地近似计算 | 离线可用，但节气/历法存在简化 | 八字、五运六气 |
| 演示数据 | 仅用于可视化结构展示 | 紫微、六爻、梅花 |
| 需外部引擎 | 真实排盘必须接入外部库或人工规则 | 紫微、六爻、梅花精算 |

Dashboard 中可通过 `window.FORTUNE.getCapabilities()` 获取能力状态，通过 `window.FORTUNE.exportReportData()` 获取脱敏 `REPORT_DATA` 快照。`REPORT_DATA` v0.2 新增 `version`、`generatedAt`、`sourceNotes`，旧字段保持兼容。
## 3. 可视化报告生成

### 模式 A：静态 HTML 报告（对话内联）

```markdown
1. 打开 templates/visual-report.md
2. 将推算结果填充到 REPORT_DATA JSON 区块，并保留 `version`、`generatedAt`、`sourceNotes`
3. 取消不需要的模块注释（如 ziwei/liuyao 等）
4. 保存为独立 .html 文件
5. 在对话中呈现文字报告摘要 + 提供 HTML 文件链接
```

### 模式 B：交互式 Web Dashboard

```markdown
1. 引导用户双击打开 visual/index.html
2. 或在浏览器中打开 file://<SKILL_ROOT>/visual/index.html
3. 用户可在 11 个标签页间切换浏览
4. 支持全局搜索、标签页数据联动
```

## 4. 关键入口文件

| 文件 | 用途 |
|------|------|
| [SKILL.md](SKILL.md) | 总控入口 + 三层路由契约 |
| [RULES.md](RULES.md) | 行为规则链（必读） |
| [tool-index.md](tool-index.md) | 引擎安装状态与备用方案 |
| [EVOLUTION.md](EVOLUTION.md) | 演进记录与架构决策 |
| [bootstrap/](bootstrap/) | 六引擎接入引导 |
| [templates/visual-report.md](templates/visual-report.md) | 静态 HTML 报告模板 |
| [visual/index.html](visual/index.html) | 交互式 Web Dashboard |
| [ROADMAP.md](ROADMAP.md) | v0.2 优化与发布路线图 |

## 5. 全球搜索

索引三源数据：
- **CORE.termExplanations**：284 条专业术语解释（定义在 visual/js/core.js）
- **MAPPING_INDEX**：6 个 JSON 确定性映射表（knowledge-base/fengshui/mappings/）
- **KB_INDEX**：30 个古籍文件（knowledge-base/fengshui/）

搜索入口：visual/index.html 右上角搜索按钮，或在 AI 对话中直接询问。

## 6. 故障处理

### §9 Fail-Two 规则

同一操作失败两次 → 停止 → 记录到 field-journal → 查 tool-index.md 备用方案 → 切换或告知用户。

### §10 输入完整性

AI **必须先补问**以下信息，不得猜测：

| 字段 | 必填条件 | 默认值 |
|------|---------|--------|
| 出生日期 | 始终必填 | N/A |
| 出生时辰 | 始终必填 | 若未知 → 子时 (23:00-01:00) |
| 性别 | 始终必填 | N/A |
| 咨询问题 | 始终必填 | N/A |
| 体质信息 | 体质分析时必填 | N/A |
| 房屋朝向 | 风水分析时必填 | N/A |

### 引擎不可用时的降级方案

| 引擎缺失 | 降级方案 |
|---------|---------|
| bazi-ziwei-skill | 使用 visual/js/engines/bazi-engine.js（纯 JS 版） |
| iztro-py | 降低为八字分析 + 知识库参考，告知用户紫微不可用 |
| ichingshifa | 使用灵棋经/数字占卜替代 |
| meihua-yishu | 使用物象法直接起卦 |
| lunar-python / lunar-javascript | 使用近似节气表降级 |
| 大寒 API | 使用内置大寒近似日期（1月20日） |

## 7. 输出规范

### 结构化报告格式

```markdown
## 命理分析报告

**出生信息**: [日期] [时辰] [性别]

### 1. 八字排盘
[四柱 + 十神 + 五行统计]

### 2. 核心分析
[用神喜忌 / 格局 / 大运走势]

### 3. 学科交叉（可选）
[八字×体质 / 八字×风水 / 八字×五运六气]

### 4. 综合建议
[针对用户问题的具体建议]

### 5. 可视化
[是否生成 HTML 报告]

*免责声明：以上内容由 AI 生成，仅供传统文化学习参考。*
```

### 语言要求

- 术语出现时必须附带简短解释（例："七杀（事业压力/竞争）"）
- 避免纯学术化的长篇引用，先给结论再给依据
- 对问健康者，末尾必须添加医疗免责声明
- 所有推算结果必须标注"仅供学习参考"

---

> **执行完成后，如发现流程缺陷或新的经验，记录到 field-journal/。**
