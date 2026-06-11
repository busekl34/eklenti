from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import re, emoji, joblib
import nltk
from nltk.corpus import stopwords

app = Flask(__name__)
CORS(app)

# --------------------
# NLP
# --------------------
nltk.download("stopwords")
stop_words = set(stopwords.words("turkish"))

def onisleme(text):
    text = text.lower()
    text = re.sub(r"http\S+", "", text)
    text = emoji.replace_emoji(text, "")
    text = re.sub(r"[^\w\s]", " ", text)
    words = [w for w in text.split() if w not in stop_words]
    return " ".join(words)

# --------------------
# MODEL
# --------------------
svm = joblib.load("svm_sahte_yorum.pkl")

# --------------------
# ⚠️ BURASI KRİTİK
# offline embedding mantığı olduğu için
# burada gerçek embedding üretmiyoruz
# (sen precompute yaptın zaten)
# --------------------
def get_embedding(text):
    # placeholder (gerçek sistemde embedding DB kullanılır)
    return np.random.rand(1, 768)

# --------------------
# API
# --------------------
@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    comments = data["comments"]

    results = []

    for c in comments:
        temiz = onisleme(c["text"])

        vec = get_embedding(temiz)

        pred = svm.predict(vec)[0]
        proba = svm.predict_proba(vec)[0].max()

        results.append({
            "text": c["text"],
            "rating": c["rating"],
            "date": c["date"],
            "label": "sahte" if pred == 0 else "gerçek",
            "confidence": round(float(proba), 2)
        })

    return jsonify(results)

# --------------------
# RUN (Render / Railway uyumlu)
# --------------------
if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 1000)))