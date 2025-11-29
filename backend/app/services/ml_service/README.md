# ML Prediction Service

FastAPI-powered inference utilities stored at `backend/app/services/ml_service`.
You can either run this service as a standalone FastAPI app or import it directly
inside the backend via `from app.services import ml_service`.

## Setup

1. **Install dependencies (from the service directory):**
   ```bash
   cd backend/app/services/ml_service
   pip install -r requirements.txt
   ```

2. **Copy your model file:**
   ```bash
   # Copy best_model.keras to app/ml/
   cp path/to/best_model.keras app/ml/best_model.keras
   ```

3. **Start the standalone server (optional):**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   The API will be available at `http://localhost:8000`

## API Endpoints

### POST `/predict`

Upload an image file for prediction.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field containing an image file

**Response:**
```json
{
  "filename": "image.jpg",
  "prediction": [[0.1, 0.2, 0.7, ...]]
}
```

**Example using curl:**
```bash
curl -X POST "http://localhost:8000/predict" \
  -F "file=@path/to/image.jpg"
```

**Example using Python:**
```python
import requests

with open("image.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8000/predict",
        files={"file": ("image.jpg", f, "image/jpeg")}
    )
print(response.json())
```

## Testing

### Basic API Test

Test the endpoint with a single request:

```bash
python test_api.py
```

Options:
- `--url URL`: Custom server URL (default: http://localhost:8000)
- `--image PATH`: Path to test image (default: creates test_image.jpg)

### Performance Testing

Run performance benchmarks:

```bash
# Basic test (10 sequential requests)
python test_performance.py

# Custom test (100 requests, 5 concurrent)
python test_performance.py --requests 100 --concurrent 5
```

Options:
- `--url URL`: Custom server URL
- `--requests N`: Total number of requests (default: 10)
- `--concurrent N`: Number of concurrent requests (default: 1)
- `--image PATH`: Path to test image

## Project Structure

```
backend/app/services/ml_service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       └── predict.py   # Prediction endpoint
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── loader.py        # Model loading utilities
│   │   ├── preprocessing.py # Shared preprocessing + size detection
│   │   └── best_model.keras # Your trained model (copy here)
│   └── models/
│       ├── __init__.py
│       └── questionnaires_and_logs.py  # Data models
├── processor.py             # Backend integration helpers
├── test_api.py              # Basic API test script
├── test_performance.py      # Performance testing script
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Model Loading

The model is loaded once at application startup using FastAPI's `lifespan` context manager. This ensures:
- Model is loaded only once (not per request)
- Efficient memory usage
- Fast inference response times

## Image Preprocessing

Images are automatically:
- Converted to RGB format
- Resized to the exact `(height, width)` expected by the trained model
  (auto-detected or overridden via `MODEL_INPUT_SIZE=HxW`)
- Normalized to the `[0, 1]` range
- Converted to NumPy arrays compatible with Keras/TensorFlow

## Backend Integration

Import the helpers anywhere inside the backend:

```python
from app.services.ml_service import predict_incident_media

result = predict_incident_media(db_session, media_id)
print(result["prediction"])
```

`predict_incident_media` fetches the `IncidentMedia` record, resolves its
`storage_path`, preprocesses the image, and returns JSON-serializable predictions.

## Development

### Running in Development Mode

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`


