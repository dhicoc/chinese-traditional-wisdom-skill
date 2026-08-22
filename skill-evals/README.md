# Skill 行为评测

该目录是纯本地、确定性的行为契约评测，不调用 LLM、不访问远端服务，也不执行新的术数计算。

```bash
pnpm eval:skill
```

结构：

- `cases/`：合成输入与执行器类型；不包含真实用户咨询资料。
- `expected/`：对路由、缺失字段、文档边界和结果包的断言。
- `run-evals.ts`：读取同名 case/expected，输出仅含 case ID 的 JSON 报告。

当前 20 项覆盖实施计划第 7 节全部 15 项行为、4 项产品决定及周易六十四卦本地查询契约。Planner 用例复用生产 `planAgentParameters()`；六十四卦用例复用 `parseIChingLookupRequest()` / `runIChingLookup()`；文档用例检查 `SKILL.md` / `RULES.md`；结果包用例复用 canonical integrity verifier。任何断言失败进程退出码为 1，并阻断 CI。
