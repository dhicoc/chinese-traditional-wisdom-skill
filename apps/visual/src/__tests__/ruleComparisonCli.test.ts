import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCAL_TOOL_NAMES } from '@/legacy/localToolRegistry';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tsxCli = require.resolve('tsx/cli');
type CliResult = { code: number | null; stdout: string; stderr: string };

function runAgent(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, 'scripts/run-engine-agent.ts', ...args], { cwd: appRoot, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

const SUCCESS_CASES = [
  ['rule-comparison-bazi.success.json', 'bazi-shensha', 2],
  ['rule-comparison-chenguz.success.json', 'chenguz-version', 3],
  ['rule-comparison-daliuren.success.json', 'daliuren-school', 3],
  ['rule-comparison-taiyi.success.json', 'taiyi-config', 4],
  ['rule-comparison-time-basis.success.json', 'bazi-time-basis', 2],
  ['rule-comparison-ziwei.success.json', 'ziwei-dynamic-scope', 2],
] as const;

describe('rule comparison Agent CLI', () => {
  it.each(SUCCESS_CASES)('runs %s as independent domain %s', async (name, domain, variantCount) => {
    const registryCount = LOCAL_TOOL_NAMES.length;
    const fixture = path.join(appRoot, 'src/__fixtures__/analysis', name);
    const result = await runAgent(['compare-rules', fixture]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({ schemaVersion: '1.0.0', domain });
    expect(payload.variants).toHaveLength(variantCount);
    expect(payload.variants.every((variant: { factsVerified: boolean; citations: unknown[] }) => variant.factsVerified && variant.citations.length > 0)).toBe(true);
    expect(payload).not.toHaveProperty('recommendedVariant');
    expect(LOCAL_TOOL_NAMES).toHaveLength(registryCount);
  }, 15_000);

  it('returns INVALID_INPUT for an unsupported comparison domain', async () => {
    const fixture = path.join(appRoot, 'src/__fixtures__/analysis/rule-comparison.invalid.json');
    const result = await runAgent(['compare-rules', fixture]);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  }, 15_000);
});
