"""
Prediction endpoint definitions.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from ...ml.preprocessing import (
    UnidentifiedImageError,
    get_model_input_size,
    preprocess_image,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["prediction"])

# Thread pool for running blocking model predictions
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="model_predict")


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
    target_size = get_model_input_size(model)
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


