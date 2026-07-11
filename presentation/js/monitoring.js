/* ===========================================
   monitoring.js — live charts + system panel
   =========================================== */

import { state, fetchHealth, setStatus } from './api.js';

const COLORS = {
  text: '#7b8db3',
  grid: 'rgba(255,255,255,0.04)',
  accent: '#38bdf8',
  accent2: '#6366f1',
  danger: '#f87171',
  success: '#4ade80',
};

const baseChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a2332',
      borderColor: '#1e2d45',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#e2e8f0',
      padding: 8,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { color: COLORS.grid, display: false },
      ticks: { color: COLORS.text, font: { family: 'JetBrains Mono', size: 11 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: COLORS.grid },
      ticks: { color: COLORS.text, font: { family: 'JetBrains Mono', size: 11 } },
    },
  },
});

function fmt(s) {
  const d = new Date(s * 1000);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

let latencyChart = null;
let throughputChart = null;
let lastLatency = null;
let history = [];
const MAX_HISTORY = 60;

export function initMonitoring() {
  if (typeof Chart === 'undefined') return;

  // Latency distribution chart
  const latCanvas = document.getElementById('latencyChart');
  if (latCanvas) {
    latencyChart = new Chart(latCanvas, {
      type: 'bar',
      data: {
        labels: ['p50', 'p95', 'p99'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['rgba(56,189,248,0.6)', 'rgba(99,102,241,0.6)', 'rgba(248,113,113,0.6)'],
          borderColor: [COLORS.accent, COLORS.accent2, COLORS.danger],
          borderWidth: 1,
          borderRadius: 4,
          barThickness: 50,
        }],
      },
      options: {
        ...baseChartOptions(),
        plugins: {
          ...baseChartOptions().plugins,
          tooltip: {
            ...baseChartOptions().plugins.tooltip,
            callbacks: { label: (ctx) => `${ctx.parsed.y.toFixed(1)} ms` },
          },
        },
        scales: {
          ...baseChartOptions().scales,
          y: {
            ...baseChartOptions().scales.y,
            ticks: {
              ...baseChartOptions().scales.y.ticks,
              callback: (v) => `${v} ms`,
            },
          },
        },
      },
    });
  }

  // Throughput chart
  const tpCanvas = document.getElementById('throughputChart');
  if (tpCanvas) {
    throughputChart = new Chart(tpCanvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Latency (ms)',
            data: [],
            borderColor: COLORS.accent,
            backgroundColor: 'rgba(56,189,248,0.1)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 3,
          },
        ],
      },
      options: {
        ...baseChartOptions(),
        scales: {
          ...baseChartOptions().scales,
          x: {
            ...baseChartOptions().scales.x,
            ticks: { ...baseChartOptions().scales.x.ticks, maxRotation: 0, autoSkipPadding: 16 },
          },
        },
        plugins: {
          ...baseChartOptions().plugins,
          legend: { display: false },
        },
      },
    });
  }
}

export function updateMonitoring(health) {
  // Update latency distribution
  if (latencyChart && health.stats) {
    const { latency_ms_p50, latency_ms_p95, latency_ms_p99 } = health.stats;
    latencyChart.data.datasets[0].data = [
      latency_ms_p50 || 0,
      latency_ms_p95 || 0,
      latency_ms_p99 || 0,
    ];
    latencyChart.update('none');
  }

  // Update kv panel
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('kvModel', health.model_loaded ? 'Yes' : 'No');
  set('kvPath', health.model_path || '—');
  set('kvRam', health.stats?.ram_rss_mb ? `${health.stats.ram_rss_mb.toFixed(1)} MB` : '—');
  set('kvReqs', health.stats?.total_requests ?? '—');
  set('kvPercentiles', health.stats?.latency_ms_p50
    ? `${health.stats.latency_ms_p50.toFixed(1)} / ${(health.stats.latency_ms_p95 || 0).toFixed(1)} / ${(health.stats.latency_ms_p99 || 0).toFixed(1)} ms`
    : '—');
  set('kvTracking', health.tracking_enabled ? 'On' : 'Off');

  // Update throughput chart
  if (throughputChart && health.stats) {
    const p50 = health.stats.latency_ms_p50 || 0;
    if (p50 !== lastLatency) {
      lastLatency = p50;
      const ts = fmt(Math.floor(Date.now() / 1000));
      history.push({ ts, ms: p50 });
      if (history.length > MAX_HISTORY) history.shift();
      throughputChart.data.labels = history.map((h) => h.ts);
      throughputChart.data.datasets[0].data = history.map((h) => h.ms);
      throughputChart.update('none');
    }
  }

  document.querySelectorAll('.card__sub').forEach((el) => {
    if (el.id?.endsWith('Updated')) {
      el.textContent = `updated ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }
  });
}

export function startMonitoringPolling() {
  const tick = async () => {
    try {
      const d = await fetchHealth();
      state.health = d;
      updateMonitoring(d);
    } catch (e) {
      // silently fail
    }
  };
  tick();
  state.pollHandle = setInterval(tick, 10_000);
}
