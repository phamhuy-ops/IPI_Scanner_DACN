const fs = require('fs/promises');
const path = require('path');

function resolveInsideRoot(rootDir, filePath) {
  const root = path.resolve(rootDir);
  const resolved = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(root, filePath);
  const rel = path.relative(root, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Đường dẫn nằm ngoài thư mục dự án: ${filePath}`);
  }
  return { root, resolved, rel };
}

function normalizeNewlines(text) {
  return String(text).replace(/\r\n/g, '\n');
}

function stripFences(text) {
  const fenced = String(text).match(/^```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/);
  return fenced ? fenced[1] : text;
}

function stripLineNumberPrefixes(text) {
  const lines = String(text).split(/\r?\n/);
  // Check if every non-empty line has a prefix like "12|" or "12: "
  const prefixRe = /^\s*\d+\s*[|:]\s?/;
  const hasPrefixes = lines.some((l) => l.trim() && prefixRe.test(l));
  if (!hasPrefixes) return text;
  return lines.map((l) => l.replace(prefixRe, '')).join('\n');
}

function cleanSlmCode(text) {
  if (typeof text !== 'string') return '';
  let cleaned = stripFences(text);
  cleaned = stripLineNumberPrefixes(cleaned);
  return cleaned;
}

function applySearchReplace(source, search, replace) {
  const src = String(source || '');
  const rawSearch = String(search || '');
  const rawReplace = String(replace || '');

  // 1. Exact match
  if (rawSearch && src.includes(rawSearch)) {
    return { ok: true, next: src.replace(rawSearch, rawReplace), mode: 'exact' };
  }

  // 2. LF normalized
  const srcN = normalizeNewlines(src);
  const searchN = normalizeNewlines(rawSearch);
  const replaceN = normalizeNewlines(rawReplace);
  if (searchN && srcN.includes(searchN)) {
    return { ok: true, next: srcN.replace(searchN, replaceN), mode: 'lf' };
  }

  // 3. Clean SLM artifacts (code fences, line number prefixes like 12|)
  const searchClean = cleanSlmCode(rawSearch);
  const replaceClean = cleanSlmCode(rawReplace);

  if (searchClean && searchClean !== rawSearch) {
    if (src.includes(searchClean)) {
      return { ok: true, next: src.replace(searchClean, replaceClean), mode: 'clean-exact' };
    }
    const searchCleanN = normalizeNewlines(searchClean);
    const replaceCleanN = normalizeNewlines(replaceClean);
    if (srcN.includes(searchCleanN)) {
      const isCrLf = src.includes('\r\n');
      const nextN = srcN.replace(searchCleanN, replaceCleanN);
      return { ok: true, next: isCrLf ? nextN.replace(/\n/g, '\r\n') : nextN, mode: 'clean-lf' };
    }
  }

  // 4. Line-by-line trimmed match (handles indentation differences)
  const targetSearch = normalizeNewlines(searchClean || searchN);
  const targetReplace = normalizeNewlines(replaceClean || replaceN);
  const searchLines = targetSearch.split('\n').filter((l) => l.length > 0);

  if (searchLines.length > 0) {
    const srcLines = srcN.split('\n');
    for (let i = 0; i <= srcLines.length - searchLines.length; i += 1) {
      let matched = true;
      for (let j = 0; j < searchLines.length; j += 1) {
        if (srcLines[i + j].trim() !== searchLines[j].trim()) {
          matched = false;
          break;
        }
      }
      if (matched) {
        // Calculate original start and end indices in srcN
        const linesBefore = srcLines.slice(0, i);
        const startIdx = linesBefore.length ? linesBefore.join('\n').length + 1 : 0;
        const matchedBlock = srcLines.slice(i, i + searchLines.length).join('\n');
        const endIdx = startIdx + matchedBlock.length;

        const nextN = srcN.slice(0, startIdx) + targetReplace + srcN.slice(endIdx);
        const isCrLf = src.includes('\r\n');
        return { ok: true, next: isCrLf ? nextN.replace(/\n/g, '\r\n') : nextN, mode: 'fuzzy-lines' };
      }
    }
  }

  return { ok: false, next: src, mode: 'miss' };
}

async function readSnippet(rootDir, filePath, aroundLine = 1, radius = 40) {
  const { resolved, rel } = resolveInsideRoot(rootDir, filePath);
  const content = await fs.readFile(resolved, 'utf8');
  const lines = content.split(/\r?\n/);
  const line = Math.max(1, Number(aroundLine) || 1);
  const from = Math.max(1, line - radius);
  const to = Math.min(lines.length, line + radius);
  const snippet = lines.slice(from - 1, to).map((text, i) => `${from + i}|${text}`).join('\n');
  return { ok: true, filePath: resolved, rel, from, to, totalLines: lines.length, snippet, content };
}

async function applyPatches(rootDir, patches = []) {
  const results = [];
  for (const patch of patches) {
    if (!patch?.filePath || typeof patch.search !== 'string' || typeof patch.replace !== 'string') {
      results.push({ ok: false, error: 'Patch thiếu filePath/search/replace', patch });
      continue;
    }
    try {
      const { resolved, rel, root } = resolveInsideRoot(rootDir, patch.filePath);
      const original = await fs.readFile(resolved, 'utf8');
      const applied = applySearchReplace(original, patch.search, patch.replace);
      if (!applied.ok) {
        results.push({ ok: false, error: 'Không tìm thấy đoạn search trong file', filePath: resolved, rel });
        continue;
      }
      const backupDir = path.join(root, '.sentinel-ipi-backup');
      await fs.mkdir(path.join(backupDir, path.dirname(rel)), { recursive: true });
      const backupPath = path.join(backupDir, rel);
      try {
        await fs.access(backupPath);
      } catch {
        await fs.writeFile(backupPath, original, 'utf8');
      }
      await fs.writeFile(resolved, applied.next, 'utf8');
      results.push({ ok: true, filePath: resolved, rel, mode: applied.mode, backupPath });
    } catch (error) {
      results.push({ ok: false, error: error.message, filePath: patch.filePath });
    }
  }
  return results;
}

module.exports = { resolveInsideRoot, applySearchReplace, readSnippet, applyPatches };
