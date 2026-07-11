/* ===========================================
   api.js — API client + status helpers
   =========================================== */

const DEFAULT_API = 'http://road-sense-api.swedencentral.azurecontainer.io:8000';

export const state = {
  apiBase: DEFAULT_API,
  health: null,
  pollHandle: null,
};

export function normalizeBase(url) {
  return (url || DEFAULT_API).replace(/\/+$/, '');
}

export function getBase() {
  return normalizeBase(state.apiBase);
}

export async function fetchHealth() {
  const base = getBase();
  const r = await fetch(`${base}/health`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Health check failed (HTTP ${r.status})`);
  return r.json();
}

export async function detectSingle(file, conf) {
  const base = getBase();
  const fd = new FormData();
  fd.append('image', file);
  fd.append('conf', conf.toFixed(2));
  const r = await fetch(`${base}/detect`, { method: 'POST', body: fd });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || `HTTP ${r.status}`);
  return data;
}

export function setApiBase(url) {
  state.apiBase = normalizeBase(url);
  localStorage.setItem('roadsense.apiBase', state.apiBase);
}

export function loadApiBase() {
  const saved = localStorage.getItem('roadsense.apiBase');
  if (saved) state.apiBase = normalizeBase(saved);
  return state.apiBase;
}

export function setStatus(element, state, label) {
  const dot = element.querySelector('.status__dot');
  const text = element.querySelector('span[data-state]') || element.querySelector('span:not(.status__dot)');
  if (dot) dot.dataset.state = state;
  if (text) {
    text.dataset.state = state;
    text.textContent = label;
  }
}
