import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planAgentParameters } from '../apps/visual/src/legacy/agentParameterPlanner.ts';
import { parseIChingLookupRequest, runIChingLookup } from '../apps/visual/src/legacy/ichingLookup.ts';
import { canonicalStringify } from '../apps/visual/src/legacy/provenance.ts';
import { verifyPortableResultBundle } from '../apps/visual/src/legacy/resultBundleIntegrity.ts';

type EvalKind = 'planner' | 'document' | 'bundle' | 'iching-lookup';
type EvalCase = { schemaVersion: '1.0.0'; id: string; kind: EvalKind; input: Record<string, unknown> };
type Assertion = { path: string; operator: 'equals' | 'contains' | 'not-contains' | 'contains-text' | 'not-contains-text' | 'matches' | 'not-matches' | 'array-contains-object' | 'length-equals' | 'length-at-least'; value: unknown };
type Expected = { schemaVersion: '1.0.0'; caseId: string; assertions: Assertion[] };
type CaseResult = { id: string; passed: boolean; assertionCount: number; failures: string[] };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const casesDir = path.join(root, 'skill-evals/cases');
const expectedDir = path.join(root, 'skill-evals/expected');

async function json<T>(file: string): Promise<T> { return JSON.parse(await readFile(file, 'utf8')) as T; }
function atPath(value: unknown, selector: string): unknown {
  return selector.split('.').filter(Boolean).reduce<unknown>((current, key) => {
    if (Array.isArray(current) && /^\d+$/.test(key)) return current[Number(key)];
    if (current && typeof current === 'object') return (current as Record<string, unknown>)[key];
    return undefined;
  }, value);
}
function subset(actual: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== 'object') return actual === expected;
  if (Array.isArray(expected)) return Array.isArray(actual) && expected.every((item, index) => subset(actual[index], item));
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
  return Object.entries(expected as Record<string, unknown>).every(([key, child]) => subset((actual as Record<string, unknown>)[key], child));
}
function assertValue(actual: unknown, assertion: Assertion): boolean {
  const text = typeof actual === 'string' ? actual : canonicalStringify(actual);
  switch (assertion.operator) {
    case 'equals': return subset(actual, assertion.value);
    case 'contains': return Array.isArray(actual) && actual.some((item) => subset(item, assertion.value));
    case 'not-contains': return !Array.isArray(actual) || !actual.some((item) => subset(item, assertion.value));
    case 'contains-text': return text.includes(String(assertion.value));
    case 'not-contains-text': return !text.includes(String(assertion.value));
    case 'matches': return new RegExp(String(assertion.value), 'u').test(text);
    case 'not-matches': return !new RegExp(String(assertion.value), 'u').test(text);
    case 'array-contains-object': return Array.isArray(actual) && actual.some((item) => subset(item, assertion.value));
    case 'length-equals': return (Array.isArray(actual) || typeof actual === 'string') && actual.length === assertion.value;
    case 'length-at-least': return typeof actual === 'number' ? actual >= Number(assertion.value) : (Array.isArray(actual) || typeof actual === 'string') && actual.length >= Number(assertion.value);
  }
}
async function execute(testCase: EvalCase): Promise<unknown> {
  if (testCase.kind === 'planner') return planAgentParameters(testCase.input as { query: string; providedFields?: string[] });
  if (testCase.kind === 'iching-lookup') return runIChingLookup(parseIChingLookupRequest(testCase.input));
  const relative = String(testCase.input.file ?? '');
  const target = path.resolve(root, relative);
  if (!(target === root || target.startsWith(root + path.sep))) throw new Error(`case ${testCase.id}: file outside repository`);
  if (testCase.kind === 'document') return { text: await readFile(target, 'utf8') };
  const bundle = await json<Record<string, unknown>>(target);
  return {
    ...verifyPortableResultBundle(bundle),
    inputIncluded: bundle.inputIncluded,
    replayable: bundle.replayable,
    verifiedFactCount: Array.isArray(bundle.verifiedFacts) ? bundle.verifiedFacts.length : 0,
    text: canonicalStringify(bundle),
  };
}
async function run(): Promise<void> {
  const files = (await readdir(casesDir)).filter((file) => file.endsWith('.json')).sort();
  const results: CaseResult[] = [];
  for (const file of files) {
    const testCase = await json<EvalCase>(path.join(casesDir, file));
    const expected = await json<Expected>(path.join(expectedDir, file));
    if (testCase.schemaVersion !== '1.0.0' || expected.schemaVersion !== '1.0.0' || expected.caseId !== testCase.id) throw new Error(`${file}: schema/caseId mismatch`);
    const output = await execute(testCase);
    const failures = expected.assertions.flatMap((assertion, index) => assertValue(atPath(output, assertion.path), assertion) ? [] : [`#${index + 1} ${assertion.path} ${assertion.operator}`]);
    results.push({ id: testCase.id, passed: failures.length === 0, assertionCount: expected.assertions.length, failures });
  }
  const passed = results.filter((result) => result.passed).length;
  const report = { schemaVersion: '1.0.0', total: results.length, passed, failed: results.length - passed, results };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.failed > 0) process.exitCode = 1;
}
run().catch((error) => { process.stderr.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`); process.exitCode = 1; });
