"""
Service to handle ML inference and database updates.
"""
import logging
import json
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.questionnaires_and_logs import IncidentMedia
# ML imports moved inside functions to allow lazy loading

logger = logging.getLogger(__name__)

_MODEL_CACHE: Any | None = None
_MODEL_INPUT_SIZE: tuple[int, int] | None = None


def get_or_create_model() -> tuple[Any, tuple[int, int]]:
    """
    Lazily load the trained Keras model and cache it for reuse.
    """
    from app.ML.loader import load_best_model
    from app.ML.preprocessing import get_model_input_size
    
    global _MODEL_CACHE, _MODEL_INPUT_SIZE

    if _MODEL_CACHE is None:
        logger.info("Loading ML model for inference service...")
        _MODEL_CACHE = load_best_model()
        _MODEL_INPUT_SIZE = get_model_input_size(_MODEL_CACHE)
        logger.info("Model ready. Input size: %s", _MODEL_INPUT_SIZE)

    return _MODEL_CACHE, _MODEL_INPUT_SIZE or (48, 48)


def predict_image_bytes(image_bytes: bytes) -> dict[str, Any]:
    """
    Run inference on in-memory image bytes.
    """
    from app.ML.preprocessing import preprocess_image
    
    model, target_size = get_or_create_model()
    input_tensor = preprocess_image(image_bytes, target_size)
    predictions = model.predict(input_tensor, verbose=0)

    if hasattr(predictions, "tolist"):
        payload = predictions.tolist()
    elif hasattr(predictions, "numpy"):
        payload = predictions.numpy().tolist()
    else:
        payload = list(predictions)

    return {
        "prediction": payload,
        "input_shape": list(input_tensor.shape),
        "output_shape": list(predictions.shape) if hasattr(predictions, "shape") else None,
    }


def _resolve_storage_path(storage_path: str) -> Path:
    """
    Resolve the actual path to the stored incident media file.
    """
    path = Path(storage_path)
    if path.exists():
        return path

    candidate_roots = [
        Path(__file__).resolve().parents[3],  # backend/
        Path(__file__).resolve().parents[4],  # repo root
        Path(__file__).resolve().parents[2],  # app/
    ]

    for root in candidate_roots:
        candidate = (root / storage_path).resolve()
        if candidate.exists():
            return candidate

    raise FileNotFoundError(f"Unable to locate media file at {storage_path}")


async def run_inference_and_update_db(media_id: UUID) -> None:
    """
    Background task to run inference on an image and update the database.
    """
    logger.info(f"Starting inference for media_id: {media_id}")
    
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(IncidentMedia).where(IncidentMedia.media_id == media_id)
            result = await session.execute(stmt)
            media = result.scalar_one_or_none()

            if not media:
                logger.error(f"IncidentMedia {media_id} not found.")
                return

            if media.file_type != "image":
                logger.info(f"IncidentMedia {media_id} is not an image. Skipping inference.")
                return

            try:
                image_path = _resolve_storage_path(media.storage_path)
                image_bytes = image_path.read_bytes()
            except FileNotFoundError as e:
                logger.error(f"File not found for media {media_id}: {e}")
                return
            except Exception as e:
                logger.error(f"Error reading file for media {media_id}: {e}")
                return

            # Run inference (sync call, might block event loop briefly, but model predict is usually fast or releases GIL)
            # If strictly async, run_in_executor could be used, but for now direct call is fine as per requirements.
            try:
                scores = predict_image_bytes(image_bytes)
                media.CNNModelScores = scores
                session.add(media)
                await session.commit()
                logger.info(f"Successfully updated CNNModelScores for media_id: {media_id}")
            except Exception as e:
                logger.error(f"Inference failed for media {media_id}: {e}")
                await session.rollback()

        except Exception as e:
            logger.error(f"Unexpected error in inference task for media {media_id}: {e}")
