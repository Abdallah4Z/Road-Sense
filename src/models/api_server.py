#!/usr/bin/env python3
"""
Inference API Server - Road-Sense

Lightweight FastAPI server for web-based object detection inference.
Serves annotated images with bounding boxes for the presentation demo.

Usage:
    python src/models/api_server.py --port 8000 --weights models/checkpoints/best-3classes-exp34332.pt

Endpoints:
    POST /detect - Upload image, return JSON with detections and annotated image URL
    GET  /health  - Health check
"""

import sys
import argparse
import logging
import base64
import io
from pathlib import Path
from typing import Optional, Dict, Any, List

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
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
        required=True,
        help="Path to trained model weights",
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


# FastAPI app
app = FastAPI(
    title="Road-Sense Inference API",
    description="Object detection API for Road-Sense autonomous vision project",
    version="1.0.0",
)


@app.on_event("startup")
async def startup_event():
    """Load model on startup."""
    global model, class_names
    weights = args.weights
    logger.info(f"Loading model from {weights}")
    model = load_model(weights, device=args.device)
    class_names = getattr(model, "names", {0: "Vehicle", 1: "Pedestrian", 2: "Cyclist"})
    logger.info(f"Model loaded with classes: {class_names}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "model_loaded": model is not None}


@app.post("/detect", response_model=DetectionResponse)
async def detect_objects(
    image: UploadFile = File(..., description="Image file to run inference on"),
    conf: float = Form(
        default=0.25, ge=0.0, le=1.0, description="Confidence threshold"
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
        import time

        start_time = time.time()
        results = model.predict(img, conf=conf, verbose=False)
        inference_time = (time.time() - start_time) * 1000

        # Draw boxes
        annotated_img = draw_boxes(img, results[0], class_names)

        # Encode annotated image
        annotated_b64 = encode_image_to_base64(annotated_img)

        # Build detections list
        detections = []
        if hasattr(results[0], "boxes") and len(results[0].boxes) > 0:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            confs = results[0].boxes.conf.cpu().numpy()
            cls_ids = results[0].boxes.cls.cpu().numpy().astype(int)

            for box, conf_val, cls_id in zip(boxes, confs, cls_ids):
                detections.append(
                    Detection(
                        class_name=class_names.get(cls_id, f"class_{cls_id}"),
                        confidence=float(conf_val),
                        bbox=box.tolist(),
                    )
                )

        return DetectionResponse(
            success=True,
            detections=detections,
            annotated_image=annotated_b64,
            inference_time_ms=inference_time,
            message=f"Detected {len(detections)} objects",
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
