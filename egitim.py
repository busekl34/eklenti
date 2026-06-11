
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import re
import torch
from transformers import AutoTokenizer, AutoModel
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import nltk
from nltk.corpus import stopwords
import emoji
from collections import Counter

# ============================
# FLASK
# ============================
app = Flask(__name__)
CORS(app)

# ============================
# STOPWORDS
# ============================
nltk.download('stopwords')
stop_words = set(stopwords.words('turkish'))

# ============================
# METİN ÖNİŞLEME
# ============================
def onisleme_fonk(text):
    if not isinstance(text, str):
        return ""

    text = text.lower()
    text = re.sub(r"http\S+|www\S+|https\S+", "", text)
    text = emoji.replace_emoji(text, replace='')
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\d+", "", text)
    text = re.sub(r"(.)\1{2,}", r"\1", text)

    words = text.split()
    words = [w for w in words if w not in stop_words]
    return " ".join(words)

# ============================
# CSV
# ============================
csv_path = r"C:\Users\busek\OneDrive\Masaüstü\trendyol-fake-review\backend\proje_trendyol_veri_seti.csv"
df = pd.read_csv(csv_path)
df = df.dropna(subset=["yorum", "etiket"])
df["temizlenmis_yorum"] = df["yorum"].apply(onisleme_fonk)

# ============================
# BERT
# ============================
model_name = "dbmdz/bert-base-turkish-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
bert_model = AutoModel.from_pretrained(model_name)

def bert_vektor(metin):
    if not metin.strip():
        return torch.zeros(768)

    encoded = tokenizer(
        metin,
        padding="max_length",
        truncation=True,
        max_length=128,
        return_tensors="pt"
    )

    with torch.no_grad():
        output = bert_model(**encoded)

    return torch.mean(output.last_hidden_state, dim=1).squeeze()

# ============================
# EMBEDDING
# ============================
df["bert_vec"] = df["temizlenmis_yorum"].apply(bert_vektor)
X = np.vstack(df["bert_vec"].apply(lambda x: x.numpy()).values)
y = df["etiket"].map({"sahte": 0, "normal": 1})

# ============================
# MODEL
# ============================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model_svm = SVC(kernel="rbf", probability=True)
model_svm.fit(X_train, y_train)

print("Doğruluk:", accuracy_score(y_test, model_svm.predict(X_test)))
print(confusion_matrix(y_test, model_svm.predict(X_test)))
print(classification_report(y_test, model_svm.predict(X_test)))

# ============================
# MODEL KAYDETME
# ============================
joblib.dump(model_svm, "svm_model.pkl")

print("✅ SVM modeli kaydedildi")
