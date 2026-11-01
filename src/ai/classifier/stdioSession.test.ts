import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { classifySource } from './classifierAdapter';
import { ClassifierSession } from './contracts';

const require = createRequire(import.meta.url);
const { openClassifierSession } = require('../../../engine/classifier/stdio-session.js') as {
  openClassifierSession(options: { executable: string; scriptPath: string; maxResponseBytes?: number }): ClassifierSession & { pid: number; exited: boolean };
};
const dirs: string[] = [];
const sessions: Array<ReturnType<typeof openClassifierSession>> = [];
function worker(body: string, maxResponseBytes?: number) {
  const dir = mkdtempSync(join(tmpdir(), 'ipi-classifier-fixture-')); dirs.push(dir);
  const scriptPath = join(dir, 'worker.cjs'); writeFileSync(scriptPath, body);
  const session = openClassifierSession({ executable: process.execPath, scriptPath, maxResponseBytes }); sessions.push(session); return session;
}
async function stopped(session: ReturnType<typeof openClassifierSession>) {
  for (let i = 0; i < 100 && !session.exited; i++) await new Promise(resolve => setTimeout(resolve, 10));
  expect(session.exited).toBe(true);
}
afterEach(async () => {
  for (const session of sessions.splice(0)) { session.terminate(); await stopped(session); }
  for (const dir of dirs.splice(0)) {
    const target = resolve(dir);
    expect(dirname(target)).toBe(resolve(tmpdir()));
    expect(basename(target)).toMatch(/^ipi-classifier-fixture-/);
    rmSync(target, { recursive: true, force: true });
  }
});
const identity = { model: 'fixture', revision: 'a'.repeat(40), tokenizerSha256: 'b'.repeat(64), labels: ['benign', 'malicious'] as ['benign', 'malicious'] };
const request = { protocol: 1 as const, model: identity.model, revision: identity.revision, tokenizerSha256: identity.tokenizerSha256, windows: [{ id: 'window-1', text: 'Hồ sơ 😀' }] };

describe('transport stdio với tiến trình fixture thật, không inference', () => {
  it('truyền JSON/Unicode đúng qua stdio và chấm dứt worker sau dùng', async () => {
    const session = worker("require('readline').createInterface({input:process.stdin}).on('line',s=>process.stdout.write(JSON.stringify(JSON.parse(s))+'\\n'));");
    expect(await session.classify(request, new AbortController().signal)).toEqual(request);
    session.terminate(); await stopped(session);
    await expect(session.classify(request, new AbortController().signal)).rejects.toThrow();
  });
  it('adapter nhận logits qua tiến trình fixture thật và giữ nguồn', async () => {
    const session = worker("require('readline').createInterface({input:process.stdin}).on('line',s=>{const r=JSON.parse(s);process.stdout.write(JSON.stringify({...r,labels:['benign','malicious'],windows:r.windows.map(w=>({id:w.id,logits:[0,0]}))})+'\\n');});");
    const result = await classifySource({ sourceId: 'view', filePath: '/fixture.txt', sourceView: 'text', startLine: 1, text: 'Fixture source' }, {
      identity, tokenizer: { sha256: identity.tokenizerSha256, offsets: () => [{ start: 0, end: 14 }], countInputTokens: () => 4 },
      maxInputTokens: 8, overlapTokens: 0, maxWindows: 1, timeoutMs: 2000, lowThreshold: 0.3, highThreshold: 0.8, openSession: () => session,
    });
    expect(result.coverage.complete).toBe(true); expect(result.windows[0].score).toBe(0.5);
    expect(result.windows[0].text).toBe('Fixture source'); expect(result.windows[0].route).toBe('review'); await stopped(session);
  });
  it('timeout adapter dừng cả tiến trình treo, không chỉ reject Promise', async () => {
    const session = worker("require('readline').createInterface({input:process.stdin}).on('line',()=>{});");
    const result = await classifySource({ sourceId: 'view', filePath: '/fixture.txt', sourceView: 'text', startLine: 1, text: 'Fixture source' }, {
      identity, tokenizer: { sha256: identity.tokenizerSha256, offsets: () => [{ start: 0, end: 14 }], countInputTokens: () => 4 },
      maxInputTokens: 8, overlapTokens: 0, maxWindows: 1, timeoutMs: 150,
      lowThreshold: 0.3, highThreshold: 0.8, openSession: () => session,
    });
    expect(result.issues[0].kind).toBe('timeout'); expect(result.coverage.complete).toBe(false);
    expect(result.windows).toEqual([]); await stopped(session);
  });
  it('nhận phản hồi đầy đủ trước khi worker tự thoát', async () => {
    const session = worker("require('readline').createInterface({input:process.stdin}).on('line',s=>{process.stdout.write(s+'\\n',()=>process.exit(0));});");
    expect(await session.classify(request, new AbortController().signal)).toEqual(request); await stopped(session);
  });
  it('hủy trực tiếp phải dừng worker', async () => {
    const session = worker("require('readline').createInterface({input:process.stdin}).on('line',()=>{});");
    const controller = new AbortController(); const pending = session.classify(request, controller.signal);
    controller.abort(); await expect(pending).rejects.toThrow(/hủy/); await stopped(session);
  });
  it.each(['bad-json', 'too-large', 'exit'])('worker %s không thành điểm sạch', async mode => {
    const code = mode === 'bad-json' ? "process.stdout.write('not-json\\n')" : mode === 'too-large' ? "process.stdout.write('x'.repeat(10000))" : 'process.exit(7)';
    const session = worker("require('readline').createInterface({input:process.stdin}).on('line',()=>{" + code + '});', 100);
    await expect(session.classify(request, new AbortController().signal)).rejects.toThrow();
    session.terminate(); await stopped(session);
  });
});
