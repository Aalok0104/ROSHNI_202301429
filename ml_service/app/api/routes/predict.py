"""
Prediction endpoint definitions.
"""

import logging
import os
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from typing import Any

import numpy as np
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["prediction"])

# Thread pool for running blocking model predictions
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="model_predict")

# Allow override via environment variable: MODEL_INPUT_SIZE=80,80 or MODEL_INPUT_SIZE=96x96
_OVERRIDE_INPUT_SIZE = os.getenv("MODEL_INPUT_SIZE")
if _OVERRIDE_INPUT_SIZE:
    try:
        # Support both comma and x separator
        parts = _OVERRIDE_INPUT_SIZE.replace("x", ",").split(",")
        if len(parts) == 2:
            _OVERRIDE_INPUT_SIZE = (int(parts[0].strip()), int(parts[1].strip()))
            logger.info(f"Using override input size from environment: {_OVERRIDE_INPUT_SIZE}")
        else:
            _OVERRIDE_INPUT_SIZE = None
    except ValueError:
        logger.warning(f"Invalid MODEL_INPUT_SIZE format: {_OVERRIDE_INPUT_SIZE}")
        _OVERRIDE_INPUT_SIZE = None
else:
    _OVERRIDE_INPUT_SIZE = None


def get_model_input_shape(model: Any) -> tuple[int, int]:
    """
    Extract the expected input image dimensions from the model.
    
    Returns:
        Tuple of (height, width) that the model expects.
    """
    # Check for environment variable override first
    if _OVERRIDE_INPUT_SIZE:
        logger.info(f"Using override input size: {_OVERRIDE_INPUT_SIZE}")
        return _OVERRIDE_INPUT_SIZE
    
    # Try to get from input_shape attribute
    if hasattr(model, 'input_shape') and model.input_shape:
        shape = model.input_shape
        logger.debug(f"Model input_shape: {shape}")
        
        # Handle different shape formats
        if isinstance(shape, (list, tuple)) and len(shape) >= 3:
            # input_shape is typically (batch, height, width, channels) or (height, width, channels)
            # If batch is None, it's (None, height, width, channels)
            if shape[0] is None and len(shape) == 4:
                # Format: (None, height, width, channels)
                if shape[1] is not None and shape[2] is not None:
                    return (int(shape[1]), int(shape[2]))
            elif len(shape) == 4:
                # Format: (batch, height, width, channels) - batch might be 1 or None
                if shape[1] is not None and shape[2] is not None:
                    return (int(shape[1]), int(shape[2]))
            elif len(shape) == 3:
                # Format: (height, width, channels)
                if shape[0] is not None and shape[1] is not None:
                    return (int(shape[0]), int(shape[1]))
    
    # Try to get from inputs attribute
    if hasattr(model, 'inputs') and model.inputs and len(model.inputs) > 0:
        shape = model.inputs[0].shape
        logger.debug(f"Model inputs[0].shape: {shape}")
        if len(shape) >= 3:
            # shape is typically (batch, height, width, channels)
            if shape[1] is not None and shape[2] is not None:
                return (int(shape[1]), int(shape[2]))
    
    # Try to get from get_config if available
    if hasattr(model, 'get_config'):
        try:
            config = model.get_config()
            if 'layers' in config and len(config['layers']) > 0:
                first_layer = config['layers'][0]
                if 'config' in first_layer and 'batch_input_shape' in first_layer['config']:
                    batch_input_shape = first_layer['config']['batch_input_shape']
                    if len(batch_input_shape) >= 3:
                        # Format: (batch, height, width, channels)
                        if batch_input_shape[1] is not None and batch_input_shape[2] is not None:
                            return (int(batch_input_shape[1]), int(batch_input_shape[2]))
        except Exception as e:
            logger.debug(f"Could not get shape from model config: {e}")
    
    # Log model structure for debugging
    logger.warning("Could not determine model input shape from model attributes")
    if hasattr(model, 'summary'):
        logger.info("Model summary available - check model architecture for input size")
    
    # Default fallback
    # Based on error analysis: model expects 2304 features (48x48) but got 6400 (80x80) with 224x224 input
    # Common sizes: 48x48, 64x64, 80x80, 96x96, 128x128, 224x224
    # If the model architecture produces features proportional to input area, try 48x48 first
    default_size = (48, 48)
    logger.warning(
        f"Could not determine model input shape. Using default {default_size}. "
        "If this fails, set MODEL_INPUT_SIZE environment variable (e.g., MODEL_INPUT_SIZE=80,80)"
    )
    return default_size


def preprocess_image(image_bytes: bytes, target_size: tuple[int, int]) -> np.ndarray:
    """
    Convert uploaded image bytes into a numpy array suitable for Keras models.
    
    Args:
        image_bytes: Raw image file bytes
        target_size: Tuple of (height, width) to resize the image to
    
    Returns:
        Preprocessed image array with shape (1, height, width, 3)
    """
    with Image.open(BytesIO(image_bytes)) as image:
        # Convert to RGB if needed (handles RGBA, grayscale, etc.)
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Resize to target dimensions
        # PIL resize expects (width, height), but we have (height, width)
        image = image.resize((target_size[1], target_size[0]), Image.Resampling.LANCZOS)
    
    # Convert to numpy array and normalize to [0, 1]
    image_array = np.array(image, dtype="float32") / 255.0
    
    # Add batch dimension: (height, width, channels) -> (1, height, width, channels)
    return np.expand_dims(image_array, axis=0)


@router.post("", summary="Run inference on an incident image")
async def predict(request: Request, file: UploadFile = File(...)) -> dict[str, Any]:
    """
    Accept an uploaded image, preprocess it, and return model predictions.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported.")

    model = getattr(request.app.state, "model", None)
    if model is None:
        logger.error("Model not available in app state")
        raise HTTPException(
            status_code=503,
            detail="Prediction model is not available. Please try again later.",
        )

    # Get the model's expected input size
    target_size = get_model_input_shape(model)
    logger.info(f"Model expects input size: {target_size} (height x width)")

    try:
        contents = await file.read()
        logger.info(f"Received image: {file.filename}, size: {len(contents)} bytes")
        input_tensor = preprocess_image(contents, target_size)
        logger.info(f"Preprocessed image shape: {input_tensor.shape}")
    except UnidentifiedImageError as exc:
        logger.error(f"Invalid image file: {exc}")
        raise HTTPException(status_code=400, detail="Invalid image file.") from exc
    except Exception as exc:
        logger.error(f"Error preprocessing image: {exc}", exc_info=True)
        raise HTTPException(
            status_code=400, detail=f"Error processing image: {str(exc)}"
        ) from exc

    try:
        logger.info(f"Running prediction with input shape: {input_tensor.shape}")
        
        # Run model prediction in thread pool to avoid blocking async event loop
        # TensorFlow/Keras operations are blocking and should run in a separate thread
        import asyncio
        loop = asyncio.get_event_loop()
        predictions = await loop.run_in_executor(
            _executor,
            lambda: model.predict(input_tensor, verbose=0)
        )
        
        logger.info(f"Prediction completed, output shape: {predictions.shape}")
        
        # Convert to list format
        if hasattr(predictions, 'tolist'):
            prediction_list = predictions.tolist()
        else:
            prediction_list = predictions.numpy().tolist() if hasattr(predictions, 'numpy') else list(predictions)
        
        return {
            "filename": file.filename,
            "prediction": prediction_list,
            "input_shape": list(input_tensor.shape),
            "output_shape": list(predictions.shape) if hasattr(predictions, 'shape') else None,
        }
    except Exception as exc:
        logger.error(f"Error during prediction: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error during model prediction: {str(exc)}",
        ) from exc


