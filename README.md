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

# 🏥 MedAI Pro
### AI-Powered Medical Imaging & Clinical Risk Prediction Platform

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-HuggingFace-orange?style=for-the-badge)](https://huggingface.co/spaces/Yatharthnagpal/MedAI)
[![Python](https://img.shields.io/badge/Python-3.10-blue?style=for-the-badge&logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://docker.com)

</div>

---

## 📌 Overview

**MedAI Pro** is a full-stack AI healthcare platform for **multi-modal medical diagnosis** and **clinical risk prediction**. It combines state-of-the-art deep learning models with a modern web interface to assist clinicians with rapid, accurate analysis.

### 🎯 What It Does

| Module | Task | Model |
|--------|------|-------|
| 🧠 **Brain MRI** | Tumor detection & classification | VGG16 (Keras) |
| 🫁 **Chest X-Ray** | 14-disease pathology detection | ResNet50 (PyTorch) |
| 👁️ **Retinal Scan** | Diabetic retinopathy grading | Ensemble CNN (Keras) |
| 🎗️ **Skin Lesion** | Benign/Malignant classification | MobileNetV3 (Keras) |
| ⚠️ **Sepsis Risk** | ICU risk prediction from vitals | LSTM + XGBoost + RF |

---

## 🖼️ Screenshots

### Dashboard
![Dashboard](https://github.com/user-attachments/assets/a85079ae-edd2-420e-b721-f4c498c46507)

### Brain MRI Analysis
![Brain MRI](https://github.com/user-attachments/assets/181cccd2-1955-439d-a354-11ef3c19d375)

### Diagnosis Report
![Report](https://github.com/user-attachments/assets/94759e9e-a250-4d61-93cd-741253dfa5a9)

### Patient History
![Patient History](https://github.com/user-attachments/assets/909a6a1f-6cd7-4a26-9375-9bc94ac62822)

---

## ✨ Key Features

- **🔬 Multi-Modal AI** — 5 independent diagnostic modules in one platform
- **🌡️ Grad-CAM Heatmaps** — Visual explanations for every prediction
- **💈 CLAHE Enhancement** — Contrast-limited histogram equalization for better image clarity
- **🔐 JWT Authentication** — Secure login with httpOnly cookies
- **📋 Patient History** — Stores and retrieves past diagnoses
- **🐳 Docker Ready** — One-command deployment to any cloud platform
- **⚡ Ensemble Models** — Sepsis detection uses 3 models voted together for accuracy

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────┐
│             Browser (React SPA)            │
│         Vite + Tailwind + Framer Motion    │
└──────────────────┬─────────────────────────┘
                   │ HTTP /api/*
┌──────────────────▼─────────────────────────┐
│         Node.js / Express  :7860           │
│  JWT Auth · History API · Image Proxy      │
└──────────────────┬─────────────────────────┘
                   │ HTTP /predict/*
┌──────────────────▼─────────────────────────┐
│         FastAPI (Python) :8000             │
│  Brain · Chest · Eye · Skin · Sepsis       │
│  TensorFlow · PyTorch · Scikit-learn       │
└────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion, Axios |
| **Node Backend** | Express.js, JWT, bcrypt, Mongoose, Multer |
| **ML API** | FastAPI, Uvicorn, Python 3.10 |
| **ML Frameworks** | TensorFlow/Keras, PyTorch, Scikit-learn, XGBoost |
| **Database** | MongoDB Atlas (optional; falls back to in-memory) |
| **Deployment** | Docker, Hugging Face Spaces |

---

## 📂 Project Structure

```
MedAI/
├── api.py                  # FastAPI ML backend (all /predict/* routes)
├── requirements.txt        # Python dependencies
├── Dockerfile              # Multi-stage build (React → Node + Python)
├── start.sh                # Startup script (FastAPI + Express)
│
├── frontend/               # React SPA (Vite + Tailwind)
│   ├── src/
│   │   ├── App.jsx         # Main router & layout
│   │   ├── api.js          # Axios API client
│   │   └── components/     # UI components
│   └── package.json
│
├── backend/                # Express.js server
│   └── server.js           # Auth, history, proxy to FastAPI
│
├── modules/                # Python Streamlit UI helpers
│   ├── brain.py
│   ├── chest.py
│   ├── eye.py
│   └── skin.py
│
└── model code/             # Jupyter training notebooks
    ├── brain.ipynb         # Brain tumor model training
    ├── chest.ipynb         # Chest X-ray model training
    ├── eye.ipynb           # Retinal disease model training
    ├── skin.ipynb          # Skin cancer model training
    └── sepsis.ipynb        # Sepsis prediction model training
```

> **Note:** Large model files (~600 MB total) are **not committed** to git. They are downloaded automatically from Google Drive on first startup via `gdown`.

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/Yatharthnagpal/MedAI-AI-powered-CDSS-portal.git
cd MedAI
docker build -t medai .
docker run -p 7860:7860 \
  -e JWT_SECRET="your_secret_here" \
  -e NODE_ENV=production \
  medai
```

Open `http://localhost:7860`

### Option 2: Local Development

**1. Python / FastAPI backend**
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```

**2. Node.js / Express backend**
```bash
cd backend
npm install
node server.js
```

**3. React frontend (dev)**
```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` → `http://localhost:5000` automatically.

---

## ⚙️ Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5000` | Express server port |
| `PYTHON_API_URL` | `http://127.0.0.1:8000` | FastAPI base URL |
| `MONGO_URI` | _(optional)_ | MongoDB Atlas URI (omit for in-memory mode) |
| `JWT_SECRET` | `dev_secret_change_me` | JWT signing secret |
| `NODE_ENV` | `development` | Set to `production` for static SPA serving |
| `VITE_API_BASE` | `/api` | Frontend API base (for split deployments) |

---

## 🤖 AI Models

All models are trained on publicly available medical imaging datasets from Kaggle:

| Model | Dataset | Accuracy |
|-------|---------|----------|
| Brain Tumor (VGG16) | Brain Tumor MRI Dataset | ~97% |
| Chest X-Ray (ResNet50) | NIH ChestX-ray14 | Multi-label AUC |
| Eye Disease (Ensemble) | APTOS 2019 Blindness Detection | ~85% |
| Skin Cancer (MobileNetV3) | SIIM-ISIC Melanoma 2020 | High AUC |
| Sepsis (LSTM+XGB+RF) | PhysioNet Sepsis Challenge | Ensemble |

---

## 📄 License

This project is for educational and research purposes.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/Yatharthnagpal">Yatharth Nagpal</a> · <a href="https://huggingface.co/spaces/Yatharthnagpal/MedAI">🚀 Live Demo</a> · <a href="https://github.com/Yatharthnagpal/MedAI-AI-powered-CDSS-portal">⭐ Star on GitHub</a>
</div>
