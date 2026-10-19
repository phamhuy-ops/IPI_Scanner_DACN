/**
 * SENTINEL — In-app user guide (IPI document scanner)
 */
(function () {
  'use strict';

  const TABS = ['Start', 'Input', 'Agents', 'Results', 'LLM01'];

  const DATA = {
    0: [
      {
        icon: '🛡️', title: 'What is SENTINEL?', open: true,
        items: [
          'Desktop app (Electron) to find <strong>Indirect Prompt Injection (IPI)</strong> in documents before LLM/RAG ingestion.',
          'Uses a <strong>rule prefilter</strong> plus two local TinyLLMs through <strong>Ollama</strong> — no cloud.',
        ],
        tip: 'Only scan documents you are allowed to test.'
      },
      {
        icon: '⚙️', title: 'Quick workflow', open: false,
        items: [
          'Pick a <strong>folder</strong> or <strong>files</strong> on the left.',
          'Click <strong>Check local Ollama</strong>.',
          'Choose <strong>Balanced</strong> or <strong>Deep Scan</strong>, then run the scan.',
          'Review findings and the Verifier verdict on the right.'
        ]
      },
      {
        icon: '📁', title: 'Supported formats', open: false,
        items: [
          'Text: <code>txt</code>, <code>md</code>, <code>csv</code>, <code>json</code>, <code>xml</code>, <code>html</code>.',
          'Office: <code>pdf</code>, <code>docx</code>, <code>doc</code>.',
          'Folder scans: up to 300 files; skips <code>.git</code> and <code>node_modules</code>.'
        ]
      }
    ],
    1: [
      {
        icon: '📂', title: 'Document input', open: true,
        items: [
          '<strong>Document folder:</strong> recursive scan of supported files.',
          '<strong>Pick files:</strong> select one or more documents manually.',
        ],
        warn: 'Document text is processed locally; still avoid uploading real production secrets into test folders.'
      },
      {
        icon: '🔬', title: 'Balanced vs Deep Scan', open: false,
        items: [
          '<strong>Balanced:</strong> up to 12 chunks for TinyLLM review — faster daily use.',
          '<strong>Deep Scan:</strong> up to 24 chunks and more Verifier evidence — slower, wider coverage.',
        ],
        tip: 'If the prefilter is clean but you still suspect hidden instructions, try Deep Scan.'
      },
      {
        icon: '🔑', title: 'Ollama models', open: false,
        items: [
          'Baseline: <code>gemma3:1b</code> (Detector) and <code>qwen2.5-coder:1.5b</code> (Verifier).',
          'Pull models: <code>ollama pull gemma3:1b</code> and <code>ollama pull qwen2.5-coder:1.5b</code>.',
        ]
      }
    ],
    2: [
      {
        icon: '🤖', title: 'Three pipeline stages', open: true,
        items: [
          '<strong>Rule prefilter:</strong> 35+ patterns (English and Vietnamese), Base64, delimiters, steganography.',
          '<strong>Detector Agent:</strong> semantic intent on selected chunks.',
          '<strong>Verifier Agent:</strong> independent pass/fail cross-check.',
        ]
      },
      {
        icon: '🔍', title: 'What counts as IPI?', open: false,
        items: [
          'Direct orders to the model inside user documents (e.g. ignore prior instructions).',
          'System prompt override, jailbreak personas, exfiltration, task diversion.',
          'Security education text is usually benign; direct commands to the LLM are not.',
        ],
        tip: 'Teaching about prompt injection is not the same as performing it.'
      }
    ],
    3: [
      {
        icon: '📊', title: 'Reading results', open: true,
        items: [
          '<strong>Prefilter:</strong> rule ID, title, file location, evidence snippets.',
          '<strong>Detector:</strong> which chunks were semantically reviewed.',
          '<strong>Verifier:</strong> final verdict, reasons, remaining risks.',
        ]
      },
      {
        icon: '🔎', title: 'Pipeline log', open: false,
        items: [
          'Expand the log on the results panel for step-by-step progress.',
          'Failed scans usually mean Ollama is down or a model is missing.',
        ]
      },
      {
        icon: '🔄', title: 'Clear results', open: false,
        items: [
          'Use <strong>Clear results</strong> on the left to reset the panel before a new run.',
        ]
      }
    ],
    4: 'vulns'
  };

  const VULNS = [
    { id: 'LLM01', name: 'Prompt Injection', sev: 'critical', desc: 'Direct or indirect instructions in untrusted input that change model behavior.' },
    { id: 'IPI', name: 'Indirect Prompt Injection', sev: 'critical', desc: 'Hidden instructions in documents loaded into RAG or chat context.' },
    { id: 'OVERRIDE', name: 'Instruction override', sev: 'critical', desc: '"Ignore previous instructions" and similar cancel-system-directive patterns.' },
    { id: 'EXFIL', name: 'Prompt / secret exfiltration', sev: 'high', desc: 'Attempts to print system prompt, API keys, or leak data via markdown URLs.' },
    { id: 'JAIL', name: 'Jailbreak / persona hijack', sev: 'high', desc: 'DAN, dev mode, uncensored role-play embedded in documents.' },
    { id: 'OBF', name: 'Obfuscation', sev: 'high', desc: 'Base64 payloads, zero-width characters, delimiter smuggling.' },
  ];

  let guideOpen = false;
  let activeTab = 0;
  const openSections = {}; // key → boolean

  // ── Render ──────────────────────────────────────────────────────────────────

  function sevColor(sev) {
    if (sev === 'critical') return 'var(--crit)';
    if (sev === 'high')     return 'var(--high)';
    if (sev === 'medium')   return 'var(--med)';
    return 'var(--low)';
  }
  function sevBg(sev) {
    if (sev === 'critical') return 'var(--crit-bg)';
    if (sev === 'high')     return 'var(--high-bg)';
    if (sev === 'medium')   return 'var(--med-bg)';
    return 'var(--low-bg)';
  }
  function sevBorder(sev) {
    if (sev === 'critical') return 'var(--crit-b)';
    if (sev === 'high')     return 'var(--high-b)';
    if (sev === 'medium')   return 'var(--med-b)';
    return 'var(--low-b)';
  }

  function renderVulns() {
    return `<div style="display:flex;flex-direction:column;gap:5px;">` +
      VULNS.map(v => `
        <div style="display:flex;align-items:flex-start;gap:9px;padding:8px 10px;
          background:var(--bg-input);border:1px solid var(--border-dim);
          border-left:3px solid ${sevColor(v.sev)};border-radius:6px;">
          <div style="display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;">
            <div style="display:flex;align-items:center;gap:7px;">
              <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${sevColor(v.sev)};flex-shrink:0;">${v.id}</span>
              <span style="font-size:11.5px;font-weight:600;color:var(--text);">${v.name}</span>
            </div>
            <div style="font-size:11px;color:var(--text-2);line-height:1.45;margin-top:2px;">${v.desc}</div>
          </div>
          <span style="font-size:9px;font-family:var(--mono);font-weight:700;padding:2px 6px;
            border-radius:3px;border:1px solid ${sevBorder(v.sev)};
            background:${sevBg(v.sev)};color:${sevColor(v.sev)};
            flex-shrink:0;white-space:nowrap;margin-top:1px;">${v.sev.toUpperCase()}</span>
        </div>
      `).join('') +
    `</div>`;
  }

  function renderSections(sections, tabIdx) {
    return sections.map((sec, idx) => {
      const key = `${tabIdx}_${idx}`;
      const isOpen = openSections[key] !== undefined ? openSections[key] : sec.open;

      const itemsHtml = (sec.items || []).map(item => `
        <div style="display:flex;gap:8px;align-items:flex-start;">
          <div style="width:5px;height:5px;border-radius:50%;background:var(--accent-bright);
            flex-shrink:0;margin-top:6px;border:1.5px solid var(--accent);"></div>
          <div style="font-size:12px;color:var(--text-2);line-height:1.55;flex:1;">${item}</div>
        </div>
      `).join('');

      const tipHtml = sec.tip ? `
        <div style="display:flex;gap:7px;align-items:flex-start;
          background:var(--accent-dim);border:1px solid var(--accent-border);
          border-left:3px solid var(--accent-bright);border-radius:6px;padding:8px 10px;margin-top:4px;">
          <span style="font-size:13px;flex-shrink:0;">💡</span>
          <span style="font-size:11.5px;color:var(--text-2);line-height:1.5;">${sec.tip}</span>
        </div>
      ` : '';

      const warnHtml = sec.warn ? `
        <div style="display:flex;gap:7px;align-items:flex-start;
          background:var(--crit-bg);border:1px solid var(--crit-b);
          border-left:3px solid var(--crit);border-radius:6px;padding:8px 10px;margin-top:4px;">
          <span style="font-size:13px;flex-shrink:0;">⚠️</span>
          <span style="font-size:11.5px;color:var(--crit);line-height:1.5;font-weight:500;">${sec.warn}</span>
        </div>
      ` : '';

      return `
        <div class="gd-section" data-key="${key}">
          <button class="gd-section-hdr ${isOpen ? 'open' : ''}" data-key="${key}" type="button">
            <span style="font-size:14px;">${sec.icon}</span>
            <span class="gd-section-name">${sec.title}</span>
            <span class="gd-caret ${isOpen ? 'open' : ''}">▶</span>
          </button>
          <div class="gd-section-body" style="display:${isOpen ? 'flex' : 'none'};">
            ${itemsHtml}${tipHtml}${warnHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderBody() {
    const d = DATA[activeTab];
    if (d === 'vulns') return renderVulns();
    return renderSections(d, activeTab);
  }

  function renderPanel() {
    const tabsHtml = TABS.map((t, i) => `
      <button class="gd-tab ${i === activeTab ? 'active' : ''}" data-tab="${i}" type="button">${t}</button>
    `).join('');

    return `
      <aside id="sentinel-guide-panel" class="gd-panel" role="complementary" aria-label="User guide">
        <div class="gd-header">
          <div class="gd-header-title">
            <span style="font-size:15px;">📖</span>
            <span>Guide</span>
          </div>
          <button class="gd-close" id="gd-close-btn" title="Close guide" type="button" aria-label="Close guide">✕</button>
        </div>
        <div class="gd-tabs" id="gd-tabs" role="tablist">${tabsHtml}</div>
        <div class="gd-body" id="gd-body" role="tabpanel">${renderBody()}</div>
      </aside>
    `;
  }

  // ── CSS inject ───────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('sentinel-guide-css')) return;
    const style = document.createElement('style');
    style.id = 'sentinel-guide-css';
    style.textContent = `
/* ── Guide button in header ───────────────────── */
#sentinel-guide-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-input);
  color: var(--text-2);
  font-size: 12px; font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background .13s, color .13s, border-color .13s;
  white-space: nowrap;
}
#sentinel-guide-btn:hover {
  background: var(--bg-hover); color: var(--text); border-color: var(--border);
}
#sentinel-guide-btn.guide-open {
  background: var(--accent-dim);
  border-color: var(--accent-border);
  color: var(--accent);
}

/* ── Panel overlay backdrop ───────────────────── */
#gd-backdrop {
  position: fixed; inset: 0; z-index: 80;
  background: rgba(0,0,0,.18);
  animation: gdFadeIn .18s ease both;
}
@keyframes gdFadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ── Guide panel ──────────────────────────────── */
.gd-panel {
  position: fixed;
  top: 44px; right: 0; bottom: 0;
  width: min(340px, calc(100vw - 40px));
  z-index: 81;
  display: flex; flex-direction: column;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  box-shadow: -4px 0 24px rgba(0,0,0,.12);
  animation: gdSlideIn .22s cubic-bezier(.4,0,.2,1) both;
  overflow: hidden;
}
@keyframes gdSlideIn {
  from { transform: translateX(100%); opacity: .6; }
  to   { transform: translateX(0);   opacity: 1; }
}

/* ── Header ───────────────────────────────────── */
.gd-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px;
  background: var(--bg-panel);
  border-bottom: 2px solid var(--accent-bright);
  flex-shrink: 0;
}
.gd-header-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; font-weight: 700; color: var(--text);
  letter-spacing: .02em;
}
.gd-close {
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg-input); color: var(--text-3);
  font-size: 11px; cursor: pointer;
  transition: all .12s;
}
.gd-close:hover { background: var(--crit-bg); color: var(--crit); border-color: var(--crit-b); }

/* ── Tabs ─────────────────────────────────────── */
.gd-tabs {
  display: flex; border-bottom: 1px solid var(--border-dim);
  flex-shrink: 0; overflow-x: auto; scrollbar-width: none;
  background: var(--bg-panel);
}
.gd-tabs::-webkit-scrollbar { display: none; }
.gd-tab {
  flex: 1; min-width: max-content;
  padding: 8px 10px;
  font-size: 11px; font-weight: 500;
  color: var(--text-2);
  background: transparent; border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer; font-family: inherit;
  transition: all .12s; white-space: nowrap;
}
.gd-tab:hover { color: var(--text); background: var(--bg-hover); }
.gd-tab.active {
  color: var(--accent); border-bottom-color: var(--accent-bright);
  font-weight: 600; background: var(--bg-card);
}

/* ── Body ─────────────────────────────────────── */
.gd-body {
  flex: 1; overflow-y: auto;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 8px;
}
.gd-body::-webkit-scrollbar { width: 4px; }
.gd-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* ── Section ──────────────────────────────────── */
.gd-section {
  border: 1px solid var(--border-dim);
  border-radius: 8px;
  background: var(--bg-input);
  overflow: hidden;
}
.gd-section-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 11px;
  background: transparent; border: none;
  cursor: pointer; width: 100%; text-align: left;
  font-family: inherit;
  transition: background .1s;
  -webkit-user-select: none; user-select: none;
}
.gd-section-hdr:hover { background: var(--bg-hover); }
.gd-section-hdr.open { background: var(--accent-dim); border-bottom: 1px solid var(--accent-border); }
.gd-section-name {
  flex: 1; font-size: 12px; font-weight: 600; color: var(--text);
}
.gd-caret {
  font-size: 8px; color: var(--text-3);
  transition: transform .15s; flex-shrink: 0;
}
.gd-caret.open { transform: rotate(90deg); color: var(--accent); }
.gd-section-body {
  flex-direction: column; gap: 7px;
  padding: 10px 12px;
  animation: gdFadeIn .15s ease both;
  border-top: 1px solid var(--border-dim);
  background: var(--bg-card);
}
.gd-section-body code {
  font-family: var(--mono); font-size: 11px;
  background: var(--bg-input); padding: 1px 5px;
  border-radius: 4px; color: var(--accent);
  border: 1px solid var(--border);
}
    `;
    document.head.appendChild(style);
  }

  // ── DOM ──────────────────────────────────────────────────────────────────────

  function removePanel() {
    document.getElementById('sentinel-guide-panel')?.remove();
    document.getElementById('gd-backdrop')?.remove();
    document.body.classList.remove('guide-visible');
  }

  function mountPanel() {
    removePanel();
    injectStyles();

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'gd-backdrop';
    backdrop.addEventListener('click', () => { guideOpen = false; removePanel(); updateBtn(); });
    document.body.appendChild(backdrop);

    // Panel
    const div = document.createElement('div');
    div.innerHTML = renderPanel();
    const panel = div.firstElementChild;
    document.body.appendChild(panel);
    document.body.classList.add('guide-visible');

    // Close
    panel.querySelector('#gd-close-btn').addEventListener('click', () => {
      guideOpen = false; removePanel(); updateBtn();
    });

    // Tabs
    panel.querySelector('#gd-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.gd-tab');
      if (!btn) return;
      activeTab = parseInt(btn.dataset.tab, 10);
      panel.querySelectorAll('.gd-tab').forEach((t, i) => t.classList.toggle('active', i === activeTab));
      const body = panel.querySelector('#gd-body');
      if (body) { body.innerHTML = renderBody(); bindSections(body); }
    });

    bindSections(panel.querySelector('#gd-body'));
  }

  function bindSections(container) {
    if (!container) return;
    container.querySelectorAll('.gd-section-hdr').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const key = hdr.dataset.key;
        const isOpen = !hdr.classList.contains('open');
        openSections[key] = isOpen;
        hdr.classList.toggle('open', isOpen);
        const caret = hdr.querySelector('.gd-caret');
        if (caret) caret.classList.toggle('open', isOpen);
        const body = hdr.nextElementSibling;
        if (body) body.style.display = isOpen ? 'flex' : 'none';
      });
    });
  }

  function updateBtn() {
    const btn = document.getElementById('sentinel-guide-btn');
    if (!btn) return;
    btn.classList.toggle('guide-open', guideOpen);
    btn.innerHTML = guideOpen
      ? '<span>📖</span> Close guide'
      : '<span>📖</span> Guide';
  }

  function injectBtn() {
    const headerGap = document.querySelector('.header-gap');
    if (!headerGap || document.getElementById('sentinel-guide-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'sentinel-guide-btn';
    btn.type = 'button';
    btn.innerHTML = '<span>📖</span> Guide';
    btn.title = 'Open or close the user guide';
    btn.addEventListener('click', () => {
      guideOpen = !guideOpen;
      guideOpen ? mountPanel() : removePanel();
      updateBtn();
    });
    headerGap.insertAdjacentElement('afterend', btn);
  }

  // Bootstrap
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (document.querySelector('.header-gap')) { clearInterval(iv); injectBtn(); injectStyles(); }
    if (tries > 100) clearInterval(iv);
  }, 100);

})();
