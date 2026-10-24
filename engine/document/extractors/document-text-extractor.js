/**
 * Extract plain text from common document types for the IPI scanner.
 * Supports: .txt, .md, .pdf, .docx, .doc, .csv, .json, .xml, .html, .htm
 */

const fs = require('fs/promises');
const path = require('path');
const { inspectHtmlSource } = require('./html-source');

/**
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<{ok: boolean, text?: string, ext?: string, error?: string, views?: Array<{id: string, text: string, lineBasis: string}>, extraction?: ReturnType<typeof inspectHtmlSource>['extraction']}>}
 */
async function extractDocumentText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    switch (ext) {
      case '.txt':
      case '.md':
      case '.csv':
      case '.log':
      case '.rst': {
        const text = await fs.readFile(filePath, 'utf8');
        return { ok: true, text, ext };
      }

      case '.json': {
        const raw = await fs.readFile(filePath, 'utf8');
        // Keep raw JSON — IPI patterns often hide in values
        return { ok: true, text: raw, ext };
      }

      case '.html':
      case '.htm': {
        const raw = await fs.readFile(filePath, 'utf8');
        return { ok: true, ...inspectHtmlSource(raw), ext };
      }

      case '.xml': {
        const raw = await fs.readFile(filePath, 'utf8');
        // Strip tags, keep text content
        const text = raw.replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s{2,}/g, ' ')
          .trim();
        return { ok: true, text, ext };
      }

      case '.pdf': {
        // Lazy require — load only when needed
        let pdfModule;
        try {
          pdfModule = require('pdf-parse');
        } catch {
          return { ok: false, error: 'Missing pdf-parse. Run: npm install pdf-parse' };
        }
        const buffer = await fs.readFile(filePath);
        let extractedText = '';
        if (typeof pdfModule === 'function') {
          const data = await pdfModule(buffer);
          extractedText = data.text || '';
        } else if (pdfModule && pdfModule.PDFParse) {
          const parser = new pdfModule.PDFParse({ data: buffer });
          const res = await parser.getText();
          if (typeof parser.destroy === 'function') await parser.destroy();
          extractedText = res.text || '';
        } else {
          return { ok: false, error: 'Could not initialize PDF reader.' };
        }
        return { ok: true, text: extractedText, ext };
      }

      case '.docx':
      case '.doc': {
        let mammoth;
        try {
          mammoth = require('mammoth');
        } catch {
          return { ok: false, error: 'Missing mammoth. Run: npm install mammoth' };
        }
        const result = await mammoth.extractRawText({ path: filePath });
        return { ok: true, text: result.value || '', ext };
      }

      default:
        return { ok: false, error: `Unsupported file format "${ext}". Supported: txt, md, pdf, docx, csv, json, xml, html` };
    }
  } catch (err) {
    return { ok: false, error: err?.message || `Could not read file: ${filePath}` };
  }
}

/** Supported file extensions. */
const SUPPORTED_DOC_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.log', '.rst',
  '.json', '.xml', '.html', '.htm',
  '.pdf', '.docx', '.doc',
]);

module.exports = { extractDocumentText, SUPPORTED_DOC_EXTENSIONS };
