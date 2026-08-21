import fs from 'node:fs';
export function canonicalTextBufferFromString(text) {
  return Buffer.from(text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'), 'utf8');
}
export function canonicalTextBuffer(file) {
  return canonicalTextBufferFromString(fs.readFileSync(file, 'utf8'));
}
