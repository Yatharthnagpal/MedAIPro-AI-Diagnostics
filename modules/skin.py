import streamlit as st
import tensorflow as tf
import pandas as pd
import numpy as np
from PIL import Image
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# --- 1. CONFIGURATION ---
IMG_SIZE = 512  # Updated to match your new code

# --- 2. SETUP PREPROCESSORS ---
@st.cache_resource
def get_preprocessors():
    """
    Fits the encoders exactly as done in your Kaggle training script.
    """
    try:
        # Load training data to learn the structure
        df = pd.read_csv('models/train.csv')
        
        # --- REPLICATE KAGGLE PREPROCESSING EXACTLY ---
        # 1. Fill NaNs (Matches your script)
        df['sex'] = df['sex'].fillna('unknown')
        df['anatom_site_general_challenge'] = df['anatom_site_general_challenge'].fillna('unknown')
        df['age_approx'] = df['age_approx'].fillna(df['age_approx'].mean())
        
        # 2. Fit Encoders
        categorical_features = ['sex', 'anatom_site_general_challenge']
        ohe = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
        ohe.fit(df[categorical_features])
        
        # 3. Fit Scaler
        numerical_features = ['age_approx']
        scaler = StandardScaler()
        scaler.fit(df[numerical_features])
        
        # Save mean age for fallback
        mean_age = df['age_approx'].mean()
        
        return ohe, scaler, mean_age
        
    except FileNotFoundError:
        st.error("❌ Critical Error: 'train.csv' not found in 'models/' folder.")
        return None, None, 0

# --- 3. MODEL LOADING ---
@st.cache_resource
def load_skin_model():
    # We load with compile=False to avoid errors with the custom 'focal_loss'
    # We only need the model for prediction, not training, so compiling isn't necessary.
    try:
        model = tf.keras.models.load_model('models/best_model.keras', compile=False)
        return model
    except Exception as e:
        st.error(f"Error loading model: {e}")
        return None

# --- 4. DATA PROCESSING ---
def preprocess_inputs(image, age, sex, site, ohe, scaler, mean_age):
    # --- A. Image Processing (Matches decode_image) ---
    image = image.convert('RGB')
    image = image.resize((IMG_SIZE, IMG_SIZE)) # 512x512
    img_array = np.array(image)
    
    # Normalize to [0, 1]
    img_array = img_array.astype(np.float32) / 255.0
    img_batch = np.expand_dims(img_array, axis=0) # (1, 512, 512, 3)
    
    # --- B. Metadata Processing (Matches process_metadata) ---
    # Create dataframe for input
    meta_df = pd.DataFrame({
        'sex': [sex],
        'anatom_site_general_challenge': [site],
        'age_approx': [age if age > 0 else mean_age]
    })
    
    # 1. Encode Categorical
    cat_encoded = ohe.transform(meta_df[['sex', 'anatom_site_general_challenge']])
    
    # 2. Scale Numerical
    num_scaled = scaler.transform(meta_df[['age_approx']])
    
    # 3. Concatenate (Matches tf.concat in your script)
    # Your script combined them: [sex_ohe, site_ohe, age_scaled]
    meta_batch = np.hstack([cat_encoded, num_scaled])
    
    return img_batch, meta_batch

# --- 5. MAIN APP ---
def run():
    st.title("🎗️ Melanoma Classification (MobileNetV3)")
    st.markdown("---")
    st.info("Advanced Dual-Input Model: Analyzes 512x512 Dermoscopy Images + Patient Metadata.")
    
    # Load Preprocessors
    ohe, scaler, mean_age = get_preprocessors()
    if not ohe:
        st.stop()
        
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("1. Patient Profile")
        # Options must match values in train.csv
        sex = st.selectbox("Sex", ["male", "female", "unknown"])
        age = st.number_input("Age", min_value=0, max_value=120, value=50)
        
        # These are the exact categories from the dataset
        site = st.selectbox("Anatomical Site", [
            "head/neck", 
            "upper extremity", 
            "lower extremity", 
            "torso", 
            "palms/soles", 
            "oral/genital",
            "unknown"
        ])

    with col2:
        st.subheader("2. Dermoscopy Scan")
        uploaded_file = st.file_uploader("Upload Image", type=['jpg', 'png', 'jpeg'])
        if uploaded_file:
            image = Image.open(uploaded_file)
            st.image(image, caption="Uploaded Scan", width=200)

    if st.button("Analyze Lesion"):
        if not uploaded_file:
            st.warning("⚠️ Please upload an image.")
            return

        with st.spinner("Processing Dual-Stream Data..."):
            model = load_skin_model()
            
            if model:
                # Prepare Inputs
                img_in, meta_in = preprocess_inputs(image, age, sex, site, ohe, scaler, mean_age)
                
                # Predict
                # The model expects a list: [image_input, metadata_input]
                prediction = model.predict([img_in, meta_in], verbose=0)
                
                # Output is a single probability (sigmoid)
                malignancy_prob = float(prediction[0][0])
                percent = malignancy_prob * 100
                
                # --- RESULTS ---
                st.markdown("---")
                st.subheader(" diagnostic Report")
                
                # Visualization
                col_a, col_b = st.columns([1, 2])
                with col_a:
                    st.metric("Malignancy Risk", f"{percent:.2f}%")
                
                with col_b:
                    # Color logic
                    if malignancy_prob > 0.5:
                        st.error("⚠️ **High Risk: MALIGNANT**")
                        st.write("The model detected patterns consistent with Melanoma.")
                    elif malignancy_prob > 0.2:
                         st.warning("🟠 **Medium Risk: SUSPICIOUS**")
                         st.write("Consultation recommended due to elevated risk score.")
                    else:
                        st.success("✅ **Low Risk: BENIGN**")
                        st.write("No significant malignant features detected.")
                    
                    st.progress(int(percent))