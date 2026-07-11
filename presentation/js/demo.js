/* ===========================================
   demo.js — file upload + detect pipeline
   =========================================== */

import { getBase, setApiBase, detectSingle } from './api.js';

const $ = (sel) => document.querySelector(sel);
const el = (id) => document.getElementById(id);

let selectedFile = null;

function reset() {
  selectedFile = null;
  el('fileInput').value = '';
  el('previewWrap').hidden = true;
  el('previewImg').src = '';
  el('dropzoneInfo').textContent = 'No file selected';
  el('detectBtn').disabled = false;
  el('outputPlaceholder').hidden = false;
  el('outputContent').hidden = true;
  el('outputLoading').hidden = true;
  el('outputError').hidden = true;
  el('outputError').textContent = '';
}

function selectFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    el('outputError').hidden = false;
    el('outputError').textContent = 'Please select an image file (PNG, JPG, etc.)';
    return;
  }
  selectedFile = file;
  el('outputError').hidden = true;
  el('dropzoneInfo').textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  const reader = new FileReader();
  reader.onload = (ev) => {
    el('previewImg').src = ev.target.result;
    el('previewWrap').hidden = false;
  };
  reader.readAsDataURL(file);
}

async function runDetection() {
  if (!selectedFile) {
    el('outputError').hidden = false;
    el('outputError').textContent = 'Please select an image first.';
    return;
  }
  const conf = parseFloat(el('confSlider').value) / 100;

  el('detectBtn').disabled = true;
  el('outputPlaceholder').hidden = true;
  el('outputContent').hidden = true;
  el('outputError').hidden = true;
  el('outputLoading').hidden = false;

  const t0 = performance.now();
  try {
    const data = await detectSingle(selectedFile, conf);
    const elapsed = performance.now() - t0;

    el('annotatedImg').src = data.annotated_image;
    el('outObjects').textContent = data.detections?.length ?? 0;
    el('outLatency').textContent = `${data.inference_time_ms.toFixed(0)} ms`;
    el('outFps').textContent = (1000 / data.inference_time_ms).toFixed(1);

    const tbody = el('detectionTbody');
    tbody.innerHTML = (data.detections || []).map((d) => `
      <tr>
        <td><span class="det-class">${d.class_name}</span></td>
        <td class="det-conf">${(d.confidence * 100).toFixed(1)}%</td>
        <td class="mono">${d.track_id ?? '—'}</td>
        <td class="mono ta-r">${d.bbox.map((v) => v.toFixed(0)).join(', ')}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--c-text-3)">No detections</td></tr>';

    el('outputLoading').hidden = true;
    el('outputContent').hidden = false;
  } catch (err) {
    el('outputLoading').hidden = true;
    el('outputPlaceholder').hidden = false;
    el('outputError').hidden = false;
    el('outputError').textContent = `Detection failed: ${err.message}`;
  } finally {
    el('detectBtn').disabled = false;
  }
}

export function initDemo() {
  // API base URL
  el('apiBaseInput').addEventListener('change', (e) => {
    setApiBase(e.target.value);
  });
  el('apiBaseInput').value = getBase();

  // Dropzone
  const dz = el('dropzone');
  const fi = el('fileInput');
  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fi.click();
  });
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('is-dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('is-dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('is-dragover');
    if (e.dataTransfer.files.length) selectFile(e.dataTransfer.files[0]);
  });
  fi.addEventListener('change', (e) => {
    if (e.target.files.length) selectFile(e.target.files[0]);
  });

  // Slider
  el('confSlider').addEventListener('input', (e) => {
    el('confVal').textContent = (parseFloat(e.target.value) / 100).toFixed(2);
  });

  // Buttons
  el('detectBtn').addEventListener('click', runDetection);
  el('resetBtn').addEventListener('click', reset);
}
