/* ===========================================
   header.js — nav status + active section
   =========================================== */

import { state, fetchHealth, setStatus } from './api.js';

const $ = (sel) => document.querySelector(sel);

function formatUptime(seconds) {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.round(seconds)}s`;
}

function formatNumber(n, digits = 0) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatMs(n) {
  if (n == null) return '—';
  return `${Number(n).toFixed(1)} ms`;
}

export function setStripMetrics(d) {
  const map = {
    'uptime': formatUptime(d.stats?.uptime_seconds),
    'ram': d.stats?.ram_rss_mb ? `${Math.round(d.stats.ram_rss_mb)} MB` : '—',
    'requests': formatNumber(d.stats?.total_requests),
    'p50': formatMs(d.stats?.latency_ms_p50),
    'error-rate': d.stats?.error_rate != null
      ? `${(d.stats.error_rate * 100).toFixed(2)}%`
      : '—',
    'model': d.model_loaded ? 'Loaded' : 'Offline',
  };
  for (const [k, v] of Object.entries(map)) {
    const el = document.querySelector(`.stat__value[data-key="${k}"]`);
    if (el) el.textContent = v;
  }
}

export function setNavStatus(online) {
  const el = $('#navStatus');
  if (!el) return;
  if (online === null) {
    setStatus(el, 'loading', 'checking…');
  } else if (online) {
    setStatus(el, 'online', 'Operational');
  } else {
    setStatus(el, 'offline', 'Unreachable');
  }
}

export function populateEndpoints(items) {
  const grid = $('#apiGrid');
  if (!grid) return;
  grid.innerHTML = items.map((it) => `
    <article class="card endpoint">
      <div class="endpoint__head">
        <span class="endpoint__method method--${it.method.toLowerCase()}">${it.method}</span>
        <span class="endpoint__path">${it.path}</span>
      </div>
      <p class="endpoint__desc">${it.desc}</p>
      ${it.link ? `<a class="endpoint__link" href="${it.link}" target="_blank" rel="noopener">${it.linkText || 'Open'} →</a>` : ''}
    </article>
  `).join('');
}

export function populateDocs(items) {
  const grid = $('#docsGrid');
  if (!grid) return;
  grid.innerHTML = items.map((d) => `
    <a class="doc" href="${d.href}" target="_blank" rel="noopener">
      <div class="doc__icon">${d.icon || '📄'}</div>
      <div class="doc__body">
        <div class="doc__name">${d.name}</div>
        <div class="doc__desc">${d.desc}</div>
      </div>
    </a>
  `).join('');
}

export function initHeader() {
  setNavStatus(null);
  fetchHealth()
    .then((d) => {
      state.health = d;
      setStripMetrics(d);
      setNavStatus(true);
    })
    .catch(() => setNavStatus(false));

  // Active section on scroll
  const navLinks = document.querySelectorAll('.topbar__nav a');
  const sections = Array.from(navLinks)
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          navLinks.forEach((a) => {
            a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
          });
        }
      });
    },
    { rootMargin: '-30% 0px -60% 0px' }
  );
  sections.forEach((s) => observer.observe(s));
}

export function updateBaseDisplay() {
  const el = document.querySelector('[data-api-base]');
  if (el) el.textContent = state.apiBase;
}
