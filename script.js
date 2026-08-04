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
const timelineItems = Array.from(document.querySelectorAll('.timeline-item'));

if (timeline && timelineItems.length) {
    // Reveal each timeline card as it scrolls into view
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    timelineItems.forEach(item => revealObserver.observe(item));
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
const timelineEl = document.querySelector('.timeline');
const timelineBase = document.querySelector('.timeline-snake-base');
const timelineFill = document.querySelector('.timeline-snake-fill');
const timelineHead = document.querySelector('.timeline-head');
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

    // ---- Timeline: mirror the overview snake, 3 cards per row ----
    function getTimelineColumns() {
        const w = window.innerWidth;
        if (w >= 900) return 3;
        if (w >= 600) return 2;
        return 1;
    }

    function layoutTimelineRows() {
        if (!timelineEl) return;
        const rows = Array.from(timelineEl.querySelectorAll('.timeline-row'));
        rows.forEach(r => r.remove());
        const cols = getTimelineColumns();
        for (let i = 0; i < N; i += cols) {
            const row = document.createElement('div');
            row.className = 'timeline-row';
            if ((i / cols) % 2 === 1) row.classList.add('reversed');
            timelineItems.slice(i, i + cols).forEach(item => row.appendChild(item));
            timelineEl.appendChild(row);
        }
    }

    // ---- Snake path through the timeline station dots (in tour order) ----
    function computeTimelinePath() {
        if (!timelineEl || !timelineBase) return;
        const tlRect = timelineEl.getBoundingClientRect();
        const W = tlRect.width;
        const H = tlRect.height;
        const svg = timelineBase.parentNode;
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);

        const pts = timelineItems.map(item => {
            const dot = item.querySelector('.timeline-dot');
            const r = dot ? dot.getBoundingClientRect() : item.getBoundingClientRect();
            return (r.left - tlRect.left + r.width / 2).toFixed(1) + ',' +
                   (r.top - tlRect.top + r.height / 2).toFixed(1);
        }).join(' ');

        timelineBase.setAttribute('points', pts);
        timelineFill.setAttribute('points', pts);
    }

    function timelinePathLength() {
        try { return timelineFill.getTotalLength(); } catch (e) { return 0; }
    }

    let timelineActiveIndex = -1;

    function renderTimeline(progress) {
        if (!timelineEl || !timelineFill) return;
        const pr = Math.max(0, Math.min(1, progress));
        const L = timelinePathLength();
        timelineFill.style.strokeDasharray = L;
        timelineFill.style.strokeDashoffset = L * (1 - pr);

        const idx = Math.min(N - 1, Math.floor(pr * N));
        if (idx !== timelineActiveIndex) {
            timelineActiveIndex = idx;
            timelineItems.forEach((item, i) => {
                item.classList.toggle('active', i === idx);
                item.classList.toggle('visited', i < idx);
            });
        }

        if (L > 0) {
            const pt = timelineFill.getPointAtLength(L * pr);
            timelineHead.style.opacity = 1;
            timelineHead.style.transform = 'translate(' + pt.x + 'px,' + pt.y + 'px) translate(-50%, -50%)';
        }
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

        renderTimeline(p);
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

    // ---- Click a node -> jump there, the tour keeps gliding from it ----
    overviewNodes.forEach((node, i) => {
        node.addEventListener('click', () => {
            elapsed = i * STEP_MS;
            render(i / N);
            if (timelineItems[i]) {
                timelineItems[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
            }
        });
    });

    // Click a timeline card -> jump the shared tour to it
    timelineItems.forEach((item, i) => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            elapsed = i * STEP_MS;
            render(i / N);
        });
    });

    // ---- Rebuild the snake on resize ----
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            layoutRows();
            computePath();
            layoutTimelineRows();
            computeTimelinePath();
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
    layoutTimelineRows();
    computeTimelinePath();
    if (reduceMotion) {
        render(1);
    } else {
        render(0);
        startTour();
    }
}
