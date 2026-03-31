import os
import io
import logging
import warnings
import cv2
import json
import base64
import pickle
import hashlib
import secrets
import numpy as np
import pandas as pd
import torch
import tensorflow as tf
from typing import Optional, List
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request, Cookie
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from torchvision import transforms, models
import torch.nn as nn
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from keras.models import load_model
from pydantic import BaseModel
import gdown

# Quieter logs for legacy saved models (inference-only; does not change predictions).
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '2')
logging.getLogger('absl').setLevel(logging.ERROR)
warnings.filterwarnings(
    'ignore',
    message=r'Do not pass an `input_shape`/`input_dim` argument to a layer',
    category=UserWarning,
)

# --- HELPER: Convert OpenCV Image to Base64 String ---
def encode_image(image_np):
    """Encodes a numpy image (BGR) into a base64 string for the frontend."""
    success, encoded_image = cv2.imencode('.png', image_np)
    if success:
        return base64.b64encode(encoded_image).decode('utf-8')
    return None

def make_gradcam_heatmap(img_array, model, last_conv_layer_name, pred_index=None):
    """
    Generates a heat map for class activation.
    FIXED: Handles Keras models that return outputs as lists.
    """
    # 1. Handle Model Inputs (Fixes "Expected structure" warning)
    # If the model expects a list of inputs, wrap the image in a list.
    model_inputs = model.inputs
    if isinstance(img_array, np.ndarray):
        # If the model has multiple inputs, we might need to be careful, 
        # but for CNNs it's usually just one image.
        img_inputs = [img_array]
    else:
        img_inputs = img_array

    # 2. Handle Model Outputs (Fixes "List indices" error)
    # Ensure we are grabbing the actual tensor, not a list containing the tensor.
    model_output = model.output
    if isinstance(model_output, list):
        model_output = model_output[0]

    # 3. Create the Gradient Model
    grad_model = tf.keras.models.Model(
        inputs=model_inputs,
        outputs=[model.get_layer(last_conv_layer_name).output, model_output]
    )

    # 4. Record operations
    with tf.GradientTape() as tape:
        # Pass inputs as a list to satisfy Keras 3.x
        conv_outputs, predictions = grad_model(img_inputs)
        
        # DOUBLE CHECK: If predictions is still a list, extract the tensor
        if isinstance(predictions, list):
            predictions = predictions[0]
            
        if pred_index is None:
            pred_index = tf.argmax(predictions[0])
        
        class_channel = predictions[:, pred_index]

    # 5. Compute Gradients
    grads = tape.gradient(class_channel, conv_outputs)

    # 6. Generate Heatmap
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    
    # Check if conv_outputs is a list (rare but possible)
    if isinstance(conv_outputs, list):
        conv_outputs = conv_outputs[0]
        
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    # 7. Normalize
    heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
    return heatmap.numpy()

def save_and_display_gradcam(img, heatmap, alpha=0.4):
    """
    Overlays the heatmap on the original image.
    """
    # Rescale heatmap to a range 0-255
    heatmap = np.uint8(255 * heatmap)

    # Use jet colormap to colorize heatmap
    jet = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

    # Rescale heatmap to match original image size
    jet = cv2.resize(jet, (img.shape[1], img.shape[0]))

    # Convert to RGB
    jet = cv2.cvtColor(jet, cv2.COLOR_BGR2RGB)
    
    # Superimpose the heatmap on original image
    superimposed_img = jet * alpha + img
    superimposed_img = np.clip(superimposed_img, 0, 255).astype('uint8') # Ensure valid range

    return superimposed_img
# --- GLOBAL VARIABLES (To hold models) ---
models_cache = {}
preprocessors = {}

# --- 1. LIFESPAN (Load models when server starts) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[*] Loading AI Models... This might take a minute.")

    os.makedirs('models', exist_ok=True)
    MODEL_FILES = {
        'best_model.keras': '1nOs7aD_wCPY-R3fyBiMwJcdENiMNVVDh',
        'brain_tumor_vgg16_fixed.keras': '13pp49Hszgiqx8-NfPB0xqMP_Xr5IYG26',
        'chest_xray.pth': '168COiHHfYtASFR9tq74Ae3EkP1r1FHs8',
        'cnn_model_1.h5': '1SAoXWi5WkbEaJlgc0fpTWOJjj_YGCbif',
        'config.json': '1iUe2hPgUYxPlaxBRVjkCa37aDpIhHdcl',
        'lstm_model.h5': '1wQaojmsKZSHiIk99-cJX_nnINocuMRYm',
        'ml_artifacts.pkl': '1qddEuoarOLzYjTn2heNKmS6WszK6HiOm',
        'multibranch_model_1.h5': '14t5OXQb3vdAHHZKzbmHu7AJE4RSLk75R',
        'multibranch_model_1.keras': '1WvU1ajbfuH0eSmMVRfffVwJVwFkj9On5',
        'train.csv': '1F2I7CT2FUVxCBYv7kyuXvZUVOjgTFKNZ',
    }
    for filename, file_id in MODEL_FILES.items():
        filepath = os.path.join('models', filename)
        if not os.path.exists(filepath):
            print(f"[*] Downloading {filename} from Google Drive...", flush=True)
            gdown.download(f'https://drive.google.com/uc?id={file_id}', filepath, quiet=False)
        else:
            print(f"[OK] {filename} already exists locally.", flush=True)

    # A. LOAD CHEST MODEL (PyTorch)
    try:
        chest_model = models.resnet50(weights=None)
        chest_labels = [
            'Atelectasis',
            'Cardiomegaly',
            'Consolidation',
            'Edema',
            'Effusion',
            'Emphysema',
            'Fibrosis',
            'Hernia',
            'Infiltration',
            'Mass',
            'Nodule',
            'Pleural_Thickening',
            'Pneumonia',
            'Pneumothorax'
        ]
        chest_model.fc = nn.Linear(2048, len(chest_labels))
        
        # Load weights (Fixing keys as before)
        checkpoint = torch.load('models/chest_xray.pth', map_location='cpu', weights_only=False)
        state_dict = checkpoint.get('model_state_dict', checkpoint)
        new_state_dict = {}
        for k, v in state_dict.items():
            name = k.replace("module.", "").replace("base_model.", "").replace("backbone.", "").replace("fc.1.", "fc.")
            if "classifier" in name: name = name.replace("classifier", "fc")
            if "head" in name: name = name.replace("head", "fc")
            new_state_dict[name] = v
        
        chest_model.load_state_dict(new_state_dict, strict=False)
        chest_model.eval()
        models_cache['chest'] = chest_model
        models_cache['chest_labels'] = chest_labels
        print("[OK] Chest X-Ray Model Loaded")
    except Exception as e:
        print(f"[ERROR] Failed to load Chest Model: {e}")

    # B. LOAD BRAIN MODEL (Keras)
    try:
        models_cache['brain'] = load_model('models/brain_tumor_vgg16_fixed.keras')
        models_cache['brain_labels'] = {
            0: 'Glioma Tumor',
            1: 'Meningioma Tumor',
            2: 'No Tumor',
            3: 'Pituitary Tumor'
        }
        print("[OK] Brain Tumor Model Loaded")
    except Exception as e:
        print(f"[ERROR] Failed to load Brain Model: {e}")

    # C. LOAD EYE MODELS (Ensemble)
    try:
        models_cache['eye_multi'] = load_model('models/multibranch_model_1.h5')
        models_cache['eye_cnn'] = load_model('models/cnn_model_1.h5')
        models_cache['eye_labels'] = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR']
        print("[OK] Eye Disease Models Loaded")
    except Exception as e:
        print(f"[ERROR] Failed to load Eye Models: {e}")

    # D. LOAD SKIN MODEL + PREPROCESSORS (MobileNetV3)
    try:
        # Load Model
        models_cache['skin'] = load_model('models/best_model.keras', compile=False)
        
        # Load CSV for Encoders
        df = pd.read_csv('models/train.csv')
        df['sex'] = df['sex'].fillna('unknown')
        df['anatom_site_general_challenge'] = df['anatom_site_general_challenge'].fillna('unknown')
        df['age_approx'] = df['age_approx'].fillna(df['age_approx'].mean())
        
        # Fit Encoders
        ohe = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
        ohe.fit(df[['sex', 'anatom_site_general_challenge']])
        
        scaler = StandardScaler()
        scaler.fit(df[['age_approx']])
        
        preprocessors['skin_ohe'] = ohe
        preprocessors['skin_scaler'] = scaler
        preprocessors['skin_mean_age'] = df['age_approx'].mean()
        print("[OK] Skin Cancer Model & Preprocessors Loaded")
    except Exception as e:
        print(f"[ERROR] Failed to load Skin Model: {e}")

    # E. LOAD SEPSIS MODELS (LSTM + XGB + RF + Scaler + Config)
    import sys
    sepsis_path = 'models'

    # Custom Unpickler to handle sklearn 1.2 -> 1.7 tree node dtype change.
    try:
        _BaseUnpickler = pickle._Unpickler
    except AttributeError:
        _BaseUnpickler = pickle.Unpickler

    class _TreeCompatUnpickler(_BaseUnpickler):
        dispatch = _BaseUnpickler.dispatch.copy()
        def load_build(self):
            state = self.stack[-1]
            if isinstance(state, dict) and 'nodes' in state:
                na = state['nodes']
                if (isinstance(na, np.ndarray) and na.dtype.names is not None
                        and 'missing_go_to_left' not in na.dtype.names
                        and 'left_child' in na.dtype.names):
                    new_dt = np.dtype(list(na.dtype.descr) + [('missing_go_to_left', '|u1')])
                    new_na = np.zeros(na.shape, dtype=new_dt)
                    for n in na.dtype.names:
                        new_na[n] = na[n]
                    state['nodes'] = new_na
            return _BaseUnpickler.load_build(self)
        dispatch[ord('b')] = load_build

    try:
        with open(f'{sepsis_path}/ml_artifacts.pkl', 'rb') as f:
            artifacts = _TreeCompatUnpickler(f).load()
            models_cache['sepsis_xgb'] = artifacts.get('xgb')
            preprocessors['sepsis_scaler'] = artifacts.get('scaler')
            models_cache['sepsis_rf'] = artifacts.get('rf')
        print("[OK] Sepsis ML artifacts loaded (XGB + RF + Scaler)", flush=True)
    except Exception as e:
        print(f"[ERROR] Sepsis ML artifacts: {e}", flush=True)

    try:
        from keras.layers import LSTM as _KerasLSTM
        class _CompatLSTM(_KerasLSTM):
            def __init__(self, *args, **kwargs):
                kwargs.pop('time_major', None)
                super().__init__(*args, **kwargs)
        models_cache['sepsis_lstm'] = load_model(
            f'{sepsis_path}/lstm_model.h5',
            custom_objects={'LSTM': _CompatLSTM}
        )
        print("[OK] Sepsis LSTM loaded", flush=True)
    except Exception as e:
        print(f"[ERROR] Sepsis LSTM: {e}", flush=True)

    try:
        with open(f'{sepsis_path}/config.json', 'r') as f:
            models_cache['sepsis_config'] = json.load(f)
        print("[OK] Sepsis config loaded", flush=True)
    except Exception as e:
        print(f"[ERROR] Sepsis config: {e}", flush=True)

    yield
    print("[*] Shutting down AI Server")

# --- INITIALIZE APP ---
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- IN-MEMORY AUTH STORE ---
users_db: dict[str, dict] = {}
sessions_db: dict[str, str] = {}

SESSION_COOKIE = "medai_session"

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

class AuthBody(BaseModel):
    email: str
    password: str

@app.post("/api/auth/signup")
async def auth_signup(body: AuthBody):
    if body.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    users_db[body.email] = {
        "email": body.email,
        "password_hash": _hash_password(body.password),
    }
    token = secrets.token_hex(32)
    sessions_db[token] = body.email
    response = JSONResponse({"ok": True})
    response.set_cookie(
        key=SESSION_COOKIE, value=token, httponly=True,
        samesite="lax", max_age=86400,
    )
    return response

@app.post("/api/auth/login")
async def auth_login(body: AuthBody):
    user = users_db.get(body.email)
    if not user or user["password_hash"] != _hash_password(body.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = secrets.token_hex(32)
    sessions_db[token] = body.email
    response = JSONResponse({"ok": True})
    response.set_cookie(
        key=SESSION_COOKIE, value=token, httponly=True,
        samesite="lax", max_age=86400,
    )
    return response

@app.post("/api/auth/logout")
async def auth_logout(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        sessions_db.pop(token, None)
    response = JSONResponse({"ok": True})
    response.delete_cookie(key=SESSION_COOKIE)
    return response

@app.get("/api/auth/me")
async def auth_me(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    if not token or token not in sessions_db:
        raise HTTPException(status_code=401, detail="Not authenticated")
    email = sessions_db[token]
    return {"user": {"email": email}}

# --- UTILITIES ---
def read_imagefile(file) -> Image.Image:
    image = Image.open(io.BytesIO(file))
    return image.convert('RGB')

# --- ENDPOINT 1: CHEST X-RAY ---
# --- ENDPOINT 1: CHEST X-RAY (Upgraded with Enhancement Tools) ---
@app.post("/predict/chest")
async def predict_chest(file: UploadFile = File(...)):
    model = models_cache.get('chest')

    # 1. Read Image
    image = read_imagefile(await file.read())
    
    # 2. Preprocess for Model (PyTorch Standard)
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    img_tensor = transform(image).unsqueeze(0)
    
    # 3. Generate Visualizations (OpenCV)
    # Convert PIL -> OpenCV (BGR)
    img_cv = np.array(image)
    img_cv = cv2.cvtColor(img_cv, cv2.COLOR_RGB2BGR)
    img_cv = cv2.resize(img_cv, (224, 224))

    # A. CLAHE (Contrast Enhancement - "Bone View")
    # Work on the "Lightness" channel to avoid messing up colors (even though it's grayscale)
    lab = cv2.cvtColor(img_cv, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    merged = cv2.merge((cl, a, b))
    img_clahe = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)

    # B. Negative Mode (Inverted - Good for Masses)
    img_neg = cv2.bitwise_not(img_cv)

    # If the model is unavailable (files missing / failed load), return a safe fallback
    if model is None:
        print("[WARN] Chest model not loaded; returning fallback response")
        return {
            "module": "chest",
            "findings": [{"condition": "No Finding", "confidence": 0.0}],
            "warning": "Chest model unavailable on server (models/chest_xray.pth missing).",
            "images": {
                "original": encode_image(img_cv),
                "clahe": encode_image(img_clahe),
                "negative": encode_image(img_neg)
            }
        }

    # 4. Predict
    with torch.no_grad():
        out = model(img_tensor)
        probs = torch.sigmoid(out)[0].tolist()
    
    # 5. Format Results
    results = []
    labels = models_cache['chest_labels']
    
    # Define thresholds for reporting (only show if confidence > 20%)
    for i, score in enumerate(probs):
        confidence = round(score * 100, 2)
        if confidence > 20.0: 
            results.append({"condition": labels[i], "confidence": confidence})
            
    results.sort(key=lambda x: x['confidence'], reverse=True)
    
    # If nothing detected, return "Normal"
    if not results:
        results.append({"condition": "No Finding", "confidence": 99.0})

    return {
        "module": "chest",
        "findings": results,
        "images": {
            "original": encode_image(img_cv),
            "clahe": encode_image(img_clahe),
            "negative": encode_image(img_neg)
        }
    }

# --- ENDPOINT 2: BRAIN TUMOR ---
# --- ENDPOINT 2: BRAIN TUMOR (Upgraded with Heatmap & Contrast) ---
@app.post("/predict/brain")
async def predict_brain(file: UploadFile = File(...)):
    model = models_cache.get('brain')

    # 1. Read Image
    image = read_imagefile(await file.read())
    
    # 2. Preprocess for VGG16 (Resize to 150x150 as per your training)
    # We keep a copy of the original size for better visualization later
    img_viz = np.array(image)
    img_viz = cv2.cvtColor(img_viz, cv2.COLOR_RGB2BGR)
    
    # Resize for Model
    img_resized = image.resize((150, 150))
    img_array = np.array(img_resized) / 255.0
    img_batch = np.expand_dims(img_array, axis=0)
    
    # If Brain model isn't ready, return fallback response
    if model is None:
        print("[WARN] Brain model not loaded; returning fallback response")
        return {
            "module": "brain",
            "diagnosis": "No Tumor",
            "confidence": 0.0,
            "warning": "Brain model unavailable on server (models/brain_tumor_vgg16_fixed.keras missing).",
            "images": {
                "original": encode_image(img_viz),
                "contrast": encode_image(img_viz),
                "heatmap": None
            }
        }

    # 3. Predict
    pred = model.predict(img_batch, verbose=0)
    idx = np.argmax(pred)
    label = models_cache['brain_labels'].get(idx, "Unknown")
    conf = float(np.max(pred)) * 100
    
    # 4. Generate "High Contrast" Version (Histogram Equalization)
    # MRI scans are often dark; this makes the tumor pop out.
    img_yuv = cv2.cvtColor(img_viz, cv2.COLOR_BGR2YUV)
    img_yuv[:,:,0] = cv2.equalizeHist(img_yuv[:,:,0])
    img_contrast = cv2.cvtColor(img_yuv, cv2.COLOR_YUV2BGR)

    # 5. Generate Heatmap
    encoded_heatmap = None
    try:
        # Find the last Conv layer. For VGG16, it is usually 'block5_conv3'
        last_conv_layer_name = None
        for layer in reversed(model.layers):
            if 'Conv2D' in layer.__class__.__name__:
                last_conv_layer_name = layer.name
                break
        
        if last_conv_layer_name:
            # We resize the original image to 150x150 for the heatmap overlay to match model input
            heatmap = make_gradcam_heatmap(img_batch, model, last_conv_layer_name)
            
            # Upscale heatmap to original image size for better visuals
            viz_resized = cv2.resize(img_viz, (150, 150))
            gradcam_img = save_and_display_gradcam(viz_resized, heatmap)
            encoded_heatmap = encode_image(cv2.cvtColor(gradcam_img, cv2.COLOR_RGB2BGR))
    except Exception as e:
        print(f"[ERROR] Brain Heatmap Failed: {e}")

    # 6. Return Data
    return {
        "module": "brain", 
        "diagnosis": label, 
        "confidence": round(conf, 2),
        "images": {
            "original": encode_image(img_viz),
            "contrast": encode_image(img_contrast),
            "heatmap": encoded_heatmap
        }
    }
# --- ENDPOINT 3: EYE DISEASE (UPDATED WITH CLAHE VISUALIZATION) ---
# --- ENDPOINT 3: EYE DISEASE (Fixed Heatmap Logic) ---
@app.post("/predict/eye")
async def predict_eye(file: UploadFile = File(...)):
    m_multi = models_cache.get('eye_multi')
    m_cnn = models_cache.get('eye_cnn')

    # 1. Read & Preprocess
    image = read_imagefile(await file.read())
    img_np = np.array(image)
    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    img_resized = cv2.resize(img_bgr, (224, 224))
    
    # 2. Generate CLAHE (Enhanced View)
    lab = cv2.cvtColor(img_resized, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    merged = cv2.merge((cl, a, b))
    img_clahe_bgr = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    final_rgb = cv2.cvtColor(img_clahe_bgr, cv2.COLOR_BGR2RGB)
    
    # If the Eye models are not loaded, return fallback response
    if m_multi is None or m_cnn is None:
        print("[WARN] Eye models not loaded; returning fallback response")
        return {
            "module": "eye",
            "diagnosis": "No DR",
            "confidence": 0.0,
            "warning": "Eye models unavailable on server (models/multibranch_model_1.h5 or cnn_model_1.h5 missing).",
            "images": {
                "original": encode_image(img_resized),
                "clahe": encode_image(img_clahe_bgr),
                "heatmap": None
            }
        }

    # 3. Predict
    norm_img = final_rgb / 255.0
    img_batch = np.expand_dims(norm_img, axis=0)
    
    p1 = m_multi.predict(img_batch, verbose=0)
    p2 = m_cnn.predict(img_batch, verbose=0)
    ensemble = (0.7 * p1) + (0.3 * p2)
    
    idx = np.argmax(ensemble)
    label = models_cache['eye_labels'][idx]
    conf = float(np.max(ensemble)) * 100

    # 4. Generate REAL Grad-CAM Heatmap (ROBUST FIX)
    encoded_heatmap = None
    try:
        last_conv_layer_name = None
        
        # Iterate backwards to find the LAST layer that is a Convolution
        for layer in reversed(m_cnn.layers):
            # We check the class name string instead of output_shape to avoid errors
            if 'Conv2D' in layer.__class__.__name__:
                last_conv_layer_name = layer.name
                break
        
        if last_conv_layer_name:
            # print(f"[OK] Found Conv Layer: {last_conv_layer_name}")
            heatmap = make_gradcam_heatmap(img_batch, m_cnn, last_conv_layer_name)
            gradcam_img = save_and_display_gradcam(img_resized, heatmap)
            encoded_heatmap = encode_image(cv2.cvtColor(gradcam_img, cv2.COLOR_RGB2BGR))
        else:
            print("[ERROR] No Conv2D layer found in model architecture.")

    except Exception as e:
        print(f"[ERROR] Heatmap generation skipped: {e}")

    # 5. Return Results
    return {
        "module": "eye",
        "diagnosis": label,
        "confidence": round(conf, 2),
        "images": {
            "original": encode_image(img_resized),
            "clahe": encode_image(img_clahe_bgr),
            "heatmap": encoded_heatmap
        },
        "details": "CLAHE enhancement + Grad-CAM analysis applied."
    }

# --- ENDPOINT 4: SKIN CANCER (Multi-Input) ---
# --- ENDPOINT 4: SKIN CANCER (Upgraded with Hair Removal & Segmentation) ---
@app.post("/predict/skin")
async def predict_skin(
    file: UploadFile = File(...),
    age: int = Form(...),
    sex: str = Form(...),
    site: str = Form(...)
):
    model = models_cache.get('skin')
    ohe = preprocessors.get('skin_ohe')

    # 1. Read Image
    image = read_imagefile(await file.read())
    
    # Keep original size for visuals, but resize for processing
    img_viz = np.array(image)
    img_viz = cv2.cvtColor(img_viz, cv2.COLOR_RGB2BGR) # Convert to BGR
    
    # 2. FEATURE A: Digital Hair Removal (The "Cleaned View")
    # Grayscale -> BlackHat Transform -> Threshold -> Inpainting
    gray = cv2.cvtColor(img_viz, cv2.COLOR_BGR2GRAY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 17))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    _, thresh = cv2.threshold(blackhat, 10, 255, cv2.THRESH_BINARY)
    img_cleaned = cv2.inpaint(img_viz, thresh, 1, cv2.INPAINT_TELEA)

    # 3. FEATURE B: Lesion Segmentation (Contour Detection)
    # Convert cleaned image to grayscale -> Blur -> Otsu Threshold
    gray_clean = cv2.cvtColor(img_cleaned, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray_clean, (5, 5), 0)
    _, mask = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    img_segmented = img_cleaned.copy()
    if contours:
        # Draw the largest contour (the lesion) in Green
        largest_contour = max(contours, key=cv2.contourArea)
        cv2.drawContours(img_segmented, [largest_contour], -1, (0, 255, 0), 2)

    # If Skin model/preprocessors are missing, return fallback response
    if model is None or ohe is None:
        print("[WARN] Skin model/preprocessors not loaded; returning fallback response")
        return {
            "module": "skin",
            "diagnosis": "Benign",
            "malignancy_score": 0.0,
            "details": "Model unavailable; using fallback output.",
            "warning": "Skin model unavailable on server (models/best_model.keras or preprocessors missing).",
            "images": {
                "original": encode_image(img_viz),
                "cleaned": encode_image(img_cleaned),
                "segmented": encode_image(img_segmented)
            }
        }

    # 4. Prepare for AI Model
    img_model = cv2.resize(img_cleaned, (512, 512))
    img_model = cv2.cvtColor(img_model, cv2.COLOR_BGR2RGB)
    img_arr = np.array(img_model).astype(np.float32) / 255.0
    img_batch = np.expand_dims(img_arr, axis=0)
    
    # 5. Prepare Metadata
    mean_age = preprocessors['skin_mean_age']
    age_val = age if age > 0 else mean_age
    
    meta_df = pd.DataFrame({'sex': [sex], 'anatom_site_general_challenge': [site], 'age_approx': [age_val]})
    cat_enc = ohe.transform(meta_df[['sex', 'anatom_site_general_challenge']])
    num_scl = preprocessors['skin_scaler'].transform(meta_df[['age_approx']])
    meta_batch = np.hstack([cat_enc, num_scl])

    # 6. Predict
    pred = model.predict([img_batch, meta_batch], verbose=0)
    malignancy = float(pred[0][0])
    
    risk = "Malignant" if malignancy > 0.5 else "Benign"
    
    return {
        "module": "skin", 
        "diagnosis": risk, 
        "malignancy_score": round(malignancy * 100, 2),
        "details": "High Risk" if malignancy > 0.5 else "Low Risk",
        "images": {
            "original": encode_image(img_viz),
            "cleaned": encode_image(img_cleaned),   # No Hair
            "segmented": encode_image(img_segmented) # Green Outline
        }
    }

# --- ENDPOINT 5: SEPSIS DETECTION (Hybrid Ensemble) ---
class SepsisVitals(BaseModel):
    HR: float = 80.0
    O2Sat: float = 97.0
    Temp: float = 37.0
    SBP: float = 120.0
    MAP: float = 80.0
    Resp: float = 18.0
    Age: float = 60.0
    Gender: int = 0
    ICULOS: int = 1
    Platelets: Optional[float] = None
    Bilirubin_total: Optional[float] = None
    Creatinine: Optional[float] = None
    WBC: Optional[float] = None
    FiO2: Optional[float] = None
    pH: Optional[float] = None
    BUN: Optional[float] = None
    Lactate: Optional[float] = None
    HospAdmTime: Optional[float] = None

@app.post("/predict/sepsis")
async def predict_sepsis(vitals: SepsisVitals):
    lstm = models_cache.get('sepsis_lstm')
    xgb_model = models_cache.get('sepsis_xgb')
    rf_model = models_cache.get('sepsis_rf')
    scaler = preprocessors.get('sepsis_scaler')
    config = models_cache.get('sepsis_config')

    TRAINING_FEATURES = [
        'HR', 'O2Sat', 'Temp', 'SBP', 'MAP', 'DBP', 'Resp', 'EtCO2',
        'BaseExcess', 'HCO3', 'FiO2', 'pH', 'PaCO2', 'SaO2', 'AST', 'BUN',
        'Alkalinephos', 'Calcium', 'Chloride', 'Creatinine', 'Bilirubin_direct',
        'Glucose', 'Lactate', 'Magnesium', 'Phosphate', 'Potassium',
        'Bilirubin_total', 'TroponinI', 'Hct', 'Hgb', 'PTT', 'WBC',
        'Fibrinogen', 'Platelets', 'Age', 'Gender', 'Unit1', 'Unit2',
        'HospAdmTime', 'ICULOS',
    ]

    row = vitals.model_dump()
    full_row = {col: float(row.get(col, 0) or 0) for col in TRAINING_FEATURES}
    df = pd.DataFrame([full_row], columns=TRAINING_FEATURES)

    eps = 1e-6
    shock_index = float(df['HR'].iloc[0] / (df['SBP'].iloc[0] + eps))

    if lstm is None or xgb_model is None or scaler is None:
        return {
            "module": "sepsis",
            "risk_score": 0.0,
            "risk_level": "Low",
            "alarm": False,
            "shock_index": round(shock_index, 3),
            "warning": "Sepsis models unavailable on server.",
            "contributions": {"lstm": 0, "xgb": 0, "rf": 0},
        }

    # LSTM path: pad to lookback window, scale, predict
    data_array = df.values
    lookback = 50
    if data_array.shape[0] < lookback:
        pad = lookback - data_array.shape[0]
        data_array = np.pad(data_array, ((pad, 0), (0, 0)), mode='constant')

    try:
        scaled_data = scaler.transform(data_array)
    except ValueError:
        n_expected = scaler.n_features_in_
        n_have = data_array.shape[1]
        if n_have < n_expected:
            data_array = np.pad(data_array, ((0, 0), (0, n_expected - n_have)), mode='constant')
        else:
            data_array = data_array[:, :n_expected]
        scaled_data = scaler.transform(data_array)

    lstm_input = scaled_data.reshape(1, lookback, -1)
    p_lstm = float(lstm.predict(lstm_input, verbose=0)[0][0])

    # XGBoost + RF path: use the full 40-feature DataFrame directly
    try:
        p_xgb = float(xgb_model.predict_proba(df)[:, 1][0])
    except Exception:
        p_xgb = p_lstm

    p_rf = 0.0
    if rf_model is not None:
        try:
            p_rf = float(rf_model.predict_proba(df)[:, 1][0])
        except Exception:
            p_rf = 0.0

    if rf_model is not None:
        risk = (0.74 * p_lstm) + (0.05 * p_xgb) + (0.21 * p_rf)
    else:
        risk = (0.93 * p_lstm) + (0.07 * p_xgb)

    alarm = False
    pressure = 0.0
    if config:
        p = config
        slope = 0
        inflow = (p['w_risk'] * risk) + (p['w_slope'] * slope)
        if risk < 0.20:
            drain = p['drain_safe']
        elif shock_index > 0.85:
            drain = p['drain_danger']
        else:
            drain = (p['drain_safe'] + p['drain_danger']) / 2
        net_flow = max(inflow - drain, p['max_debt'])
        pressure = net_flow
        alarm = pressure > p.get('limit', 0.57)

    if risk > 0.65:
        risk_level = "Critical"
    elif risk > 0.40:
        risk_level = "High"
    elif risk > 0.20:
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    return {
        "module": "sepsis",
        "risk_score": round(risk * 100, 2),
        "risk_level": risk_level,
        "alarm": alarm,
        "pressure": round(pressure, 4),
        "shock_index": round(shock_index, 3),
        "contributions": {
            "lstm": round(p_lstm * 100, 2),
            "xgb": round(p_xgb * 100, 2),
            "rf": round(p_rf * 100, 2),
        },
    }

# --- UNIFIED ENDPOINT (Used by the React frontend) ---
@app.post("/api/analyze")
async def analyze(
    module: str = Form(None),
    image: UploadFile = File(None),
    age: Optional[str] = Form(None),
    sex: Optional[str] = Form(None),
    site: Optional[str] = Form(None),
    patientName: Optional[str] = Form(None),
):
    if module == 'chest':
        result = await predict_chest(file=image)
    elif module == 'brain':
        result = await predict_brain(file=image)
    elif module == 'eye':
        result = await predict_eye(file=image)
    elif module == 'skin':
        parsed_age = 45
        if age is not None:
            try:
                parsed_age = int(age)
            except (ValueError, TypeError):
                parsed_age = 45
        result = await predict_skin(
            file=image,
            age=parsed_age,
            sex=sex or 'unknown',
            site=site or 'unknown'
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unknown module: {module}")

    return {"data": result}

# Separate JSON endpoint for sepsis (no image upload needed)
@app.post("/api/analyze/sepsis")
async def analyze_sepsis(vitals: SepsisVitals):
    result = await predict_sepsis(vitals)
    return {"data": result}

# --- ROOT ---
@app.get("/")
def home():
    return {"status": "online", "message": "Universal Disease Predictor API is running."}
