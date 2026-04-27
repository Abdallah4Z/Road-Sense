#!/usr/bin/env python3
"""
Inference API Server - Road-Sense

Lightweight FastAPI server for web-based object detection inference.
Serves annotated images with bounding boxes for the presentation demo.

Usage:
    python src/models/api_server.py --port 8000
    python src/models/api_server.py --weights models/exports/best-3classes-exp34332-original.pt

Endpoints:
    POST /detect - Upload image, return JSON with detections and annotated image URL
    GET  /health  - Health check
"""

import sys
import argparse
import logging
import base64
import io
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict, Any, List

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
from pydantic import BaseModel
from ultralytics import YOLO
import uvicorn

logger = logging.getLogger(__name__)


# Pydantic models
class Detection(BaseModel):
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    track_id: Optional[int] = None


class DetectionResponse(BaseModel):
    success: bool
    detections: List[Detection]
    annotated_image: Optional[str] = None  # Base64 encoded image
    inference_time_ms: float
    message: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inference API Server for Road-Sense")
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to run the server on (default: 8000)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to bind to (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--weights",
        type=str,
        default=None,
        help=(
            "Path to model weights. If omitted, the server auto-loads from "
            "models/exports/ (prefers .pt)."
        ),
    )
    parser.add_argument(
        "--weights-dir",
        type=str,
        default="models/exports",
        help="Directory used for auto model resolution when --weights is omitted",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.25,
        help="Confidence threshold (default: 0.25)",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="",
        help="Device for inference: 0, cpu, etc.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=False,
        help="Enable verbose logging",
    )
    parser.add_argument(
        "--disable-tracking",
        action="store_true",
        default=False,
        help="Disable temporal tracking and return raw per-frame detections",
    )
    parser.add_argument(
        "--tracking-iou",
        type=float,
        default=0.35,
        help="IoU threshold used to match detections to tracks (default: 0.35)",
    )
    parser.add_argument(
        "--tracking-max-missed",
        type=int,
        default=3,
        help="Number of missed frames before dropping a track (default: 3)",
    )
    parser.add_argument(
        "--tracking-bbox-alpha",
        type=float,
        default=0.7,
        help="EMA factor for bbox smoothing (default: 0.7)",
    )
    parser.add_argument(
        "--tracking-conf-alpha",
        type=float,
        default=0.6,
        help="EMA factor for confidence smoothing (default: 0.6)",
    )
    return parser.parse_args()


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )


def load_model(weights_path: str, device: str = "") -> YOLO:
    weights_path = Path(weights_path)
    if not weights_path.exists():
        raise FileNotFoundError(f"Model weights not found: {weights_path}")
    logger.info(f"Loading model: {weights_path}")
    model = YOLO(str(weights_path))
    if device:
        model.to(device)
    return model


def resolve_weights_path(weights: Optional[str], weights_dir: str) -> Path:
    """Resolve model path from explicit --weights or auto-discover in exports directory."""
    project_root = Path(__file__).resolve().parents[2]

    exports_dir = Path(weights_dir)
    if not exports_dir.is_absolute():
        exports_dir = project_root / exports_dir

    if weights:
        explicit = Path(weights)
        if explicit.exists():
            return explicit

        rooted_explicit = project_root / explicit
        if rooted_explicit.exists():
            return rooted_explicit

        # Allow passing just a filename from anywhere; also check in weights_dir.
        exports_explicit = exports_dir / explicit.name
        if exports_explicit.exists():
            return exports_explicit

        raise FileNotFoundError(
            "Model weights not found: "
            f"{explicit} (also checked {rooted_explicit} and {exports_explicit})"
        )

    if not exports_dir.exists() or not exports_dir.is_dir():
        raise FileNotFoundError(
            f"Weights directory not found: {exports_dir}. "
            "Provide --weights explicitly or create models/exports/."
        )

    preferred_names = [
        "best-3classes-exp34332-original.pt",
        "best-3classes-exp34332.pt",
        "best.pt",
    ]
    for model_name in preferred_names:
        candidate = exports_dir / model_name
        if candidate.exists():
            return candidate

    extension_priority = ["*.pt", "*.onnx", "*.torchscript"]
    for pattern in extension_priority:
        matches = sorted(exports_dir.glob(pattern))
        if matches:
            return matches[0]

    raise FileNotFoundError(
        f"No model files found in {exports_dir}. Expected .pt, .onnx, or .torchscript files."
    )


@dataclass
class TrackState:
    track_id: int
    class_name: str
    bbox: np.ndarray
    confidence: float
    missed: int = 0
    hits: int = 1


class SessionTracker:
    """Simple IoU tracker with temporal smoothing to reduce detection flicker."""

    def __init__(
        self,
        iou_threshold: float = 0.35,
        max_missed: int = 3,
        bbox_alpha: float = 0.7,
        conf_alpha: float = 0.6,
    ) -> None:
        self.iou_threshold = iou_threshold
        self.max_missed = max_missed
        self.bbox_alpha = bbox_alpha
        self.conf_alpha = conf_alpha
        self.next_track_id = 1
        self.tracks: List[TrackState] = []
        self.last_update = time.monotonic()

    @staticmethod
    def _iou(a: np.ndarray, b: np.ndarray) -> float:
        ax1, ay1, ax2, ay2 = a
        bx1, by1, bx2, by2 = b

        inter_x1 = max(ax1, bx1)
        inter_y1 = max(ay1, by1)
        inter_x2 = min(ax2, bx2)
        inter_y2 = min(ay2, by2)

        inter_w = max(0.0, inter_x2 - inter_x1)
        inter_h = max(0.0, inter_y2 - inter_y1)
        inter_area = inter_w * inter_h

        area_a = max(0.0, (ax2 - ax1)) * max(0.0, (ay2 - ay1))
        area_b = max(0.0, (bx2 - bx1)) * max(0.0, (by2 - by1))
        union = area_a + area_b - inter_area

        if union <= 0.0:
            return 0.0
        return inter_area / union

    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        self.last_update = time.monotonic()
        unmatched_track_indices = set(range(len(self.tracks)))

        detections_sorted = sorted(
            detections,
            key=lambda d: float(d.get("confidence", 0.0)),
            reverse=True,
        )

        for det in detections_sorted:
            det_bbox = np.array(det["bbox"], dtype=np.float32)
            det_conf = float(det["confidence"])
            det_class = str(det["class_name"])

            best_idx = None
            best_iou = 0.0

            for idx in list(unmatched_track_indices):
                track = self.tracks[idx]
                if track.class_name != det_class:
                    continue
                iou = self._iou(det_bbox, track.bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_idx = idx

            if best_idx is not None and best_iou >= self.iou_threshold:
                track = self.tracks[best_idx]
                track.bbox = self.bbox_alpha * det_bbox + (1.0 - self.bbox_alpha) * track.bbox
                track.confidence = self.conf_alpha * det_conf + (1.0 - self.conf_alpha) * track.confidence
                track.missed = 0
                track.hits += 1
                unmatched_track_indices.remove(best_idx)
            else:
                self.tracks.append(
                    TrackState(
                        track_id=self.next_track_id,
                        class_name=det_class,
                        bbox=det_bbox,
                        confidence=det_conf,
                    )
                )
                self.next_track_id += 1

        for idx in unmatched_track_indices:
            self.tracks[idx].missed += 1

        self.tracks = [track for track in self.tracks if track.missed <= self.max_missed]

        output: List[Dict[str, Any]] = []
        for track in self.tracks:
            decayed_conf = max(0.05, track.confidence * (0.92 ** track.missed))
            output.append(
                {
                    "track_id": track.track_id,
                    "class_name": track.class_name,
                    "confidence": float(decayed_conf),
                    "bbox": track.bbox.tolist(),
                }
            )

        return output


def extract_raw_detections(result, class_name_map: Dict[int, str]) -> List[Dict[str, Any]]:
    """Convert YOLO result object into a serializable detections list."""
    detections: List[Dict[str, Any]] = []
    if not hasattr(result, "boxes") or len(result.boxes) == 0:
        return detections

    boxes = result.boxes.xyxy.cpu().numpy()
    confs = result.boxes.conf.cpu().numpy()
    cls_ids = result.boxes.cls.cpu().numpy().astype(int)

    for box, conf_val, cls_id in zip(boxes, confs, cls_ids):
        detections.append(
            {
                "track_id": None,
                "class_name": class_name_map.get(cls_id, f"class_{cls_id}"),
                "confidence": float(conf_val),
                "bbox": box.tolist(),
            }
        )

    return detections


def draw_boxes_from_detections(
    image: np.ndarray,
    detections: List[Dict[str, Any]],
    line_thickness: int = 2,
    font_scale: float = 0.5,
) -> np.ndarray:
    """Draw detections list on image (in-place modification)."""
    img = image.copy()
    if not detections:
        return img

    color_by_class = {
        "Vehicle": (0, 255, 0),
        "Pedestrian": (255, 0, 0),
        "Cyclist": (0, 0, 255),
    }

    for det in detections:
        x1, y1, x2, y2 = map(int, det["bbox"])
        class_name = str(det.get("class_name", "object"))
        confidence = float(det.get("confidence", 0.0))
        track_id = det.get("track_id")

        color = color_by_class.get(class_name, (255, 255, 0))
        id_suffix = f" #{track_id}" if track_id is not None else ""
        label = f"{class_name}{id_suffix}: {confidence:.2f}"

        cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness=line_thickness)

        (label_w, label_h), baseline = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1
        )
        cv2.rectangle(
            img,
            (x1, y1 - label_h - baseline - 4),
            (x1 + label_w + 4, y1),
            color,
            thickness=cv2.FILLED,
        )
        cv2.putText(
            img,
            label,
            (x1 + 2, y1 - baseline - 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (255, 255, 255),
            thickness=1,
            lineType=cv2.LINE_AA,
        )

    return img


def cleanup_trackers(trackers: Dict[str, "SessionTracker"], max_idle_seconds: float = 120.0) -> None:
    """Drop stale tracking sessions to keep memory bounded."""
    now = time.monotonic()
    stale_keys = [
        key
        for key, tracker in trackers.items()
        if now - tracker.last_update > max_idle_seconds
    ]
    for key in stale_keys:
        del trackers[key]


def draw_boxes(
    image: np.ndarray,
    results,
    class_names: Dict[int, str],
    line_thickness: int = 2,
    font_scale: float = 0.5,
) -> np.ndarray:
    """Draw bounding boxes on image (in-place modification)."""
    img = image.copy()

    if not hasattr(results, "boxes") or len(results.boxes) == 0:
        return img

    boxes = results.boxes.xyxy.cpu().numpy()
    confs = results.boxes.conf.cpu().numpy()
    cls_ids = results.boxes.cls.cpu().numpy().astype(int)

    colors = [
        (0, 255, 0),  # Green - Vehicle
        (255, 0, 0),  # Blue - Pedestrian
        (0, 0, 255),  # Red - Cyclist
    ]

    for box, conf, cls_id in zip(boxes, confs, cls_ids):
        x1, y1, x2, y2 = map(int, box)
        color = colors[cls_id % len(colors)]
        class_name = class_names.get(cls_id, f"class_{cls_id}")
        label = f"{class_name}: {conf:.2f}"

        # Box
        cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness=line_thickness)

        # Label background
        (label_w, label_h), baseline = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1
        )
        cv2.rectangle(
            img,
            (x1, y1 - label_h - baseline - 4),
            (x1 + label_w + 4, y1),
            color,
            thickness=cv2.FILLED,
        )

        # Label text
        cv2.putText(
            img,
            label,
            (x1 + 2, y1 - baseline - 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (255, 255, 255),
            thickness=1,
            lineType=cv2.LINE_AA,
        )

    return img


def encode_image_to_base64(image: np.ndarray) -> str:
    """Encode OpenCV image to base64 string."""
    _, buffer = cv2.imencode(".jpg", image)
    img_bytes = buffer.tobytes()
    b64_str = base64.b64encode(img_bytes).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"


# Global model instance
model: Optional[YOLO] = None
class_names: Dict[int, str] = {}
loaded_model_path: Optional[str] = None
trackers: Dict[str, SessionTracker] = {}
trackers_lock = threading.Lock()


# FastAPI app
app = FastAPI(
    title="Road-Sense Inference API",
    description="Object detection API for Road-Sense autonomous vision project",
    version="1.0.0",
)

# Allow browser clients (local or deployed presentation) to call this API directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Load model on startup."""
    global model, class_names, loaded_model_path
    resolved_weights = resolve_weights_path(args.weights, args.weights_dir)
    loaded_model_path = str(resolved_weights)
    logger.info(f"Loading model from {resolved_weights}")
    model = load_model(str(resolved_weights), device=args.device)
    class_names = getattr(model, "names", {0: "Vehicle", 1: "Pedestrian", 2: "Cyclist"})
    logger.info(f"Model loaded with classes: {class_names}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_path": loaded_model_path,
        "tracking_enabled": not args.disable_tracking,
    }


@app.post("/detect", response_model=DetectionResponse)
async def detect_objects(
    image: UploadFile = File(..., description="Image file to run inference on"),
    conf: float = Form(
        default=0.25, ge=0.0, le=1.0, description="Confidence threshold"
    ),
    session_id: str = Form(
        default="default",
        description="Client session ID used for temporal tracking",
    ),
):
    """
    Run object detection on uploaded image.

    Returns list of detections and annotated image as base64.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Validate file type
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Read image
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image")

        # Run inference
        start_time = time.time()
        results = model.predict(img, conf=conf, verbose=False)
        inference_time = (time.time() - start_time) * 1000

        raw_detections = extract_raw_detections(results[0], class_names)

        if args.disable_tracking:
            output_detections = raw_detections
        else:
            with trackers_lock:
                cleanup_trackers(trackers)
                tracker = trackers.get(session_id)
                if tracker is None:
                    tracker = SessionTracker(
                        iou_threshold=args.tracking_iou,
                        max_missed=args.tracking_max_missed,
                        bbox_alpha=args.tracking_bbox_alpha,
                        conf_alpha=args.tracking_conf_alpha,
                    )
                    trackers[session_id] = tracker
                output_detections = tracker.update(raw_detections)

        # Draw boxes
        annotated_img = draw_boxes_from_detections(img, output_detections)

        # Encode annotated image
        annotated_b64 = encode_image_to_base64(annotated_img)

        # Build detections list
        detections = []
        for det in output_detections:
            detections.append(
                Detection(
                    class_name=str(det["class_name"]),
                    confidence=float(det["confidence"]),
                    bbox=[float(v) for v in det["bbox"]],
                    track_id=det.get("track_id"),
                )
            )

        return DetectionResponse(
            success=True,
            detections=detections,
            annotated_image=annotated_b64,
            inference_time_ms=inference_time,
            message=f"Detected {len(detections)} tracked objects",
        )

    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def main() -> int:
    global args
    args = parse_args()
    setup_logging(verbose=args.verbose)

    try:
        logger.info(f"Starting API server on {args.host}:{args.port}")
        uvicorn.run(app, host=args.host, port=args.port)
        return 0
    except Exception as e:
        logger.error(f"Server failed: {e}", exc_info=args.verbose)
        return 1


if __name__ == "__main__":
    sys.exit(main())
