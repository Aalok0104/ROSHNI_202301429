"""
Utility helpers for loading the trained Keras model.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from keras.models import load_model

from .custom_metrics import f1_score

MODEL_FILENAME = "best_model.keras"


def get_model_path() -> Path:
    """
    Resolve the on-disk path to the trained Keras model.
    """
    return Path(__file__).resolve().parent / MODEL_FILENAME


def load_best_model() -> Any:
    """
    Load and return the trained model instance.

    Raises:
        FileNotFoundError: If the model file is missing.
    """
    model_path = get_model_path()
    if not model_path.exists():
        raise FileNotFoundError(f"Keras model not found at {model_path}")
    return load_model(model_path, custom_objects={"f1_score": f1_score})


