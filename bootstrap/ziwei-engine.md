# 紫微斗数排盘引擎集成指南

> 本文件指导如何集成 Renhuai123/ziwei-doushu 排盘引擎，用于"命"维度的排盘与格局分析。

> **2026-07-10 架构重构后推荐路径**：本项目已内置纯 TS 紫微引擎 `apps/visual/src/legacy/ziweiEngine.ts`，用 ESM `import { astro } from 'iztro'`（v2.5.8，MIT），零 DOM 依赖，统一返回 `ToolEnvelope`。MCP server 与 React Dashboard 直接 import 使用，无需 Python iztro-py。
> - **纯 TS 调用**：`calcZiweiEnveloped({ birth, mingGua })`，输出十二宫 + 四化 + 主星。**关键**：iztro ESM 版四化不在顶层 sihua，标在每颗星的 `mutagen` 字段 → `extractSihuaFromChart` 遍历全盘提取。
> - **MCP 工具**：`ziwei_chart`。
> - 本指南下方的 Python iztro-py 集成方式仍可用（命令行交叉验证或 fallback），但 Dashboard/MCP 默认走纯 TS ESM iztro 路径。

---

## 引擎概览

**项目地址**：https://github.com/Renhuai123/ziwei-doushu

**技术栈**：Next.js 14 + TypeScript + iztro + lunar-javascript

**核心能力**：
- 命宫定位与五行局确定
- 十四主星排布
- 辅星安放
- 大限/流年推算
- 四化（禄、权、科、忌）推演
- 41 种格局检测（上格8 + 中格9 + 助力格6 + 恶格8 + 基础格10）
- 合盘（heming）分析知识库
- 518,400 条样本命盘数据（5.5GB，需单独下载）

**许可**：MIT（代码），样本数据需署名，古籍为公共领域。

---

## 集成方式

### 方式一：本地运行完整应用

适用于需要可视化排盘界面的场景。

```bash
git clone https://github.com/Renhuai123/ziwei-doushu.git
cd ziwei-doushu
npm install
cp .env.example .env.local
npm run dev
```

启动后访问 http://localhost:3000，在前端输入生辰信息即可排盘。

**注意**：开源版不含后端 API 路由（/api/interpret、/api/heming、/api/generate 均需自行实现）。排盘算法和前端界面可独立运行。

### 方式二：直接使用 iztro 库（推荐轻量集成）

ziwei-doushu 的排盘核心依赖 iztro 库，可直接安装使用：

```bash
npm install iztro lunar-javascript
```

```typescript
import { astro } from 'iztro';

// 输入：阳历出生信息
const chart = astro.bySolar(
  1990,    // 年
  8,       // 月
  15,      // 日
  3,       // 时辰（0=子时, 1=丑时, ... 11=亥时）
  '女'     // 性别
);

// 输出结构（关键字段）：
// chart.solarPalaces     — 十二宫数据（命宫、财帛、事业等）
// chart.solarPalaces[0].stars  — 该宫位的主星列表
// chart.surpalaces       — 中宫信息
// chart.cadastroPalaces  — 大限信息
// chart.yearPalaces      — 流年信息
```

### 方式二·Python：使用 iztro-py 库（推荐 Python 环境集成）

当技能运行在 Python 环境中（如五运六气 Agent 已使用 lunar-python），无需安装 Node.js，可直接使用 iztro-py：

**项目地址**：https://pypi.org/project/iztro-py/ （v0.3.5, MIT）

iztro-py 是 iztro JS 库的纯 Python 移植版，使用 Pydantic 模型封装排盘数据，API 与 JS 版一一对应。

```bash
pip install iztro-py
```

```python
from iztro_py import astro

# 输入：阳历出生信息
chart = astro.by_solar(
    1990,    # 年
    8,       # 月
    15,      # 日
    3,       # 时辰（0=子时, 1=丑时, ... 11=亥时）
    "女"     # 性别
)

# 输出结构（Pydantic 模型，关键字段）：
# chart.solar_palaces     — 十二宫数据（命宫、财帛、事业等）
# chart.solar_palaces[0].stars  — 该宫位的主星列表
# chart.sur_palaces       — 中宫信息
# chart.cadastro_palaces  — 大限信息
# chart.year_palaces      — 流年信息
```

**JS iztro 与 Python iztro-py 对比**：

| 维度 | iztro (JS) | iztro-py (Python) |
|------|-----------|-------------------|
| 依赖 | Node.js + lunar-javascript | Python ≥3.8（纯 Python） |
| 输出 | 原生对象 | Pydantic 模型（可序列化为 JSON/dict） |
| 历法库 | lunar-javascript | sxtwl（内置天文历法） |
| 适用场景 | 前端可视化排盘 | 后端 Agent 集成、与五运六气联动 |
| 许可 | MIT | MIT |

**选择建议**：若技能已在 Python 环境（如 wuyun-liuqi Agent），优先使用 iztro-py，可与 lunar-python、ichingshifa 共存于同一 Python 依赖链。若需要前端可视化（如 Vue 前端展示命盘），使用 JS iztro。

### 方式三：调用排盘脚本

在技能的 bootstrap/ 目录下创建排盘脚本：

```bash
# 假设已 clone ziwei-doushu 到本地
node /path/to/ziwei-doushu/scripts/generate-chart.js \
  --year 1990 --month 8 --day 15 --hour 3 --gender female
```

---

## 排盘输入格式

| 参数 | 类型 | 说明 |
|------|------|------|
| year | int | 出生年（阳历） |
| month | int | 出生月（1-12） |
| day | int | 出生日（1-31） |
| hour | int | 时辰（0=子, 1=丑, 2=寅, 3=卯, 4=辰, 5=巳, 6=午, 7=未, 8=申, 9=酉, 10=戌, 11=亥） |
| gender | string | "男" 或 "女" |
| isLeap | bool | 农历闰月标记（农历输入时） |
| city | string | 出生地城市（真太阳时校正，可选） |

---

## 排盘输出结构

排盘结果包含以下关键信息：

### 十二宫位

| 宫位 | 序号 | 简称 | 关注重点 |
|------|------|------|---------|
| 命宫 | 1 | 命 | 先天格局、性格倾向 |
| 兄弟宫 | 2 | 兄 | 手足关系、合伙 |
| 夫妻宫 | 3 | 夫 | 感情婚姻 |
| 子女宫 | 4 | 子 | 子女缘分 |
| 财帛宫 | 5 | 财 | 财运格局 |
| 疾厄宫 | 6 | 疾 | 健康体质 |
| 迁移宫 | 7 | 迁 | 出行、外出发展 |
| 交友宫 | 8 | 友 | 人际关系 |
| 官禄宫 | 9 | 官 | 事业方向 |
| 田宅宫 | 10 | 田 | 不动产、家居 |
| 福德宫 | 11 | 福 | 精神生活、内心 |
| 父母宫 | 12 | 父 | 长辈缘分 |

### 每宫数据

每宫包含：
- **天干地支**：宫干宫支
- **主星**：十四主星中的星曜（可能空宫）
- **辅星**：左辅右弼、文昌文曲、天魁天钺、禄存天马等
- **煞星**：擎羊、陀罗、火星、铃星、地空、地劫
- **四化**：化禄、化权、化科、化忌（按生年天干安放）
- **亮度**：bright / normal / dim（对应庙旺利陷）
- **大限**：该宫位对应的大限十年运程

### 格局检测

引擎内置 41 种格局检测函数，输出格式：

```json
{
  "name": "君臣庆会",
  "level": "excellent",
  "description": "紫微入命，左辅右弼同会，帝王得贤臣辅佐...",
  "palaces": ["命宫"],
  "conditions": {
    "required": ["紫微入命", "左辅右弼同会三方四正"],
    "bonus": ["再会文昌或文曲"],
    "breaking": []
  },
  "source": "《紫微斗数全书·君臣庆会格》"
}
```

格局分级：excellent（上格）、good（中格/助力格）、neutral（基础格）、caution（恶格）。

---

## 在咨询中的使用

### 事业决策（场景 B）

1. 排盘后重点关注：命宫主星（性格倾向）、官禄宫（事业方向）、财帛宫（财运格局）
2. 查看格局检测中与事业相关的格局（如紫府同宫、阳梁昌禄等）
3. 结合大限判断当前十年事业运势方向
4. 四化中化禄入财/官表示机遇，化忌入官表示压力

### 婚恋合婚（场景 C）

1. 分别排双方命盘
2. 重点看：夫妻宫主星、福德宫（内心满足度）、太阳/太阴亮度
3. 合盘分析参考 heming-knowledge.ts 知识库
4. 五行互补性判断（命宫五行局）

### 健康养生（场景 A）

1. 排盘后重点看疾厄宫主星
2. 主星五行属性对应脏腑（参考 reference-tcm.md 五行与脏腑对应表）
3. 煞星会照情况提示体质弱点
4. 结合大限流年判断当前健康周期

---

## 知识库文件参考

ziwei-doushu 引擎中的以下文件可作为深度分析参考：

| 文件 | 内容 | 用途 |
|------|------|------|
| patterns.ts | 41种格局检测 + 1100行知识库 | 格局解读 |
| heming-knowledge.ts | 合盘方法论 | 合婚分析 |
| cities.ts | 中国城市经纬度 | 真太阳时校正 |
| famous.ts | 名人命盘示例 | 案例参考 |
| classics/ | 骨髓赋、全集、全书 | 古籍引用 |

---

## 注意事项

- 排盘需要准确的出生时辰（地支时），时辰错误会导致整个命盘排错
- 真太阳时校正：如知道出生地，应进行经纬度校正（cities.ts 提供中国城市坐标）
- 闰月处理：农历闰月排盘需特别标记 isLeap 参数
- 引擎遵循倪海厦天机派体系，不包含飞星四化、宫干自化等高级技法
- 所有命理分析必须遵守 RULES.md 中的 disclaimer 和积极导向原则
