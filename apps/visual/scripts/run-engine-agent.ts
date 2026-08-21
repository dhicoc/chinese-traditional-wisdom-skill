import { Solar } from 'lunar-typescript';
import { readFile } from 'node:fs/promises';
import { stderr, stdout } from 'node:process';
import { isLocalToolName } from '../src/legacy/localToolRegistry.ts';
import { describeLocalTool, listLocalToolDescriptors } from '../src/legacy/localToolIntrospection.ts';
import { verifyLocalToolClaims } from '../src/legacy/localClaimVerifier.ts';
import { presentLocalTool } from '../src/legacy/agentPresentation.ts';
import { LocalToolError, localToolErrorPayload } from '../src/legacy/localToolErrors.ts';
import { createSafeResultBundle, serializeSafeResultBundle, verifySafeResultBundle } from '../src/legacy/resultBundle.ts';
import { analyzeBaziTimeSensitivity, parseBaziTimeSensitivityInput } from '../src/legacy/baziTimeSensitivity.ts';
import { parseRuleComparisonRequest, runRuleComparison } from '../src/legacy/ruleComparison.ts';
import { parseAgentParameterPlanInput, planAgentParameters } from '../src/legacy/agentParameterPlanner.ts';

async function readJson(path: string | undefined, label: string, tool?: string): Promise<unknown> {
  if (!path) throw new LocalToolError('INVALID_INPUT', `${label}缺少 JSON 文件路径。`, tool);
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    throw new LocalToolError('INPUT_READ_FAILURE', error instanceof Error ? error.message : String(error), tool);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new LocalToolError('INVALID_JSON', `${label}不是有效 JSON：${error instanceof Error ? error.message : String(error)}`, tool);
  }
}

function requireTool(value: string | undefined) {
  if (!value || !isLocalToolName(value)) throw new LocalToolError('UNKNOWN_TOOL', `未知本地工具：${value ?? ''}`, value);
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  const [command, toolArg, firstPath, secondPath] = args;
  if (command === 'list') {
    stdout.write(`${JSON.stringify({ schemaVersion: '1.0.0', tools: listLocalToolDescriptors().map(({ name, category, resultKind, claimVerifier, riskDomain }) => ({ name, category, resultKind, claimVerifier, riskDomain })) })}\n`);
    return;
  }

  if (command === 'plan') {
    try {
      let rawInput: unknown;
      if (toolArg === '--input') {
        if (args.length !== 3) throw new TypeError('用法：engine:plan --input <planner-input.json>。');
        rawInput = await readJson(firstPath, 'planner input');
      } else {
        const queryIndex = args.indexOf('--query');
        if (queryIndex < 0 || !args[queryIndex + 1]) throw new TypeError('engine:plan 必须提供 --query <text> 或 --input <file>。');
        const providedIndex = args.indexOf('--provided');
        const allowedLength = providedIndex >= 0 ? 5 : 3;
        if (queryIndex !== 1 || args.length !== allowedLength || (providedIndex >= 0 && providedIndex !== 3)) {
          throw new TypeError('用法：engine:plan --query <text> [--provided field1,field2]。');
        }
        rawInput = {
          query: args[queryIndex + 1],
          providedFields: providedIndex >= 0 ? args[providedIndex + 1]?.split(',').map((field) => field.trim()).filter(Boolean) : [],
        };
      }
      stdout.write(`${JSON.stringify(planAgentParameters(parseAgentParameterPlanInput(rawInput)))}
`);
      return;
    } catch (error) {
      if (error instanceof LocalToolError) throw error;
      throw new LocalToolError('INVALID_INPUT', error instanceof Error ? error.message : String(error));
    }
  }
  if (command === 'bazi-time-sensitivity') {
    try {
      const input = parseBaziTimeSensitivityInput(await readJson(toolArg, 'input'));
      stdout.write(`${JSON.stringify(analyzeBaziTimeSensitivity({ ...input, solar: Solar }))}\n`);
      return;
    } catch (error) {
      if (error instanceof LocalToolError) throw error;
      throw new LocalToolError('INVALID_INPUT', error instanceof Error ? error.message : String(error));
    }
  }
  if (command === 'compare-rules') {
    try {
      const input = parseRuleComparisonRequest(await readJson(toolArg, 'input'));
      stdout.write(`${JSON.stringify(runRuleComparison(input, Solar))}\n`);
      return;
    } catch (error) {
      if (error instanceof LocalToolError) throw error;
      throw new LocalToolError('INVALID_INPUT', error instanceof Error ? error.message : String(error));
    }
  }
  if (command === 'verify-bundle') {
    const bundle = await readJson(toolArg, 'bundle');
    stdout.write(`${JSON.stringify(verifySafeResultBundle(bundle))}\n`);
    return;
  }

  const tool = requireTool(toolArg);
  if (command === 'describe') {
    stdout.write(`${JSON.stringify(describeLocalTool(tool))}\n`);
    return;
  }
  if (command === 'verify') {
    const envelope = await readJson(firstPath, 'envelope', tool);
    const claims = await readJson(secondPath, 'claims', tool);
    stdout.write(`${JSON.stringify(verifyLocalToolClaims(tool, envelope, claims))}\n`);
    return;
  }
  if (command === 'bundle') {
    const input = await readJson(firstPath, 'input', tool);
    const claims = secondPath ? await readJson(secondPath, 'claims', tool) : [];
    if (!Array.isArray(claims)) throw new LocalToolError('INVALID_INPUT', 'claims 必须是 JSON 数组。', tool);
    stdout.write(serializeSafeResultBundle(await createSafeResultBundle(tool, input, claims)));
    return;
  }
  if (command === 'present') {
    const input = await readJson(firstPath, 'input', tool);
    stdout.write(`${JSON.stringify(await presentLocalTool(tool, input))}\n`);
    return;
  }

  throw new LocalToolError('INVALID_INPUT', '用法：engine-agent list | describe <tool> | verify <tool> <envelope.json> <claims.json> | present <tool> <input.json> | bundle <tool> <input.json> [claims.json] | verify-bundle <bundle.json> | bazi-time-sensitivity <input.json> | compare-rules <input.json> | plan --query <text> [--provided fields] | plan --input <input.json>');
}

main().catch((error: unknown) => {
  stderr.write(`${JSON.stringify(localToolErrorPayload(error))}\n`);
  process.exitCode = 1;
});
