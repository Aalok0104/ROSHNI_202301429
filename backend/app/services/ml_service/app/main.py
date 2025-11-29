"""
FastAPI application entry point.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from .api import api_router
from .ml.loader import load_best_model

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Load the Keras model once when the app starts and release it on shutdown.
    """
    try:
        logger.info("Loading Keras model...")
        model = load_best_model()
        app.state.model = model
        
        # Log model input/output information
        if hasattr(model, 'input_shape'):
            logger.info(f"Model input shape: {model.input_shape}")
        if hasattr(model, 'inputs') and model.inputs:
            for i, inp in enumerate(model.inputs):
                logger.info(f"Model input {i}: shape={inp.shape}, dtype={inp.dtype}")
        if hasattr(model, 'output_shape'):
            logger.info(f"Model output shape: {model.output_shape}")
        if hasattr(model, 'outputs') and model.outputs:
            for i, out in enumerate(model.outputs):
                logger.info(f"Model output {i}: shape={out.shape}, dtype={out.dtype}")
        
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        app.state.model = None
        raise
    
    try:
        yield
    finally:
        logger.info("Shutting down, cleaning up model...")
        if hasattr(app.state, "model") and app.state.model is not None:
            if hasattr(app.state.model, "close"):
                app.state.model.close()
            app.state.model = None
        logger.info("Cleanup complete")


app = FastAPI(lifespan=lifespan, title="Incident ML Service", version="0.1.0")
app.include_router(api_router)


