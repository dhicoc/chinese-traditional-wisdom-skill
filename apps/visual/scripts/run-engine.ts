import { readFile } from 'node:fs/promises';
import { stdin, stderr, stdout } from 'node:process';
import { runLocalTool } from '../src/legacy/directRunner.ts';

async function readInput(path?: string): Promise<unknown> {
  const text = path && path !== '-'
    ? await readFile(path, 'utf8')
    : await new Promise<string>((resolve, reject) => {
      let data = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk) => { data += chunk; });
      stdin.on('end', () => resolve(data));
      stdin.on('error', reject);
    });
  if (!text.trim()) throw new Error('需要 JSON 输入文件，或通过 stdin 提供 JSON。');
  return JSON.parse(text);
}

async function main() {
  const [tool, inputFile] = process.argv.slice(2);
  if (!tool) throw new Error('用法：pnpm engine <tool> <input-json-file>（或将 JSON 传入 stdin）。');
  const result = await runLocalTool(tool, await readInput(inputFile));
  stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error: unknown) => {
  stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
