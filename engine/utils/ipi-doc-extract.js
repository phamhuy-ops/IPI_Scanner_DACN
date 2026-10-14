/**
 * ipi-doc-extract.js
 * Trích xuất text từ các loại file tài liệu phổ biến cho IPI scanner.
 * Hỗ trợ: .txt, .md, .pdf, .docx, .doc, .csv, .json, .xml, .html, .htm
 */

const fs = require('fs/promises');
const path = require('path');

/**
 * Trích xuất text thuần từ một file document.
 * @param {string} filePath - Đường dẫn tuyệt đối tới file
 * @returns {Promise<{ok: boolean, text?: string, ext?: string, error?: string}>}
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
        // Giữ nguyên JSON string — IPI pattern thường ẩn trong value
        return { ok: true, text: raw, ext };
      }

      case '.xml':
      case '.html':
      case '.htm': {
        const raw = await fs.readFile(filePath, 'utf8');
        // Strip tags, giữ text content
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
        // Lazy require — chỉ load khi cần
        let pdfModule;
        try {
          pdfModule = require('pdf-parse');
        } catch {
          return { ok: false, error: 'Thiếu thư viện pdf-parse. Chạy: npm install pdf-parse' };
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
          return { ok: false, error: 'Không thể khởi tạo bộ đọc PDF.' };
        }
        return { ok: true, text: extractedText, ext };
      }

      case '.docx':
      case '.doc': {
        let mammoth;
        try {
          mammoth = require('mammoth');
        } catch {
          return { ok: false, error: 'Thiếu thư viện mammoth. Chạy: npm install mammoth' };
        }
        const result = await mammoth.extractRawText({ path: filePath });
        return { ok: true, text: result.value || '', ext };
      }

      default:
        return { ok: false, error: `Định dạng file "${ext}" chưa được hỗ trợ. Hỗ trợ: txt, md, pdf, docx, csv, json, xml, html` };
    }
  } catch (err) {
    return { ok: false, error: err?.message || `Không đọc được file: ${filePath}` };
  }
}

/**
 * Danh sách extension được hỗ trợ.
 */
const SUPPORTED_DOC_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.log', '.rst',
  '.json', '.xml', '.html', '.htm',
  '.pdf', '.docx', '.doc',
]);

module.exports = { extractDocumentText, SUPPORTED_DOC_EXTENSIONS };
