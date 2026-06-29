from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import re, emoji, torch
import nltk
from nltk.corpus import stopwords
from transformers import AutoTokenizer, AutoModel
import joblib

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
# BERT
# --------------------
tokenizer = AutoTokenizer.from_pretrained("dbmdz/bert-base-turkish-uncased")
bert = AutoModel.from_pretrained("dbmdz/bert-base-turkish-uncased")

def bert_vec(text):
    enc = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        out = bert(**enc)
    return torch.mean(out.last_hidden_state, dim=1).numpy()

# --------------------
# MODEL
# --------------------
svm = joblib.load("svm_sahte_yorum.pkl")

# --------------------
# API
# --------------------


@app.route("/")
def home():
    return "API çalışıyor."



@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    comments = data["comments"]

    results = []

    for c in comments:
        temiz = onisleme(c["text"])
        vec = bert_vec(temiz)
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

import os

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000))
    )
