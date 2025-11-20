# Setup script for ML Service
# This script copies the model file and sets up the environment

Write-Host "Setting up ML Service..." -ForegroundColor Green

# Check if model exists in backend
$modelSource = "..\backend\app\ML\best_model.keras"
$modelDest = "app\ml\best_model.keras"

if (Test-Path $modelSource) {
    Write-Host "Found model at: $modelSource" -ForegroundColor Yellow
    if (-not (Test-Path $modelDest)) {
        Write-Host "Copying model to: $modelDest" -ForegroundColor Yellow
        Copy-Item $modelSource $modelDest
        Write-Host "✓ Model copied successfully!" -ForegroundColor Green
    } else {
        Write-Host "✓ Model already exists at destination" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ Warning: Model not found at $modelSource" -ForegroundColor Red
    Write-Host "Please copy best_model.keras to app\ml\ manually" -ForegroundColor Yellow
}

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Install dependencies: pip install -r requirements.txt" -ForegroundColor White
Write-Host "  2. Start server: uvicorn app.main:app --reload" -ForegroundColor White
Write-Host "  3. Test API: python test_api.py" -ForegroundColor White


