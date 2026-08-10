import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tsxCli = require.resolve('tsx/cli');
const fixture = (name: string) => path.join(appRoot, 'src/__fixtures__/local-tools', name);

type CliResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

function runEngine(args: string[], input?: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, 'scripts/run-engine.ts', ...args], {
      cwd: appRoot,
      stdio: 'pipe',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

describe('run-engine CLI', () => {
  it('returns a JSON envelope from an input file', async () => {
    const result = await runEngine(['list_constitution_questionnaire', fixture('list_constitution_questionnaire.success.json')]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      tool: 'list_constitution_questionnaire',
      data: { groups: expect.any(Array) },
    });
  });

  it('accepts JSON from stdin', async () => {
    const result = await runEngine(['list_constitution_questionnaire', '-'], '{}');

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      tool: 'list_constitution_questionnaire',
    });
  });

  it('returns a non-zero exit code for a contract failure', async () => {
    const result = await runEngine(['calc_chenguz', fixture('calc_chenguz.failure.json')]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('version 必须是 standard、folk 或 full。');
  });

  it('returns a non-zero exit code for invalid JSON', async () => {
    const result = await runEngine(['list_constitution_questionnaire', '-'], '{');

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/JSON/);
  });
});
