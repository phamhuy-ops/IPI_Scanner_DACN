const path = require('path');
const { normalizeFinding } = require('../models/finding');
const { IPI_DOC_PATTERNS } = require('./rules/ipi-document-rules');

function snippetAround(text, index, radius = 150) {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

/** Scan for suspicious Base64 strings and decode to find hidden IPI commands. */
function scanBase64Payloads(text, filePath, folderPath = '') {
  const findings = [];
  const rel = folderPath ? path.relative(folderPath, filePath) : path.basename(filePath);
  const b64Regex = /\b[A-Za-z0-9+/]{24,}={0,2}\b/g;

  let match;
  while ((match = b64Regex.exec(text)) !== null) {
    const rawMatch = match[0];
    try {
      const decoded = Buffer.from(rawMatch, 'base64').toString('utf8');
      if (/^[\x20-\x7E\r\n\t\u00C0-\u024F\u1EA0-\u1EF9]+$/.test(decoded)) {
        for (const pattern of IPI_DOC_PATTERNS) {
          if (pattern.re.test(decoded)) {
            const line = lineOf(text, match.index);
            findings.push(normalizeFinding({
              ruleId: 'IPI-DOC-BASE64-OBFUSCATED',
              owaspCategory: 'LLM01',
              title: '[Doc IPI] Base64 obfuscation — encoded IPI command hidden in Base64',
              severity: 'critical',
              confidence: 'high',
              target: filePath,
              location: `${rel}:${line}`,
              evidence: [
                `Base64 string: "${rawMatch.slice(0, 60)}..."`,
                `Decoded content: "${decoded.slice(0, 150)}"`,
                `Matched attack pattern: ${pattern.label}`,
                `File: ${rel}`,
              ],
              remediation:
                'Do not auto-decode unknown content into the LLM prompt. ' +
                'Filter encoded payloads before they enter the context window.',
              references: [
                'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
                'https://genai.owasp.org/llmrisk/llm01-prompt-injection/',
              ],
              collector: 'document',
            }));
            break;
          }
        }
      }
    } catch {
      // Invalid Base64 — skip
    }
  }

  return findings;
}

/** Scan plain text for IPI patterns using the knowledge base and decoders. */
function scanTextForIpi(text, filePath, folderPath = '') {
  const findings = [];
  const rel = folderPath ? path.relative(folderPath, filePath) : path.basename(filePath);

  for (const pattern of IPI_DOC_PATTERNS) {
    const regex = new RegExp(pattern.re.source, pattern.re.flags.includes('g') ? pattern.re.flags : pattern.re.flags + 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const line = lineOf(text, match.index);
      const snippet = snippetAround(text, match.index);

      findings.push(normalizeFinding({
        ruleId: `IPI-DOC-${pattern.label.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
        owaspCategory: 'LLM01',
        title: `[Doc IPI] ${pattern.label} — ${pattern.description}`,
        severity: pattern.severity,
        confidence: 'high',
        target: filePath,
        location: `${rel}:${line}`,
        evidence: [
          `Pattern: ${pattern.label}`,
          `Line ${line} snippet: "${snippet}"`,
          `Document file: ${rel}`,
        ],
        remediation:
          'Keep user document content separate from the system prompt. ' +
          'Wrap content in clear delimiters (e.g. <user_document>...</user_document>) ' +
          'and instruct the model to treat it as data only.',
        references: [
          'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
          'https://genai.owasp.org/llmrisk/llm01-prompt-injection/',
        ],
        collector: 'document',
      }));

      if (match[0].length === 0) break;
    }
  }

  findings.push(...scanBase64Payloads(text, filePath, folderPath));

  return findings;
}

module.exports = { scanTextForIpi, scanBase64Payloads };
