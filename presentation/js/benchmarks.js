/* ===========================================
   benchmarks.js — performance charts
   =========================================== */

const COLORS = {
  text: '#7b8db3',
  grid: 'rgba(255,255,255,0.04)',
  accent: '#38bdf8',
  accent2: '#6366f1',
  danger: '#f87171',
  success: '#4ade80',
  warn: '#facc15',
};

// Real benchmark data (from reports/MODEL_EVALUATION_REPORT.md)
// Single-image latency, RTX 3050 4GB, 640x640
const DATA = {
  formats: ['PyTorch', 'ONNX FP16', 'TorchScript'],
  fps:        [33.6, 44.1, 33.2],
  sizes:      [38.8, 38.3, 77.0],
  p50:        [29.5, 21.9, 29.8],
  p95:        [32.1, 28.2, 33.3],
  p99:        [33.2, 34.4, 34.4],
  map50:      [0.935, 0.935, 0.935],
};

const baseOpts = () => ({
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
    x: { grid: { display: false }, ticks: { color: COLORS.text, font: { family: 'JetBrains Mono', size: 11 } } },
    y: {
      beginAtZero: true,
      grid: { color: COLORS.grid },
      ticks: { color: COLORS.text, font: { family: 'JetBrains Mono', size: 11 } },
    },
  },
});

function makeBar(canvas, label, data, color, opts = {}) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: DATA.formats,
      datasets: [{
        label,
        data,
        backgroundColor: color + 'aa',
        borderColor: color,
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 36,
      }],
    },
    options: { ...baseOpts(), ...opts },
  });
}

export function initBenchmarks() {
  if (typeof Chart === 'undefined') return;

  const fps = document.getElementById('fpsChart');
  const lat = document.getElementById('latencyBarChart');
  const size = document.getElementById('sizeChart');
  const scat = document.getElementById('scatterChart');

  if (fps) makeBar(fps, 'FPS', DATA.fps, COLORS.accent, {
    plugins: { ...baseOpts().plugins, tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (c) => `${c.parsed.y.toFixed(1)} FPS` } } },
  });
  if (lat) makeBar(lat, 'p95 (ms)', DATA.p95, COLORS.accent2, {
    plugins: { ...baseOpts().plugins, tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (c) => `${c.parsed.y.toFixed(1)} ms` } } },
  });
  if (size) makeBar(size, 'Size (MB)', DATA.sizes, COLORS.warn, {
    plugins: { ...baseOpts().plugins, tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (c) => `${c.parsed.y.toFixed(1)} MB` } } },
  });

  if (scat) {
    new Chart(scat, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Formats',
          data: DATA.formats.map((f, i) => ({ x: DATA.fps[i], y: DATA.map50[i] * 100, label: f })),
          backgroundColor: COLORS.accent,
          borderColor: COLORS.accent,
          pointRadius: 10,
          pointHoverRadius: 12,
        }],
      },
      options: {
        ...baseOpts(),
        plugins: {
          ...baseOpts().plugins,
          legend: { display: false },
          tooltip: {
            ...baseOpts().plugins.tooltip,
            callbacks: {
              title: () => '',
              label: (c) => `${c.raw.label} — ${c.parsed.x.toFixed(1)} FPS, mAP@50 ${c.parsed.y.toFixed(1)}%`,
            },
          },
        },
        scales: {
          ...baseOpts().scales,
          x: {
            ...baseOpts().scales.x,
            title: { display: true, text: 'Throughput (FPS)', color: COLORS.text, font: { family: 'Inter', size: 12 } },
          },
          y: {
            ...baseOpts().scales.y,
            max: 100,
            title: { display: true, text: 'mAP@50 (%)', color: COLORS.text, font: { family: 'Inter', size: 12 } },
            ticks: { ...baseOpts().scales.y.ticks, callback: (v) => `${v}%` },
          },
        },
      },
    });
  }
}
