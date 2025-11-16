# Backend Dockerfile
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy requirements (if exists)
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI app
COPY backend/app ./app

# Expose the FastAPI port
EXPOSE 8000

# Run FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
