import torch

# Load the file
try:
    state_dict = torch.load('models/chest_xray.pth', map_location='cpu', weights_only=False)
    
    print("\n--- LAYERS FOUND IN FILE ---")
    keys = list(state_dict.keys())
    
    # Print first few to identify backbone
    for k in keys[:5]:
        print(f"Layer: {k}")
        
    # Print the FINAL layers (The most important part)
    print("\n--- FINAL LAYERS (Classifier) ---")
    for k in keys[-4:]:
        print(f"Layer: {k}")
        
except Exception as e:
    print(f"Error: {e}")