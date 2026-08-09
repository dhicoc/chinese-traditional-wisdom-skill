# 紫微呈现依据校验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为紫微 `ziwei_chart` 添加进程内呈现凭证与确定性 claims 校验，阻止 Agent 将不属于本次命盘的事实呈现为计算结果。

**Architecture:** 新建独立的 `ziweiClaimVerifier.ts`，以 UUID token 映射本次 `ZiweiData`，不改动现有八字校验器。`ziwei_chart` 成功后注册数据并在 ToolEnvelope 的 `result_meta` 返回 token；新增 MCP 元工具按受限 discriminated-union claims 逐项校验宫位、星曜、四化、元资料与动态层事实。

**Tech Stack:** TypeScript、Zod、Vitest、MCP SDK、iztro 2.5.8。

---

## 文件结构

- Create: `apps/mcp-server/src/ziweiClaimVerifier.ts` — 紫微 claims 类型、token registry 与确定性事实比对。
- Create: `apps/mcp-server/src/ziweiClaimVerifier.test.ts` — 校验器级别的有效和篡改断言测试。
- Modify: `apps/mcp-server/src/tools.ts` — 成功的 `ziwei_chart` 注册 `ZiweiData` 并返回 token。
- Modify: `apps/mcp-server/src/index.ts` — 注册 `validate_ziwei_presentation`，定义公开 Zod schema 与无效 token 返回。
- Modify: `apps/mcp-server/src/mcpContract.ts` — 新工具 title 与 deterministic annotation。
- Modify: `apps/mcp-server/src/guidance.ts` — 强制 Agent 对紫微确定性事实先校验。
- Modify: `apps/mcp-server/src/guidance.test.ts` — 断言全局规则含紫微校验流程。
- Modify: `apps/mcp-server/src/server.test.ts` — 工具目录、无效 token 及同 stdio 会话的有效／篡改校验。
- Modify: `SKILL.md`, `README.md`, `README_AI.md`, `apps/mcp-server/README.md`, `tool-index.md` — 同步第 36 个工具和紫微呈现约束。
- Modify: `apps/visual/scripts/check-doc-contracts.mjs` — 将公开工具数与紫微校验工具文档约束同步为 36。

### Task 1: 紫微校验器的 TDD 基线

**Files:**
- Create: `apps/mcp-server/src/ziweiClaimVerifier.test.ts`
- Create: `apps/mcp-server/src/ziweiClaimVerifier.ts`

- [ ] **Step 1: 写入失败的校验器测试**

```ts
import { calcZiweiEnveloped } from '../../visual/src/legacy/ziweiEngine';
import { validateZiweiClaims, type ZiweiPresentationClaim } from './ziweiClaimVerifier';

const envelope = calcZiweiEnveloped({
  birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
  transit: { year: 2025, month: 7 },
});

describe('紫微呈现断言校验', () => {
  it('接受本次命宫、星曜、四化与元资料断言', () => {
    const data = envelope.data;
    const ming = data.palaces.命宫;
    const star = ming.stars[0]!;
    const [sihuaStar, mutagen] = Object.entries(data.sihua)[0]!;
    const claims: ZiweiPresentationClaim[] = [
      { kind: 'palace', palace: '命宫', field: 'position', value: ming.position },
      { kind: 'palaceStar', palace: '命宫', value: star },
      { kind: 'sihua', star: sihuaStar, value: mutagen },
      { kind: 'metadata', field: 'soul', value: data.soul! },
      { kind: 'mainStar', value: data.mainStars[0]! },
    ];
    expect(validateZiweiClaims(data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝伪造的宫位星曜、四化与元资料', () => {
    const result = validateZiweiClaims(envelope.data, [
      { kind: 'palaceStar', palace: '命宫', value: '不存在星曜' },
      { kind: 'sihua', star: '不存在星曜', value: '忌' },
      { kind: 'metadata', field: 'soul', value: '不存在命主' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'palaceStar' }),
      expect.objectContaining({ kind: 'sihua' }),
      expect.objectContaining({ kind: 'metadata' }),
    ]));
  });
});
```

- [ ] **Step 2: 运行失败测试**

Run: `pnpm exec vitest run src/ziweiClaimVerifier.test.ts`

Expected: FAIL，原因是找不到 `./ziweiClaimVerifier`。

- [ ] **Step 3: 实现最小校验器**

在 `ziweiClaimVerifier.ts` 定义下列 claims，导入 `ZiweiData`，并对每条 claim 追加 `{ index, kind, message, expected?, actual }`：

```ts
export type ZiweiPresentationClaim =
  | { kind: 'palace'; palace: string; field: 'position' | 'miaoxian'; value: string }
  | { kind: 'palaceStar'; palace: string; value: string }
  | { kind: 'sihua'; star: string; value: string }
  | { kind: 'mainStar'; value: string }
  | { kind: 'metadata'; field: 'fiveElementsClass' | 'soul' | 'body' | 'bodyPalaceBranch' | 'originalPalaceBranch'; value: string };

const presentationResults = new Map<string, ZiweiData>();
export function registerZiweiPresentation(data: ZiweiData, token: string) { presentationResults.set(token, data); }
export function validateZiweiPresentation(token: string, claims: ZiweiPresentationClaim[]) { const data = presentationResults.get(token); return data ? validateZiweiClaims(data, claims) : null; }
```

`palace` 读取 `data.palaces[palace]?.[field]`；`palaceStar` 用 `data.palaces[palace]?.stars.includes(value)`；`sihua` 精确读取 `data.sihua[star]`；`mainStar` 判断 `data.mainStars.includes(value)`；`metadata` 精确读取 `data[field]`。缺宫位或缺字段按不一致处理，不将 `undefined` 误判为有效。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm exec vitest run src/ziweiClaimVerifier.test.ts`

Expected: 2 tests passed。

- [ ] **Step 5: 提交校验器基线**

```bash
git add apps/mcp-server/src/ziweiClaimVerifier.ts apps/mcp-server/src/ziweiClaimVerifier.test.ts
git commit -m "feat(mcp): 校验紫微呈现依据"
```

### Task 2: 为紫微排盘签发本次进程凭证

**Files:**
- Modify: `apps/mcp-server/src/tools.ts:21-37,229-238`
- Test: `apps/mcp-server/src/tools.test.ts:184-213`

- [ ] **Step 1: 写入失败的工具测试**

在 `ziwei_chart` 的首个测试中，断言：

```ts
expect(e.result_meta?.presentationToken).toMatch(/^[0-9a-f-]{36}$/);
```

- [ ] **Step 2: 运行失败测试**

Run: `pnpm exec vitest run src/tools.test.ts -t "1990-6-15 12时男 返回十二宫 envelope"`

Expected: FAIL，`presentationToken` 为 `undefined`。

- [ ] **Step 3: 仅在成功结果中注册并返回 token**

在 `tools.ts` 导入 `registerZiweiPresentation`，将 `ziwei_chart` handler 替换为：

```ts
handler: (i) => {
  const envelope = calcZiweiEnveloped(i as { birth: never; transit?: { year: number; month: number } });
  if (!envelope.ok) return envelope;
  const presentationToken = randomUUID();
  registerZiweiPresentation(envelope.data, presentationToken);
  return {
    ...envelope,
    result_meta: { ...envelope.result_meta, presentationToken },
  };
},
```

- [ ] **Step 4: 运行工具测试确认通过**

Run: `pnpm exec vitest run src/tools.test.ts -t "ziwei_chart"`

Expected: 2 tests passed。

- [ ] **Step 5: 提交 token 签发**

```bash
git add apps/mcp-server/src/tools.ts apps/mcp-server/src/tools.test.ts
git commit -m "feat(mcp): 为紫微排盘签发呈现凭证"
```

### Task 3: 注册 MCP 紫微呈现校验工具

**Files:**
- Modify: `apps/mcp-server/src/index.ts:20,114-159`
- Modify: `apps/mcp-server/src/mcpContract.ts:16-80`
- Test: `apps/mcp-server/src/server.test.ts:142-280`

- [ ] **Step 1: 写入失败的 stdio 测试**

在工具目录测试中将工具数由 35 调为 36，并加入：

```ts
expect(names).toContain('validate_ziwei_presentation');
```

新增无效 token 测试：

```ts
const responses = await runMcpSession([
  INIT_MSG, INITIALIZED_MSG,
  toolCallMsg(28, 'validate_ziwei_presentation', {
    presentationToken: '00000000-0000-4000-8000-000000000000',
    claims: [{ kind: 'mainStar', value: '紫微' }],
  }),
]);
const payload = JSON.parse(((responses.find((r) => r.id === 28)!.result as { content: Array<{ text: string }> }).content[0].text));
expect(payload).toEqual({ valid: false, violations: [expect.objectContaining({ kind: 'presentationToken' })] });
```

- [ ] **Step 2: 运行失败测试**

Run: `pnpm exec vitest run src/server.test.ts -t "tools/list 返回|validate_ziwei_presentation 拒绝无效凭证"`

Expected: FAIL，因为工具尚未注册。

- [ ] **Step 3: 添加公开契约与工具注册**

在 `mcpContract.ts` 将 `validate_ziwei_presentation` 加入 `deterministicTools` 和 `toolTitles`（标题为“紫微呈现依据校验”）。

在 `index.ts` 导入 `validateZiweiPresentation` 与 `ZiweiPresentationClaim`，并在八字校验工具之后注册工具：

```ts
server.registerTool('validate_ziwei_presentation', {
  ...getToolContract('validate_ziwei_presentation'),
  description: '紫微呈现依据校验。对本次 ziwei_chart 返回的 result_meta.presentationToken 与拟呈现的确定性紫微断言逐项比对；仅核验宫位、星曜、四化、元资料。传统解释、倾向和建议不进入 claims。校验器不生成、补全或修正解读。',
  inputSchema: {
    presentationToken: z.string().uuid(),
    claims: z.array(z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('palace'), palace: z.string().min(1), field: z.enum(['position', 'miaoxian']), value: z.string().min(1) }),
      z.object({ kind: z.literal('palaceStar'), palace: z.string().min(1), value: z.string().min(1) }),
      z.object({ kind: z.literal('sihua'), star: z.string().min(1), value: z.enum(['禄', '权', '科', '忌']) }),
      z.object({ kind: z.literal('mainStar'), value: z.string().min(1) }),
      z.object({ kind: z.literal('metadata'), field: z.enum(['fiveElementsClass', 'soul', 'body', 'bodyPalaceBranch', 'originalPalaceBranch']), value: z.string().min(1) }),
    ])),
  },
  outputSchema: openObjectOutputSchema,
}, async (input) => {
  const { presentationToken, claims } = input as { presentationToken: string; claims: ZiweiPresentationClaim[] };
  const validation = validateZiweiPresentation(presentationToken, claims);
  const structuredContent = validation ?? { valid: false, violations: [{ kind: 'presentationToken', message: 'presentationToken 无效、已失效或不属于当前 MCP 进程；请重新调用 ziwei_chart。' }] };
  return { content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }], structuredContent };
});
```

- [ ] **Step 4: 运行工具目录及无效 token 测试**

Run: `pnpm exec vitest run src/server.test.ts -t "tools/list 返回|validate_ziwei_presentation 拒绝无效凭证" -u`

Expected: 2 tests passed，schema 快照更新为 36 工具。

- [ ] **Step 5: 提交 MCP 工具**

```bash
git add apps/mcp-server/src/index.ts apps/mcp-server/src/mcpContract.ts apps/mcp-server/src/server.test.ts
git commit -m "feat(mcp): 暴露紫微呈现校验工具"
```

### Task 4: 验证真实 stdio 同会话的有效与篡改路径

**Files:**
- Modify: `apps/mcp-server/src/server.test.ts:251-315`

- [ ] **Step 1: 写入同会话测试**

新增测试通过 `runMcpSessionWithFollowUp` 先调用：

```ts
toolCallMsg(29, 'ziwei_chart', {
  birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
  transit: { year: 2025, month: 7 },
})
```

在 id 29 的 `structuredContent` 中读取 `data.palaces.命宫.stars[0]`、`data.mainStars[0]` 和 `result_meta.presentationToken`，接着发送：

```ts
toolCallMsg(30, 'validate_ziwei_presentation', {
  presentationToken,
  claims: [
    { kind: 'palaceStar', palace: '命宫', value: mingStar },
    { kind: 'mainStar', value: mainStar },
  ],
}),
toolCallMsg(31, 'validate_ziwei_presentation', {
  presentationToken,
  claims: [{ kind: 'palaceStar', palace: '命宫', value: '不存在星曜' }],
}),
```

断言 id 30 精确为 `{ valid: true, violations: [] }`，id 31 为 `valid: false` 且含 `kind: 'palaceStar'`。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm exec vitest run src/server.test.ts -t "同一会话中仅允许通过校验的紫微断言进入呈现"`

Expected: 在 Task 3 后应 PASS；若失败，检查是否从 `structuredContent.result_meta.presentationToken` 而非顶层读取 token，以及是否保持同一 server 进程。

- [ ] **Step 3: 运行全部 MCP 测试**

Run: `pnpm test`

Expected: 所有 MCP tests passed，Node DEP0190 Windows shell warning 不阻断。

- [ ] **Step 4: 提交 stdio 闭环测试**

```bash
git add apps/mcp-server/src/server.test.ts
git commit -m "test(mcp): 覆盖紫微呈现校验闭环"
```

### Task 5: 强化 Agent 指令和用户可见文档

**Files:**
- Modify: `apps/mcp-server/src/guidance.ts:45-60,94-103`
- Modify: `apps/mcp-server/src/guidance.test.ts:45-55`
- Modify: `SKILL.md`
- Modify: `README.md`
- Modify: `README_AI.md`
- Modify: `apps/mcp-server/README.md`
- Modify: `tool-index.md`
- Modify: `apps/visual/scripts/check-doc-contracts.mjs`

- [ ] **Step 1: 写入失败的 guidance 测试**

在 `guidance.test.ts` 断言：

```ts
expect(GLOBAL_AGENT_RULES.some((rule) => rule.includes('ziwei_chart') && rule.includes('validate_ziwei_presentation') && rule.includes('claims'))).toBe(true);
expect(TOOL_GUIDANCE.ziwei_chart.workflow).toContain('validate_ziwei_presentation');
```

- [ ] **Step 2: 运行失败测试**

Run: `pnpm exec vitest run src/guidance.test.ts`

Expected: FAIL，因为现有紫微 workflow 没有校验步骤。

- [ ] **Step 3: 更新 Agent 规则与文档**

在 `GLOBAL_AGENT_RULES` 追加规则：`紫微解读若写入宫位、星曜、四化、五行局、命主、身主或本次动态层等确定性结论，必须以本次 ziwei_chart 的 result_meta.presentationToken 调 validate_ziwei_presentation；每条结论逐项放入 claims，校验失败不得呈现为本次命盘结果。传统解释、条件性推论和建议不进入 claims。`

将 `TOOL_GUIDANCE.ziwei_chart.workflow` 改为：`先确认完整生辰 → 调 ziwei_chart → 从本次 ToolEnvelope 提取宫位、星曜、四化等确定性事实组成 claims → 用 presentationToken 调 validate_ziwei_presentation；valid:true 后才呈现。传统解释与建议不进入 claims。`

将 README、AI README、MCP README、SKILL 和索引中的 MCP 工具总数统一为 36（32 计算 + 4 元工具），并明确紫微确定性断言必须使用同一次 `ziwei_chart` token 校验；不要把文化解释和建议写入 claims。更新文档契约脚本，以 `36 个工具`、`validate_ziwei_presentation` 及各文档出现该工具为要求。

- [ ] **Step 4: 运行 guidance 与文档契约检查**

Run: `pnpm exec vitest run src/guidance.test.ts && node ../visual/scripts/check-doc-contracts.mjs`

Expected: guidance tests 与 doc contracts passed。

- [ ] **Step 5: 提交指令与文档**

```bash
git add apps/mcp-server/src/guidance.ts apps/mcp-server/src/guidance.test.ts SKILL.md README.md README_AI.md apps/mcp-server/README.md tool-index.md apps/visual/scripts/check-doc-contracts.mjs
git commit -m "docs: 固化紫微呈现校验流程"
```

### Task 6: 完整 CI 回归

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: 运行两端类型检查**

Run: `pnpm typecheck` in `apps/mcp-server`, then `pnpm typecheck` in `apps/visual`.

Expected: both exit 0.

- [ ] **Step 2: 运行两端完整单测**

Run: `pnpm test` in `apps/mcp-server`, then `pnpm test:unit` in `apps/visual`.

Expected: all test files and tests pass.

- [ ] **Step 3: 运行 visual CI 契约集合与构建**

Run: `node scripts/smoke-react-shell.mjs && node scripts/check-doc-contracts.mjs && node scripts/check-knowledge-references.mjs && node scripts/check-mapping-schema.mjs && node scripts/check-react-migration.mjs && node scripts/check-search-index.mjs && pnpm build` in `apps/visual`.

Expected: each checker has 0 failed and build exits 0. Existing Vite native-config and bundle-size warnings are non-blocking.

- [ ] **Step 4: 最终差异检查与单提交整理**

Run: `git diff --check && git status --short && git diff HEAD`.

Expected: only P2.3 verifier, MCP contract/tests, guidance, documentation, contract script, and design/plan files are present. Before any user-requested final commit, use one focused commit message: `feat(mcp): 扩展紫微呈现校验闭环`.
