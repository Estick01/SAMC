// SAMC Barbers — visual effects: intro, reveals, header, micro-interactions.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const INTRO_FALLBACK_MS = 1600;
const HEADER_SCROLLED_AT = 40;
const HEADER_HIDE_AFTER = 500; // header hides on scroll down only past this point
const SCROLL_DIRECTION_TOLERANCE = 6; // px, ignores tiny jitters
const PROGRESS_STEPS = 100; // scroll progress resolution (1% steps)
const TILT_MAX_DEG = 6;
const MAGNET_STRENGTH = 0.25;
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

    intro.addEventListener('animationend', (e) => {
        if (e.target === intro && e.animationName === 'introOut') finish();
    });

    intro.addEventListener('click', finish);
    document.addEventListener('keydown', finish, { once: true });
    setTimeout(finish, INTRO_FALLBACK_MS);
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
            const item = entry.target;
            item.classList.add('is-visible');
            // Drop the stagger delay once the entrance is done (see .is-revealed)
            const settle = (e) => {
                if (e.target !== item || e.propertyName !== 'translate') return;
                item.classList.add('is-revealed');
                item.removeEventListener('transitionend', settle);
            };
            item.addEventListener('transitionend', settle);
            observer.unobserve(item);
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    items.forEach(item => observer.observe(item));
}

// ---------- OFF-SCREEN VIDEOS ----------
// GIF-style looping videos: decode only while visible
function initOffscreenPause() {
    if (!('IntersectionObserver' in window)) return;

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

// Liquid-glass light: injects a glare + rim catch-light layer and moves it
// with transform only (see .glass-light). Touch devices keep the static glass.
function initGlassLight() {
    if (!hasFinePointer) return;

    document.querySelectorAll('.glass:is([data-tilt], [data-spotlight])').forEach(card => {
        const light = document.createElement('span');
        light.className = 'glass-light';
        light.setAttribute('aria-hidden', 'true');
        light.innerHTML = '<span class="glass-light__glare"></span><span class="glass-light__rim"><span></span></span>';
        card.append(light);

        const movers = light.querySelectorAll('.glass-light__glare, .glass-light__rim > span');
        const moveTo = (e, rect) => {
            const t = `translate3d(${e.clientX - rect.left}px, ${e.clientY - rect.top}px, 0)`;
            movers.forEach(m => { m.style.transform = t; });
        };

        card.addEventListener('pointerenter', (e) => {
            if (e.pointerType !== 'mouse') return;
            moveTo(e, card.getBoundingClientRect());
            card.classList.add('is-lit');
        });
        card.addEventListener('pointerleave', () => card.classList.remove('is-lit'));
        onPointerFrame(card, moveTo);
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

    // Hide the header while scrolling down, bring it back on scroll up.
    // The class is only written when the state flips, never per frame.
    let lastY = window.scrollY;
    let headerHidden = false;
    const updateHeaderVisibility = () => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (Math.abs(delta) < SCROLL_DIRECTION_TOLERANCE) return;
        const shouldHide = delta > 0 && y > HEADER_HIDE_AFTER && !nav.classList.contains('is-open');
        if (shouldHide !== headerHidden) {
            headerHidden = shouldHide;
            header.classList.toggle('is-hidden', shouldHide);
        }
        lastY = y;
    };

    const onScroll = () => {
        lastScrollAt = performance.now();
        updateHeaderVisibility();
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
    initReveal();
    initOffscreenPause();
    initGlassLight();
    initTilt();
    initMagnetic();
    initHeaderAndScroll();

    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
});
