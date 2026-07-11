// road-sense demo

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const API = 'http://road-sense-api.swedencentral.azurecontainer.io:8000';

const fmt = (s) => {
  if (s == null) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
};

const fmtMs = (n) => (n == null ? '—' : `${Math.round(n)} ms`);
const fmtMB = (n) => (n == null ? '—' : `${Math.round(n)} MB`);
const fmtPct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

async function fetchHealth() {
  const r = await fetch(`${API}/health`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

let lastHealth = null;
let lastTime = 0;

async function tick() {
  try {
    const d = await fetchHealth();
    const s = d.stats || {};
    const t0 = performance.now();
    const delta = lastTime ? t0 - lastTime : 0;
    const newReqs = (s.total_requests || 0) - (lastHealth?.stats?.total_requests || 0);
    const rps = delta > 0 ? (newReqs / (delta / 1000)).toFixed(2) : '—';
    lastTime = t0;
    lastHealth = d;

    $('#mUptime').textContent = fmt(s.uptime_seconds);
    $('#mMem').textContent = fmtMB(s.ram_rss_mb);
    $('#mReq').textContent = s.total_requests ?? '—';
    $('#mP50').textContent = fmtMs(s.latency_ms_p50);
    $('#mErr').textContent = s.error_count ?? '0';
    $('#mModel').textContent = d.model_loaded ? 'loaded' : '—';
    $('#heroTime').textContent = `${Math.round(s.latency_ms_p50 || 0)} ms`;

    $('#sBase').textContent = $('#apiBase').value;
    $('#sPath').textContent = d.model_path || '—';
    $('#sUp').textContent = fmt(s.uptime_seconds);
    $('#sMem').textContent = fmtMB(s.ram_rss_mb);
    $('#sTrack').textContent = d.tracking_enabled ? 'enabled' : 'disabled';

    $('#statusDot').classList.remove('off');
    $('#statusText').textContent = `${fmt(s.uptime_seconds)} · ${s.latency_ms_p50 ? Math.round(s.latency_ms_p50) + 'ms' : '—'} · ${rps} rps`;
    $('#statusPill').textContent = 'CPU';
    $('#statusPill').classList.add('on');
  } catch (e) {
    $('#statusDot').classList.add('off');
    $('#statusText').textContent = 'unreachable';
    $('#statusPill').textContent = 'OFF';
    $('#statusPill').classList.remove('on');
  }
}

// ===== Playground =====

const drop = $('#drop');
const fileInput = $('#file');
const confSlider = $('#conf');
const confVal = $('#confVal');
const runBtn = $('#runBtn');
const apiBaseInput = $('#apiBase');

let selectedFile = null;

confSlider.addEventListener('input', () => {
  confVal.textContent = (confSlider.value / 100).toFixed(2);
});

drop.addEventListener('click', () => fileInput.click());
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('is-over');
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    selectedFile = e.dataTransfer.files[0];
    $('#dropLabel').textContent = `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)`;
  }
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) {
    selectedFile = fileInput.files[0];
    $('#dropLabel').textContent = `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)`;
  }
});

runBtn.addEventListener('click', runDetect);

async function runDetect() {
  if (!selectedFile) {
    showError('select an image first');
    return;
  }
  hideError();
  $('#pgEmpty').style.display = 'none';
  $('#pgLoading').style.display = 'flex';
  $('#pgResult').classList.remove('is-on');
  runBtn.disabled = true;
  runBtn.textContent = '...';

  const fd = new FormData();
  fd.append('image', selectedFile);
  fd.append('conf', confSlider.value / 100);

  const t0 = performance.now();
  try {
    const r = await fetch(`${apiBaseInput.value.replace(/\/+$/, '')}/detect`, { method: 'POST', body: fd });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${r.status}`);
    }
    const d = await r.json();
    const elapsed = performance.now() - t0;
    renderResult(d, elapsed);
  } catch (e) {
    showError(e.message);
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = 'POST /detect →';
    $('#pgLoading').style.display = 'none';
  }
}

function renderResult(d, elapsed) {
  const dets = d.detections || [];
  $('#pgResult').classList.add('is-on');
  $('#rObj').textContent = dets.length;
  $('#rLat').textContent = `${Math.round(d.inference_time_ms)} ms`;
  $('#rTps').textContent = `${(1000 / d.inference_time_ms).toFixed(1)}/s`;
  $('#rImg').src = d.annotated_image;

  $('#rBody').innerHTML = dets.map((d) => `
    <tr>
      <td class="cls">${d.class_name}</td>
      <td class="conf">${(d.confidence * 100).toFixed(1)}%</td>
      <td class="track">${d.track_id ?? '—'}</td>
      <td class="bbox">${d.bbox.map((v) => v.toFixed(0)).join(', ')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" style="color:var(--text-dim);text-align:center">no detections</td></tr>';
}

function showError(msg) {
  const el = $('#pgErr');
  el.textContent = `> ${msg}`;
  el.style.display = 'block';
  $('#pgResult').classList.remove('is-on');
  $('#pgEmpty').style.display = 'none';
}
function hideError() {
  $('#pgErr').style.display = 'none';
}

// ===== Init =====

if (window.location.protocol === 'https:' && !window.location.hostname.includes('azurecontainer')) {
  document.body.insertAdjacentHTML('afterbegin', `<div style="background:#0a0a0a;border-bottom:1px solid #fbbf24;padding:10px 32px;font-size:12px;color:#fbbf24">HTTPS detected — open <a style="color:#fbbf24;text-decoration:underline" href="http://road-sense-api.swedencentral.azurecontainer.io:8000/">http://road-sense-api.swedencentral.azurecontainer.io:8000/</a> directly</div>`);
}

tick();
setInterval(tick, 5000);
