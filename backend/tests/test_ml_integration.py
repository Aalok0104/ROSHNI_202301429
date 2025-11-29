import pytest
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock
from uuid import uuid4
from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.inference_service import run_inference_and_update_db, predict_image_bytes
from app.models.questionnaires_and_logs import IncidentMedia
from app.routers.incidents import upload_media

@pytest.mark.asyncio
async def test_inference_service_update_db():
    # Mock session and media
    mock_session = AsyncMock(spec=AsyncSession)
    media_id = uuid4()
    mock_media = MagicMock(spec=IncidentMedia)
    mock_media.media_id = media_id
    mock_media.file_type = "image"
    mock_media.storage_path = "test_image.jpg"
    mock_media.CNNModelScores = None
    
    # Mock select result
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_media
    
    # Configure execute to be awaitable and return the mock result
    mock_session.execute = AsyncMock(return_value=mock_result)

    # Mock AsyncSessionLocal to return a context manager that yields our mock session
    mock_session_ctx = AsyncMock()
    mock_session_ctx.__aenter__.return_value = mock_session
    mock_session_ctx.__aexit__.return_value = None

    with patch("app.services.inference_service.AsyncSessionLocal", return_value=mock_session_ctx):
        # Mock file reading and prediction
        with patch("pathlib.Path.read_bytes", return_value=b"fake_image_bytes"), \
             patch("pathlib.Path.exists", return_value=True), \
             patch("app.services.inference_service.predict_image_bytes", return_value={"score": 0.9}):
            
            await run_inference_and_update_db(media_id)
            
            # Verify
            # Check if session.add was called with the media object having the correct scores
            mock_session.add.assert_called_once()
            args, _ = mock_session.add.call_args
            added_media = args[0]
            assert added_media.CNNModelScores == {"score": 0.9}
            mock_session.commit.assert_called_once()

@pytest.mark.asyncio
async def test_upload_media_triggers_background_task():
    # Mock dependencies
    incident_id = uuid4()
    user_id = uuid4()
    mock_file = MagicMock()
    mock_file.filename = "test.jpg"
    mock_file.content_type = "image/jpeg"
    mock_file.read = AsyncMock(return_value=b"fake_content")
    
    mock_bg_tasks = MagicMock(spec=BackgroundTasks)
    mock_user = MagicMock()
    mock_user.user_id = user_id
    
    mock_db = AsyncMock(spec=AsyncSession)
    
    # Mock repository
    with patch("app.routers.incidents.IncidentRepository") as MockRepo:
        mock_repo_instance = MockRepo.return_value
        mock_media_entry = MagicMock()
        mock_media_entry.media_id = uuid4()
        mock_repo_instance.add_media = AsyncMock(return_value=mock_media_entry)
        
        # Mock aiofiles
        with patch("aiofiles.open", new_callable=MagicMock) as mock_open:
            mock_file_handle = AsyncMock()
            mock_open.return_value.__aenter__.return_value = mock_file_handle
            
            await upload_media(
                incident_id=incident_id,
                background_tasks=mock_bg_tasks,
                file=mock_file,
                current_user=mock_user,
                db=mock_db
            )
            
            # Verify background task added
            mock_bg_tasks.add_task.assert_called_once()
            args, _ = mock_bg_tasks.add_task.call_args
            assert args[0] == run_inference_and_update_db
            assert args[1] == mock_media_entry.media_id

def test_predict_image_bytes():
    # Mock model and preprocessing
    mock_model = MagicMock()
    mock_model.predict.return_value.tolist.return_value = [[0.1, 0.9]]
    mock_model.input_shape = (None, 48, 48, 3)
    mock_model.output_shape = (None, 2)
    
    with patch("app.services.inference_service.get_or_create_model", return_value=(mock_model, (48, 48))), \
         patch("app.services.inference_service.preprocess_image", return_value=MagicMock(shape=(1, 48, 48, 3))):
        
        result = predict_image_bytes(b"fake_bytes")
        assert result["prediction"] == [[0.1, 0.9]]
        assert result["input_shape"] == [1, 48, 48, 3]

def test_resolve_storage_path():
    from app.services.inference_service import _resolve_storage_path
    
    with patch("pathlib.Path.exists", return_value=True):
        path = _resolve_storage_path("some/path.jpg")
        # Use name to avoid Windows/Unix path separator issues
        assert path.name == "path.jpg"

    with patch("pathlib.Path.exists", side_effect=[False, True]):
        # First check fails, second (candidate) succeeds
        path = _resolve_storage_path("some/path.jpg")
        assert path.name == "path.jpg"

    with patch("pathlib.Path.exists", return_value=False):
        with pytest.raises(FileNotFoundError):
            _resolve_storage_path("nonexistent.jpg")

@pytest.mark.asyncio
async def test_inference_service_errors():
    # Test media not found
    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session_ctx = AsyncMock()
    mock_session_ctx.__aenter__.return_value = mock_session
    mock_session_ctx.__aexit__.return_value = None

    with patch("app.services.inference_service.AsyncSessionLocal", return_value=mock_session_ctx):
        await run_inference_and_update_db(uuid4())
        mock_session.add.assert_not_called()

    # Test not an image
    mock_media = MagicMock(spec=IncidentMedia)
    mock_media.file_type = "video"
    mock_result.scalar_one_or_none.return_value = mock_media
    mock_session.execute = AsyncMock(return_value=mock_result)
    
    with patch("app.services.inference_service.AsyncSessionLocal", return_value=mock_session_ctx):
        await run_inference_and_update_db(uuid4())
        mock_session.add.assert_not_called()

    # Test file not found
    mock_media.file_type = "image"
    mock_media.storage_path = "missing.jpg"
    
    with patch("app.services.inference_service.AsyncSessionLocal", return_value=mock_session_ctx), \
         patch("app.services.inference_service._resolve_storage_path", side_effect=FileNotFoundError):
        await run_inference_and_update_db(uuid4())
        mock_session.add.assert_not_called()

    # Test inference error
    with patch("app.services.inference_service.AsyncSessionLocal", return_value=mock_session_ctx), \
         patch("app.services.inference_service._resolve_storage_path", return_value=Path("test.jpg")), \
         patch("pathlib.Path.read_bytes", return_value=b"bytes"), \
         patch("app.services.inference_service.predict_image_bytes", side_effect=Exception("Model error")):
        
        await run_inference_and_update_db(uuid4())
        mock_session.rollback.assert_called()
