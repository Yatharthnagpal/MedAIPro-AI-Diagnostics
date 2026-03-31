# File: app.py
import streamlit as st
from modules import brain, eye, skin, chest

# --- PAGE CONFIGURATION ---
st.set_page_config(
    page_title="MediScan AI",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- SIDEBAR ---
st.sidebar.title("🏥 MediScan AI")
st.sidebar.write("Universal Disease Prediction System")

# Add "Home" to the menu
menu = ["Home", "Brain Tumor (MRI)", "Eye Disease", "Skin Cancer", "Chest X-Ray"]
selection = st.sidebar.radio("Select Module:", menu)

st.sidebar.markdown("---")
st.sidebar.info("© 2026 Capstone Project\n\n**System Status:**\n🟢 Brain: Active\n🟢 Eye: Active\n🟢 Skin: Active\n🟡 Chest: Maintenance")

# --- MAIN PAGE LOGIC ---
if selection == "Home":
    st.title("Welcome to MediScan AI 👋")
    st.markdown("### Advanced Medical Diagnostics Powered by Deep Learning")
    st.markdown("---")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.write("""
        **MediScan AI** assists medical professionals by providing rapid, AI-driven analysis 
        of medical imaging. Our multi-modal system covers four critical areas:
        
        * 🧠 **Neurology:** Detection of Glioma, Meningioma, and Pituitary tumors.
        * 👁️ **Ophthalmology:** Diabetic Retinopathy screening with CLAHE enhancement.
        * 🎗️ **Dermatology:** Melanoma detection using high-res analysis.
        * 🫁 **Pulmonology:** (Coming Soon) Thoracic pathology identification.
        """)
        
        st.info("👈 **Select a module from the sidebar to begin analysis.**")
    
    with col2:
        # You can add a logo or generic medical image here if you have one
        st.image("https://cdn-icons-png.flaticon.com/512/3063/3063176.png", width=200)

elif selection == "Brain Tumor (MRI)":
    brain.run()

elif selection == "Eye Disease":
    eye.run()

elif selection == "Skin Cancer":
    skin.run()

elif selection == "Chest X-Ray":
    chest.run()