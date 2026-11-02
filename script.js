// SAMC Barbers — core behaviour: language, booking, lead tracking, video slider.
// Visual effects (intro, reveals, header) live in effects.js.

const WHATSAPP_PHONE = '573173054836';
const LANG_STORAGE_KEY = 'samc-lang';
const DEFAULT_LANG = 'es';
const SHEET_DISMISS_PX = 110; // drag distance that closes the bottom sheet
const SHEET_DISMISS_VELOCITY = 0.6; // px/ms, a quick flick closes it too
const SHEET_RUBBER_BAND = 0.2; // resistance when pulling the sheet upwards

let currentLang = DEFAULT_LANG;

const t = (key) => (translations[currentLang] && translations[currentLang][key]) || '';

const trackLead = () => {
    if (typeof fbq === 'function') {
        fbq('track', 'Lead');
    }
};

// ---------- LANGUAGE ----------
function readStoredLang() {
    try {
        return localStorage.getItem(LANG_STORAGE_KEY);
    } catch (e) {
        return null;
    }
}

function storeLang(language) {
    try {
        localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch (e) {
        // Storage can be blocked (private mode); the language still applies for this visit.
    }
}

function setLanguage(language) {
    if (!translations[language]) return;
    currentLang = language;

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const value = translations[language][key];
        if (!value) return;
        if (key === 'hero_title') {
            element.innerHTML = value;
        } else {
            element.innerText = value;
        }
    });

    document.documentElement.lang = language;
    document.querySelectorAll('.language-switcher button').forEach(btn => {
        btn.classList.toggle('is-active', btn.id === `${language}-btn`);
    });
    storeLang(language);
}

function initLanguage() {
    document.getElementById('es-btn').addEventListener('click', () => setLanguage('es'));
    document.getElementById('en-btn').addEventListener('click', () => setLanguage('en'));
    setLanguage(readStoredLang() || DEFAULT_LANG);
}

// ---------- META PIXEL LEAD TRACKING ----------
function initLeadTracking() {
    ['whatsapp-hero', 'whatsapp-footer', 'whatsapp-fixed', 'whatsapp-cta'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.addEventListener('click', trackLead);
    });
}

// ---------- BOOKING MODAL ----------
function initBookingModal() {
    const modal = document.getElementById('serviceModal');
    const modalTitle = document.getElementById('modalServiceTitle');
    const closeBtn = modal.querySelector('.close-modal');
    const confirmBtn = document.getElementById('confirmBooking');
    const barbaOption = document.getElementById('barba-option');
    const extraOptions = modal.querySelectorAll('.extra-option');

    let selectedService = '';
    let selectedExtras = [];
    let lastFocused = null;

    const setExtraState = (option, active) => {
        option.classList.toggle('active', active);
        option.setAttribute('aria-checked', String(active));
    };

    const openModal = (card) => {
        selectedService = card.querySelector('h3').innerText.trim();
        selectedExtras = [];
        modalTitle.innerText = `${t('modal_prefix')}${selectedService}`;
        extraOptions.forEach(opt => setExtraState(opt, false));
        barbaOption.hidden = card.dataset.barba !== 'true';

        lastFocused = document.activeElement;
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        closeBtn.focus({ preventScroll: true });
    };

    const closeModal = () => {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        if (lastFocused) lastFocused.focus({ preventScroll: true });
    };

    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => openModal(card));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(card);
            }
        });
    });

    const toggleExtra = (option) => {
        const name = option.dataset.name;
        const isActive = selectedExtras.includes(name);
        selectedExtras = isActive
            ? selectedExtras.filter(extra => extra !== name)
            : [...selectedExtras, name];
        setExtraState(option, !isActive);
    };

    extraOptions.forEach(option => {
        option.addEventListener('click', () => toggleExtra(option));
        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExtra(option);
            }
        });
    });

    confirmBtn.addEventListener('click', () => {
        let message = `Hola, quiero agendar una cita para ${selectedService}`;
        if (selectedExtras.length > 0) {
            message += ` y agregar los siguientes adicionales: ${selectedExtras.join(', ')}`;
        }
        trackLead();
        window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    });

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    initSheetDrag(modal.querySelector('.modal-content'), modal.querySelector('.modal-grabber'), closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
    });
}

// ---------- BOTTOM SHEET DRAG (mobile) ----------
// Pull the grabber down to dismiss, like an iOS sheet. While dragging the sheet
// follows the finger 1:1; on release it either closes or springs back (CSS).
function initSheetDrag(sheet, grabber, onDismiss) {
    const isSheetLayout = window.matchMedia('(max-width: 640px)');
    let drag = null;

    grabber.addEventListener('pointerdown', (e) => {
        if (!isSheetLayout.matches) return;
        drag = { startY: e.clientY, startAt: performance.now(), dy: 0 };
        grabber.setPointerCapture(e.pointerId);
        sheet.style.transition = 'none';
    });

    grabber.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const raw = e.clientY - drag.startY;
        drag.dy = raw < 0 ? raw * SHEET_RUBBER_BAND : raw;
        sheet.style.transform = `translateY(${drag.dy}px)`;
    });

    const release = () => {
        if (!drag) return;
        const velocity = drag.dy / Math.max(1, performance.now() - drag.startAt);
        const dismiss = drag.dy > SHEET_DISMISS_PX || (drag.dy > 30 && velocity > SHEET_DISMISS_VELOCITY);
        drag = null;
        // Hand control back to the stylesheet: it animates from the dragged
        // position to either the closed or the open state.
        sheet.style.transition = '';
        sheet.style.transform = '';
        if (dismiss) onDismiss();
    };

    grabber.addEventListener('pointerup', release);
    grabber.addEventListener('pointercancel', release);
}

// ---------- SERVICE TABS (segmented control) ----------
function initServiceTabs() {
    const control = document.querySelector('.segmented');
    if (!control) return;
    const tabs = [...control.querySelectorAll('[role="tab"]')];

    const select = (index, { focus = false } = {}) => {
        tabs.forEach((tab, i) => {
            const active = i === index;
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
        });
        control.dataset.active = String(index);
        if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(i));
        tab.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const step = e.key === 'ArrowRight' ? 1 : -1;
            select((i + step + tabs.length) % tabs.length, { focus: true });
        });
    });

    // Deep links (e.g. sitemap's #beard-services) open the matching tab
    const openFromHash = () => {
        const index = tabs.findIndex(tab => `#${tab.getAttribute('aria-controls')}` === location.hash);
        if (index < 0) return;
        select(index);
        document.getElementById('services').scrollIntoView();
    };
    window.addEventListener('hashchange', openFromHash);
    openFromHash();
}

// ---------- VIDEO SLIDER ----------
function initVideoSlider() {
    const section = document.getElementById('videos');
    const slider = section.querySelector('.video-slider');
    const track = slider.querySelector('.slider-track');
    const slides = [...slider.querySelectorAll('.slide')];
    const videos = slides.map(slide => slide.querySelector('video'));
    const prevBtn = slider.querySelector('.slider-btn.prev');
    const nextBtn = slider.querySelector('.slider-btn.next');
    const dotsContainer = section.querySelector('.slider-dots');
    const soundBtn = section.querySelector('.sound-toggle');

    const SWIPE_THRESHOLD = 60;
    const TAP_TOLERANCE = 6;

    let currentIndex = 0;
    let sectionVisible = false;
    let muted = true;
    let drag = null;

    const dots = slides.map((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Video ${index + 1}`);
        dot.addEventListener('click', () => goTo(index));
        dotsContainer.appendChild(dot);
        return dot;
    });

    const playCurrent = () => {
        videos.forEach((video, index) => {
            if (index === currentIndex && sectionVisible && !video.userPaused) {
                video.play().catch(() => { });
            } else {
                video.pause();
            }
        });
    };

    function goTo(index) {
        currentIndex = Math.max(0, Math.min(slides.length - 1, index));
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === currentIndex));
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === slides.length - 1;
        playCurrent();
    }

    const togglePlay = (video) => {
        video.userPaused = !video.paused;
        if (video.paused) {
            video.play().catch(() => { });
        } else {
            video.pause();
        }
    };

    prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
    nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

    videos.forEach(video => {
        video.muted = muted;
        video.userPaused = false;
        video.addEventListener('play', () => video.classList.add('playing'));
        video.addEventListener('pause', () => video.classList.remove('playing'));

        const overlay = video.nextElementSibling;
        if (overlay && overlay.classList.contains('play-overlay')) {
            overlay.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlay(video);
            });
        }
    });

    soundBtn.addEventListener('click', () => {
        muted = !muted;
        videos.forEach(video => { video.muted = muted; });
        soundBtn.setAttribute('aria-pressed', String(!muted));
        soundBtn.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');
        soundBtn.querySelector('use').setAttribute('href', muted ? '#i-volume-x' : '#i-volume-2');
    });

    // Pointer drag / swipe (works for mouse, touch and pen)
    slider.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, .play-overlay')) return;
        drag = { startX: e.clientX, delta: 0, pointerId: e.pointerId };
        slider.setPointerCapture(e.pointerId);
        track.style.transition = 'none';
        slider.style.cursor = 'grabbing';
    });

    slider.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        drag = { ...drag, delta: e.clientX - drag.startX };
        track.style.transform = `translateX(calc(-${currentIndex * 100}% + ${drag.delta}px))`;
    });

    const endDrag = (e) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const { delta } = drag;
        drag = null;
        track.style.transition = '';
        slider.style.cursor = '';

        if (Math.abs(delta) < TAP_TOLERANCE) {
            goTo(currentIndex);
            togglePlay(videos[currentIndex]);
        } else if (delta < -SWIPE_THRESHOLD) {
            goTo(currentIndex + 1);
        } else if (delta > SWIPE_THRESHOLD) {
            goTo(currentIndex - 1);
        } else {
            goTo(currentIndex);
        }
    };

    slider.addEventListener('pointerup', endDrag);
    slider.addEventListener('pointercancel', endDrag);

    // Auto play only while the section is on screen
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            sectionVisible = entries[0].isIntersecting;
            playCurrent();
        }, { threshold: 0.5 }).observe(slider);
    }

    goTo(0);
}

// ---------- IMAGE LIGHTBOX ----------
function initImageModal() {
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeBtn = imageModal.querySelector('.close-image-modal');

    const close = () => { imageModal.style.display = 'none'; };

    document.querySelectorAll('.gallery-image').forEach(image => {
        image.addEventListener('click', () => {
            modalImage.src = image.src;
            modalImage.alt = image.alt;
            imageModal.style.display = 'block';
        });
    });

    closeBtn.addEventListener('click', close);
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) close();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
    initLeadTracking();
    initBookingModal();
    initServiceTabs();
    initVideoSlider();
    initImageModal();
});
