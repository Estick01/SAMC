// SAMC Barbers — visual effects: intro, scissors cursor, reveals, header, micro-interactions.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const INTRO_FALLBACK_MS = 3600;
const SKIP_FADE_MS = 350;
const HEADER_SCROLLED_AT = 40;
const PROGRESS_STEPS = 100; // scroll progress resolution (1% steps)
const TILT_MAX_DEG = 6;
const MAGNET_STRENGTH = 0.25;
const CURSOR_HOTSPOT = 8; // px from the cursor box corner to the scissor tips
const SCROLL_IDLE_MS = 150; // pointer effects pause while the page is scrolling

// Updated by the scroll listener; hover effects skip work while scrolling so the
// card passing under a still mouse doesn't restyle on every frame.
let lastScrollAt = 0;
const isScrolling = () => performance.now() - lastScrollAt < SCROLL_IDLE_MS;

// ---------- INTRO ----------
function initIntro() {
    const intro = document.getElementById('intro');
    const body = document.body;
    let finished = false;

    const finish = () => {
        if (finished) return;
        finished = true;
        body.classList.remove('is-loading');
        body.classList.add('is-ready');
        if (intro) intro.remove();
    };

    if (!intro || prefersReducedMotion) {
        finish();
        return;
    }

    const bottomHalf = intro.querySelector('.intro__half--bottom');
    bottomHalf.addEventListener('animationend', (e) => {
        if (e.animationName === 'splitDown') finish();
    });

    const skip = () => {
        intro.classList.add('is-skipped');
        setTimeout(finish, SKIP_FADE_MS);
    };

    intro.addEventListener('click', skip);
    document.addEventListener('keydown', skip, { once: true });
    setTimeout(finish, INTRO_FALLBACK_MS);
}

// ---------- SCISSORS CURSOR ----------
function initCursor() {
    const cursor = document.querySelector('.cursor');
    if (!cursor || !hasFinePointer) {
        if (cursor) cursor.remove();
        return;
    }

    document.documentElement.classList.add('has-cursor');

    const INTERACTIVE = 'a, button, [role="button"], [role="checkbox"], summary, .gallery-image, .video-slider';
    let x = -100;
    let y = -100;
    let frame = null;

    const render = () => {
        cursor.style.transform = `translate3d(${x - CURSOR_HOTSPOT}px, ${y - CURSOR_HOTSPOT}px, 0)`;
        frame = null;
    };

    document.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        x = e.clientX;
        y = e.clientY;
        cursor.classList.add('is-visible');
        if (!frame) frame = requestAnimationFrame(render);
    });

    document.addEventListener('pointerover', (e) => {
        cursor.classList.toggle('is-hover', Boolean(e.target.closest(INTERACTIVE)));
    });

    document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
}

// ---------- SCROLL REVEAL ----------
function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
        items.forEach(item => item.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    items.forEach(item => observer.observe(item));
}

// ---------- PAUSE OFF-SCREEN LOOPS ----------
// Infinite CSS animations keep the GPU busy even when nobody can see them.
function initOffscreenPause() {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting));
    });

    document.querySelectorAll('.marquee, .btn--gold, .cta__crown').forEach(el => observer.observe(el));

    // GIF-style looping videos: decode only while visible
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting) {
                target.play().catch(() => { });
            } else {
                target.pause();
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('video.media-loop').forEach(video => videoObserver.observe(video));
}

// ---------- POINTER MICRO-INTERACTIONS ----------
// Runs `handler` at most once per frame, and never while the page is scrolling
// (the browser fires synthetic pointer moves as content slides under the mouse).
function onPointerFrame(el, handler) {
    let latest = null;
    el.addEventListener('pointermove', (e) => {
        if (isScrolling()) return;
        const scheduled = latest !== null;
        latest = e;
        if (scheduled) return;
        requestAnimationFrame(() => {
            handler(latest, el.getBoundingClientRect());
            latest = null;
        });
    });
}

function initSpotlight() {
    if (!hasFinePointer) return;

    document.querySelectorAll('[data-spotlight]').forEach(el => {
        onPointerFrame(el, (e, rect) => {
            el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            el.style.setProperty('--my', `${e.clientY - rect.top}px`);
        });
    });
}

function initTilt() {
    if (!hasFinePointer || prefersReducedMotion) return;

    document.querySelectorAll('[data-tilt]').forEach(card => {
        onPointerFrame(card, (e, rect) => {
            const px = (e.clientX - rect.left) / rect.width - 0.5;
            const py = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform =
                `perspective(1200px) rotateX(${(-py * TILT_MAX_DEG).toFixed(2)}deg) rotateY(${(px * TILT_MAX_DEG).toFixed(2)}deg) translateY(-6px)`;
        });
        card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
}

function initMagnetic() {
    if (!hasFinePointer || prefersReducedMotion) return;

    document.querySelectorAll('[data-magnetic]').forEach(btn => {
        onPointerFrame(btn, (e, rect) => {
            const dx = (e.clientX - rect.left - rect.width / 2) * MAGNET_STRENGTH;
            const dy = (e.clientY - rect.top - rect.height / 2) * MAGNET_STRENGTH;
            btn.style.transform = `translate(${dx}px, ${dy}px)`;
        });
        btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
}

// ---------- HEADER, NAV & SCROLL PROGRESS ----------
// No per-frame scroll work: the progress bar is a CSS scroll-driven animation
// (runs on the compositor) and the header / back-to-top states come from
// IntersectionObservers, so scrolling never has to wait on the main thread.
function initHeaderAndScroll() {
    const header = document.querySelector('.main-header');
    const nav = document.getElementById('mainNav');
    const menuToggle = document.getElementById('menuToggle');
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const hero = document.querySelector('.hero');

    const setMenu = (open) => {
        nav.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
    };

    menuToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));

    // Scroll progress (bar + back-to-top ring), kept cheap: each scroll event only
    // reads scrollY against a cached page height, and the DOM is written (in one
    // rAF) only when progress crosses a 1% step — ~100 writes per full page
    // instead of one per frame. A CSS transition smooths the steps.
    const progressBar = document.querySelector('.scroll-progress span');
    let maxScroll = 1;
    const measure = () => {
        maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);

    let shownStep = -1;
    let pendingStep = -1;
    const writeProgress = () => {
        shownStep = pendingStep;
        const value = shownStep / PROGRESS_STEPS;
        progressBar.style.setProperty('--progress', value);
        scrollTopBtn.style.setProperty('--progress', value);
    };

    const onScroll = () => {
        lastScrollAt = performance.now();
        const step = Math.round(Math.min(1, window.scrollY / maxScroll) * PROGRESS_STEPS);
        if (step === pendingStep) return;
        const scheduled = pendingStep !== shownStep;
        pendingStep = step;
        if (!scheduled) requestAnimationFrame(writeProgress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if ('IntersectionObserver' in window && hero) {
        // Header turns solid as soon as the top of the hero leaves the viewport
        const topSentinel = document.createElement('div');
        topSentinel.style.cssText = `position:absolute;top:${HEADER_SCROLLED_AT}px;height:1px;width:1px;pointer-events:none;`;
        hero.prepend(topSentinel);
        new IntersectionObserver(([entry]) => {
            header.classList.toggle('is-scrolled', !entry.isIntersecting);
        }).observe(topSentinel);

        // Back-to-top shows once most of the hero is gone
        new IntersectionObserver(([entry]) => {
            scrollTopBtn.classList.toggle('visible', !entry.isIntersecting);
        }, { threshold: 0.35 }).observe(hero);
    }

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    // Highlight the nav link of the section on screen
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const sections = links
        .map(link => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const id = `#${entry.target.id}`;
                links.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === id));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        sections.forEach(section => observer.observe(section));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initIntro();
    initCursor();
    initReveal();
    initOffscreenPause();
    initSpotlight();
    initTilt();
    initMagnetic();
    initHeaderAndScroll();

    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
});
