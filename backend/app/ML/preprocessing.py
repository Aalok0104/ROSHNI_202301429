"""
Shared preprocessing utilities for the ML service.
"""

from __future__ import annotations

import logging
import os
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)


def _parse_override(value: str | None) -> tuple[int, int] | None:
    """
    Parse MODEL_INPUT_SIZE environment variable values such as `80,80` or `80x80`.
    """
    if not value:
        return None

    normalized = value.lower().replace(" ", "").replace("x", ",")
    parts = [p for p in normalized.split(",") if p]
    if len(parts) != 2:
        return None

    try:
        return (int(parts[0]), int(parts[1]))
    except ValueError:
        return None


_OVERRIDE_INPUT_SIZE = _parse_override(os.getenv("MODEL_INPUT_SIZE"))
if _OVERRIDE_INPUT_SIZE:
    logger.info("MODEL_INPUT_SIZE override detected: %s", _OVERRIDE_INPUT_SIZE)


def get_model_input_size(model: Any) -> tuple[int, int]:
    """
    Determine the (height, width) expected by the trained model.
    """
    if _OVERRIDE_INPUT_SIZE:
        return _OVERRIDE_INPUT_SIZE

    # Try `input_shape`
    shape = getattr(model, "input_shape", None)
    if shape:
        logger.debug("Model input_shape: %s", shape)
        resolved = _extract_hw_from_shape(shape)
        if resolved:
            return resolved

    # Try `inputs[0].shape`
    inputs = getattr(model, "inputs", None)
    if inputs:
        first_shape = getattr(inputs[0], "shape", None)
        logger.debug("Model inputs[0].shape: %s", first_shape)
        resolved = _extract_hw_from_shape(first_shape)
        if resolved:
            return resolved

    # Try config
    if hasattr(model, "get_config"):
        try:
            config = model.get_config()
            layers = config.get("layers", [])
            if layers:
                first_layer = layers[0].get("config", {})
                batch_input_shape = first_layer.get("batch_input_shape")
                resolved = _extract_hw_from_shape(batch_input_shape)
                if resolved:
                    return resolved
        except Exception as exc:  # pragma: no cover - defensive
            logger.debug("Failed to inspect model config: %s", exc)

    # Fallback based on observed error (2304 features -> 48x48)
    default_size = (48, 48)
    logger.warning(
        "Could not determine model input size. Falling back to %s. "
        "Set MODEL_INPUT_SIZE=HxW if your model expects a different size.",
        default_size,
    )
    return default_size


def _extract_hw_from_shape(shape: Any) -> tuple[int, int] | None:
    """
    Extract (height, width) tuple from a variety of shape representations.
    """
    if not shape:
        return None

    if isinstance(shape, (list, tuple)):
        if len(shape) == 4:
            _, height, width, _ = shape
            if height and width:
                return (int(height), int(width))
        elif len(shape) == 3:
            height, width, _ = shape
            if height and width:
                return (int(height), int(width))
    return None


def preprocess_image(image_bytes: bytes, target_size: tuple[int, int]) -> np.ndarray:
    """
    Convert uploaded image bytes into a normalized numpy array expected by the model.
    """
    with Image.open(BytesIO(image_bytes)) as image:
        if image.mode != "RGB":
            image = image.convert("RGB")

        resample = getattr(Image, "Resampling", Image).LANCZOS
        width, height = target_size[1], target_size[0]
        image = image.resize((width, height), resample=resample)

    image_array = np.array(image, dtype="float32") / 255.0
    return np.expand_dims(image_array, axis=0)


def preprocess_image_from_path(path: Path, target_size: tuple[int, int]) -> np.ndarray:
    """
    Convenience helper to preprocess an image stored on disk.
    """
    return preprocess_image(path.read_bytes(), target_size)


__all__ = [
    "get_model_input_size",
    "preprocess_image",
    "preprocess_image_from_path",
    "UnidentifiedImageError",
]


