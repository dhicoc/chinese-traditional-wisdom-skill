# 中国传统文化整体智慧 AI Agent 技能包

> 融合玄学五术（山医命相卜）、中医体质/五运六气、道家哲学、佛教心性的 holistic 人生咨询 AI Agent 技能包。
>
> **Human readers:** 从目录开始阅读即可。
> **AI Agents:** 请直接跳至第 0 节执行自动配置流程。

> 本仓库可放置在任何目录。AI 会自动检测实际路径。下文 `<SKILL_ROOT>` 指实际安装路径。

---

## 0. AI 自动配置流程（AI Agent 首次读取后立即执行）

> **AI 读完本文件后，须自动执行以下配置流程，用户无需手动操作。**

```text
0. 检测本包安装路径（由当前文件所在目录推导）
1. 检测本包结构完整性：
   - 检查 SKILL.md / RULES.md 等核心文件存在
   - 检查 bootstrap/ 目录下引擎引导文件
   - 检查 visual/index.html 等可视化文件
2. 确认结构就绪后，读取 SKILL.md → 三层路由（问题类型→学科→融合深度）
3. 根据用户问题匹配对应场景和工具引擎
4. 如需生成可视化报告，询问用户选择：
   - 模式 A：静态 HTML 报告（一次性的图文报告）
   - 模式 B：交互式 Web Dashboard（反复查询用）
5. 开始执行任务
```

---

## 功能概览

- **八字命理**（Bazi）：四柱排盘、十神分析、五行旺衰、用神喜忌、大运流年
- **紫微斗数**（Ziwei）：十二宫位、十四主星、四化飞星、大限流年
- **六爻占卜**（Liuyao）：纳甲装卦、六亲世应、六神断卦、用神旺衰
- **梅花易数**（Meihua）：时间/数字/物象起卦、体用生克、卦气旺衰
- **中医体质**（Constitution）：九种体质辨识、饮食调理、节气养生
- **五运六气**（Yunqi）：岁运太过不及、司天在泉、客气六步、客主加临
- **风水堪舆**（Fengshui）：八宅大游年、流年飞星、二十四山、形煞化解
- **道家哲学**（Daoism）：无为自然、阴阳辩证、性命双修
- **佛教心性**（Buddhism）：四圣谛、八正道、般若空性、禅修次第
- **全方位可视化**（Visual）：11 标签页 Canvas 2D 图表 + Mermaid 知识图谱
- **全局搜索**：284 条术语解释 + 6 个 JSON 映射表 + 30 个古籍全文

## 快速开始

### 方式 A：AI 对话内使用（默认模式）

直接向 AI 提出人生困惑、健康调养、事业决策、婚姻合婚、择吉选址等问题即可。AI 会自动：
1. 基于三层路由匹配最佳工具组合
2. 排盘推算 → 调用知识库 → 综合分析 → 生成结构化咨询报告
3. 询问是否生成可视化 HTML 报告

### 方式 B：交互式 Web Dashboard

```bash
# 直接双击打开
<SKILL_ROOT>/visual/index.html

# 或从浏览器打开
file://<SKILL_ROOT>/visual/index.html
```

支持 11 个标签页：八字 / 五行 / 紫微 / 六爻 / 梅花 / 风水罗盘 / 流年飞星 / 八宅 / 五运六气 / 体质 / 知识图谱。双击 test-runner.html 可运行自动化测试。

### 方式 C：静态 HTML 可视化报告

由 AI 根据咨询内容自动生成，包含八字命盘、五行统计、紫微盘、六爻卦、梅花卦、风水分析、五运六气、体质分析等模块，适合分享和存档。

## 目录结构

```
chinese-traditional-wisdom-skill/
├── SKILL.md                    # ★ 总控入口 + 三层路由契约
├── RULES.md                    # ★ 行为规则（§9 Fail-Two 规则、§10 输入完整性）
├── EVOLUTION.md                # 三阶段演进记录 + 架构决策理由
├── tool-index.md               # 6 引擎 + 6 JSON 映射 + 可视化依赖表
├── README.md                   # 本文件
│
├── bootstrap/                  # ★ 引擎接入引导（6 引擎）
│   ├── bazi-engine.md          # 八字引擎（bazi-ziwei-skill 封装）
│   ├── ziwei-engine.md         # 紫微引擎（iztro-py 接入）
│   ├── liuyao-engine.md        # 六爻引擎（ichingshifa 接入）
│   ├── meihua-yishu-engine.md  # 梅花易数引擎（meihua-yishu 接入）
│   ├── yunqi-integration.md    # 五运六气引擎（大寒 API + RAG）
│   └── constitution-questionnaire.md # 体质问卷
│
├── templates/                  # ★ 7 种专业咨询报告模板
│   ├── visual-report.md        # 可视化 HTML 报告（10 节全量）
│   ├── career-consultation.md  # 事业咨询
│   ├── comprehensive-report.md # 综合报告
│   ├── divination-consultation.md # 占卜决策咨询
│   ├── fengshui-consultation.md   # 风水咨询
│   ├── health-consultation.md  # 健康咨询
│   └── marriage-consultation.md   # 婚姻合婚
│
├── knowledge-base/             # ★ 古籍知识库（30 文件 / 16+ 部古籍 / 21.5 万字）
│   └── fengshui/
│       ├── 01-situation-form/  # 形势派（撼龙经/疑龙经/葬书/雪心赋）
│       ├── 02-principle-form/  # 理气派（青囊经/天玉经/都天宝照经/催官篇）
│       ├── 03-yang-house/      # 阳宅（阳宅十书10章/阳宅三要/八宅明镜）
│       ├── 04-comprehensive/   # 综合（地理大全/宅经/管氏地理指蒙）
│       ├── 05-others/          # 其他（入地眼全书/博山篇）
│       ├── _index.md           # 知识库索引
│       └── mappings/           # ★ 6个JSON确定性映射表
│           ├── eight-mansions.json       # 八宅大游年
│           ├── form-sha-cures.json       # 形煞化解
│           ├── life-trigram.json         # 命卦速查
│           ├── three-essentials.json     # 阳宅三要
│           ├── twenty-four-mountains.json # 二十四山（360°连续）
│           └── yearly-flying-stars.json  # 流年飞星
│
├── reference-metaphysics.md    # 玄学参考手册（375行，含十神/格局/用神/紫微/六爻/梅花）
├── reference-buddhism.md       # 佛教参考
├── reference-daoism.md         # 道家参考
├── reference-tcm.md            # 中医参考
│
├── visual/                     # ★ 可视化系统（纯前端，零外部JS依赖）
│   ├── index.html              # 11标签页交互式 Dashboard
│   ├── test-runner.html        # 自动化测试运行器
│   ├── css/style.css           # 样式
│   ├── js/
│   │   ├── core.js             # 核心库（天干地支/五行/284术语解释）
│   │   ├── data-bridge.js      # ★ 全局数据桥（FORTUNE 单例）
│   │   ├── search.js           # 全局搜索（术语+映射+古籍三源索引）
│   │   ├── bazi.js             # 八字可视化渲染
│   │   ├── ziwei.js            # 紫微可视化渲染
│   │   ├── divination.js       # 六爻/梅花可视化
│   │   ├── fengshui.js         # 风水罗盘/飞星/八宅渲染
│   │   ├── health.js           # 体质可视化
│   │   └── engines/            # ★ 纯JS排盘引擎
│   │       ├── bazi-engine.js  # 八字引擎（四柱/十神/大运/纳音）
│   │       └── yunqi-engine.js # 五运六气引擎（岁运/司天/客气）
│   └── tests/                  # 自动化测试
│       ├── test-bazi.js        # 八字 50 项测试
│       ├── test-yunqi.js       # 五运六气 53 项测试
│       └── test-data-bridge.js # 数据桥测试
│
└── field-journal/              # 经验沉淀
    ├── _index.md
    └── _template.md
```

## 架构设计

### 三层路由矩阵

| 维度 | 分类 | 说明 |
|------|------|------|
| 问题类型 | 健康 / 事业 / 婚恋 / 占卜 / 综合 | 匹配最佳咨询场景 |
| 学科 | 八字 / 紫微 / 六爻 / 梅花 / 五运六气 / 体质 / 风水 | 调用对应推算引擎 |
| 融合深度 | 单一学科 / 跨学科交叉 / 儒释道整体智慧 | 决定知识引用范围 |

### 六引擎架构

| 引擎 | 类型 | 来源 | 用途 |
|------|------|------|------|
| 八字 | npm 包 | bazi-ziwei-skill (520★ MIT) | 四柱/十神/大运/流年 |
| 紫微斗数 | PyPI | iztro-py (MIT) | 十二宫/主星/四化 |
| 六爻 | PyPI | ichingshifa (MIT) | 纳甲/六亲/世应/六神 |
| 梅花易数 | GitHub | meihua-yishu (169★ CC) | 体用/生克/卦气 |
| 五运六气 | API | 大寒 API + RAG | 岁运/客气/司天在泉 |
| 体质 | 问卷 | N/A | 九种体质辨识 |

### 数据层设计

**确定性 JSON 映射表（6 表）**：命卦速查、八宅大游年、二十四山（360° 连续）、流年飞星、阳宅三要、形煞化解。零外部依赖，一步到位。

**古籍知识库（30 MD 文件）**：16+ 部风水经典全文 + 注释，覆盖形势/理气/阳宅/综合四大类。支持全文引用与交叉验证。

**纯前端排盘引擎（2 个）**：八字（1900-01-01=己亥基准）、五运六气（丙辛水运太过/乙庚金运不及等）。零 npm/pip 依赖，双击即可运行。

### 可视化体系

```
visual/index.html
├── 八字标签页（Canvas 命盘 + 五行雷达图 + 大运走势）
├── 紫微标签页（十二宫位图 + 主星表）
├── 六爻标签页（卦象 Canvas + 六亲世应表）
├── 梅花标签页（体用生克图）
├── 风水罗盘（二十四山 Canvas 罗盘）
├── 流年飞星（九宫飞星图 + 古籍引用）
├── 八宅（大游年方位图 + 古籍引用）
├── 五运六气（客气六步图 + 司天在泉）
├── 体质（九种体质雷达图）
├── 知识图谱（Mermaid 关系图）
└── 全局搜索（284 术语 + 6 映射 + 30 古籍）
```

### 引擎 + RAG + 可视化推理路径

```
用户输入 → 三层路由（问题→学科→融合深度）
  ↓
bootstrap/ ← 加载对应引擎引导
  ↓
推算引擎执行（本地纯JS / npm 包 / PyPI 包 / API）
  ↓
json mappings/ ← 确定性数据查询
  ↓
knowledge-base/ ← 古籍全文引用
  ↓
templates/ ← 选择报告模板
  ↓
询问用户可视化模式 → A: 静态HTML报告 / B: Web Dashboard
  ↓
field-journal/ ← 经验沉淀（可选）
```

## 工具索引与故障处理

`tool-index.md` 记录了所有引擎、映射表、可视化依赖的安装状态和备用方案。

**§9 Fail-Two 规则**：同一操作失败两次 → 停止 → 记录到 field-journal → 查 tool-index.md 备用方案 → 切换或告知用户。

**§10 输入完整性**：AI 必须先补问必要信息（生辰/性别/问题/体质/房屋信息），不得猜测。

## 可视化使用

```bash
# 交互式 Web Dashboard
# 直接双击 visual/index.html，或从浏览器打开：
file://<SKILL_ROOT>/visual/index.html

# 运行自动化测试
# 双击 visual/test-runner.html，或从浏览器打开：
file://<SKILL_ROOT>/visual/test-runner.html
```

### 浏览器兼容性

| 浏览器 | 状态 | 说明 |
|--------|------|------|
| Chrome 90+ | 全量支持 | Canvas 2D + Mermaid v10.9.1 |
| Firefox 90+ | 全量支持 | 同上 |
| Edge 90+ | 全量支持 | 同上 |
| Safari 15+ | 基本支持 | Mermaid 部分渲染正常 |

## 裁剪复用策略

从 reverse-skill 保留：
- 三轴路由矩阵（问题类型 + 学科 + 融合深度）
- SKILL.md 标准格式（frontmatter + scope + workflow + pitfalls + 路由上下文）
- RULES.md 行为规则链（§9 Fail-Two / §10 输入完整性）
- field-journal 经验沉淀系统
- EVOLUTION.md 演进留痕

从 reverse-skill 裁剪：
- manifest 驱动自举系统（本技能无需安装外部工具）
- bootstrap/ToolDiscovery/tool-index
- MCP 服务器注册
- 多平台脚本对等（本技能为 agent 知识包，无代码运行依赖）

## 声明与许可

本技能包仅供传统文化学习、学术研究和 AI Agent 应用开发参考。所有推算结果仅供参考，不构成医疗诊断、投资建议或人生决策依据。

实际健康问题请咨询执业医师；重大决策请理性判断。

### License

MIT License. 详见 [LICENSE](./LICENSE)。

### 致谢

- 架构设计参考 [reverse-skill](https://github.com/zhaoxuya520/reverse-skill)（zhaoxuya520）
- 八字引擎参考 [bazi-ziwei-skill](https://github.com/novertime/bazi-ziwei-skill)（novertime, MIT）
- 紫微引擎参考 [iztro-py](https://github.com/syncretism/iztro-py)（MIT）
- 六爻引擎参考 [ichingshifa](https://github.com/winetree94/ichingshifa)（MIT）
- 梅花易数参考 [meihua-yishu](https://github.com/shtan1992/meihua-yishu)（CC BY-NC-SA）
- 五运六气参考 [wuyun-liuqi-skills](https://github.com/dhicoc/wuyun-liuqi-skills)（MIT）
- 风水古籍数据来源于维基文库、绝学网、美篇、163、搜狐等公开来源
- AI 社区交流：[linux.do](https://linux.do)
