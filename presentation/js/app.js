// Road-Sense demo — one client script, no framework
(() => {
  'use strict';

  const DEFAULT_API_BASE = 'http://road-sense-api.swedencentral.azurecontainer.io:8000';
  const POLL_INTERVAL_MS = 10_000;
  const STORAGE_KEY = 'roadsense.apiBase';
  const HISTORY_LEN = 6; // 6 samples x 10s = 60s window

  // ----- Utilities -----

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const formatUptime = (s) => {
    if (s == null) return '—';
    const total = Math.floor(s);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const formatBytes = (mb) => {
    if (mb == null) return '—';
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  const formatNumber = (n) => {
    if (n == null) return '—';
    return n.toLocaleString('en-US');
  };

  const formatPct = (n) => {
    if (n == null) return '—';
    return `${(n * 100).toFixed(1)}%`;
  };

  const formatMs = (n) => {
    if (n == null) return '—';
    return `${Math.round(n)} ms`;
  };

  const shortModelPath = (p) => {
    if (!p) return '—';
    return p.split('/').pop();
  };

  const formatTime = (d) => {
    return d.toTimeString().slice(0, 8);
  };

  const readApiBase = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_API_BASE;
    } catch {
      return DEFAULT_API_BASE;
    }
  };

  const writeApiBase = (v) => {
    try { localStorage.setItem(STORAGE_KEY, v); } catch {}
  };

  // ----- API client -----

  async function fetchHealth(apiBase) {
    const url = `${apiBase.replace(/\/$/, '')}/health`;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { ok: true, data: await r.json() };
    } catch (e) {
      return { ok: false, error: e.message || 'unreachable' };
    } finally {
      clearTimeout(tid);
    }
  }

  // ----- Status strip -----

  function applyStrip(stats) {
    const set = (key, val) => {
      const el = document.querySelector(`.strip__value[data-key="${key}"]`);
      if (el) el.textContent = val;
    };
    if (!stats) return;
    set('uptime', formatUptime(stats.uptime_seconds));
    set('ram', formatBytes(stats.ram_rss_mb));
    set('requests', formatNumber(stats.total_requests));
    set('p50', formatMs(stats.latency_ms_p50));
    set('error', formatPct(stats.error_rate));
  }

  function applyNavStatus(state, label) {
    const el = $('#navStatus');
    if (!el) return;
    const dot = el.querySelector('.status__dot');
    const text = el.querySelector('[data-state]');
    dot.setAttribute('data-state', state);
    text.setAttribute('data-state', state);
    text.textContent = label;
  }

  // ----- Topbar nav active state -----

  function setupNavActive() {
    const links = $$('.topbar__nav a');
    const map = new Map(links.map(a => [a.getAttribute('href'), a]));
    const targets = links
      .map(a => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = '#' + e.target.id;
          links.forEach(a => a.classList.remove('is-active'));
          const active = map.get(id);
          if (active) active.classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

    targets.forEach(t => observer.observe(t));
  }

  // ----- Monitoring -----

  const state = {
    history: [], // [{ts, p50, p95, p99, total, rps}]
    lastTotal: null,
    lastTs: null,
  };

  function applyLatencyBars(stats) {
    const p50 = stats.latency_ms_p50;
    const p95 = stats.latency_ms_p95;
    const p99 = stats.latency_ms_p99;
    const max = Math.max(p99 || 0, 100);
    const setBar = (key, val) => {
      const row = document.querySelector(`.lbar[data-key="${key}"]`);
      if (!row) return;
      const fill = row.querySelector('.lbar__fill');
      const text = row.querySelector('.lbar__value');
      if (val == null) {
        fill.style.width = '0%';
        text.textContent = '—';
      } else {
        fill.style.width = `${(val / max) * 100}%`;
        text.textContent = formatMs(val);
      }
    };
    setBar('p50', p50);
    setBar('p95', p95);
    setBar('p99', p99);

    const aux = $('#latencyAux');
    if (aux) {
      const avg = aux.querySelector('[data-key="avg"]');
      const maxV = aux.querySelector('[data-key="max"]');
      // Approximate max from the current p99 sample (server doesn't expose raw max)
      if (avg) avg.textContent = formatMs(stats.latency_ms_avg);
      if (maxV) maxV.textContent = formatMs(p99);
    }
  }

  function updateThroughputChart(currentRps) {
    const chart = $('#throughputChart');
    if (!chart) return;
    const line = $('#throughputLine');
    const area = $('#throughputArea');
    const W = 600;
    const H = 120;
    const padX = 4;
    const padY = 12;

    const samples = state.history.slice(-HISTORY_LEN);
    if (samples.length < 2) {
      line.setAttribute('d', '');
      area.setAttribute('d', '');
      return;
    }
    const max = Math.max(...samples.map(s => s.rps), 0.1);
    const stepX = (W - padX * 2) / (HISTORY_LEN - 1);

    const points = samples.map((s, i) => {
      const x = padX + i * stepX;
      const y = H - padY - (s.rps / max) * (H - padY * 2);
      return [x, y];
    });

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
      .join(' ');

    const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${H - padY} L${points[0][0].toFixed(1)},${H - padY} Z`;

    line.setAttribute('d', linePath);
    area.setAttribute('d', areaPath);
  }

  function applyThroughput(stats, now) {
    const total = stats.total_requests;
    let rps = 0;
    if (state.lastTotal != null && state.lastTs != null) {
      const dt = (now - state.lastTs) / 1000;
      if (dt > 0) rps = Math.max(0, (total - state.lastTotal) / dt);
    }
    state.lastTotal = total;
    state.lastTs = now;

    const sample = {
      ts: now,
      p50: stats.latency_ms_p50,
      p95: stats.latency_ms_p95,
      p99: stats.latency_ms_p99,
      total,
      rps,
    };
    state.history.push(sample);
    if (state.history.length > HISTORY_LEN + 1) {
      state.history = state.history.slice(-HISTORY_LEN - 1);
    }

    const nowEl = $('#throughputNow');
    if (nowEl) nowEl.textContent = rps.toFixed(2);
    updateThroughputChart(rps);
  }

  function applySystemKv(health) {
    const stats = health.stats || {};
    const path = $('#kvPath');
    const model = $('#kvModel');
    const tracking = $('#kvTracking');
    if (path) path.textContent = health.model_path || '—';
    if (model) model.textContent = health.model_loaded ? 'true' : 'false';
    if (tracking) tracking.textContent = health.tracking_enabled ? 'enabled' : 'disabled';
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('kvRam', formatBytes(stats.ram_rss_mb));
    set('kvReqs', formatNumber(stats.total_requests));
    set('kvErrors', formatNumber(stats.error_count));
    set('kvRps', stats.requests_per_second != null ? stats.requests_per_second.toFixed(2) : '—');
    set('kvBudget', stats.ram_rss_mb != null && stats.ram_rss_mb < 2048 ? 'within 2 GB' : 'over 2 GB');
  }

  function applyUpdated(when) {
    const fmt = formatTime(when);
    const lat = $('#latencyUpdated');
    const sys = $('#systemUpdated');
    if (lat) lat.textContent = `updated ${fmt}`;
    if (sys) sys.textContent = `updated ${fmt}`;
  }

  async function poll(apiBase) {
    const res = await fetchHealth(apiBase);
    const now = new Date();
    if (!res.ok) {
      applyNavStatus('down', 'unreachable');
      return;
    }
    const health = res.data;
    applyNavStatus('ok', 'operational');
    applyStrip(health.stats || {});
    applyLatencyBars(health.stats || {});
    applyThroughput(health.stats || {}, now);
    applySystemKv(health);
    applyUpdated(now);
  }

  function startPolling() {
    let apiBase = readApiBase();
    const tick = () => poll(apiBase);
    tick();
    setInterval(tick, POLL_INTERVAL_MS);
  }

  // ----- Playground -----

  function setupPlayground() {
    const baseInput = $('#apiBaseInput');
    if (baseInput) baseInput.value = readApiBase();
    baseInput?.addEventListener('change', () => {
      writeApiBase(baseInput.value.trim());
    });

    const dropzone = $('#dropzone');
    const fileInput = $('#fileInput');
    const preview = $('#dropzonePreview');
    const empty = $('#dropzoneEmpty');
    const previewImg = $('#previewImg');
    const clearBtn = $('#clearFile');
    const confSlider = $('#confSlider');
    const confVal = $('#confVal');
    const detectBtn = $('#detectBtn');
    const resetBtn = null; // use clear button only
    const placeholder = $('#outputPlaceholder');
    const loading = $('#outputLoading');
    const errorBox = $('#outputError');
    const content = $('#outputContent');
    const outObjects = $('#outObjects');
    const outLatency = $('#outLatency');
    const outFps = $('#outFps');
    const annotatedImg = $('#annotatedImg');
    const tbody = $('#detectionTbody');

    let currentFile = null;
    let currentPreviewUrl = null;

    const show = (el) => { if (el) el.hidden = false; };
    const hide = (el) => { if (el) el.hidden = true; };

    const showOnly = (which) => {
      hide(placeholder);
      hide(loading);
      hide(errorBox);
      hide(content);
      if (which === 'placeholder') show(placeholder);
      if (which === 'loading') show(loading);
      if (which === 'error') show(errorBox);
      if (which === 'content') show(content);
    };

    const setFile = (file) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showOnly('error');
        errorBox.textContent = 'Selected file is not an image.';
        return;
      }
      currentFile = file;
      if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = URL.createObjectURL(file);
      previewImg.src = currentPreviewUrl;
      hide(empty);
      show(preview);
    };

    const clearFile = () => {
      currentFile = null;
      if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = null;
      previewImg.src = '';
      fileInput.value = '';
      show(empty);
      hide(preview);
      showOnly('placeholder');
    };

    dropzone?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput?.click();
      }
    });
    fileInput?.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (f) setFile(f);
    });
    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      clearFile();
    });

    ;['dragenter', 'dragover'].forEach(evt => {
      dropzone?.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('is-drag');
      });
    });
    ;['dragleave', 'drop'].forEach(evt => {
      dropzone?.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('is-drag');
      });
    });
    dropzone?.addEventListener('drop', (e) => {
      const f = e.dataTransfer?.files?.[0];
      if (f) setFile(f);
    });

    confSlider?.addEventListener('input', () => {
      confVal.textContent = (confSlider.value / 100).toFixed(2);
    });

    const run = async () => {
      if (!currentFile) {
        showOnly('error');
        errorBox.textContent = 'Pick an image first.';
        return;
      }
      const apiBase = readApiBase().replace(/\/$/, '');
      const conf = (confSlider.value / 100).toFixed(2);
      detectBtn.disabled = true;
      showOnly('loading');
      try {
        const form = new FormData();
        form.append('image', currentFile);
        form.append('conf', conf);
        form.append('session_id', 'web-' + Math.random().toString(36).slice(2, 8));
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 60_000);
        const r = await fetch(`${apiBase}/detect`, {
          method: 'POST',
          body: form,
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        if (!r.ok) {
          const t = await r.text();
          throw new Error(`HTTP ${r.status}\n${t}`);
        }
        const data = await r.json();
        renderResult(data);
      } catch (e) {
        showOnly('error');
        errorBox.textContent = e.message || String(e);
      } finally {
        detectBtn.disabled = false;
      }
    };

    const classDotClass = (name) => {
      const n = (name || '').toLowerCase();
      if (n.includes('vehicle') || n.includes('car')) return 'class-dot--vehicle';
      if (n.includes('pedestrian') || n.includes('person')) return 'class-dot--pedestrian';
      if (n.includes('cyclist') || n.includes('bike') || n.includes('bicycle')) return 'class-dot--cyclist';
      return '';
    };

    const renderResult = (data) => {
      const dets = data.detections || [];
      outObjects.textContent = dets.length;
      outLatency.textContent = data.inference_time_ms != null ? `${data.inference_time_ms.toFixed(1)} ms` : '—';
      const fps = data.inference_time_ms > 0 ? (1000 / data.inference_time_ms) : 0;
      outFps.textContent = data.inference_time_ms > 0 ? `${fps.toFixed(1)}` : '—';
      if (data.annotated_image) annotatedImg.src = data.annotated_image;

      tbody.innerHTML = '';
      if (dets.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.style.color = 'var(--text-dim)';
        td.style.textAlign = 'center';
        td.style.padding = '24px';
        td.textContent = 'No objects detected at this confidence threshold.';
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        dets.forEach((d) => {
          const tr = document.createElement('tr');
          const cls = document.createElement('td');
          const pill = document.createElement('span');
          pill.className = 'class-pill';
          const dot = document.createElement('span');
          dot.className = 'class-dot ' + classDotClass(d.class_name);
          pill.appendChild(dot);
          pill.appendChild(document.createTextNode(d.class_name || ''));
          cls.appendChild(pill);

          const conf = document.createElement('td');
          conf.style.fontFamily = "'JetBrains Mono', monospace";
          conf.style.fontSize = '12.5px';
          conf.textContent = (d.confidence != null ? d.confidence.toFixed(3) : '—');

          const tid_ = document.createElement('td');
          tid_.style.fontFamily = "'JetBrains Mono', monospace";
          tid_.style.fontSize = '12.5px';
          tid_.style.color = 'var(--text-mid)';
          tid_.textContent = d.track_id != null ? `#${d.track_id}` : '—';

          const bbox = document.createElement('td');
          bbox.className = 'dtable__num';
          const b = d.bbox || [];
          bbox.textContent = b.length === 4
            ? `[${b[0].toFixed(1)}, ${b[1].toFixed(1)}, ${b[2].toFixed(1)}, ${b[3].toFixed(1)}]`
            : '—';

          tr.appendChild(cls);
          tr.appendChild(conf);
          tr.appendChild(tid_);
          tr.appendChild(bbox);
          tbody.appendChild(tr);
        });
      }
      showOnly('content');
    };

    detectBtn?.addEventListener('click', run);
  }

  // ----- Terminal copy buttons -----

  function setupCopy() {
    $$('.terminal__copy').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const target = btn.getAttribute('data-copy');
        const el = document.getElementById(target);
        if (!el) return;
        const text = el.innerText;
        try {
          await navigator.clipboard.writeText(text);
          btn.classList.add('is-copied');
          const orig = btn.querySelector('span').textContent;
          btn.querySelector('span').textContent = 'Copied';
          setTimeout(() => {
            btn.classList.remove('is-copied');
            btn.querySelector('span').textContent = orig;
          }, 1400);
        } catch {}
      });
    });
  }

  // ----- API tabs -----

  function setupApiTabs() {
    const tabs = $$('.tabs .tab');
    const panels = $$('.tabs__panel');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.getAttribute('data-tab');
        tabs.forEach(t => t.classList.toggle('is-active', t === tab));
        panels.forEach(p => p.classList.toggle('is-active', p.getAttribute('data-panel') === name));
      });
    });
  }

  // ----- Boot -----

  document.addEventListener('DOMContentLoaded', () => {
    setupNavActive();
    setupCopy();
    setupApiTabs();
    setupPlayground();
    startPolling();
  });
})();
