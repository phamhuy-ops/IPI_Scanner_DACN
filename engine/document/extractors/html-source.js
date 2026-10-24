// Static inspection only. Raw source is authoritative; the readable projection
// is supplementary and never substitutes for raw comments/attributes/code.
function decodeTextEntities(text) {
  const named = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  return text.replace(/&(#x[0-9a-f]+|#\d+|nbsp|amp|lt|gt|quot|apos);/gi, (original, entity) => {
    if (!entity.startsWith('#')) return named[entity.toLowerCase()] || original;
    const value = /^#x/i.test(entity) ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return value > 0 && value <= 0x10FFFF && !(value >= 0xD800 && value <= 0xDFFF)
      ? String.fromCodePoint(value) : original;
  });
}

function inspectHtmlSource(raw) {
  const regions = [];
  const warnings = [];
  // Region labels are lexical hints, not browser visibility determinations.
  const pattern = /<!--[\s\S]*?(?:-->|$)|<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)|<style\b[^>]*>[\s\S]*?(?:<\/style\s*>|$)/gi;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    const kind = match[0].startsWith('<!--') ? 'comment' : /^<script/i.test(match[0]) ? 'script' : 'style';
    const closed = kind === 'comment' ? match[0].endsWith('-->') : new RegExp(`</${kind}\\s*>$`, 'i').test(match[0]);
    regions.push({ kind, startOffset: match.index, endOffset: match.index + match[0].length,
      startLine: raw.slice(0, match.index).split(/\r\n?|\n/).length,
      endLine: raw.slice(0, match.index + match[0].length).split(/\r\n?|\n/).length, closed });
    if (!closed) warnings.push(`Unclosed HTML ${kind}; static text projection may be incomplete.`);
  }
  if (/<script\b|<iframe\b|<object\b|<embed\b|\bon[a-z]+\s*=|\b(?:src|href)\s*=\s*['"]?\s*javascript:/i.test(raw)) {
    warnings.push('Executable or embedded content was not executed/resolved; generated or remote content is outside coverage.');
  }
  if (/<(?:link|img|source|video|audio)\b[^>]*(?:src|href)\s*=/i.test(raw) || /\burl\s*\(|@import\b/i.test(raw)) {
    warnings.push('Referenced resources and image/OCR content were not loaded; only local source is covered.');
  }
  const projection = decodeTextEntities(raw.replace(pattern, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[\t ]+/g, ' ').trim();
  const views = [{ id: 'raw-html', text: raw, lineBasis: 'source' }];
  if (projection.trim()) views.push({ id: 'text-projection', text: projection, lineBasis: 'projection' });
  return { text: raw, views, extraction: { format: 'html', sourcePreserved: true,
    sourceCharacters: raw.length, sourceViews: views.map(({ id, lineBasis }) => ({ id, lineBasis })), regions, warnings,
    limitations: ['Static source inspection, not browser rendering. CSS visibility, JavaScript execution and remote resources are not evaluated.',
      'Text projection uses lexical tag removal and a limited entity decoder; raw source remains available even for malformed HTML.'] } };
}
module.exports = { inspectHtmlSource, decodeTextEntities };
