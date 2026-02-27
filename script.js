document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    const esBtn = document.getElementById('es-btn');
    const enBtn = document.getElementById('en-btn');

    const setLanguage = (language) => {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[language] && translations[language][key]) {
                if (key === 'hero_title') {
                    element.innerHTML = translations[language][key];
                } else {
                    element.innerText = translations[language][key];
                }
            }
        });
        document.documentElement.lang = language;
    };

    esBtn.addEventListener('click', () => setLanguage('es'));
    enBtn.addEventListener('click', () => setLanguage('en'));

    // Set default language
    setLanguage('es');

    // ---------- META PIXEL LEAD TRACKING ----------
    // Track Lead event for hero WhatsApp button
    const heroWhatsAppBtn = document.getElementById('whatsapp-hero');
    if (heroWhatsAppBtn) {
        heroWhatsAppBtn.addEventListener('click', function(e) {
            // Check if fbq is available before firing event
            if (typeof fbq === 'function') {
                fbq('track', 'Lead');
            }
        });
    }

    // Track Lead event for footer WhatsApp button
    const footerWhatsAppBtn = document.getElementById('whatsapp-footer');
    if (footerWhatsAppBtn) {
        footerWhatsAppBtn.addEventListener('click', function(e) {
            // Check if fbq is available before firing event
            if (typeof fbq === 'function') {
                fbq('track', 'Lead');
            }
        });
    }

    // Track Lead event for confirm booking button (in modal)
    const confirmBookingBtn = document.getElementById('confirmBooking');
    if (confirmBookingBtn) {
        confirmBookingBtn.addEventListener('click', function() {

            let message = `Hola, quiero agendar una cita para ${selectedService}`;

            if (selectedExtras.length > 0) {
                message += ` y agregar los siguientes adicionales: ${selectedExtras.join(", ")}`;
            }

            const phone = "573173054836";
            const whatsappURL = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

            // Track Lead event before redirect
            if (typeof fbq === 'function') {
                fbq('track', 'Lead');
            }

            window.open(whatsappURL, "_blank");
        });
    }

    const modal = document.getElementById("serviceModal");
    const modalTitle = document.getElementById("modalServiceTitle");
    const confirmBtn = document.getElementById("confirmBooking");
    const closeModal = document.querySelector(".close-modal");

    let selectedService = "";
    let selectedExtras = [];

    function openModal() {
        modal.classList.add("show");
    }

    function closeModalFunc() {
        modal.classList.remove("show");
    }

    // Abrir modal al hacer click en servicio
    document.querySelectorAll(".service-card").forEach(card => {
        card.addEventListener("click", function () {
            selectedService = this.querySelector("h3").innerText;
            modalTitle.innerText = "Agendar: " + selectedService;
            selectedExtras = [];

            document.querySelectorAll(".extra-option").forEach(opt => {
                opt.classList.remove("active");
            });

            // Mostrar/ocultar opción de barba
            const barbaOption = document.getElementById('barba-option');
            if (selectedService.includes('CORTE SENCILLO') || selectedService.includes('PREMIUM EXPERIENCE')) {
                barbaOption.style.display = 'block';
            } else {
                barbaOption.style.display = 'none';
            }

            openModal();
        });
    });

    // Selección múltiple
    document.querySelectorAll(".extra-option").forEach(option => {
        option.addEventListener("click", function () {
            const name = this.dataset.name;

            this.classList.toggle("active");

            if (selectedExtras.includes(name)) {
                selectedExtras = selectedExtras.filter(e => e !== name);
            } else {
                selectedExtras.push(name);
            }
        });
    });

    // Cerrar modal
    closeModal.addEventListener("click", closeModalFunc);

    window.addEventListener("click", function (e) {
        if (e.target === modal) {
            closeModalFunc();
        }
    });
});

const slider = document.querySelector('.video-slider');
const track = document.querySelector('.slider-track');
const slides = document.querySelectorAll('.slide');
const videos = document.querySelectorAll('video');
const prevBtn = document.querySelector('.slider-btn.prev');
const nextBtn = document.querySelector('.slider-btn.next');

let currentIndex = 0;
let startX = 0;
let isDragging = false;
let currentTranslate = 0;
let prevTranslate = 0;

// ---------- SLIDER BUTTON NAVIGATION ----------
if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateSlider();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentIndex < slides.length - 1) {
            currentIndex++;
            updateSlider();
        }
    });
}

// ---------- VIDEO LAZY LOADING WITH INTERSECTION OBSERVER ----------
// Only load video sources when they come into view for better performance
if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                // Load video source when visible
                if (video.poster && !video.loaded) {
                    video.load();
                    video.loaded = true;
                }
                // Auto-play when in view (only if user hasn't manually paused)
                if ((video.parentElement.classList.contains('active') || 
                    slides[currentIndex].contains(video)) && !video.userPaused) {
                    video.play().catch(() => { });
                }
            } else {
                // Pause when not visible to save resources
                video.pause();
            }
        });
    }, { 
        rootMargin: '100px',
        threshold: 0.1 
    });

    videos.forEach(video => {
        video.loaded = false;
        const playOverlay = video.nextElementSibling;
        const swipeIndicator = playOverlay ? playOverlay.nextElementSibling : null;
        
        // Add click event to toggle play/pause via overlay
        if (playOverlay && playOverlay.classList.contains('play-overlay')) {
            playOverlay.addEventListener('click', (e) => {
                e.stopPropagation();
                playOverlay.classList.toggle('playing');
                if (video.userPaused) {
                    video.userPaused = false;
                    video.play();
                } else {
                    video.userPaused = true;
                    video.pause();
                }
            });
        }
        
        if (swipeIndicator && swipeIndicator.classList.contains('swipe-indicator')) {
            swipeIndicator.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentIndex < slides.length - 1) {
                    currentIndex++;
                    updateSlider();
                }
            });
        }
        
        video.addEventListener('play', () => {
            video.classList.add('playing');
        });
        
        video.addEventListener('pause', () => {
            video.classList.remove('playing');
        });
        
        videoObserver.observe(video);
    });
}

// ---------- UPDATE SLIDER ----------
function updateSlider() {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    videos.forEach((video, index) => {
        video.pause();
        if (index === currentIndex) {
            video.play().catch(() => { });
        }
    });
}

// ---------- DRAG FUNCTION ----------
slider.addEventListener('mousedown', startDrag);
slider.addEventListener('touchstart', startDrag);

slider.addEventListener('mousemove', drag);
slider.addEventListener('touchmove', drag);

slider.addEventListener('mouseup', endDrag);
slider.addEventListener('mouseleave', endDrag);
slider.addEventListener('touchend', endDrag);

function startDrag(e) {
    isDragging = true;
    startX = getPositionX(e);
    slider.style.cursor = "grabbing";
}

function drag(e) {
    if (!isDragging) return;
    const currentPosition = getPositionX(e);
    const diff = currentPosition - startX;

    currentTranslate = prevTranslate + diff;
    track.style.transform = `translateX(${currentTranslate}px)`;
}

function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    slider.style.cursor = "grab";

    const movedBy = currentTranslate - prevTranslate;

    if (movedBy < -100 && currentIndex < slides.length - 1) {
        currentIndex++;
    }

    if (movedBy > 100 && currentIndex > 0) {
        currentIndex--;
    }

    prevTranslate = -currentIndex * slider.offsetWidth;
    currentTranslate = prevTranslate;
    updateSlider();
}

function getPositionX(e) {
    return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
}

// ---------- AUTO PLAY WHEN SECTION VISIBLE ----------
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            updateSlider();
        } else {
            videos.forEach(video => video.pause());
        }
    });
}, { threshold: 0.6 });

observer.observe(document.querySelector('#videos'));

function openModal() {
    modal.classList.add("show");
}

function closeModalFunc() {
    modal.classList.remove("show");
}

// Image Modal
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const galleryImages = document.querySelectorAll(".gallery-image");
const closeImageModal = document.querySelector(".close-image-modal");

galleryImages.forEach(image => {
    image.addEventListener("click", () => {
        imageModal.style.display = "block";
        modalImage.src = image.src;
    });
});

closeImageModal.addEventListener("click", () => {
    imageModal.style.display = "none";
});

imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
        imageModal.style.display = "none";
    }
});

// ---------- SCROLL TO TOP BUTTON ----------
const scrollTopBtn = document.getElementById('scrollTopBtn');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollTopBtn.classList.add('visible');
    } else {
        scrollTopBtn.classList.remove('visible');
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

