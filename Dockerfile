# ── Stage 1: Build React frontend ──
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Final runtime image ──
FROM python:3.10-slim

# Install Node.js 20 and system dependencies for OpenCV
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl libgl1 libglx-mesa0 libglib2.0-0 && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Node backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy application code
COPY api.py ./
COPY modules/ ./modules/
COPY backend/ ./backend/

# Copy built frontend into backend/public so Express can serve it
COPY --from=frontend-build /app/frontend/dist ./backend/public

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 7860

CMD ["./start.sh"]
