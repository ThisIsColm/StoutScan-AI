import { state } from './state.js';

export const $ = (s, r = document) => r.querySelector(s);

export const els = {};

export function initUIElements() {
    els.video = $('#video');
    els.overlay = $('#overlay');
    els.inactive = $('#inactive');
    els.enableBtn = $('#enableBtn');
    els.analyzeBtn = $('#primaryBtn');
    els.stepsPanel = $('#stepsPanel');
    els.bar = $('#bar');
    els.fpsEl = $('#fps');
    els.confEl = $('#conf');
    els.resultModal = $('#resultModal');
    els.btnAgain = $('#btnAgain');
    els.scanLine = $('#scanLine');
    els.vignette = $('#vignetteOverlay');
    els.arCanvas = $('#arCanvas');
    els.chipContainer = $('#chipContainer');
    els.siteFooter = $('#siteFooter');

    // New two-stage flow elements
    els.promptScreen = $('#promptScreen');
    els.processingScreen = $('#processingScreen');
    els.promptOkBtn = $('#promptOkBtn');
    els.targetBox = $('.g-target');

    // Stitched video display
    els.stitchedVideo = $('#stitchedVideo');
}

export function setupArElements() {
    if (!els.arCanvas) return;
    els.arCanvas.width = els.arCanvas.clientWidth;
    els.arCanvas.height = els.arCanvas.clientHeight;
}

export function motionListener(event) {
    const { beta, gamma } = event.rotationRate;
    const sensitivity = 2.5;
    state.trackingState.targetX = (gamma || 0) * -sensitivity;
    state.trackingState.targetY = (beta || 0) * -sensitivity;
}

export function drawArLoop() {
    if (!state.trackingState.active) return;

    const now = performance.now();
    if (now - state.trackingState.lastUpdate > 1000) {
        state.trackingState.lastUpdate = now;
        const targetBoxEl = $('.g-target');
        if (targetBoxEl) {
            const rect = targetBoxEl.getBoundingClientRect();
            for (const point of state.trackingState.points) {
                point.x = rect.left + Math.random() * rect.width;
                point.y = rect.top + Math.random() * rect.height;
            }
        }
    }

    const ease = 0.05;
    state.trackingState.cx += (state.trackingState.targetX - state.trackingState.cx) * ease;
    state.trackingState.cy += (state.trackingState.targetY - state.trackingState.cy) * ease;

    const arCtx = els.arCanvas.getContext('2d');
    arCtx.clearRect(0, 0, els.arCanvas.width, els.arCanvas.height);
    arCtx.fillStyle = 'rgba(255, 215, 0, 0.7)';

    for (const point of state.trackingState.points) {
        arCtx.beginPath();
        arCtx.arc(point.x + state.trackingState.cx, point.y + state.trackingState.cy, point.size, 0, Math.PI * 2);
        arCtx.fill();
    }

    state.trackingState.animationFrameId = requestAnimationFrame(drawArLoop);
}

export function startTracking() {
    if (state.trackingState.active) return;
    state.trackingState.active = true;
    setupArElements();
    state.trackingState.lastUpdate = performance.now();

    const targetBoxEl = $('.g-target');
    if (targetBoxEl) {
        const rect = targetBoxEl.getBoundingClientRect();
        state.trackingState.points = [];
        for (let i = 0; i < 30; i++) {
            state.trackingState.points.push({
                x: rect.left + Math.random() * rect.width,
                y: rect.top + Math.random() * rect.height,
                size: Math.random() * 2 + 1
            });
        }
    }

    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(permissionState => {
            if (permissionState === 'granted') {
                window.addEventListener('devicemotion', motionListener);
            }
        });
    } else {
        window.addEventListener('devicemotion', motionListener);
    }
    drawArLoop();
}

export function stopTracking() {
    state.trackingState.active = false;
    if (state.trackingState.animationFrameId) {
        cancelAnimationFrame(state.trackingState.animationFrameId);
        state.trackingState.animationFrameId = null;
    }
    window.removeEventListener('devicemotion', motionListener);
    setTimeout(() => {
        if (els.arCanvas) {
            const arCtx = els.arCanvas.getContext('2d');
            arCtx.clearRect(0, 0, els.arCanvas.width, els.arCanvas.height);
        }
    }, 50);
}

export function updateFpsConf() {
    if (els.fpsEl) els.fpsEl.textContent = (30 + Math.floor(Math.random() * 6));
    if (els.confEl) els.confEl.textContent = (80 + Math.random() * 15).toFixed(1) + '%';
}

export function launchConfetti() {
    const end = Date.now() + 2000;
    (function frame() {
        if (window.confetti) {
            confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
        }
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
}

export function startScanLine() {
    if (!els.scanLine) return;
    els.scanLine.style.display = 'block';
    state.pos = 0;
    state.dir = 1;
    const w = $('.stage')?.offsetWidth || window.innerWidth;
    state.scanAnim = setInterval(() => {
        state.pos += state.dir * 4;
        if (state.pos >= w || state.pos <= 0) state.dir *= -1;
        els.scanLine.style.left = state.pos + 'px';
    }, 16);
}

export function stopScanLine() {
    clearInterval(state.scanAnim);
    if (els.scanLine) els.scanLine.style.display = 'none';
    stopTracking();
}
