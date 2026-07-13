# 太乙神数实施计划

> 数据源：kentang2017/kintaiyi (MIT, v0.2.4)，已实读源码 + 解包 data.pkl 确认可行性。
> 模式参考：`daliurenEngine.ts`（同属"坚三式"系列，Solar 参数化 + ToolEnvelope + 纯 TS）。

## 总体范围

**精简版太乙**——覆盖 `pan()` 最有价值字段，纯 TS 实现，复用 `lunar-javascript` 取干支/农历/节气。

不做：皇极经世四卦（需 pkl 29KB）、命法卦象（需 pkl 15KB）、军事占断卷四~十七（80字段，后续可选）。

## 接入点清单（已核对）

| 层 | 文件 | 接入方式 |
|----|------|----------|
| 引擎 | `apps/visual/src/legacy/taiyiEngine.ts` (新) | 仿 daliurenEngine |
| 数据表 | 同文件内联常量（config.py 表搬成 TS） | 无 pkl 依赖 |
| 测试 | `apps/visual/src/__tests__/taiyiEngine.test.ts` (新) | 仿 daliurenEngine.test |
| MCP 工具 | `apps/mcp-server/src/tools.ts` | 加 `taiyi_calculate` |
| MCP guidance | `apps/mcp-server/src/guidance.ts` | 加 `taiyi_calculate` 引导 |
| MCP dispatch | `apps/mcp-server/src/dispatch.ts` | 加路由规则 |
| MCP 测试 | `apps/mcp-server/src/tools.test.ts` / `guidance.test.ts` | 加用例 |
| 侧边栏 | `apps/visual/src/lib/modules.ts` | 加 `taiyi` ModuleId + MODULES 项 |
| 工作区 | `apps/visual/src/features/taiyi/TaiyiWorkspace.tsx` (新) | 仿 LiurenWorkspace |
| 工作区注册 | `apps/visual/src/components/app-shell/workspaceRegistry.tsx` | 注册 taiyi |
| Combo | `apps/visual/src/legacy/comboEngine.ts` | 扩展 combo_sanshi 或新增 combo_sanshi_classic |

## 分步实施

### Step 1：引擎核心算法（taiyiEngine.ts 上半）

新建 `taiyiEngine.ts`，先写：
- 类型定义：`TaiyiInput` / `JiStyle`（年月日时分计 0-4）/ `AcumYearMethod`（统宗/金镜/淘金歌/太乙局 0-3）/ `TaiyiData`
- 内联数据表（从 config.py 搬）：
  - `TAIYI_PAI`（72局太乙落宫，74字符）
  - `SF_LIST`（72局始击，80字符）
  - `FOUR_GOD`/`SKY_YI`/`EARTH_YI`/`ZHI_FU`（四神/天乙/地乙/直符，各38字符）
  - `SKYEYES_DICT`/`SKYEYES_SUMMARY`（72局文昌+处境）
  - `SIXTEEN`/`GONG`/`GONG1`/`GONG2`（16宫映射）
  - `JC`/`TYJC`/`DOOR`/`GOLDEN_D`/`OFFICER_BASE`/`SU_GONG`/`SU`（28宿）
  - `FIVE_ELEMENTS`/`CHEUNGSUN`/`SIXTEENGOD`
  - 积年常数 `TN_DICT={0:10153917,1:1936557,2:10154193,3:10153917}`
- Solar 参数化（同六壬）：`getGanZhi()` / `getLunarDate()` / `getJieqi()`，传入走精确，未传走近似
- 核心算法函数：
  - `accnum(jiStyle, acumYear)` — 太乙积年（5种计式）
  - `kook(jiStyle, acumYear)` — 太乙局数（%72 + 阴阳遁）
  - `ty(jiStyle, acumYear)` — 太乙落宫
  - `skyeyes(jiStyle, acumYear)` — 文昌
  - `sf(jiStyle, acumYear)` — 始击
  - `se(jiStyle, acumYear)` — 定目
  - `hegod(jiStyle)` / `jigod(jiStyle)` — 合神/计神
  - `homeCal`/`awayCal`/`setCal` — 主算/客算/定算
  - `homeGeneral`/`awayGeneral`/`homeVgen`/`awayVgen` — 主将/客将/主参/客参
  - `skyyi`/`earthyi`/`fgd`/`zhifu` — 天乙/地乙/四神/直符
  - `kingbase`/`officerbase`/`pplbase` — 君基/臣基/民基
  - `wufu`/`bigyo`/`smyo` — 五福/大游/小游（查 accnum）

### Step 2：格局 + 八门 + 十六宫 + 装配（taiyiEngine.ts 下半）

- `shiGeju(jiStyle, acumYear)` — 格局判断（掩/迫/关/囚/击/格 规则匹配）
- `getEightDoors(jiStyle, acumYear)` — 八门分布
- `sixteenGong(jiStyle, acumYear)` — 十六宫分布
- `threedoors`/`fivegenerals` — 推三门/推五将
- `calculateTaiyi(input)` — 主装配函数，返回 `TaiyiData`
- `calcTaiyiEnveloped(input)` — 包 ToolEnvelope + export_snapshot
- tone 定调（供 combo 一致性检验）：据格局/主客算判定 吉/中/凶

### Step 3：单元测试（taiyiEngine.test.ts）

- 结构验证：accnum/kook/ty/sf/skyeyes 返回合法宫位
- 格局验证：已知日期能产出合法格局字符串
- envelope 验证：`calcTaiyiEnveloped` 返回 ok=true + export_snapshot 完整
- Solar 参数化：精确 vs 近似路径都能跑通
- tone 验证：返回 '吉'/'中'/'凶'

### Step 4：MCP 工具 + guidance + dispatch

- `tools.ts`：加 `taiyi_calculate`（schema: birth + jiStyle? + acumYear?）
- `guidance.ts`：加 `taiyi_calculate` 引导项（purpose/workflow）
- `dispatch.ts`：加路由 `{ tool:'taiyi_calculate', keywords:['太乙','太乙神数','太乙神數','年计','月计','日计','時計'], priority:80 }`
- `tools.test.ts` / `guidance.test.ts`：加用例

### Step 5：Dashboard 工作区（TaiyiWorkspace.tsx）

- 仿 LiurenWorkspace：生辰输入 + 计式选择（年/月/日/时计）+ 积年法选择（统宗/金镜/淘金歌/太乙局）
- 结果区：太乙落宫/文昌/始击/主客算/格局 卡片 + 四层报告（FourLayerReport）
- 用 solarBirth（历法改造后统一入口）
- 不做 SVG 式盘（先文字卡片，后续可选）

### Step 6：侧边栏 + 工作区注册

- `modules.ts`：ModuleId 联合类型加 `'taiyi'`；MODULES 数组加大六壬后面（术数排盘组）
- `workspaceRegistry.tsx`：import TaiyiWorkspace + 注册 `taiyi: TaiyiWorkspace`

### Step 7：三式合一（combo 扩展）

- `comboEngine.ts`：现有 `combo_sanshi` = 大六壬+奇门+梅花
- 新增 `calcSanshiClassicCombo` = 奇门 + 太乙 + 大六壬（真正传统三式）
- `ComboWorkspace.tsx`：COMBO_OPTIONS 加「三式合一（传统）」选项
- MCP：加 `combo_sanshi_classic` 工具 + guidance + dispatch
- 一致性检验：三式 tone 同向→高置信

### Step 8：验证 + 提交

- 跑 visual 测试 + mcp-server 测试，全过
- 巡检 Dashboard 太乙工作区实际渲染
- 技术细节清理（不显示引擎名/版本/计式编号等技术词）
- 提交并推送

## 关键技术约束

1. **纯 TS，零 Python 依赖**（不学 horosa 重型 runtime）
2. **Solar 参数化**：传入走 local-exact，未传走 local-approx（同六壬/二十八宿）
3. **ToolEnvelope 统一输出**：`calcTaiyiEnveloped` 返回 `ToolEnvelope<TaiyiData>`
4. **export_snapshot 放 data 内部**（对齐项目规范，非 envelope 顶层）
5. **tone 字段**：供 combo 一致性检验（吉/中/凶）
6. **UI 不显示技术细节**：计式用中文名（年计/月计/日计/時計），不显示 0/1/2/3 编号
7. **用 solarBirth**：历法改造后统一入口，农历自动转公历

## 移植工作量预估

| Step | 内容 | 预估 |
|------|------|------|
| 1 | 引擎核心算法 | 大 |
| 2 | 格局+装配+envelope | 中 |
| 3 | 单元测试 | 小 |
| 4 | MCP 三件套 | 小 |
| 5 | Dashboard 工作区 | 中 |
| 6 | 注册 | 小 |
| 7 | 三式合一 combo | 中 |
| 8 | 验证提交 | 小 |
