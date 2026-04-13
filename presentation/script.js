const docs = [
  {
    title: "Quick Setup Guide",
    description: "Install, validate, preprocess, and verify in a fast setup flow.",
    path: "../docs/QUICK_SETUP_GUIDE.md",
    category: "getting-started"
  },
  {
    title: "Project Details",
    description: "Full dataset context, workflow design, and milestone structure.",
    path: "../docs/PROJECT_DETAILS.md",
    category: "getting-started"
  },
  {
    title: "Preprocessing and Augmentation",
    description: "Details of the data conversion and augmentation pipeline.",
    path: "../docs/PREPROCESSING_AND_AUGMENTATION_GUIDE.md",
    category: "dataset"
  },
  {
    title: "Dataset Exploration",
    description: "Dataset profile and supporting statistical analysis.",
    path: "../docs/DATASET_EXPLORATION_REPORT.md",
    category: "dataset"
  },
  {
    title: "Data Quality Report",
    description: "Validation checks for corruption, labels, and box constraints.",
    path: "../docs/data_quality_report.md",
    category: "dataset"
  },
  {
    title: "Dataset Download Instructions",
    description: "How to obtain and place KITTI and related datasets.",
    path: "../docs/DATASET_DOWNLOAD_INSTRUCTIONS.md",
    category: "dataset"
  },
  {
    title: "Dataset Upload Guidelines",
    description: "Repository data handling and large-file best practices.",
    path: "../docs/DATASET_UPLOAD_GUIDELINES.md",
    category: "dataset"
  },
  {
    title: "Training Report",
    description: "Training configuration, curves, and run-specific observations.",
    path: "../docs/TRAINING_REPORT_EXP34332.md",
    category: "training"
  },
  {
    title: "Multi-Dataset Training Strategy",
    description: "Plan for integrating additional datasets and training stages.",
    path: "../docs/MULTI_DATASET_TRAINING_STRATEGY.md",
    category: "training"
  },
  {
    title: "Model Comparison Report",
    description: "Model-level comparison details and performance perspective.",
    path: "../docs/models/MODEL_COMPARISON_REPORT.md",
    category: "models"
  }
];

const reports = [
  {
    title: "Milestone 2 Executive Summary",
    description: "High-level training outcomes and readiness statement.",
    path: "../reports/MILESTONE_2_EXECUTIVE_SUMMARY_EXP34332.md",
    category: "milestones"
  },
  {
    title: "Milestone 2 Technical Report",
    description: "Technical details, metrics, and artifact inventory.",
    path: "../reports/MILESTONE_2_TECHNICAL_REPORT_EXP34332.md",
    category: "milestones"
  },
  {
    title: "Reports Index",
    description: "One-stop map for all major reporting documents.",
    path: "../reports/REPORTS_INDEX.md",
    category: "status"
  },
  {
    title: "Project Status Report",
    description: "Progress across milestones and current priorities.",
    path: "../reports/PROJECT_STATUS_REPORT.md",
    category: "status"
  },
  {
    title: "Week 1 Deliverables",
    description: "Early milestone summary and key outputs.",
    path: "../reports/WEEK_1_DELIVERABLES_SUMMARY.md",
    category: "status"
  },
  {
    title: "Abdallah Dataset Analysis",
    description: "Research analysis for dataset options and rationale.",
    path: "../reports/research/Abdallah_dataset_analysis.md",
    category: "research"
  },
  {
    title: "Aya Dataset Analysis",
    description: "Research notes and comparative insights by Aya Ahmed.",
    path: "../reports/research/AyaAhmed_dataset_analysis.md",
    category: "research"
  },
  {
    title: "Dataset Analysis Template",
    description: "Template used for standardized analysis documentation.",
    path: "../reports/templates/dataset_analysis_template.md",
    category: "research"
  }
];

const visuals = [
  {
    title: "Class Distribution",
    src: "../experiments/visualization/dataset_analysis/class_distribution.png",
    category: "dataset"
  },
  {
    title: "Merged Class Distribution",
    src: "../experiments/visualization/dataset_analysis/class_distribution_after_merge.png",
    category: "dataset"
  },
  {
    title: "Bounding Box Area by Class",
    src: "../experiments/visualization/dataset_analysis/bbox_area_by_class.png",
    category: "dataset"
  },
  {
    title: "Bounding Box Width vs Height",
    src: "../experiments/visualization/dataset_analysis/bbox_width_vs_height.png",
    category: "dataset"
  },
  {
    title: "Occlusion Distribution",
    src: "../experiments/visualization/dataset_analysis/occlusion_distribution.png",
    category: "dataset"
  },
  {
    title: "Truncation Distribution",
    src: "../experiments/visualization/dataset_analysis/truncation_distribution.png",
    category: "dataset"
  },
  {
    title: "Results Curve",
    src: "../experiments/visualization/runsV/exp34332/results.png",
    category: "runs"
  },
  {
    title: "Confusion Matrix",
    src: "../experiments/visualization/runsV/exp34332/confusion_matrix.png",
    category: "runs"
  },
  {
    title: "Normalized Confusion Matrix",
    src: "../experiments/visualization/runsV/exp34332/confusion_matrix_normalized.png",
    category: "runs"
  },
  {
    title: "PR Curve",
    src: "../experiments/visualization/runsV/exp34332/BoxPR_curve.png",
    category: "runs"
  },
  {
    title: "F1 Curve",
    src: "../experiments/visualization/runsV/exp34332/BoxF1_curve.png",
    category: "runs"
  },
  {
    title: "Precision Curve",
    src: "../experiments/visualization/runsV/exp34332/BoxP_curve.png",
    category: "runs"
  },
  {
    title: "Recall Curve",
    src: "../experiments/visualization/runsV/exp34332/BoxR_curve.png",
    category: "runs"
  },
  {
    title: "Validation Prediction Sample",
    src: "../experiments/visualization/runsV/exp34332/val_batch0_pred.jpg",
    category: "runs"
  },
  {
    title: "Validation Prediction Sample 2",
    src: "../experiments/visualization/runsV/exp34332/val_batch1_pred.jpg",
    category: "runs"
  },
  {
    title: "Validation Prediction Sample 3",
    src: "../experiments/visualization/runsV/exp34332/val_batch2_pred.jpg",
    category: "runs"
  }
];

const metricRows = [
  { name: "mAP50-95", best: 0.76786, final: 0.76517 },
  { name: "mAP50", best: 0.94159, final: 0.93534 },
  { name: "Precision", best: 0.92421, final: 0.90017 },
  { name: "Recall", best: 0.91550, final: 0.90167 }
];

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inCode = false;
  let inUl = false;
  let inOl = false;
  let inTable = false;

  const closeLists = () => {
    if (inUl) {
      html += "</ul>";
      inUl = false;
    }
    if (inOl) {
      html += "</ol>";
      inOl = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      html += "</tbody></table>";
      inTable = false;
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine;
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      closeLists();
      closeTable();
      if (!inCode) {
        inCode = true;
        html += "<pre><code>";
      } else {
        inCode = false;
        html += "</code></pre>";
      }
      return;
    }

    if (inCode) {
      html += `${escapeHtml(line)}\n`;
      return;
    }

    if (!trimmed) {
      closeLists();
      closeTable();
      html += "<br />";
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (heading) {
      closeLists();
      closeTable();
      const level = heading[1].length;
      const content = inlineMarkdown(escapeHtml(heading[2]));
      const id = heading[2]
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      html += `<h${level} id="${id}">${content}</h${level}>`;
      return;
    }

    if (/^>\s+/.test(trimmed)) {
      closeLists();
      closeTable();
      html += `<blockquote>${inlineMarkdown(escapeHtml(trimmed.replace(/^>\s+/, "")))}</blockquote>`;
      return;
    }

    if (/^\|(.+)\|$/.test(trimmed)) {
      closeLists();
      if (!inTable) {
        html += "<table><tbody>";
        inTable = true;
      }

      const nextLine = lines[idx + 1] ? lines[idx + 1].trim() : "";
      if (/^\|?\s*[-:]+/.test(nextLine)) {
        const headers = trimmed
          .split("|")
          .map((cell) => cell.trim())
          .filter(Boolean)
          .map((cell) => `<th>${inlineMarkdown(escapeHtml(cell))}</th>`)
          .join("");
        html += `<thead><tr>${headers}</tr></thead><tbody>`;
        return;
      }

      const cols = trimmed
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
        .map((cell) => `<td>${inlineMarkdown(escapeHtml(cell))}</td>`)
        .join("");
      html += `<tr>${cols}</tr>`;
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      closeTable();
      if (!inUl) {
        closeLists();
        html += "<ul>";
        inUl = true;
      }
      html += `<li>${inlineMarkdown(escapeHtml(trimmed.replace(/^[-*]\s+/, "")))}</li>`;
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      closeTable();
      if (!inOl) {
        closeLists();
        html += "<ol>";
        inOl = true;
      }
      html += `<li>${inlineMarkdown(escapeHtml(trimmed.replace(/^\d+\.\s+/, "")))}</li>`;
      return;
    }

    closeLists();
    closeTable();
    html += `<p>${inlineMarkdown(escapeHtml(trimmed))}</p>`;
  });

  closeLists();
  closeTable();

  if (inCode) {
    html += "</code></pre>";
  }

  return html;
}

async function loadDocumentIntoContainer(docItem, container) {
  const statusEl = container.querySelector(".status-message") || createStatusElement(container);
  
  try {
    statusEl.textContent = "Loading document...";
    statusEl.style.display = "block";
    
    const response = await fetch(docItem.path);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const markdown = await response.text();
    container.innerHTML = markdownToHtml(markdown);
    statusEl.style.display = "none";
  } catch (error) {
    statusEl.textContent = "Could not load document. Run this site with a local server (for example: python3 -m http.server).";
    console.error(error);
  }
}

function createStatusElement(container) {
  const status = document.createElement("div");
  status.className = "status-message";
  status.style.cssText = "color: var(--muted); font-size: 0.875rem; margin-bottom: 16px;";
  container.insertBefore(status, container.firstChild);
  return status;
}

function buildDocSidebarItems(items, containerId, activeDocKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  
  items.forEach((item) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = item.title;
    a.dataset.path = item.path;
    a.dataset.title = item.title;
    
    if (item.title === activeDocKey) {
      a.classList.add("active");
    }
    
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      
      // Remove active class from all sidebar links in this section
      container.querySelectorAll("a").forEach(link => link.classList.remove("active"));
      a.classList.add("active");
      
      // Load document into the main content area
      const docsContentContainer = container.closest(".docs-layout").querySelector(".docs-content");
      await loadDocumentIntoContainer(item, docsContentContainer);
    });
    
    li.appendChild(a);
    container.appendChild(li);
  });
}

function renderDocSidebars(pageType) {
  if (pageType === 'docs') {
    const docsGettingStarted = docs.filter(d => d.category === "getting-started");
    const docsDataset = docs.filter(d => d.category === "dataset");
    const docsTraining = docs.filter(d => d.category === "training");
    const docsModels = docs.filter(d => d.category === "models");

    buildDocSidebarItems(docsGettingStarted, "docsSidebarGettingStarted");
    buildDocSidebarItems(docsDataset, "docsSidebarDataset");
    buildDocSidebarItems(docsTraining, "docsSidebarTraining");
    buildDocSidebarItems(docsModels, "docsSidebarModels");
  } else if (pageType === 'reports') {
    const reportsMilestones = reports.filter(r => r.category === "milestones");
    const reportsStatus = reports.filter(r => r.category === "status");
    const reportsResearch = reports.filter(r => r.category === "research");

    buildDocSidebarItems(reportsMilestones, "reportsSidebarMilestones");
    buildDocSidebarItems(reportsStatus, "reportsSidebarStatus");
    buildDocSidebarItems(reportsResearch, "reportsSidebarResearch");
  }
}

function initDocSearch() {
  const searchInput = document.getElementById("docSearch");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const sidebarLinks = searchInput.closest(".docs-sidebar").querySelectorAll(".sidebar-list a");

    sidebarLinks.forEach(link => {
      const title = link.textContent.toLowerCase();
      const parentLi = link.closest("li");

      if (title.includes(query)) {
        parentLi.style.display = "block";
      } else {
        parentLi.style.display = "none";
      }
    });
  });
}

function renderVisuals(filter = "all") {
  const visualGrid = document.getElementById("visualGrid");
  visualGrid.innerHTML = "";

  const filteredVisuals = filter === "all" 
    ? visuals 
    : visuals.filter(v => v.category === filter);

  filteredVisuals.forEach((item, index) => {
    const figure = document.createElement("figure");
    figure.className = "visual-card";
    figure.style.animationDelay = `${index * 60}ms`;
    figure.innerHTML = `
      <img src="${item.src}" alt="${item.title}" loading="lazy" />
      <figcaption>${item.title}</figcaption>
    `;
    
    figure.addEventListener("click", () => {
      openImageViewer(item.src, item.title);
    });
    
    visualGrid.appendChild(figure);
  });
}

function openImageViewer(src, title) {
  const imageViewer = document.getElementById("imageViewer");
  const imageViewerImage = document.getElementById("imageViewerImage");
  const imageViewerTitle = document.getElementById("imageViewerTitle");
  
  if (!imageViewer || !imageViewerImage || !imageViewerTitle) return;
  
  imageViewerImage.src = src;
  imageViewerImage.alt = title;
  imageViewerTitle.textContent = title;
  imageViewer.classList.add("open");
  imageViewer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeImageViewer() {
  const imageViewer = document.getElementById("imageViewer");
  const imageViewerImage = document.getElementById("imageViewerImage");
  const imageViewerTitle = document.getElementById("imageViewerTitle");
  
  if (!imageViewer || !imageViewerImage || !imageViewerTitle) return;
  
  imageViewer.classList.remove("open");
  imageViewer.setAttribute("aria-hidden", "true");
  imageViewerImage.src = "";
  imageViewerTitle.textContent = "";
  document.body.style.overflow = "";
}

function initImageViewer() {
  const imageViewer = document.getElementById("imageViewer");
  const imageViewerClose = document.getElementById("imageViewerClose");
  
  if (!imageViewer || !imageViewerClose) return;

  imageViewerClose.addEventListener("click", closeImageViewer);

  imageViewer.addEventListener("click", (event) => {
    if (event.target === imageViewer) {
      closeImageViewer();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && imageViewer.classList.contains("open")) {
      closeImageViewer();
    }
  });
}

function initVisualFilter() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      renderVisuals(filter);
    });
  });
}

function renderScoreCards() {
  const container = document.getElementById("scoreCards");

  metricRows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "score-card";
    card.innerHTML = `
      <div class="score-title">${row.name}</div>
      <div class="score-values">
        <span>Best: ${row.best.toFixed(5)}</span>
        <span>Final: ${row.final.toFixed(5)}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function drawBar(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function drawMetricChart() {
  const canvas = document.getElementById("metricChart");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const margin = { top: 28, right: 20, bottom: 38, left: 34 };
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  const isLight = document.body.classList.contains("light-mode");
  const bgColor = isLight ? "#ffffff" : "#1e293b";
  const textColor = isLight ? "#0f172a" : "#e2e8f0";
  const gridColor = isLight ? "#e2e8f0" : "#334155";

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(w - margin.right, y);
    ctx.stroke();
  }

  const groupW = chartW / metricRows.length;
  const barW = groupW * 0.28;

  metricRows.forEach((row, i) => {
    const center = margin.left + groupW * i + groupW / 2;
    const bestH = row.best * chartH;
    const finalH = row.final * chartH;

    drawBar(ctx, center - barW - 4, margin.top + (chartH - bestH), barW, bestH, "#3b82f6");
    drawBar(ctx, center + 4, margin.top + (chartH - finalH), barW, finalH, "#60a5fa");

    ctx.fillStyle = textColor;
    ctx.font = "12px Manrope";
    ctx.textAlign = "center";
    ctx.fillText(row.name, center, h - 14);
  });

  ctx.textAlign = "left";
  ctx.font = "12px Manrope";
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(w - 180, 14, 12, 12);
  ctx.fillStyle = textColor;
  ctx.fillText("Best", w - 162, 24);

  ctx.fillStyle = "#60a5fa";
  ctx.fillRect(w - 110, 14, 12, 12);
  ctx.fillStyle = textColor;
  ctx.fillText("Final", w - 92, 24);
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  items.forEach((item, index) => {
    item.style.transitionDelay = `${index * 70}ms`;
    observer.observe(item);
  });
}

function initMenu() {
  const menuToggle = document.getElementById("menuToggle");
  const menu = document.getElementById("menu");

  menuToggle.addEventListener("click", () => {
    menu.classList.toggle("open");
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
    });
  });
}

function initThemeToggle() {
  const themeToggle = document.getElementById("themeToggle");
  if (!themeToggle) return;

  // Load saved theme or default to night mode
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    themeToggle.textContent = "🌙";
  } else {
    themeToggle.textContent = "☀️";
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    const isLight = document.body.classList.contains("light-mode");
    
    // Update icon and save
    themeToggle.textContent = isLight ? "🌙" : "☀️";
    localStorage.setItem("theme", isLight ? "light" : "night");
  });
}

function init() {
  initMenu();
  initThemeToggle();

  // Check which page we're on and initialize accordingly
  const pagePath = window.location.pathname;

  if (pagePath.includes('docs.html')) {
    // Docs page - render docs sidebar
    renderDocSidebars('docs');
    initDocSearch();
  } else if (pagePath.includes('reports.html')) {
    // Reports page - render reports sidebar
    renderDocSidebars('reports');
  } else if (pagePath.includes('visuals.html')) {
    // Visuals page - render visuals grid and filter
    renderVisuals();
    initImageViewer();
    initVisualFilter();
  } else {
    // Home page - render results
    renderScoreCards();
    drawMetricChart();
  }

  initReveal();
  
  window.addEventListener("resize", () => {
    drawMetricChart();
  });

  // Redraw chart when theme changes
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    setTimeout(drawMetricChart, 50);
  });
}

init();
