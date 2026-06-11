import numpy as np
import re
import emoji
import nltk
import torch
import joblib

from nltk.corpus import stopwords
from transformers import AutoTokenizer, AutoModel

# --------------------
# STOPWORDS
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
# BERT MODEL (1 KEZ YÜKLENİR)
# --------------------
print("BERT yükleniyor...")

tokenizer = AutoTokenizer.from_pretrained("dbmdz/bert-base-turkish-uncased")
bert = AutoModel.from_pretrained("dbmdz/bert-base-turkish-uncased")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
bert.to(device)

def bert_vec(text):
    enc = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True
    )

    enc = {k: v.to(device) for k, v in enc.items()}

    with torch.no_grad():
        out = bert(**enc)

    # mean pooling
    vec = torch.mean(out.last_hidden_state, dim=1)

    return vec.cpu().numpy().flatten()

# --------------------
# VERİ SETİ (BURAYI KENDİ VERİNLE DEĞİŞTİR)
# --------------------
# ÖRNEK FORMAT:
# texts = [...]
# labels = [...]

texts = [
    "ürün çok güzel",
    "berbat hizmet",
    "harika gerçekten",
    "kesinlikle tavsiye ederim",
    "çok kötü bir deneyimdi"
]

labels = [
    1,
    0,
    1,
    1,
    0
]

# --------------------
# EMBEDDING OLUŞTURMA
# --------------------
print("Embeddingler oluşturuluyor...")

embeddings = []

for i, text in enumerate(texts):
    temiz = onisleme(text)
    vec = bert_vec(temiz)
    embeddings.append(vec)

    print(f"{i+1}/{len(texts)} işlendi")

embeddings = np.array(embeddings)

# --------------------
# KAYDET
# --------------------
np.save("embeddings.npy", embeddings)
np.save("labels.npy", labels)

print("✔ Embeddingler ve label'lar kaydedildi!")

# --------------------
# OPSİYONEL: SVM EĞİTİMİ
# --------------------
from sklearn.svm import SVC

print("SVM eğitiliyor...")

svm = SVC(probability=True)
svm.fit(embeddings, labels)

joblib.dump(svm, "svm_sahte_yorum.pkl")

print("✔ SVM kaydedildi!")