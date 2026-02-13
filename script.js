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
});

const slider = document.querySelector('.video-slider');
const track = document.querySelector('.slider-track');
const slides = document.querySelectorAll('.slide');
const videos = document.querySelectorAll('video');

let currentIndex = 0;
let startX = 0;
let isDragging = false;
let currentTranslate = 0;
let prevTranslate = 0;

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


document.addEventListener("DOMContentLoaded", function () {

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

    // Confirmar cita
    confirmBtn.addEventListener("click", function () {

        let message = `Hola, quiero agendar una cita para ${selectedService}`;

        if (selectedExtras.length > 0) {
            message += ` y agregar los siguientes adicionales: ${selectedExtras.join(", ")}`;
        }

        const phone = "573173054836";
        const whatsappURL = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        window.open(whatsappURL, "_blank");
    });

});
function openModal() {
    modal.classList.add("show");
}

function closeModalFunc() {
    modal.classList.remove("show");
}
window.addEventListener("load", () => {

    const brand = document.querySelector(".intro-brand");
    const leftCurtain = document.querySelector(".curtain.left");
    const rightCurtain = document.querySelector(".curtain.right");
    const overlay = document.querySelector(".intro-overlay");
    const hero = document.querySelector(".hero");

    // Mostrar marca cuando la tijera va por la mitad
    setTimeout(() => {
        brand.classList.add("show-brand");
    }, 1200);

    // Abrir cortinas
    setTimeout(() => {
        leftCurtain.classList.add("open-left");
        rightCurtain.classList.add("open-right");
    }, 2200);

    // Quitar overlay
    setTimeout(() => {
        overlay.remove();
        hero.classList.add("show");
    }, 3200);

});


