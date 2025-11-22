// DOM Elements
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebarBtn = document.getElementById('closeSidebar');
const navLinks = document.querySelectorAll('.nav-link');
const pagesContainer = document.querySelector('.pages-container');
const pages = document.querySelectorAll('.page');

// Photo Upload Elements
const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const cameraBtn = document.getElementById('cameraBtn');
const galleryBtn = document.getElementById('galleryBtn');
const checkFreshnessBtn = document.getElementById('checkFreshnessBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const retakeBtn = document.getElementById('retakeBtn');
const proceedBtn = document.getElementById('proceedBtn');

// Form Elements
const backBtn = document.getElementById('backBtn');
const checkBtn = document.getElementById('checkBtn');
const detailBackBtn = document.getElementById('detailBackBtn');

// Slider Elements
const slider = document.querySelector('.slider');
const sliderDots = document.querySelectorAll('.slider-dot');
let currentSlide = 0;

// ==========================================
// SIDEBAR FUNCTIONALITY
// ==========================================

menuBtn.addEventListener('click', () => {
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
});

closeSidebarBtn.addEventListener('click', () => {
    closeSidebar();
});

sidebarOverlay.addEventListener('click', () => {
    closeSidebar();
});

function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
}

// ==========================================
// PAGE NAVIGATION
// ==========================================

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        navigateToPage(page);
        closeSidebar();
    });
});

// Also handle view-more buttons
document.querySelectorAll('.view-more').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const page = btn.getAttribute('data-page');
        if (page) {
            navigateToPage(page);
        }
    });
});

// Handle card clicks for detail page
document.querySelectorAll('.analysis-card.clickable').forEach(card => {
    card.addEventListener('click', () => {
        navigateToPage('detail');
    });
});

// Handle education card clicks
document.querySelectorAll('.education-card-large.clickable').forEach(card => {
    card.addEventListener('click', () => {
        navigateToPage('detail');
    });
});

function navigateToPage(pageName) {
    // Hide all pages
    pages.forEach(page => page.classList.remove('active'));

    // Show selected page
    const page = document.getElementById(`${pageName}-page`);
    if (page) {
        page.classList.add('active');
        pagesContainer.scrollTop = 0;
    }

    // Update active nav link
    navLinks.forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// ==========================================
// PHOTO UPLOAD FUNCTIONALITY
// ==========================================

checkFreshnessBtn.addEventListener('click', () => {
    navigateToPage('check');
});

cameraBtn.addEventListener('click', () => {
    cameraInput.click();
});

galleryBtn.addEventListener('click', () => {
    fileInput.click();
});

// Handle camera input
cameraInput.addEventListener('change', (e) => {
    handleFileUpload(e);
});

// Handle gallery input
fileInput.addEventListener('change', (e) => {
    handleFileUpload(e);
});

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        imagePreview.style.display = 'block';

        // Scroll to preview
        setTimeout(() => {
            imagePreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
}

retakeBtn.addEventListener('click', () => {
    imagePreview.style.display = 'none';
    previewImg.src = '';
});

proceedBtn.addEventListener('click', () => {
    navigateToPage('form');
});

// ==========================================
// FORM FUNCTIONALITY
// ==========================================

backBtn.addEventListener('click', () => {
    navigateToPage('check');
});

checkBtn.addEventListener('click', () => {
    // Validate form
    const fruitType = document.getElementById('fruitType').value;
    const storageMethod = document.getElementById('storageMethod').value;
    const purchaseDate = document.getElementById('purchaseDate').value;

    if (!fruitType || !storageMethod || !purchaseDate) {
        alert('Silakan lengkapi semua field!');
        return;
    }

    // Navigate to detail page
    navigateToPage('detail');
});

// ==========================================
// DETAIL PAGE FUNCTIONALITY
// ==========================================

detailBackBtn.addEventListener('click', () => {
    navigateToPage('home');
});

// ==========================================
// IMAGE SLIDER FUNCTIONALITY
// ==========================================

function updateSlider() {
    slider.style.transform = `translateX(-${currentSlide * 100}%)`;

    // Update dots
    sliderDots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

sliderDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        currentSlide = index;
        updateSlider();
    });
});

// Auto-slide every 5 seconds
setInterval(() => {
    currentSlide = (currentSlide + 1) % sliderDots.length;
    updateSlider();
}, 5000);

// ==========================================
// INITIALIZATION
// ==========================================

// Set home page as active on load
navigateToPage('home');

// Add smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

// Add touch support for slider
let touchStartX = 0;
let touchEndX = 0;

slider.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

slider.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swiped left - go to next slide
            currentSlide = (currentSlide + 1) % sliderDots.length;
        } else {
            // Swiped right - go to previous slide
            currentSlide = (currentSlide - 1 + sliderDots.length) % sliderDots.length;
        }
        updateSlider();
    }
}

// Add visual feedback for button presses
document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('touchstart', function() {
        this.style.opacity = '0.8';
    });

    btn.addEventListener('touchend', function() {
        this.style.opacity = '1';
    });
});

// Handle date input (set minimum date to today)
const purchaseDateInput = document.getElementById('purchaseDate');
const today = new Date().toISOString().split('T')[0];
purchaseDateInput.setAttribute('min', today);

console.log('FreshCheck App Initialized Successfully!');

// ==========================================
// PAGE NAVIGATION
// ==========================================

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        navigateToPage(page);
        closeSidebar();
    });
});

// Also handle view-more buttons
document.querySelectorAll('.view-more').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const page = btn.getAttribute('data-page');
        if (page) {
            navigateToPage(page);
        }
    });
});

// Handle card clicks for detail page
document.querySelectorAll('.analysis-card.clickable').forEach(card => {
    card.addEventListener('click', () => {
        navigateToPage('detail');
    });
});

// Handle education card clicks
document.querySelectorAll('.education-card-large.clickable').forEach(card => {
    card.addEventListener('click', () => {
        navigateToPage('detail');
    });
});

// Add navigation for profile page
document.querySelector('.profile-link').addEventListener('click', (e) => {
    e.preventDefault();
    navigateToPage('profile');
});

// Article data (replace with real content or fetch from a server)
const articlesData = {
    "1": {
        title: "5 Tips Memilih Sayuran Hijau yang Segar di Pasar",
        image: "assets/artikel1.avif",
        meta: "Dipublikasi: 10 Oktober 2025",
        content: `
            <p>1. Perhatikan warna: pilih daun yang hijau dan cerah tanpa bercak coklat.</p>
            <p>2. Tekstur: tekan lembut daun dan batang, seharusnya terasa renyah bukan layu.</p>
            <p>3. Bau: hindari sayuran berbau asam atau busuk.</p>
            <p>4. Periksa akar/stem: akar yang masih segar menandakan kesegaran.</p>
            <p>5. Beli sesuai kebutuhan agar tidak tersisa lama di rumah.</p>
        `
    },
    "2": {
        title: "Cara Menyimpan Buah di Kulkas agar Tahan Lebih Lama",
        image: "assets/artikel1.avif",
        meta: "Dipublikasi: 5 Oktober 2025",
        content: `
            <p>Simpan buah di rak tengah kulkas dalam wadah bernapas, pisahkan buah yang menghasilkan etilen (seperti pisang) dari yang sensitif.</p>
        `
    },
    "3": {
        title: "Ciri-ciri Buah yang Sudah Mulai Rusak",
        image: "assets/artikel1.avif",
        meta: "Dipublikasi: 1 Oktober 2025",
        content: `
            <p>Tanda-tanda awal: perubahan warna, bau asam, tekstur lembek, atau bercak jamur. Kenali agar bisa diselamatkan lebih awal.</p>
        `
    },
    "4": {
        title: "Memanfaatkan Sisa Sayur agar Tidak Terbuang",
        image: "assets/artikel1.avif",
        meta: "Dipublikasi: 20 September 2025",
        content: `
            <p>Gunakan sisa sayur untuk kaldu, tumisan, atau simpan potongan untuk koki berikutnya. Bekukan jika perlu.</p>
        `
    }
};

// Open article on click
document.querySelectorAll('.education-card-large.clickable').forEach(card => {
    card.addEventListener('click', function () {
        const id = this.dataset.article;
        const article = articlesData[id];
        if (!article) return;

        // Populate the article page with content
        document.getElementById('articleTitle').textContent = article.title;
        document.getElementById('articleImage').src = article.image;
        document.getElementById('articleMeta').textContent = article.meta;
        document.getElementById('articleContent').innerHTML = article.content;

        // Show the article page
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById('article-page').classList.add('active');

        // Scroll to the top of the page
        window.scrollTo(0, 0);
    });
});

// Back button functionality
document.getElementById('articleBackBtn').addEventListener('click', function () {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('education-page').classList.add('active');
    window.scrollTo(0, 0);
});

// Search functionality
const searchInput = document.querySelector('.search-input'); // Select the search input
const articles = document.querySelectorAll('.education-card-large'); // Select all articles
const noResults = document.getElementById('noResults'); // Select the "No Results" message

// Add event listener for search input
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase(); // Get the search query
    let hasResults = false; // Track if any articles match the query

    // Loop through all articles
    articles.forEach(article => {
        const title = article.querySelector('h3').innerText.toLowerCase(); // Get the article title
        const content = article.querySelector('p').innerText.toLowerCase(); // Get the article content

        // Check if the query matches the title or content
        if (title.includes(query) || content.includes(query)) {
            article.style.display = 'flex'; // Show matching articles
            hasResults = true; // Set hasResults to true
        } else {
            article.style.display = 'none'; // Hide non-matching articles
        }
    });

    // Show or hide the "No Results" message
    noResults.style.display = hasResults ? 'none' : 'block';
});

