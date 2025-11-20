# ML Prediction Service

FastAPI service for running ML model inference on incident images.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Copy your model file:**
   ```bash
   # Copy best_model.keras to app/ml/
   cp path/to/best_model.keras app/ml/best_model.keras
   ```

3. **Start the server:**
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
ml_service/
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
│   │   └── best_model.keras # Your trained model (copy here)
│   └── models/
│       ├── __init__.py
│       └── questionnaires_and_logs.py  # Data models
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
- Resized to 224x224 pixels
- Normalized to [0, 1] range
- Converted to numpy array format compatible with Keras

## Development

### Running in Development Mode

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`


