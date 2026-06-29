if (!document.getElementById("analiz-stilleri")) {
    const style = document.createElement('style');
    style.id = "analiz-stilleri";
    style.innerHTML = `
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .loader-spinner {
        width: 60px; height: 60px;
        border: 6px solid #f3f3f3;
        border-top: 6px solid #e9913a;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 20px auto;
      }
      .loading-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(255,255,255,0.98);
        z-index: 100000; display: flex; flex-direction: column;
        justify-content: center; align-items: center;
        font-family: Arial, sans-serif;
      }
    `;
    document.head.appendChild(style);
}
// =====================
// 📊 Grafik Fonksiyonları
// =====================
function drawPieChart(ctx, fake, real) {
    const total = fake + real || 1;
    const fakeAngle = (fake / total) * 2 * Math.PI;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Sahte
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, 0, fakeAngle || 0.01);
    ctx.fillStyle = "#FF4C4C";
    ctx.fill();
    
    // Gerçek
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, fakeAngle || 0.01, 2 * Math.PI);
    ctx.fillStyle = "#3deb8e";
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`%${((fake/total)*100).toFixed(1)} Şüpheli Oran ⚠️`, centerX, centerY + radius + 15);
}

function getWordFrequency(textArray) {
    const freq = {};
    textArray.forEach(t => {
        t.split(/\s+/).forEach(w => {
            if (w.length > 3) freq[w] = (freq[w] || 0) + 1;
        });
    });
    return freq;
}

async function analizEt(limit = 300) {

    const sidebar = document.getElementById("yorumSidebar");
 // 1. Ekranı kilitlemek yerine sadece Sidebar'ı güncelle
    sidebar.innerHTML = `
    <div style="
        text-align:center; 
        padding: 24px 16px; 
        font-family: 'Inter', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
    ">
        <div style="position: relative; margin-bottom: 25px;">
            <div class="loader-spinner" style="width: 60px; height: 60px; border-width: 5px;"></div>
            <div style="
                position: absolute; 
                top: 50%; left: 50%; 
                transform: translate(-50%, -50%);
                font-size: 20px;
            ">🔍</div>
        </div>
        <h3 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 20px; font-weight: 800;">Analiz Yapılıyor</h3>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
            Yapay zeka yorumları derinlemesine inceliyor. <br>Lütfen tarayıcıyı kapatmayın.
        </p>
        <div style="
            background: #fff8f1;
            border: 1px solid #fee2e2;
            border-radius: 20px;
            padding: 15px 30px;
            margin-bottom: 25px;
            box-shadow: 0 4px 12px rgba(233, 145, 58, 0.08);
        ">
            <div style="font-size: 11px; color: #e9913a; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">
                Taranan Veri
            </div>
            <div id="counter" style="font-weight: 900; font-size: 34px; color: #e9913a; letter-spacing: -1px;">
                0 / ${limit}
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 30px;">
            <span style="display: inline-block; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse 1.5s infinite;"></span>
            <span id="status-text" style="font-size: 12px; color: #475569; font-weight: 600;">Yeni yorumlar aranıyor...</span>
        </div>
        <div style="
            margin-top: auto;
            padding-top: 20px;
            border-top: 1px solid #f1f5f9;
            width: 100%;
        ">
            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Öneri ve görüşleriniz için:</p>
            <a href="mailto:buself.021@gmail.com" style="
                font-size: 12px; 
                color: #e9913a; 
                text-decoration: none; 
                font-weight: 700;
                transition: opacity 0.2s;
            ">buself.021@gmail.com</a>
        </div>
    </div>
`;
  let collected = [];
  let lastHeight = document.body.scrollHeight;
    let attempts = 0;
  try {
    // 2. Veri Toplama Döngüsü
   while (collected.length < limit && attempts < 15) {
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(r => setTimeout(r, 1200));
            const reviews = document.querySelectorAll(".rnr-com-w, .review, .comment");
            reviews.forEach(r => {
                const text = r.querySelector(".rnr-com-tx, .review-comment, .comment-text")?.innerText || "";
                if (text.length > 10 && !collected.some(c => c.text === text)) {
                    collected.push({ text, rating: 5, date: null });
                }

            });
           // Sidebar içindeki sayacı güncelle
            const counterEl = document.getElementById("counter");
            if (counterEl) counterEl.innerText = `${Math.min(collected.length, limit)} / ${limit}`;
            if (document.body.scrollHeight === lastHeight) attempts++;
            else attempts = 0;
            lastHeight = document.body.scrollHeight;
        }
        // 3. API İsteği Aşaması
     sidebar.innerHTML = `
    <div style="
        text-align: center; 
        padding: 30px 20px; 
        font-family: 'Inter', sans-serif;
        background: linear-gradient(180deg, #fff 0%, #fffbf5 100%);
        border-radius: 25px;
    ">
        <div style="position: relative; display: inline-block; margin-bottom: 20px;">
            <div class="loader-spinner" style="
                width: 70px; height: 70px; 
                border-width: 3px; 
                border-top-color: #e9913a;
                border-right-color: transparent;
            "></div>
            <div style="
                position: absolute; 
                top: 50%; left: 50%; 
                transform: translate(-50%, -50%);
                font-size: 32px;
                animation: pulse 2s infinite;
            ">🤖</div>
        </div>
        <h3 style="
            color: #e9913a; 
            margin: 0 0 10px 0; 
            font-size: 18px; 
            font-weight: 800;
            line-height: 1.4;
        ">
            Merhaba! Ben Akıllı Alışveriş Asistanınız
        </h3>
        <p style="
            color: #475569; 
            font-size: 14px; 
            font-weight: 500;
            margin-bottom: 25px;
            line-height: 1.6;
        ">
            Sizin için yorumlardaki samimiyeti ve <br>
            <span style="color: #e9913a; font-weight: 700;">gerçek kullanıcı deneyimlerini</span> inceliyorum.
        </p>
        <div style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #ffffff;
            padding: 10px 20px;
            border-radius: 50px;
            box-shadow: 0 4px 15px rgba(233, 145, 58, 0.12);
            border: 1px solid #ffedd5;
        ">
            <span style="font-size: 16px;">📝</span>
            <span style="
                font-size: 13px; 
                color: #1e293b; 
                font-weight: 700;
            ">
                İncelenen Yorum: <span style="color: #e9913a; font-size: 15px;">${collected.length}</span>
            </span>
        </div>
        <p style="
            margin-top: 25px; 
            font-size: 11px; 
            color: #94a3b8; 
            font-style: italic;
        ">
            Analiz bitmek üzere, lütfen ayrılmayın...
        </p>
    </div>
`;
     const res = await fetch("https://eklenti.onrender.com/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comments: collected.slice(0, limit) })
        });
        const data = await res.json();
  // 4. Sonuçları Dashboard'a Bas (Eski dashboard fonksiyonun)
        renderDashboard(data); 
    } catch (err) {
        sidebar.innerHTML = `<div style="color:red; text-align:center; padding:20px;">❌ Hata: Python sunucusu kapalı!</div>`;
        console.error(err);
    }

}
// =====================
// 📊 Dashboard Oluşturma
// =====================
function renderDashboard(data) {
    const sidebar = document.getElementById("yorumSidebar");
    sidebar.style.top = "0px"; // Boşluğu sıfıra çeker
    sidebar.style.right = "0px"; // Sağ köşeye tam yaslar
    sidebar.style.height = "100vh"; // Ekranın tüm yüksekliğini kaplar
    sidebar.style.marginTop = "0px"; // Olası dış boşlukları siler
    sidebar.style.zIndex = "999999"; // Diğer tüm elementlerin üstünde kalmasını sağ
    const fakeData = data.filter(x => x.label === "sahte");
    const realData = data.filter(x => x.label === "gerçek");
    const fakePercent = ((fakeData.length / data.length) * 100).toFixed(1);
    const realPercent = (100 - fakePercent).toFixed(1);

    sidebar.style.height = "1200px";
    sidebar.innerHTML = `
        <div style="font-weight:bold; text-align:center; margin-bottom:10px; font-size:18px;">📊 ANALİZ SONUÇLARI</div>
        <canvas id="yorumChart" width="250" height="250"></canvas>
        <div style="text-align:center; margin:15px 0; font-size:14px;">
            <span style="color:#2196F3; font-weight:bold;">🛡️ Şüpheli Olmayan Yorum Sayısı: ${realData.length}</span> | 
            <span style="color:#FF4C4C; font-weight:bold;">⚠️ Şüpheli Yorum Sayısı: ${fakeData.length}</span>
        </div>
        <button id="detayBtn" style="width:100%; padding:12px; background:#3deb8e; color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:16px;">🔍 Detaylı İncele</button>
        <div id="detayPanel" style="display:none; margin-top:15px;"></div>
    `;
    drawPieChart(document.getElementById("yorumChart").getContext("2d"), fakeData.length, realData.length);
    document.getElementById("detayBtn").onclick = () => {
        const panel = document.getElementById("detayPanel");
        const isOpen = panel.style.display === "block";

        sidebar.style.width = isOpen ? "300px" : "850px";
        sidebar.style.height = isOpen ? "700px" : "850px";
        panel.style.display = isOpen ? "none" : "block";
        if (!isOpen) {
           panel.innerHTML = `
    <div style="font-family: 'Inter', sans-serif; display: flex; flex-direction: column; gap: 20px;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 15px 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #edf2f7;">
            <div>
                <h4 style="margin:0; color:#1e293b; font-size:16px;">🔍 Analiz Raporu</h4>
                <p style="margin:0; font-size:12px; color:#64748b;">Toplam <b>${data.length}</b> yorum incelendi</p>
            </div>
            <div style="text-align: right;">
                <span style="background: ${fakePercent > 30 ? '#fff1f2' : '#f0fdf4'}; color: ${fakePercent > 30 ? '#e11d48' : '#16a34a'}; padding: 6px 12px; border-radius: 20px; font-weight: 800; font-size: 13px; border: 1px solid currentColor;">
                    %${fakePercent} Şüpheli Oranı
                </span>
            </div>
        </div>

        <div style="display: flex; gap: 20px;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; color: #e11d48;">
                    <span style="font-size: 20px;">🚫</span>
                    <strong style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Şüpheli Örnekler</strong>
                </div>   
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${fakeData.length > 0 ? fakeData.slice(0, 5).map(item => `
                        <div style="
                            background: #fff; 
                            padding: 12px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            color: #475569; 
                            border: 1px solid #fee2e2;
                            border-left: 5px solid #e11d48;
                            line-height: 1.5;
                            box-shadow: 0 2px 8px rgba(225, 29, 72, 0.04);
                            position: relative;
                        ">
                            <span style="position: absolute; right: 10px; top: 8px; opacity: 0.2; font-size: 20px;">"</span>
                            ${item.text.length > 90 ? item.text.substring(0, 90) + '...' : item.text}
                        </div>
                    `).join('') : '<p style="font-size:12px; color:#94a3b8;">Şüpheli bulguya rastlanmadı.</p>'}
                </div>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; color: #16a34a;">
                    <span style="font-size: 20px;">🧐</span>
                    <strong style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Model Analiz Kriterleri</strong>
                </div>
                <div style="background: #fff; padding: 20px; border-radius: 15px; border: 1px solid #dcfce7; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.05);">
                    <p style="font-size: 13px; color: #334155; margin-bottom: 15px; line-height: 1.6;">
        <span>📌 <b>Anlamsız Yoğunluk:</b> Genel ve kendini tekrarlayan ifadelerin (Harika, süper, vb.) sıra dışı sıklığı.</span><br>
       <span>📌 <b>Puan-İçerik Uyumu:</b> Çok kısa içerik ile en yüksek yıldız (5⭐) kombinasyonunun istatistiksel sapması.</span><br>
        <span>📌 <b>Deneyim Eksikliği:</b> Ürün dokusu, koku, boyut veya kullanım sonrası etki gibi spesifik detayların yokluğu.</span><br>
        <span>📌 <b>Satıcı Odaklılık:</b> Üründen çok satıcıya yönelik abartılı ve doğal olmayan övgü ifadeleri.</span><br>
        <span>📌 <b>Yönlendirici Dil:</b> "Mutlaka stok yapın", "Kaçırmayın" gibi kullanıcıyı satın almaya zorlayan yapay vurgular.</span><br>
        <span>📌 <b>Duygu Dengesi:</b> Gerçekçi bir eleştiri içermeyen, tamamen "toz pembe" sunulan tek düze yorum yapıları.</span><br>
                    </p>
                </div>
            </div>
        </div>
    </div>
`;
        }
    };
}
// =====================
// 🏗️ Sidebar Başlatıcı
// =====================
function createStartSidebar() {
    // Varsa eskisini temizle
    if (document.getElementById("yorumSidebar")) {
        document.getElementById("yorumSidebar").remove();
    }
    const sidebar = document.createElement("div");
    sidebar.id = "yorumSidebar";
    sidebar.style = `
        position: fixed; top: 80px; right: 20px; width: 300px; height: auto;
        background: #fff; padding: 25px; z-index: 9999;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        border-radius: 25px; transition: all 0.4s ease;
        font-family: Arial, sans-serif; border: 1px solid #eee;
    `;
sidebar.innerHTML = `
    <div style="text-align:center; padding: 10px;">
        <div style="
            display: inline-flex;
            width: 80px; height: 80px;
            background: #fff3e6;
            border-radius: 24px;
            align-items: center; justify-content: center;
            margin-bottom: 20px;
            box-shadow: 0 10px 20px rgba(233, 145, 58, 0.1);
        ">
            <span style="font-size: 40px;">🛡️</span>
        </div>

        <h3 style="margin:0 0 10px 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
            Akıllı Analiz
        </h3>

        <p style="font-size:14px; color:#64748b; margin-bottom:25px; line-height:1.6;">
            Yapay zeka yorumları tarar ve güven skorunu belirler.
        </p>

        <button id="startAnalizBtn" style="
      width:100%; padding:12px;
      background: #e9913a; color: black;
      font-weight:bold; border:none;
      font-size:18 px;
      border-radius:6px; cursor:pointer;
    "> 👉 Analizi Başlat 👈</button>
        <div style="margin-top: 20px; display: flex; justify-content: center; gap: 15px;">
            <div style="font-size: 14px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
                ✅ Güvenli
            </div>
                        <div style="font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
                ve 
            </div>
            <div style="font-size: 14px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
                ⚡ Hızlı
            </div>
        </div>
    </div>
`;
    document.body.appendChild(sidebar);
    document.getElementById("startAnalizBtn").onclick = () => analizEt(300);
}
// Uygulamayı Başlat
createStartSidebar();


