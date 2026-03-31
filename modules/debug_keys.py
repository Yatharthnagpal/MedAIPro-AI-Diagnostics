import torch

print("--- DIAGNOSTIC START ---")

try:
    # 1. Load the file
    checkpoint = torch.load('models/chest_xray.pth', map_location='cpu', weights_only=False)
    
    # 2. Extract dictionary
    if 'model_state_dict' in checkpoint:
        state_dict = checkpoint['model_state_dict']
        print("FOUND: model_state_dict inside checkpoint.")
    else:
        state_dict = checkpoint
        print("INFO: Loaded dictionary directly.")

    # 3. Print the first 5 keys (To see the prefix)
    keys = list(state_dict.keys())
    print("\n--- FIRST 5 LAYER NAMES ---")
    for k in keys[:5]:
        print(f"{k}")

    # 4. Print the last 5 keys (To see the classifier name)
    print("\n--- LAST 5 LAYER NAMES ---")
    for k in keys[-5:]:
        print(f"{k}")
        
except Exception as e:
    print(f"ERROR: {e}")

print("--- DIAGNOSTIC END ---")