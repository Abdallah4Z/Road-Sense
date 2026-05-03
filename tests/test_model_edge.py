from pathlib import Path

import pytest
from src.models.model_factory import AVAILABLE_MODELS, get_model_info, list_available_models


def test_available_models():
    assert "yolo11n" in AVAILABLE_MODELS
    assert "yolo11m" in AVAILABLE_MODELS
    assert "yolov8n" in AVAILABLE_MODELS


def test_list_models():
    models = list_available_models()
    assert len(models) > 0
    assert "name" in models[0]
    assert "params_m" in models[0]


def test_get_model_info():
    from unittest.mock import MagicMock
    model = MagicMock()
    model.names = {0: "Vehicle", 1: "Pedestrian"}
    param = MagicMock()
    param.numel.return_value = 1000000
    model.parameters.return_value = [param]

    info = get_model_info(model)
    assert info["num_classes"] == 2
    assert info["size_mb"] > 0


def test_load_config_not_found(tmp_path):
    from src.models.trainer import load_config
    with pytest.raises(FileNotFoundError):
        load_config(tmp_path / "nonexistent.yaml")


def test_callbacks():
    from src.models.callbacks import TrainingLogger, ModelCheckpoint
    logger = TrainingLogger()
    assert logger.train_start_time is None

    config = {"model": {"name": "yolo11m"}, "training": {"epochs": 10}, "data": {"yaml_path": "data.yaml", "batch_size": 16, "imgsz": 640}, "device": {"device": "0"}}
    logger.on_train_start(config)
    assert logger.train_start_time is not None

    logger.on_epoch_end(1, {"loss": 0.5})
    logger.on_train_end({"metrics": {"mAP50": 0.9}})

    from pathlib import Path
    ckpt = ModelCheckpoint(Path("/tmp"), save_best=True, save_last=True)
    assert ckpt.get_best_model_path() is None
    ckpt.on_epoch_end(1, {"mAP50-95": 0.5})
    summary = ckpt.get_checkpoint_summary()
    assert summary["best_metric"] is None or summary["best_metric"] > 0


@pytest.fixture
def sample_trainer():
    from src.models.trainer import YOLOTrainer
    config = {
        "model": {"name": "yolo11n", "pretrained": True},
        "data": {"yaml_path": "tests/data.yaml", "imgsz": 640, "batch_size": 2},
        "training": {"epochs": 1, "optimizer": "auto"},
        "augmentation": {},
        "regularization": {},
        "validation": {"val_interval": 1},
        "device": {"device": "cpu"},
        "advanced": {"seed": 42},
        "logging": {"verbose": True},
        "checkpoint": {"save_period": -1},
    }
    return YOLOTrainer(config=config, project_root=Path("/tmp"))


def test_trainer_init(sample_trainer):
    assert sample_trainer.config["model"]["name"] == "yolo11n"
    assert sample_trainer.project_root is not None


def test_trainer_section_builders():
    from src.models.trainer import YOLOTrainer
    args = YOLOTrainer._build_data_args({"imgsz": 640, "batch_size": 4}, "/tmp/data.yaml")
    assert args["imgsz"] == 640
    assert args["batch"] == 4

    args = YOLOTrainer._build_train_hyperparams({"epochs": 50})
    assert args["epochs"] == 50

    args = YOLOTrainer._build_validation_args({"val_interval": 2})
    assert args["val"] is True

    args = YOLOTrainer._build_device_args({"device": "cpu"})
    assert args["device"] == "cpu"


def test_trainer_build_data_args():
    from src.models.trainer import YOLOTrainer
    args = YOLOTrainer._build_data_args({"imgsz": 640, "batch_size": 4}, "/tmp/data.yaml")
    assert args["imgsz"] == 640
    assert args["batch"] == 4
