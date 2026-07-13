# chinese-wisdom-mcp-server

中国传统玄学计算 MCP Server。把 18 个计算引擎（八字/紫微/六爻/奇门/大六壬/二十八星宿/太乙/梅花/五运六气/姓名/喜用神/体质/周公解梦 + 5 个跨系统联合分析）暴露为 [MCP](https://modelcontextprotocol.io) 工具，供 Claude Desktop、Cursor、Cline 等客户端直接调用。

> 三层架构 Layer 2：薄壳包装，不含计算逻辑。所有引擎都是纯 TypeScript、零 DOM 依赖，来自 `apps/visual/src/legacy/`，统一返回 `ToolEnvelope` 结构。

## 工具列表

> 共 20 个工具：18 个计算工具（下表）+ 2 个元工具（`agent_guidance` 参数引导、`wisdom_dispatch` 自然语言意图路由）。

| 工具 | 能力 | 引擎来源 |
|------|------|---------|
| `bazi_calculate` | 八字排盘（四柱、五行、十神、藏干、大运） | lunar-javascript 精确节气 |
| `ziwei_chart` | 紫微斗数（十二宫、十四主星、四化、庙旺） | iztro v2.5.8 |
| `cast_liuyao` | 六爻纳甲（六亲、六神、世应、用神、变卦、空亡） | 自研京房八宫 + lunar-javascript |
| `arrange_qimen` | 奇门遁甲（三奇六仪、九星、八门、八神、值符值使、格局） | 3meta v2.6.0 |
| `liuren_calculate` | 大六壬（天地盘、四课、三传、神煞、格局） | 自研 + lunar-javascript |
| `xingxiu_daily` | 二十八星宿每日值宿（吉凶宜忌、四象禽星） | 自研 + lunar-javascript |
| `taiyi_calculate` | 太乙神数（积年、局数、落宫、主客算、格局） | 自研 + lunar-javascript |
| `cast_meihua` | 梅花易数（体用生克、吉凶分级、错综卦、策略） | 自研 + lunar-javascript |
| `calc_yunqi` | 五运六气（岁运、司天在泉、客气六步、病势） | 自研 + lunar-javascript 大寒定年 |
| `analyze_name` | 姓名五维评分（五格、三才、五行、字义、生肖） | fate 数据 + 自研 |
| `calc_xiyong` | 喜用神（日主强弱、同类异类、喜用五行） | 自研 |
| `get_constitution_tendency` | 五运六气体质倾向（九种体质） | 自研 |
| `dream_interpret` | 周公解梦（9548 现代条目 + 952 古文断语） | 开源解梦库 |
| `combo_annual_fortune` | 年度综合运势（八字+五运六气+奇门+命卦方位） | 聚合各引擎 |
| `combo_decision` | 事件决策（六爻+梅花+奇门三卜交叉验证） | 聚合各引擎 |
| `combo_space_time` | 空间+时间（飞星+八宅+奇门吉方） | 聚合各引擎 |
| `combo_sanshi` | 三式互参（大六壬+奇门+梅花） | 聚合各引擎 |
| `combo_sanshi_classic` | 三式合一（奇门+太乙+大六壬，传统三式） | 聚合各引擎 |

每个工具返回统一 `ToolEnvelope`：
```json
{
  "ok": true,
  "tool": "BaziLunarAdapter",
  "version": "local-exact",
  "input_normalized": { ... },
  "data": { ...排盘结果..., "export_snapshot": { "summary", "tags", "sections", "sourceNotes" } },
  "summary": [ ... ],
  "warnings": [ ... ]
}
```
`data.export_snapshot` 是稳定的分段文本（summary + sections），LLM 可直接消费生成解读，无需重新解析原始盘面。

## 安装

```bash
cd apps/mcp-server
npm install
```

依赖：`@modelcontextprotocol/sdk`、`iztro`、`3meta`、`lunar-javascript`、`zod`。Node ≥ 20。

## 客户端配置（推荐：一键自动配置）

**无需手动编辑配置文件**。在仓库根目录跑：

```bash
node scripts/setup-mcp.mjs
```

该脚本自动检测已安装的 MCP 客户端（Claude Code / Claude Desktop / Cursor / Cline），并自动写入/合并对应配置文件（幂等，不覆盖已有 server）。Windows 下自动用 `cmd /c npx tsx` 包裹。配置后重启客户端即可。

- 仅检查不写入：`node scripts/setup-mcp.mjs --check`
- 只配指定客户端：`node scripts/setup-mcp.mjs --client=claude-code`（支持 claude-code / claude-desktop / cursor / cline）

> AI 自主激活：用户在对话中说"启用 MCP"，AI 可执行上述脚本自动完成配置（详见 SKILL.md「MCP 自动激活」节）。

## 客户端配置（手动，备选）

如需手动配置（或脚本未覆盖的客户端），参考 `examples/` 下对应示例：

### Claude Desktop

编辑配置文件（macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`；Windows: `%APPDATA%\Claude\claude_desktop_config.json`），参考 `examples/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "chinese-wisdom": {
      "command": "npx",
      "args": ["tsx", "/绝对路径/apps/mcp-server/src/index.ts"]
    }
  }
}
```

> `ABSOLUTE_PATH_TO` 需替换为本仓库在你机器上的绝对路径。tsx 需全局可用（`npm i -g tsx`）或在 server 目录运行。

### Cursor

项目根 `.cursor/mcp.json`，参考 `examples/cursor-mcp.json`，结构同上。

### Cline (VS Code)

VS Code settings.json，参考 `examples/cline-vscode-settings.json`。

### 验证

配置后重启客户端，应能看到 `chinese-wisdom` server 已连接，工具列表含上述 18 个计算工具 + 2 个元工具（共 20 个）。

## 使用示例

在 AI 客户端直接用自然语言：

- 「帮我排个八字，1990年6月15日12时男」→ 调 `bazi_calculate`
- 「张伟这个名字打多少分？1990年出生」→ 调 `analyze_name`
- 「我梦见蛇是什么意思」→ 调 `dream_interpret`
- 「2024年五运六气如何」→ 调 `calc_yunqi`

AI 会自动选择工具并解析返回的 `ToolEnvelope` 生成解读。

## 历法精度

- `bazi`/`yunqi`/`liuyao`/`meihua` 内置 lunar-javascript Solar 入口，默认走精确历法（`local-exact`：节气干支 / 大寒定年 / 精确日干支空亡）。
- 周公解梦 `useFull: true` 时使用全量库（9548 条，需加载）。

## 与 Visual Dashboard 的关系

MCP server 和 `apps/visual` Dashboard 共享同一份纯 TS 引擎：
- **MCP server**：AI 客户端调用，返回结构化数据，无 UI。
- **Dashboard**：用户双击打开 `apps/visual` 看可视化命盘，有 SVG 图表。

两者独立，互不依赖。未来 MCP 返回数据可带 `visualUrl` 字段指向 Dashboard 路由（ROADMAP 三层架构 Layer 3 联动）。

## 开发

```bash
# 单独运行 server（stdio，会等待 MCP 协议输入）
npm start

# 跑测试（复用 apps/visual 的引擎测试）
npm test
```

新增工具：在 `src/tools.ts` 的 `TOOLS` 数组加一项（name + description + zod schema + handler 调对应 enveloped 函数），`index.ts` 自动注册。

## 许可证

继承仓库主许可证。第三方引擎：iztro (MIT)、3meta (MIT)、lunar-javascript (MIT)。
