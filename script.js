document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

/* ============================================
   Work Experience Timeline Animations
   ============================================ */

const timeline = document.querySelector('.timeline');
const timelineItems = document.querySelectorAll('.timeline-item');

if (timeline && timelineItems.length) {
    // Reveal each timeline item as it scrolls into view
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    timelineItems.forEach(item => revealObserver.observe(item));

    // Grow the glowing progress line as the user scrolls through the timeline
    const progressLine = document.querySelector('.timeline-progress');

    function updateTimelineProgress() {
        const rect = timeline.getBoundingClientRect();
        const total = timeline.offsetHeight;
        const viewport = window.innerHeight;

        if (rect.top >= viewport) {
            progressLine.style.transform = 'translateX(-50%) scaleY(0)';
            return;
        }
        if (rect.bottom <= 0) {
            progressLine.style.transform = 'translateX(-50%) scaleY(1)';
            return;
        }

        const scrolled = viewport - rect.top;
        const ratio = Math.min(1, Math.max(0, scrolled / total));
        progressLine.style.transform = 'translateX(-50%) scaleY(' + ratio + ')';
    }

    window.addEventListener('scroll', updateTimelineProgress, { passive: true });
    window.addEventListener('resize', updateTimelineProgress);
    updateTimelineProgress();
}

/* ============================================
   Animated Overview "Career Map" Timeline
   (Snake / Z-shape progress)
   ============================================ */

const overviewEl = document.querySelector('.timeline-overview');
const overviewMap = document.querySelector('.overview-map');
const overviewTrack = document.querySelector('.overview-track');
const overviewNodes = Array.from(document.querySelectorAll('.overview-node'));
const snakeBase = document.querySelector('.overview-snake-base');
const snakeFill = document.querySelector('.overview-snake-fill');
const snakeHead = document.querySelector('.overview-head');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (overviewMap && overviewNodes.length && overviewNodes.length === timelineItems.length) {
    const N = overviewNodes.length;
    const STEP_MS = 700;
    const totalMs = N * STEP_MS;

    let p = 0;
    let elapsed = 0;
    let activeIndex = 0;
    let rafId = null;
    let lastFrame = 0;
    let suppressSync = false;

    // ---- Layout: snake rows with alternating direction ----
    function getColumns() {
        const w = window.innerWidth;
        if (w >= 1024) return 6;
        if (w >= 640) return 4;
        return 3;
    }

    function layoutRows() {
        while (overviewTrack.firstChild) {
            overviewTrack.removeChild(overviewTrack.firstChild);
        }
        const cols = getColumns();
        for (let i = 0; i < N; i += cols) {
            const row = document.createElement('div');
            row.className = 'overview-row';
            if ((i / cols) % 2 === 1) row.classList.add('reversed');
            overviewNodes.slice(i, i + cols).forEach(node => row.appendChild(node));
            overviewTrack.appendChild(row);
        }
    }

    // ---- Snake path through the station dots (in tour order) ----
    function computePath() {
        const mapRect = overviewMap.getBoundingClientRect();
        const W = mapRect.width;
        const H = mapRect.height;
        const svg = snakeBase.parentNode;
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);

        const pts = overviewNodes.map(node => {
            const station = node.querySelector('.overview-station');
            const r = station ? station.getBoundingClientRect() : node.getBoundingClientRect();
            return (r.left - mapRect.left + r.width / 2).toFixed(1) + ',' +
                   (r.top - mapRect.top + r.height / 2).toFixed(1);
        }).join(' ');

        snakeBase.setAttribute('points', pts);
        snakeFill.setAttribute('points', pts);
    }

    function pathLength() {
        try { return snakeFill.getTotalLength(); } catch (e) { return 0; }
    }

    // ---- Render current progress (fill + head + active node) ----
    function render(progress) {
        p = Math.max(0, Math.min(1, progress));
        const L = pathLength();
        snakeFill.style.strokeDasharray = L;
        snakeFill.style.strokeDashoffset = L * (1 - p);

        const idx = Math.min(N - 1, Math.floor(p * N));
        if (idx !== activeIndex) {
            activeIndex = idx;
            overviewNodes.forEach((node, i) => {
                node.classList.toggle('active', i === activeIndex);
                node.classList.toggle('visited', i < activeIndex);
            });
        }

        if (L > 0) {
            const pt = snakeFill.getPointAtLength(L * p);
            snakeHead.style.opacity = 1;
            snakeHead.style.transform = 'translate(' + pt.x + 'px,' + pt.y + 'px) translate(-50%, -50%)';
        }
    }

    // ---- Tour loop: continuous smooth glide, easing into each station ----
    function tick(now) {
        const dt = now - lastFrame;
        lastFrame = now;
        elapsed += dt;
        const cyclePos = elapsed % totalMs;
        const step = Math.min(N - 1, Math.floor(cyclePos / STEP_MS));
        const t = Math.min(1, (cyclePos - step * STEP_MS) / STEP_MS);
        const eased = t * t * (3 - 2 * t);
        render((step + eased) / N);
        rafId = requestAnimationFrame(tick);
    }

    function startTour() {
        if (reduceMotion || rafId) return;
        lastFrame = performance.now();
        rafId = requestAnimationFrame(tick);
    }

    function stopTour() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    // ---- Click a node -> jump there + restart the tour from it ----
    overviewNodes.forEach((node, i) => {
        node.addEventListener('click', () => {
            elapsed = i * STEP_MS;
            render(i / N);
            suppressSync = true;
            window.setTimeout(() => { suppressSync = false; }, 1200);
            if (timelineItems[i]) {
                timelineItems[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
            }
            stopTour();
            startTour();
        });
    });

    // Pause on hover / focus, resume on leave
    overviewEl.addEventListener('mouseenter', stopTour);
    overviewEl.addEventListener('mouseleave', startTour);
    overviewEl.addEventListener('focusin', stopTour);
    overviewEl.addEventListener('focusout', startTour);

    // ---- Sync highlight to the work nearest the viewport center ----
    let syncFrame = null;
    function syncFromScroll() {
        if (suppressSync) return;
        const mid = window.innerHeight / 2;
        let best = activeIndex;
        let bestDist = Infinity;
        timelineItems.forEach((item, i) => {
            const r = item.getBoundingClientRect();
            const d = Math.abs((r.top + r.height / 2) - mid);
            if (d < bestDist) { bestDist = d; best = i; }
        });
        if (best !== activeIndex) {
            elapsed = best * STEP_MS;
            render(best / N);
        }
    }

    window.addEventListener('scroll', () => {
        if (syncFrame) return;
        syncFrame = requestAnimationFrame(() => {
            syncFromScroll();
            syncFrame = null;
        });
    }, { passive: true });

    // ---- Run the tour only while the map is on screen ----
    const overviewObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) startTour();
            else stopTour();
        });
    }, { threshold: 0.05 });
    overviewObserver.observe(overviewEl);

    // ---- Rebuild the snake on resize ----
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            layoutRows();
            computePath();
            render(p);
        }, 200);
    });

    // ---- Init ----
    overviewNodes.forEach(node => {
        if (!node.querySelector('.overview-station')) {
            const station = document.createElement('span');
            station.className = 'overview-station';
            station.setAttribute('aria-hidden', 'true');
            node.prepend(station);
        }
    });
    layoutRows();
    computePath();
    if (reduceMotion) {
        render(1);
    } else {
        render(0);
    }
}
