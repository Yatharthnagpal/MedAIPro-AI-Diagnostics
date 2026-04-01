---
title: MedAI Pro
emoji: 🧠
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---

<div align="center">

# 🧠 MedAI Pro
### AI-powered Medical Imaging & Sepsis Risk Prediction Platform

🚀 **Live App:** https://huggingface.co/spaces/Yatharthnagpal/MedAI

</div>

---

## 📌 Overview

**MedAI Pro** is a full-stack AI healthcare platform designed for **multi-modal medical diagnosis** and **clinical risk prediction**.

It integrates **deep learning + full-stack engineering** to assist clinicians with:

- 🩻 Medical image analysis  
- 🧠 Brain tumor detection (MRI)  
- 👁️ Retinal disease classification  
- 🧬 Skin lesion analysis  
- ⚠️ ICU sepsis risk prediction  

---

## 🖼️ Application Screenshots

### 🔹 Dashboard
![Dashboard](https://github.com/user-attachments/assets/a85079ae-edd2-420e-b721-f4c498c46507)

### 🔹 Patient History
![Patient History](https://github.com/user-attachments/assets/909a6a1f-6cd7-4a26-9375-9bc94ac62822)

### 🔹 Brain MRI Module
![Brain MRI](https://github.com/user-attachments/assets/181cccd2-1955-439d-a354-11ef3c19d375)

### 🔹 Diagnosis Report Modal
![Report](https://github.com/user-attachments/assets/94759e9e-a250-4d61-93cd-741253dfa5a9)

---

## ⚙️ Key Features

### 🧠 Imaging Modules
- Chest X-Ray (Pneumonia detection)
- Brain MRI (Tumor classification + segmentation)
- Retinal Scan (Severity detection)
- Skin Lesion (Benign/Malignant classification)

### ⚠️ Clinical Module
- **Sepsis Risk Prediction**
- Ensemble Model:
  - LSTM
  - XGBoost
  - Random Forest

### 🔐 Backend Features
- JWT Authentication (secure cookies)
- MongoDB (optional persistence)
- REST API architecture

### 🗂️ Patient History
- Stores recent reports in browser (local storage)
- Thumbnail previews
- Quick access to past diagnoses

---

## 🏗️ Tech Stack

| Layer        | Technologies |
|-------------|-------------|
| Frontend     | React 19, Vite, Tailwind CSS, Framer Motion |
| Backend      | Node.js, Express, JWT, Mongoose |
| ML API       | FastAPI, Uvicorn |
| ML Models    | TensorFlow, PyTorch, Scikit-learn, XGBoost |
| Database     | MongoDB Atlas (optional) |
| Deployment   | Docker, Hugging Face Spaces |

---

## 📂 Project Structure


```
├── api.py              # FastAPI app, model load, /predict/* routes
├── requirements.txt    # Python dependencies
├── Dockerfile          # Production image (frontend build + Node + Python)
├── start.sh            # Starts FastAPI then Express on port 7860 (HF Spaces)
├── modules/            # Python helpers used by api.py
├── backend/            # Express server (auth, proxy to Python, static SPA)
├── frontend/           # React SPA
└── docs/images/        # README assets (SVG banner, architecture)
```

Large model files are **not** committed; they are downloaded at startup from Google Drive (see `api.py` `MODEL_FILES`).

---

## Prerequisites

- **Node.js** 20+  
- **Python** 3.10+  
- **MongoDB Atlas** URI (optional; without it, dev uses in-memory auth)  

---

## Local development

### 1️⃣ Python (FastAPI)

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

### 2️⃣ Node backend (Express)

```bash
cd backend
npm install
# Create backend/.env with MONGO_URI, JWT_SECRET, PYTHON_API_URL=http://127.0.0.1:8000
node server.js
```

### 3️⃣ Frontend (Vite)

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:5000` (see `frontend/vite.config.js`). The frontend uses `baseURL: /api` so cookies and routes work in dev.

---

## Environment variables

**Backend (`backend/.env` or hosting secrets)**

| Variable | Example | Purpose |
| :--- | :--- | :--- |
| `PORT` | `5000` | Express port (local) |
| `PYTHON_API_URL` | `http://127.0.0.1:8000` | FastAPI base URL |
| `MONGO_URI` | `mongodb+srv://...` | Atlas (optional) |
| `JWT_SECRET` | long random string | JWT signing |
| `NODE_ENV` | `production` | Static SPA + stricter CORS/cookies |
| `FRONTEND_ORIGIN` | `https://your-frontend.com` | Allowed CORS origin in production |

**Frontend (production build only if split from backend)**

| Variable | Purpose |
| :--- | :--- |
| `VITE_API_BASE` | Full API base, e.g. `https://your-api.com/api` |

**Docker / Hugging Face:** set secrets in the Space dashboard; `start.sh` sets `PYTHON_API_URL=http://127.0.0.1:8000` and `PORT=7860`.

---

## Docker

```bash
docker build -t medai .
docker run -p 7860:7860 -e MONGO_URI="mongodb+srv://..." -e JWT_SECRET="..." medai
```

Open `http://localhost:7860`.

---

## Deploy links (fill in for your README)

Copy the table at the top of this file and replace:

1. **Live app** — your Hugging Face Space URL (or Render / other host).  
2. **Repository** — your GitHub repo URL.  

If you use **Vercel** for frontend only, add another row:

```markdown
| **Frontend (Vercel)** | `https://your-app.vercel.app` |
```

---
