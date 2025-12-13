// --- 1. FIREBASE SETUP & AUTH (MANDATORY for persistence) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, addDoc, deleteDoc, onSnapshot, collection, query, limit, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase Variables
const appId = typeof __app_id !== 'undefined' ? __app_id : 'freshcheck-default-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db, auth;
let userId = null;
let isAuthReady = false;

if (firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId = user.uid;
        } else {
            signInAnonymously(auth).then(cred => {
                userId = cred.user.uid;
            }).catch(error => {
                console.error("Anonymous sign-in failed:", error);
                userId = crypto.randomUUID();
            });
        }
        document.getElementById('displayUserId').textContent = userId;
        isAuthReady = true;
        setupHistoryListeners();
    });

    if (initialAuthToken) {
        signInWithCustomToken(auth, initialAuthToken).catch(error => {
            console.error("Custom token sign-in failed:", error);
        });
    }
} else {
    console.warn("Firebase configuration not found. History features disabled.");
    userId = crypto.randomUUID();
    isAuthReady = true;
    document.getElementById('displayUserId').textContent = "Offline - " + userId.substring(0, 8);
}

// --- 2. GLOBAL STATE AND CONSTANTS ---
let imageFile = null;
let fullHistoryData = [];

const API_URL = "http://localhost:8000/predict"; // !!! UPDATE THIS URL !!!

const storageMethodMap = {
    'room': 'Suhu Ruangan',
    'fridge': 'Kulkas',
    'freezer': 'Freezer'
};

const statusStyleMap = {
    'fresh': { label: 'Segar', class: 'fresh', labelClass: 'fresh-label' },
    'moderate': { label: 'Cukup Segar', class: 'moderate', labelClass: 'moderate-label' },
    'rotten': { label: 'Busuk', class: 'rotten', labelClass: 'rotten-label' }
};

const ARTICLE_DATA = {
    "1": {
        title: "5 Tips Memilih Sayuran Hijau yang Segar di Pasar",
        image: "https://images.unsplash.com/photo-1582284087738-a1c0d73a8b5f?q=80&w=400&h=200&fit=crop",
        meta: "Dipublikasi: 10 Oktober 2025",
        content: "<p>1. Perhatikan warna: pilih daun yang hijau dan cerah tanpa bercak coklat.</p><p>2. Tekstur: tekan lembut daun dan batang, seharusnya terasa renyah bukan layu.</p><p>3. Bau: hindari sayuran berbau asam atau busuk.</p><p>4. Periksa akar/stem: akar yang masih segar menandakan kesegaran.</p><p>5. Beli sesuai kebutuhan agar tidak tersisa lama di rumah.</p>",
        keywords: "sayur, hijau, tips, pasar"
    },
    "2": {
        title: "Cara Menyimpan Buah di Kulkas agar Tahan Lebih Lama",
        image: "https://images.unsplash.com/photo-1543168256-418816c7a36c?q=80&w=400&h=200&fit=crop",
        meta: "Dipublikasi: 5 Oktober 2025",
        content: "<p>Simpan buah di rak tengah kulkas dalam wadah bernapas, pisahkan buah yang menghasilkan etilen (seperti pisang) dari yang sensitif.</p>",
        keywords: "buah, kulkas, penyimpanan, etilen"
    },
    "3": {
        title: "Ciri-ciri Buah yang Sudah Mulai Rusak",
        image: "https://images.unsplash.com/photo-1590959375944-abd886e37c00?q=80&w=400&h=200&fit=crop",
        meta: "Dipublikasi: 1 Oktober 2025",
        content: "<p>Tanda-tanda awal: perubahan warna, bau asam, tekstur lembek, atau bercak jamur. Kenali agar bisa diselamatkan lebih awal.</p>",
        keywords: "rusak, busuk, ciri-ciri, jamur"
    },
    "4": {
        title: "Memanfaatkan Sisa Sayur agar Tidak Terbuang",
        image: "https://images.unsplash.com/photo-1546538490-ae055ec032a2?q=80&w=400&h=200&fit=crop",
        meta: "Dipublikasi: 20 September 2025",
        content: "<p>Gunakan sisa sayur untuk kaldu, tumisan, atau simpan potongan untuk koki berikutnya. Bekukan jika perlu.</p>",
        keywords: "sisa, sayur, memasak, kaldu"
    }
};

// --- 3. UI UTILITIES (Modal/Loading) ---
function showLoading(message = "Menganalisis...") {
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('loadingOverlay').querySelector('p').textContent = message;
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showAlert(title, message, callback) {
    const modal = document.getElementById('customModal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    const okBtn = document.getElementById('modalOkBtn');
    const handler = () => {
        modal.style.display = 'none';
        okBtn.removeEventListener('click', handler);
        if (callback) callback();
    };
    okBtn.addEventListener('click', handler);
    modal.style.display = 'flex';
}

// --- 4. NAVIGATION & UI LOGIC ---
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId + '-page').classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');

    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');

    window.scrollTo(0, 0); 
    
    if (pageId === 'history') renderFullHistory();
    if (pageId === 'education') renderEducationCards(Object.values(ARTICLE_DATA));
    if (pageId === 'check') {
        resetCheckPage();
        renderRecentHistory('checkRecentHistory', 1);
    }
    if (pageId === 'home') {
         renderRecentHistory('homeRecentHistory', 2);
    }
}

function setupNavigation() {
    document.getElementById('menuBtn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('active');
        document.getElementById('sidebarOverlay').classList.add('active');
    });

    document.getElementById('closeSidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebarOverlay').classList.remove('active');
    });

    document.getElementById('sidebarOverlay').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebarOverlay').classList.remove('active');
    });

    document.querySelectorAll('.nav-link, .view-more, .profile-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // .profile-link is wrapped in an 'a' tag, check closest if clicked on img
            const target = link.closest('[data-page]');
            const page = target ? target.dataset.page.toLowerCase() : null;
            if (page) switchPage(page);
        });
    });

    document.getElementById('checkFreshnessBtn').addEventListener('click', () => switchPage('check'));
    document.getElementById('detailBackBtn').addEventListener('click', () => switchPage('history'));
}

// --- 5. HISTORY & DATA RENDERING (FIRESTORE) ---
function setupHistoryListeners() {
    if (!isAuthReady || !db || !userId) return;
    const collectionPath = `/artifacts/${appId}/users/${userId}/analysis_history`;
    const q = query(collection(db, collectionPath));

    onSnapshot(q, (snapshot) => {
        fullHistoryData = [];
        snapshot.forEach(doc => {
            fullHistoryData.push({ id: doc.id, ...doc.data() });
        });
        fullHistoryData.sort((a, b) => b.timestamp - a.timestamp);

        if (document.getElementById('home-page').classList.contains('active')) {
            renderRecentHistory('homeRecentHistory', 2);
        }
        if (document.getElementById('history-page').classList.contains('active')) {
            renderFullHistory();
        }
    }, (error) => {
        console.error("Error fetching full history:", error);
    });
}

function renderCard(data) {
    const statusInfo = statusStyleMap[data.status] || { label: 'Unknown', class: 'secondary', labelClass: 'secondary-label' };
    const card = document.createElement('div');
    // Using new CSS classes: analysis-card + status class + clickable
    card.className = `analysis-card ${statusInfo.class} clickable`;
    card.dataset.id = data.id;

    const imageSrc = data.imageData || `https://placehold.co/60x60/EEE/333?text=${data.fruitType.charAt(0)}`;

    card.innerHTML = `
        <div class="card-left">
            <div class="status-label ${statusInfo.labelClass}">${statusInfo.label}</div>
            <h3 class="card-title">${data.fruitType.charAt(0).toUpperCase() + data.fruitType.slice(1)}</h3>
            <p class="card-date">${data.purchaseDate}</p>
        </div>
        <img src="${imageSrc}" alt="${data.fruitType}" class="card-image">
    `;
    card.addEventListener('click', () => renderDetail(data));
    return card;
}

function renderRecentHistory(containerId, limitCount) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const historyToShow = fullHistoryData.slice(0, limitCount);

    if (historyToShow.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-light); padding: 20px;">Belum ada riwayat.</div>`;
        return;
    }
    historyToShow.forEach(data => container.appendChild(renderCard(data)));
}

function renderFullHistory() {
    const container = document.getElementById('fullHistoryList');
    container.innerHTML = '';

    if (fullHistoryData.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-light); padding: 20px;">Belum ada riwayat.</div>`;
        return;
    }
    fullHistoryData.forEach(data => container.appendChild(renderCard(data)));
}

async function saveAnalysis(data) {
    if (!db || !userId) return;
    try {
        const collectionPath = `/artifacts/${appId}/users/${userId}/analysis_history`;
        await addDoc(collection(db, collectionPath), { ...data, timestamp: Date.now() });
    } catch (e) {
        console.error("Error saving document: ", e);
    }
}

// --- FUNGSI BARU: Hapus Riwayat ---
async function deleteHistoryItem(id) {
    if (!db || !userId || !id) return;

    // Konfirmasi sederhana
    if (!confirm("Apakah Anda yakin ingin menghapus riwayat analisis ini?")) return;

    showLoading("Menghapus data...");
    
    try {
        const docRef = doc(db, `/artifacts/${appId}/users/${userId}/analysis_history`, id);
        await deleteDoc(docRef);
        hideLoading();
        // Kembali ke halaman history setelah menghapus
        switchPage('history');
    } catch (e) {
        hideLoading();
        console.error("Error deleting document: ", e);
        showAlert("Gagal", "Terjadi kesalahan saat menghapus data.");
    }
}

// --- 6. IMAGE AND CHECK FLOW LOGIC ---
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        imageFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('uploadSection').style.display = 'none';
            document.getElementById('imagePreview').style.display = 'flex';
        }
        reader.readAsDataURL(file);
    }
}

function resetCheckPage() {
    imageFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('cameraInput').value = '';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('previewImg').src = 'https://placehold.co/200x200/CCCCCC/333333?text=Foto';
    document.getElementById('fruitType').value = '';
    document.getElementById('storageMethod').value = '';
    document.getElementById('purchaseDate').value = new Date().toISOString().substring(0, 10);
}

function setupCheckListeners() {
    document.getElementById('purchaseDate').value = new Date().toISOString().substring(0, 10);
    document.getElementById('galleryBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('cameraBtn').addEventListener('click', () => document.getElementById('cameraInput').click());
    document.getElementById('fileInput').addEventListener('change', handleImageUpload);
    document.getElementById('cameraInput').addEventListener('change', handleImageUpload);
    document.getElementById('retakeBtn').addEventListener('click', resetCheckPage);
    document.getElementById('proceedBtn').addEventListener('click', () => {
        if (imageFile) switchPage('form');
        else showAlert('Kesalahan', 'Silakan unggah foto terlebih dahulu.');
    });
    document.getElementById('backBtn').addEventListener('click', () => switchPage('check'));
    document.getElementById('checkBtn').addEventListener('click', handlePrediction);
}

async function handlePrediction() {
    const fruitType = document.getElementById('fruitType').value;
    const storageMethod = document.getElementById('storageMethod').value;
    const purchaseDate = document.getElementById('purchaseDate').value;

    if (!imageFile) { showAlert('Kesalahan', 'Foto tidak ditemukan.'); return; }
    if (!fruitType || !storageMethod || !purchaseDate) { showAlert('Peringatan', 'Lengkapi formulir.'); return; }

    showLoading();
    const formData = new FormData();
    formData.append("file", imageFile);

    try {
        // Simulated API Call for Demo (Replace with real Fetch if API is running)
        // For testing layout without backend, uncomment below and comment fetch block:
        /*
        await new Promise(r => setTimeout(r, 1500));
        const result = { label: 'fresh_apple', confidence: 0.92 };
        */

        // -- Real Fetch Block --
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        if (!response.ok) throw new Error("API Error");
        const result = await response.json();
        // -- End Fetch Block --

        hideLoading();

        let status, tips;
        let freshnessPercentage = Math.round(result.confidence * 100);
        
        // Logic mapping
        if (result.label.toLowerCase().includes('fresh') || result.label.toLowerCase().includes('segar')) {
            status = 'fresh';
            tips = 'Sangat segar! Simpan di tempat sejuk.';
            freshnessPercentage = Math.min(95, freshnessPercentage);
        } else if (result.label.toLowerCase().includes('rotten') || result.label.toLowerCase().includes('busuk')) {
            status = 'rotten';
            tips = 'Sudah busuk. Sebaiknya dibuang.';
            freshnessPercentage = Math.min(20, freshnessPercentage);
        } else {
            status = 'moderate';
            tips = 'Cukup segar, segera konsumsi.';
            freshnessPercentage = 50;
        }

        const finalResult = {
            id: crypto.randomUUID(),
            fruitType,
            storageMethod: storageMethodMap[storageMethod],
            purchaseDate,
            apiLabel: result.label,
            confidence: result.confidence,
            status,
            freshness: freshnessPercentage,
            tips,
            imageData: document.getElementById('previewImg').src,
            estimatedRottenDate: "3 Hari lagi" // Simplified
        };

        saveAnalysis(finalResult);
        renderDetail(finalResult);

    } catch (error) {
        hideLoading();
        console.error(error);
        showAlert('Error', 'Gagal memproses. Pastikan API backend berjalan.');
    }
}

function renderDetail(data) {
    const statusInfo = statusStyleMap[data.status] || { label: 'Unknown', class: 'secondary' };

    document.getElementById('detailTitle').textContent = data.fruitType.charAt(0).toUpperCase() + data.fruitType.slice(1);
    const statusEl = document.getElementById('detailStatus');
    statusEl.textContent = statusInfo.label;
    statusEl.className = `detail-status ${statusInfo.class}`;

    document.getElementById('infoPurchaseDate').textContent = data.purchaseDate;
    document.getElementById('infoStorageMethod').textContent = data.storageMethod;
    document.getElementById('detailImage').src = data.imageData;

    const freshnessFill = document.getElementById('freshnessFill');
    freshnessFill.style.width = `${data.freshness}%`;

    document.getElementById('freshnessText').textContent = `Confidence: ${data.confidence.toFixed(2)}`;

    const tipsContainer = document.getElementById('detailTips');
    tipsContainer.innerHTML = `
        <div class="tips-section">
            <div class="tips-header">
                <span class="tips-icon">⭐</span>
                <p class="tips-title">Kesegaran: ${data.freshness}%</p>
            </div>
            <p class="tips-text">${data.tips}</p>
        </div>
    `;

    // --- LOGIKA BARU UNTUK TOMBOL HAPUS ---
    const deleteBtn = document.getElementById('deleteHistoryBtn');
    
    // Hapus event listener lama agar tidak menumpuk (cloning node trik simpel)
    const newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
    
    // Pasang event listener baru dengan ID data saat ini
    newDeleteBtn.addEventListener('click', () => {
        if(data.id) {
            deleteHistoryItem(data.id);
        } else {
            // Jika ini hasil prediksi baru yang belum punya ID database (belum di-refresh)
            showAlert("Info", "Data baru tersimpan. Silakan buka dari menu Riwayat untuk menghapus.");
        }
    });

    switchPage('detail');
}

// --- 7. EDUCATION LOGIC ---
function renderArticleCard(article, id) {
    const articleEl = document.createElement('article');
    articleEl.className = 'education-card-large clickable'; // New CSS class
    articleEl.dataset.article = id;
    articleEl.innerHTML = `
        <img src="${article.image}" onerror="this.src='https://placehold.co/80x80/60A5FA/FFFFFF?text=Artikel'" alt="Article" class="article-image">
        <div class="article-content">
            <h3>${article.title}</h3>
            <p>${article.content.substring(3, 80).split('</p>')[0]}...</p>
        </div>
    `;
    articleEl.addEventListener('click', function(){
        const a = ARTICLE_DATA[this.dataset.article];
        if(!a) return;
        document.getElementById('articleTitle').textContent = a.title;
        document.getElementById('articleImage').src = a.image;
        document.getElementById('articleMeta').textContent = a.meta;
        document.getElementById('articleContent').innerHTML = a.content;
        switchPage('article');
    });
    return articleEl;
}

function renderEducationCards(filteredArticles) {
    const listContainer = document.getElementById('articlesList');
    const noResults = document.getElementById('noEducationResults');
    listContainer.innerHTML = '';

    if (filteredArticles.length === 0) {
        noResults.style.display = 'block';
    } else {
        noResults.style.display = 'none';
        filteredArticles.forEach(article => {
            const id = Object.keys(ARTICLE_DATA).find(key => ARTICLE_DATA[key] === article);
            if (id) listContainer.appendChild(renderArticleCard(article, id));
        });
    }
}

function setupEducationSearch() {
    const searchInput = document.getElementById('educationSearch');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            renderEducationCards(Object.values(ARTICLE_DATA));
            return;
        }
        const filtered = Object.values(ARTICLE_DATA).filter(article =>
            article.title.toLowerCase().includes(query) ||
            article.keywords.toLowerCase().includes(query)
        );
        renderEducationCards(filtered);
    });
    document.getElementById('articleBackBtn').addEventListener('click', () => switchPage('education'));
}

// --- 8. SLIDER LOGIC ---
function setupSlider() {
    const slider = document.getElementById('homeSlider');
    const controls = document.getElementById('sliderControls');
    const slides = slider.querySelectorAll('.slide-image');
    if(!slider || slides.length === 0) return;
    
    let currentIndex = 0;
    controls.innerHTML = '';
    
    slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = 'slider-dot';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            currentIndex = index;
            updateSlider();
        });
        controls.appendChild(dot);
    });

    const dots = controls.querySelectorAll('.slider-dot');

    function updateSlider() {
        slider.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach(d => d.classList.remove('active'));
        if(dots[currentIndex]) dots[currentIndex].classList.add('active');
    }

    setInterval(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        updateSlider();
    }, 5000);
}

// --- 9. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupCheckListeners();
    setupEducationSearch();
    setupSlider();
    renderEducationCards(Object.values(ARTICLE_DATA).slice(0, 2));
    renderRecentHistory('homeRecentHistory', 2);
    renderRecentHistory('checkRecentHistory', 1);
});