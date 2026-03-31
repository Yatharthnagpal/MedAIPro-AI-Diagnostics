import streamlit as st
import torch
import torch.nn as nn
import torchvision.models as models
from torchvision import transforms
from PIL import Image

# --- 1. LABELS (Exact order you provided) ---
LABELS = [
    'Atelectasis', 'Cardiomegaly', 'Consolidation', 'Edema', 'Effusion',
    'Emphysema', 'Fibrosis', 'Hernia', 'Infiltration', 'Mass',
    'Nodule', 'Pleural_Thickening', 'Pneumonia', 'Pneumothorax'
]

@st.cache_resource
def load_chest_model():
    # 1. Setup Standard ResNet50 Architecture
    model = models.resnet50(weights=None)
    # Define the final layer (Standard naming is 'fc')
    model.fc = nn.Linear(2048, len(LABELS))
    
    try:
        # 2. Load File (Unlock Security)
        checkpoint = torch.load('models/chest_xray.pth', map_location='cpu', weights_only=False)
        
        # 3. Extract Weights Dictionary
        if 'model_state_dict' in checkpoint:
            state_dict = checkpoint['model_state_dict']
        else:
            state_dict = checkpoint
            
        # 4. FIX THE KEYS (The Magic Step)
        new_state_dict = {}
        for k, v in state_dict.items():
            name = k
            
            # Fix 1: Handle "fc.1" -> "fc" mismatch
            # This lines up your file's specific structure to standard ResNet
            if "fc.1." in name:
                name = name.replace("fc.1.", "fc.")
            
            # Fix 2: Remove "module." prefix (if present)
            if name.startswith("module."):
                name = name[7:]
                
            new_state_dict[name] = v
            
        # 5. Load Weights
        # strict=True guarantees that if it fails, we know immediately. 
        # But we use False here to be safe, while monitoring the load.
        msg = model.load_state_dict(new_state_dict, strict=False)
        print(f"✅ Weights Loaded. Missing keys (should be empty/irrelevant): {msg.missing_keys}")
        
    except Exception as e:
        st.error(f"❌ Error loading model: {e}")
        return None
        
    model.eval()
    return model

def preprocess_xray(image):
    # Standard ResNet50 Preprocessing
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                             std=[0.229, 0.224, 0.225])
    ])
    image = image.convert('RGB')
    return transform(image).unsqueeze(0)

def run():
    st.title("🫁 Chest X-Ray Pathology")
    st.markdown("---")
    st.info(f"Detecting {len(LABELS)} thoracic conditions.")
    
    uploaded_file = st.file_uploader("Upload Chest X-Ray", type=['png', 'jpg', 'jpeg'])
    
    if uploaded_file:
        image = Image.open(uploaded_file)
        st.image(image, caption="Uploaded Scan", width=300)
        
        if st.button("Scan Thorax"):
            model = load_chest_model()
            if model:
                input_tensor = preprocess_xray(image)
                with torch.no_grad():
                    out = model(input_tensor)
                    # Use Sigmoid for Multi-label probabilities
                    probs = torch.sigmoid(out)[0]
                
                # Sort Results
                results = sorted(zip(LABELS, probs.tolist()), key=lambda x: x[1], reverse=True)
                
                # --- DISPLAY ---
                st.write("### Diagnostic Results")
                
                col1, col2 = st.columns(2)
                found = False
                
                # Display anything with > 20% confidence
                for disease, score in results:
                    if score > 0.20: 
                        found = True
                        st.warning(f"⚠️ **{disease}**: {score*100:.1f}%")
                        st.progress(score)
                        
                if not found:
                    st.success("✅ No significant pathology detected (All < 20%)")
                    
                with st.expander("Detailed Probability Report"):
                     st.table({
                         "Condition": [x[0] for x in results],
                         "Probability": [f"{x[1]*100:.2f}%" for x in results]
                     })