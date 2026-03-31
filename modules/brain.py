import streamlit as st
import tensorflow as tf
import numpy as np
from PIL import Image

# --- 1. CONFIGURATION ---
# These match the exact order from your successful training run
# keys = exact output from model, values = nice display names
CLASS_MAP = {
    0: 'Glioma Tumor',      # 'glioma'
    1: 'Meningioma Tumor',  # 'meningioma'
    2: 'No Tumor',          # 'notumor'
    3: 'Pituitary Tumor'    # 'pituitary'
}

@st.cache_resource
def load_brain_model():
    # Load the new VGG16 model you trained on Kaggle
    model = tf.keras.models.load_model('models/brain_tumor_vgg16_fixed.keras')
    return model

def preprocess_image(image):
    """
    Matches your training code exactly:
    1. Convert to RGB
    2. Resize to 150x150
    3. Normalize (0 to 1)
    """
    image = image.convert('RGB')
    image = image.resize((150, 150)) # Matches IMG_SIZE = (150, 150)
    
    img_array = np.array(image)
    
    # NORMALIZATION: Matches rescale=1./255 from your training
    img_array = img_array / 255.0  
    
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

def run():
    st.title("🧠 Brain Tumor MRI Analysis")
    st.markdown("---")
    st.info("Upload MRI scans. The AI will detect Glioma, Meningioma, Pituitary tumors, or Healthy brains.")
    
    # Allow multiple files
    uploaded_files = st.file_uploader("Upload MRI Scans", 
                                      type=['jpg', 'png', 'jpeg'], 
                                      accept_multiple_files=True)
    
    if uploaded_files:
        st.write(f"📂 **Analyzing {len(uploaded_files)} scans...**")
        
        # Load Model
        try:
            model = load_brain_model()
        except Exception as e:
            st.error(f"Error loading model: {e}")
            st.stop()
        
        # Create tabs for organization
        tab1, tab2 = st.tabs(["🖼️ Gallery View", "📋 List View"])
        
        results = []
        
        # Process all images
        progress_bar = st.progress(0)
        for i, file in enumerate(uploaded_files):
            # Preprocess
            image = Image.open(file)
            processed_img = preprocess_image(image)
            
            # Predict
            pred_probs = model.predict(processed_img, verbose=0)
            
            # Get Result
            pred_index = np.argmax(pred_probs)
            pred_label = CLASS_MAP.get(pred_index, "Unknown")
            confidence = np.max(pred_probs) * 100
            
            # Store for display
            results.append({
                "image": image,
                "filename": file.name,
                "prediction": pred_label,
                "confidence": confidence,
                "probs": pred_probs[0]
            })
            
            progress_bar.progress((i + 1) / len(uploaded_files))
            
        # --- DISPLAY RESULTS ---
        
        with tab1:
            # Group by prediction
            unique_labels = list(CLASS_MAP.values())
            for category in unique_labels:
                # Find all images that match this category
                category_images = [r for r in results if r['prediction'] == category]
                
                if category_images:
                    with st.expander(f"**{category}** ({len(category_images)})", expanded=True):
                        cols = st.columns(4)
                        for idx, item in enumerate(category_images):
                            with cols[idx % 4]:
                                st.image(item['image'], use_column_width=True)
                                
                                # Color logic: Green for No Tumor, Red for Tumors
                                color = "green" if category == "No Tumor" else "red"
                                st.markdown(f":{color}[**{item['prediction']}**]")
                                st.caption(f"Conf: {item['confidence']:.1f}%")

        with tab2:
            # Detailed Table
            for item in results:
                col1, col2 = st.columns([1, 4])
                with col1:
                    st.image(item['image'], width=100)
                with col2:
                    st.subheader(item['filename'])
                    st.write(f"**Diagnosis:** {item['prediction']}")
                    st.progress(int(item['confidence']))
                    
                    # Show raw probabilities if confused
                    if item['confidence'] < 60:
                        st.warning("⚠️ Low confidence. Check probabilities below.")
                        st.write(item['probs'])