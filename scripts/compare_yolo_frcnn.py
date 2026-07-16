#!/usr/bin/env python3
"""
YOLO11m vs Faster R-CNN — Comprehensive Comparison Charts

Generates 6 publication-quality comparison visualizations:

1. Overall Metrics Comparison (grouped bar chart)
2. Per-Class Performance (grouped bar chart)
3. Training Loss Curves (line plot)
4. Speed vs Accuracy (scatter plot)
5. Model Complexity (bar chart)
6. Radar/Spider Chart (multi-dimensional)

Data sources:
  - YOLO11m Baseline/HPO: reports/TRAINING_COMPARISON_REPORT.md, models/hpo_results/results.csv
  - Faster R-CNN: notebooks/Faster_RCNN_FineTuning_KITTI.ipynb
  - Cross-model benchmark: experiments/model_benchmarks/model_benchmark_results.json

Output: reports/figures/yolo_vs_frcnn/*.png
"""

import os
from math import pi

import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "reports", "figures", "yolo_vs_frcnn")
os.makedirs(OUTPUT_DIR, exist_ok=True)

YOLO_COLOR = "#2ecc71"
FRCNN_COLOR = "#e74c3c"
YOLO_BASE_COLOR = "#3498db"
ACCENT_COLOR = "#f39c12"

plt.rcParams.update({
    "figure.dpi": 150,
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.titleweight": "bold",
    "axes.labelsize": 11,
    "legend.fontsize": 9,
    "figure.facecolor": "white",
})


# ---------------------------------------------------------------------------
# 1. Overall Metrics Comparison
# ---------------------------------------------------------------------------
def chart_overall_metrics():
    # Two panels: common metrics (P, R, F1) for all 3 models, + mAP@50 for YOLO only
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), gridspec_kw={"width_ratios": [3, 1.2]})

    # --- Left: Precision, Recall, F1 ---
    metrics_common = ["Precision", "Recall", "F1 Score"]
    yolo_base = [0.870, 0.830, 0.849]
    yolo_hpo  = [0.893, 0.894, 0.893]
    frcnn     = [0.843, 0.897, 0.869]

    x = np.arange(len(metrics_common))
    w = 0.25
    bars1 = ax1.bar(x - w, yolo_base, w, label="YOLO11m Baseline", color=YOLO_BASE_COLOR)
    bars2 = ax1.bar(x,     yolo_hpo,  w, label="YOLO11m HPO",     color=YOLO_COLOR)
    bars3 = ax1.bar(x + w, frcnn,     w, label="Faster R-CNN",    color=FRCNN_COLOR)

    for bars in [bars1, bars2, bars3]:
        for bar in bars:
            h = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width() / 2, h + 0.005, f"{h:.3f}",
                     ha="center", va="bottom", fontsize=8, fontweight="bold")

    ax1.set_xticks(x)
    ax1.set_xticklabels(metrics_common)
    ax1.set_ylabel("Score")
    ax1.set_title("Common Metrics (all models)")
    ax1.set_ylim(0.7, 1.02)
    ax1.legend(loc="upper left")
    ax1.grid(axis="y", alpha=0.3)
    ax1.spines["top"].set_visible(False)
    ax1.spines["right"].set_visible(False)

    # --- Right: mAP@50 (YOLO only, FRCNN N/A) ---
    map_models = ["YOLO11m\nBaseline", "YOLO11m\nHPO", "Faster R-CNN\n(N/A)"]
    map_vals = [0.942, 0.935, 0]
    map_colors = [YOLO_BASE_COLOR, YOLO_COLOR, "#cccccc"]
    bars_m = ax2.bar(range(3), map_vals, color=map_colors, edgecolor="white", linewidth=0.5, width=0.55)
    for i, (bar, val) in enumerate(zip(bars_m, map_vals)):
        if val > 0:
            ax2.text(bar.get_x() + bar.get_width() / 2, val + 0.005, f"{val:.3f}",
                     ha="center", va="bottom", fontsize=9, fontweight="bold")
        else:
            ax2.text(bar.get_x() + bar.get_width() / 2, 0.02, "N/A",
                     ha="center", va="bottom", fontsize=9, fontstyle="italic", color="gray")

    ax2.set_xticks(range(3))
    ax2.set_xticklabels(map_models, fontsize=8)
    ax2.set_ylabel("mAP@50")
    ax2.set_title("mAP@50 (KITTI)")
    ax2.set_ylim(0, 1.05)
    ax2.grid(axis="y", alpha=0.3)
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)

    fig.suptitle("Overall Metrics Comparison: YOLO11m vs Faster R-CNN", fontweight="bold", fontsize=14)
    fig.tight_layout(rect=[0, 0, 1, 0.93])
    fig.savefig(os.path.join(OUTPUT_DIR, "1_overall_metrics.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("  [1/6] Overall metrics chart saved.")


# ---------------------------------------------------------------------------
# 2. Per-Class Performance
# ---------------------------------------------------------------------------
def chart_per_class():
    classes = ["Vehicle", "Pedestrian", "Cyclist"]

    # YOLO11m HPO per-class
    yolo_p = [0.892, 0.883, 0.905]
    yolo_r = [0.960, 0.812, 0.911]
    yolo_f1 = [2 * p * r / (p + r) for p, r in zip(yolo_p, yolo_r)]

    # Faster R-CNN per-class (from classification report)
    frcnn_p = [1.00, 0.94, 0.73]
    frcnn_r = [1.00, 0.89, 0.81]
    frcnn_f1 = [1.00, 0.91, 0.77]

    x = np.arange(len(classes))
    w = 0.18

    fig, axes = plt.subplots(1, 3, figsize=(14, 5), sharey=True)

    for i, (metric_name, yolo_vals, frcnn_vals) in enumerate([
        ("Precision", yolo_p, frcnn_p),
        ("Recall",    yolo_r, frcnn_r),
        ("F1 Score",  yolo_f1, frcnn_f1),
    ]):
        ax = axes[i]
        bars_y = ax.bar(x - w / 2, yolo_vals, w, label="YOLO11m HPO", color=YOLO_COLOR, edgecolor="white")
        bars_f = ax.bar(x + w / 2, frcnn_vals, w, label="Faster R-CNN", color=FRCNN_COLOR, edgecolor="white")

        for bar in bars_y:
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
                    f"{bar.get_height():.3f}", ha="center", va="bottom", fontsize=8, fontweight="bold")
        for bar in bars_f:
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
                    f"{bar.get_height():.3f}", ha="center", va="bottom", fontsize=8, fontweight="bold")

        ax.set_xticks(x)
        ax.set_xticklabels(classes)
        ax.set_title(metric_name)
        ax.set_ylim(0.5, 1.1)
        ax.grid(axis="y", alpha=0.3)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        if i == 0:
            ax.set_ylabel("Score")
            ax.legend(loc="lower left")

    fig.suptitle("Per-Class Performance: YOLO11m HPO vs Faster R-CNN", fontweight="bold", fontsize=13)
    fig.tight_layout(rect=[0, 0, 1, 0.93])
    fig.savefig(os.path.join(OUTPUT_DIR, "2_per_class_performance.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("  [2/6] Per-class performance chart saved.")


# ---------------------------------------------------------------------------
# 3. Training Loss Curves
# ---------------------------------------------------------------------------
def chart_training_loss():
    # Faster R-CNN training loss (10 epochs)
    frcnn_epochs = list(range(1, 11))
    frcnn_loss = [0.4140, 0.3000, 0.2607, 0.2269, 0.2065, 0.1835, 0.1657, 0.1534, 0.1422, 0.1314]

    # YOLO11m HPO training loss (29 epochs from CSV)
    yolo_epochs = list(range(1, 30))
    yolo_loss = [
        1.36492 + 0.76087 + 1.3885,   # epoch 1: box + cls + dfl
        1.2302 + 0.6483 + 1.30578,
        1.19522 + 0.59846 + 1.29183,
        1.16265 + 0.5601 + 1.27821,
        1.12758 + 0.54626 + 1.25123,
        1.11185 + 0.55636 + 1.24141,
        1.08458 + 0.51984 + 1.23019,
        1.06664 + 0.51583 + 1.21616,
        1.05568 + 0.49833 + 1.20842,
        1.03729 + 0.49763 + 1.20179,
        1.0179 + 0.47375 + 1.18916,
        1.01013 + 0.48419 + 1.18334,
        1.00884 + 0.48229 + 1.18331,
        0.98933 + 0.45577 + 1.16906,
        0.98912 + 0.4745 + 1.17293,
        0.97112 + 0.45416 + 1.16012,
        0.96405 + 0.43653 + 1.1552,
        0.9595 + 0.43411 + 1.15357,
        0.95109 + 0.43102 + 1.14728,
        0.94397 + 0.44009 + 1.14594,
        0.94068 + 0.43717 + 1.14308,
        0.93029 + 0.4196 + 1.1333,
        0.92584 + 0.41937 + 1.13263,
        0.91148 + 0.40845 + 1.12583,
        0.91313 + 0.41182 + 1.12646,
        0.913 + 0.41623 + 1.12394,
        0.91003 + 0.40242 + 1.12326,
        0.90074 + 0.40677 + 1.11873,
        0.89864 + 0.40283 + 1.11827,
    ]

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(yolo_epochs, yolo_loss, marker="o", markersize=3, color=YOLO_COLOR,
            label="YOLO11m HPO (total loss)", linewidth=2)
    ax.plot(frcnn_epochs, frcnn_loss, marker="s", markersize=4, color=FRCNN_COLOR,
            label="Faster R-CNN (total loss)", linewidth=2)

    ax.set_xlabel("Epoch")
    ax.set_ylabel("Loss")
    ax.set_title("Training Loss Curves")
    ax.legend()
    ax.grid(alpha=0.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, "3_training_loss.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("  [3/6] Training loss chart saved.")


# ---------------------------------------------------------------------------
# 4. Speed vs Accuracy (scatter)
# ---------------------------------------------------------------------------
def chart_speed_vs_accuracy():
    # From model_benchmark_results.json (COCO128 pretrained, RTX 3050)
    models = {
        "Faster R-CNN": {"fps": 1.38, "map50": 0.9362, "color": FRCNN_COLOR, "size": 200},
        "YOLO11m":      {"fps": 35.19, "map50": 0.8564, "color": YOLO_COLOR, "size": 150},
        "YOLOv8s":      {"fps": 69.03, "map50": 0.8778, "color": YOLO_BASE_COLOR, "size": 120},
        "SSD300":       {"fps": 7.84, "map50": 0.6997, "color": ACCENT_COLOR, "size": 130},
    }

    fig, ax = plt.subplots(figsize=(9, 6))
    for name, d in models.items():
        ax.scatter(d["fps"], d["map50"], s=d["size"], c=d["color"], edgecolors="black",
                   linewidths=0.8, zorder=5, label=name)
        offset_x = d["fps"] * 0.08 + 1
        ax.annotate(name, (d["fps"], d["map50"]),
                    textcoords="offset points", xytext=(offset_x, 8),
                    fontsize=10, fontweight="bold", color=d["color"])

    ax.set_xlabel("Inference Speed (FPS)")
    ax.set_ylabel("mAP@50")
    ax.set_title("Speed vs Accuracy Trade-off (COCO128, RTX 3050)")
    ax.set_xscale("log")
    ax.xaxis.set_major_formatter(mticker.ScalarFormatter())
    ax.grid(True, alpha=0.3, which="both")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, "4_speed_vs_accuracy.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("  [4/6] Speed vs accuracy chart saved.")


# ---------------------------------------------------------------------------
# 5. Model Complexity Comparison
# ---------------------------------------------------------------------------
def chart_model_complexity():
    categories = ["Parameters\n(M)", "Model Size\n(MB)", "GPU Memory\n(MB)"]
    yolo_vals = [20.1, 38.8, 227.4]
    frcnn_vals = [43.7, 167.1, 770.6]

    x = np.arange(len(categories))
    w = 0.3

    fig, ax = plt.subplots(figsize=(8, 5))
    bars1 = ax.bar(x - w / 2, yolo_vals, w, label="YOLO11m", color=YOLO_COLOR, edgecolor="white")
    bars2 = ax.bar(x + w / 2, frcnn_vals, w, label="Faster R-CNN", color=FRCNN_COLOR, edgecolor="white")

    for bar in bars1:
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 8,
                f"{bar.get_height():.1f}", ha="center", va="bottom", fontsize=9, fontweight="bold")
    for bar in bars2:
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 8,
                f"{bar.get_height():.1f}", ha="center", va="bottom", fontsize=9, fontweight="bold")

    ax.set_xticks(x)
    ax.set_xticklabels(categories)
    ax.set_ylabel("Value")
    ax.set_title("Model Complexity: YOLO11m vs Faster R-CNN")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, "5_model_complexity.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("  [5/6] Model complexity chart saved.")


# ---------------------------------------------------------------------------
# 6. Radar / Spider Chart
# ---------------------------------------------------------------------------
def chart_radar():
    categories = ["Precision", "Recall", "F1 Score", "Speed\n(FPS norm)", "Size\n(inv. norm)", "mAP@50"]
    N = len(categories)  # noqa: N806

    # Normalized values (0-1 scale)
    # Speed: normalize YOLO ~35 FPS vs FRCNN ~1.4 FPS -> YOLO=1.0, FRCNN=0.04
    # Size: inverse (smaller=better) -> YOLO=1.0 (38.8MB), FRCNN=0.23 (167MB)
    yolo_vals = [0.893, 0.894, 0.893, 1.0, 1.0, 0.935]
    frcnn_vals = [0.843, 0.897, 0.869, 0.04, 0.23, 0.0]  # mAP@50 not available -> 0

    # Close the polygon
    yolo_vals += yolo_vals[:1]
    frcnn_vals += frcnn_vals[:1]

    angles = [i / float(N) * 2 * pi for i in range(N)]  # noqa: N806
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
    ax.plot(angles, yolo_vals, "o-", linewidth=2, color=YOLO_COLOR, label="YOLO11m HPO")
    ax.fill(angles, yolo_vals, alpha=0.15, color=YOLO_COLOR)
    ax.plot(angles, frcnn_vals, "s-", linewidth=2, color=FRCNN_COLOR, label="Faster R-CNN")
    ax.fill(angles, frcnn_vals, alpha=0.15, color=FRCNN_COLOR)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, fontsize=10)
    ax.set_ylim(0, 1.1)
    ax.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])
    ax.set_yticklabels(["0.2", "0.4", "0.6", "0.8", "1.0"], fontsize=8)
    ax.set_title("Multi-Dimensional Comparison\n(normalized, higher = better)", pad=20, fontsize=13, fontweight="bold")
    ax.legend(loc="upper right", bbox_to_anchor=(1.3, 1.1))
    fig.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, "6_radar_comparison.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("  [6/6] Radar comparison chart saved.")


# ---------------------------------------------------------------------------
# Summary Table
# ---------------------------------------------------------------------------
def print_summary():
    print("\n" + "=" * 72)
    print("  SUMMARY: YOLO11m (HPO) vs Faster R-CNN (ResNet-50 FPN)")
    print("=" * 72)
    header = f"  {'Metric':<25} {'YOLO11m HPO':>15} {'Faster R-CNN':>15}"
    print(header)
    print("  " + "-" * 60)
    rows = [
        ("Precision",          "0.893",          "0.843"),
        ("Recall",             "0.894",          "0.897"),
        ("F1 Score",           "0.893",          "0.869"),
        ("mAP@50 (KITTI)",     "0.935",          "N/A"),
        ("mAP@50:95 (KITTI)",  "0.725",          "N/A"),
        ("Mean IoU",           "N/A",            "0.849"),
        ("FPS (RTX 3050)",     "36.4",           "<10 (est.)"),
        ("Model Size",         "38.8 MB",        "167.1 MB"),
        ("Parameters",         "20.1 M",         "43.7 M"),
        ("Training Epochs",    "100",            "10"),
        ("Training Images",    "5,236",          "2,067"),
    ]
    for metric, yolo, frcnn in rows:
        print(f"  {metric:<25} {yolo:>15} {frcnn:>15}")
    print("=" * 72)
    print(f"  Output directory: {OUTPUT_DIR}")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Generating YOLO11m vs Faster R-CNN comparison charts...\n")
    chart_overall_metrics()
    chart_per_class()
    chart_training_loss()
    chart_speed_vs_accuracy()
    chart_model_complexity()
    chart_radar()
    print_summary()
    print("Done! All charts saved to:", OUTPUT_DIR)
