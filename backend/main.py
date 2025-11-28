import os
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware  # <--- Added this
from PIL import Image, ImageOps
import io
import tensorflow as tf

app = FastAPI()

# --- 1. ENABLE CORS (Connects Frontend to Backend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows your HTML file to talk to this API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. SETUP PATHS ---
base_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_dir, 'model', 'keras_model.h5')
labels_path = os.path.join(base_dir, 'model', 'labels.txt')

# --- 3. LOAD MODEL & LABELS ---
print(f"Loading model from: {model_path}...")
model = tf.keras.models.load_model(model_path, compile=False)

print(f"Loading labels from: {labels_path}...")
with open(labels_path, "r") as f:
    class_names = [line.strip() for line in f.readlines()]

print("Server is ready!")

# --- 4. IMAGE HELPER FUNCTION ---
def process_image(image_data):
    image = Image.open(io.BytesIO(image_data)).convert("RGB")
    size = (224, 224)
    image = ImageOps.fit(image, size, Image.Resampling.LANCZOS)
    image_array = np.asarray(image)
    normalized_image_array = (image_array.astype(np.float32) / 127.5) - 1
    data = np.ndarray(shape=(1, 224, 224, 3), dtype=np.float32)
    data[0] = normalized_image_array
    return data

# --- 5. API ENDPOINT ---
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    data = process_image(contents)
    prediction = model.predict(data)
    index = np.argmax(prediction)
    confidence = float(prediction[0][index])
    
    raw_label = class_names[index]
    
    # Clean the label (e.g., "0 busuk" -> "busuk")
    if " " in raw_label:
        label_text = raw_label.split(" ", 1)[1]
    else:
        label_text = raw_label

    return {
        "label": label_text,
        "confidence": confidence,
        "index": int(index)
    }

@app.get("/")
def home():
    return {"message": "FreshCheck API is online!"}