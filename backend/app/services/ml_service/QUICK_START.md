# Quick Start Guide - Testing the ML Service

## Step 1: Copy the Model File

The model file needs to be in `app/ml/best_model.keras`. Run the setup script:

**PowerShell:**
```powershell
cd backend\app\services\ml_service
.\setup.ps1
```

**Or manually:**
```powershell
Copy-Item ..\..\ML\best_model.keras app\ml\best_model.keras
```

## Step 2: Install Dependencies

```bash
cd backend/app/services/ml_service
pip install -r requirements.txt
```

## Step 3: Start the Server

```bash
cd backend/app/services/ml_service
uvicorn app.main:app --reload --port 8000
```

You should see output like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

## Step 4: Test the API

### Option A: Basic Test (Single Request)

Open a **new terminal** and run:

```bash
cd backend/app/services/ml_service
python test_api.py
```

Expected output:
```
Testing endpoint: http://localhost:8000/predict
Using image: test_image.jpg
Created test image at: test_image.jpg

✅ Success!
Response status: 200
Filename: test_image.jpg
Prediction shape: 1
...
```

### Option B: Performance Test (Multiple Requests)

```bash
cd backend/app/services/ml_service
python test_performance.py --requests 20 --concurrent 3
```

This will show:
- Average latency
- Requests per second
- Percentiles (P50, P95, P99)
- Error rate

### Option C: Manual Test with curl

```bash
curl -X POST "http://localhost:8000/predict" ^
  -F "file=@path/to/your/image.jpg"
```

### Option D: Use the Interactive API Docs

Open your browser and go to:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

You can test the endpoint directly from the browser interface!

## Troubleshooting

### "Model not found" error
- Make sure `best_model.keras` is in `app/ml/` directory
- Check the file path is correct

### "Connection refused" error
- Make sure the server is running (`uvicorn app.main:app --reload`)
- Check the port (default is 8000)

### Import errors
- Make sure you installed dependencies: `pip install -r requirements.txt`
- Check you're in the correct directory

### Model loading takes too long
- This is normal on first startup - the model loads once and stays in memory
- Subsequent requests will be much faster

## Performance Tips

1. **For production**: Remove `--reload` flag
2. **For better performance**: Use `--workers N` to run multiple worker processes
3. **For testing**: Use `test_performance.py` with different `--concurrent` values to find optimal settings


