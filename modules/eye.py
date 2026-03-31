import streamlit as st
import tensorflow as tf
import cv2
import numpy as np
import matplotlib.pyplot as plt
from tensorflow.keras.models import load_model

# --- 1. CONFIGURATION ---
IMG_SIZE = 224
LABELS = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR']

# --- 2. MODEL LOADING ---
@st.cache_resource
def load_eye_models():
    # Load BOTH models for the ensemble
    try:
        model_multi = load_model('models/multibranch_model_1.h5')
        model_cnn = load_model('models/cnn_model_1.h5')
        return model_multi, model_cnn
    except Exception as e:
        st.error(f"Error loading models: {e}")
        return None, None

# --- 3. ADVANCED PREPROCESSING (CLAHE) ---
def preprocess_image(image):
    # Convert PIL to CV2 format
    image = np.array(image.convert('RGB')) 
    image = image[:, :, ::-1].copy() # Convert RGB to BGR for OpenCV
    
    # Resize
    image = cv2.resize(image, (IMG_SIZE, IMG_SIZE))
    
    # Convert to LAB
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to L-channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    
    # Merge and convert back to RGB
    merged_lab = cv2.merge((cl, a, b))
    final_image = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2RGB)
    
    # Normalize (0-1)
    norm_image = final_image / 255.0
    img_tensor = np.expand_dims(norm_image, axis=0)
    
    return img_tensor, final_image

# --- 4. EXPLAINABILITY (Saliency Maps) ---
def compute_saliency_map(model, img_tensor):
    img_tensor = tf.convert_to_tensor(img_tensor, dtype=tf.float32)
    
    with tf.GradientTape() as tape:
        tape.watch(img_tensor)
        predictions = model(img_tensor)
        top_pred_index = tf.argmax(predictions[0])
        top_class_score = predictions[0, top_pred_index]

    # Get gradients
    grads = tape.gradient(top_class_score, img_tensor)
    
    # Process gradients (Max across channels)
    dgrad_abs = tf.math.abs(grads)
    dgrad_max_ = np.max(dgrad_abs, axis=-1)[0]
    
    # Normalize between 0 and 1 for visualization
    arr_min, arr_max = np.min(dgrad_max_), np.max(dgrad_max_)
    saliency_map = (dgrad_max_ - arr_min) / (arr_max - arr_min + 1e-18)
    
    return saliency_map

def plot_saliency(original_img, saliency_map, title):
    fig, ax = plt.subplots(1, 1, figsize=(5, 5))
    ax.imshow(original_img)
    ax.imshow(saliency_map, cmap='jet', alpha=0.5) # Overlay heatmap
    ax.axis('off')
    ax.set_title(title)
    return fig

# --- 5. MAIN APP ---
def run():
    st.title("👁️ Advanced Diabetic Retinopathy Detection")
    st.markdown("---")
    st.info("Using **Ensemble Learning** (Multi-Branch + CNN) & **Saliency Maps** for explainability.")
    
    uploaded_file = st.file_uploader("Upload Retinal Fundus Image", type=['png', 'jpg', 'jpeg'])
    
    if uploaded_file:
        image = st.image(uploaded_file, caption="Uploaded Scan", width=300)
        
        if st.button("Analyze Retina"):
            with st.spinner("Applying CLAHE & Computing Ensemble Predictions..."):
                # 1. Load Models
                model_multi, model_cnn = load_eye_models()
                
                if model_multi and model_cnn:
                    # 2. Preprocess
                    from PIL import Image
                    pil_image = Image.open(uploaded_file)
                    input_tensor, processed_img = preprocess_image(pil_image)
                    
                    # 3. Get Predictions
                    pred_multi = model_multi.predict(input_tensor, verbose=0)
                    pred_cnn = model_cnn.predict(input_tensor, verbose=0)
                    
                    # 4. Ensemble Logic (0.7 * Multi + 0.3 * CNN)
                    ensemble_pred = (0.7 * pred_multi) + (0.3 * pred_cnn)
                    final_class = np.argmax(ensemble_pred)
                    confidence = np.max(ensemble_pred) * 100
                    diagnosis = LABELS[final_class]
                    
                    # 5. Display Diagnosis
                    st.success(f"**Diagnosis:** {diagnosis}")
                    st.write(f"**Confidence:** {confidence:.2f}%")
                    st.progress(int(confidence))
                    
                    # 6. EXPLAINABILITY SECTION
                    st.markdown("---")
                    st.subheader("🧠 Explainable AI (XAI) Report")
                    st.write("These maps show exactly which part of the eye the AI focused on to make its decision.")
                    
                    tab1, tab2 = st.tabs(["🔍 CLAHE Enhanced View", "🔥 Saliency Heatmaps"])
                    
                    with tab1:
                        col1, col2 = st.columns(2)
                        col1.image(pil_image, caption="Original Raw Image", use_column_width=True)
                        col2.image(processed_img, caption="CLAHE Enhanced (AI Input)", use_column_width=True)
                        st.caption("CLAHE (Contrast Limited Adaptive Histogram Equalization) helps the AI see blood vessels more clearly.")

                    with tab2:
                        st.write("Red areas indicate the 'hotspots' (hemorrhages or lesions) the model detected.")
                        
                        # Compute Saliency
                        saliency_multi = compute_saliency_map(model_multi, input_tensor)
                        saliency_cnn = compute_saliency_map(model_cnn, input_tensor)
                        
                        col1, col2 = st.columns(2)
                        
                        with col1:
                            fig1 = plot_saliency(processed_img, saliency_multi, "Multi-Branch Focus")
                            st.pyplot(fig1)
                            
                        with col2:
                            fig2 = plot_saliency(processed_img, saliency_cnn, "CNN Focus")
                            st.pyplot(fig2)