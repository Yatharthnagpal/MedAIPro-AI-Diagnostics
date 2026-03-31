#!/bin/bash

# Start FastAPI (Python ML server) in background on port 8000
echo "[*] Starting FastAPI ML server on port 8000..."
python -m uvicorn api:app --host 0.0.0.0 --port 8000 &

# Wait for FastAPI to be ready
echo "[*] Waiting for FastAPI to load models..."
sleep 5

# Start Node.js Express server on port 7860 (HF Spaces exposed port)
echo "[*] Starting Node.js server on port 7860..."
cd backend
PORT=7860 PYTHON_API_URL=http://127.0.0.1:8000 NODE_ENV=production node server.js
