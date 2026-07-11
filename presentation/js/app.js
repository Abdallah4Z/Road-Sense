/* ===========================================
   app.js — main entry point
   =========================================== */

import { loadApiBase, getBase } from './api.js';
import { initHeader, updateBaseDisplay, populateEndpoints, populateDocs, setNavStatus } from './header.js';
import { initMonitoring, updateMonitoring, startMonitoringPolling } from './monitoring.js';
import { initBenchmarks } from './benchmarks.js';
import { initDemo } from './demo.js';

const DEFAULT_API = 'http://road-sense-api.swedencentral.azurecontainer.io:8000';

const ENDPOINTS = [
  { method: 'GET',  path: '/health', desc: 'Liveness probe, model status, and per-route latency percentiles (p50/p95/p99). Used by the monitoring section above.', link: '/health', linkText: 'Probe' },
  { method: 'POST', path: '/detect',  desc: 'Single-image inference. Multipart form with `image` and optional `conf`. Returns detections and a base64-encoded annotated image.' },
  { method: 'POST', path: '/detect_batch', desc: 'Batch up to 10 images in a single request. Returns array of per-image detection results.' },
  { method: 'GET',  path: '/docs',     desc: 'Interactive Swagger UI with request validation, schema, and live test calls.', link: '/docs', linkText: 'Open' },
  { method: 'GET',  path: '/redoc',    desc: 'ReDoc alternative documentation with code samples for Python, JS, and curl.', link: '/redoc', linkText: 'Open' },
  { method: 'GET',  path: '/metrics',  desc: 'Prometheus-format metrics endpoint. Compatible with Grafana, Datadog, and other observability stacks.' },
];

const DOCS = [
  { icon: '📊', name: 'Model Evaluation Report',  desc: 'Accuracy, speed, and per-class performance analysis', href: 'https://github.com/Abdallah4Z/Road-Sense/blob/main/reports/MODEL_EVALUATION_REPORT.md' },
  { icon: '⚖️', name: 'Model Comparison',           desc: 'YOLO vs SSD vs Faster R-CNN benchmarks',                 href: 'https://github.com/Abdallah4Z/Road-Sense/blob/main/docs/models/MODEL_COMPARISON_REPORT.md' },
  { icon: '📈', name: 'Training Comparison',         desc: 'YOLO11m vs Faster R-CNN fine-tuning results',           href: 'https://github.com/Abdallah4Z/Road-Sense/blob/main/reports/TRAINING_COMPARISON_REPORT.md' },
  { icon: '🚀', name: 'Deployment Guide',             desc: 'Local, Docker, and Azure deployment walkthrough',         href: 'https://github.com/Abdallah4Z/Road-Sense/blob/main/docs/DEPLOYMENT_GUIDE.md' },
  { icon: '📡', name: 'API Reference',                desc: 'Endpoint contracts, request/response schemas',           href: 'https://github.com/Abdallah4Z/Road-Sense/blob/main/docs/API_DOCUMENTATION.md' },
  { icon: '📄', name: 'Final Project Report',         desc: 'Comprehensive project summary and methodology',          href: 'https://github.com/Abdallah4Z/Road-Sense/blob/main/docs/FINAL_PROJECT_REPORT.md' },
  { icon: '☁️', name: 'Azure Infrastructure',         desc: 'Bicep / deploy scripts for Azure Container Instances',   href: 'https://github.com/Abdallah4Z/Road-Sense/blob/main/infra/azure/README.md' },
  { icon: '🔌', name: 'Live Swagger',                desc: 'Interactive OpenAPI explorer',                            href: '/docs' },
];

function init() {
  loadApiBase();
  updateBaseDisplay();

  populateEndpoints(ENDPOINTS);
  populateDocs(DOCS);

  initHeader();
  initMonitoring();
  initBenchmarks();
  initDemo();

  startMonitoringPolling();

  // HTTPS detection
  if (window.location.protocol === 'https:' && !window.location.hostname.includes('azurecontainer')) {
    document.getElementById('httpsBanner')?.removeAttribute('hidden');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
