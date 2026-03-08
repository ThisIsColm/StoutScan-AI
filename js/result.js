import { state } from './state.js';
import { els, $ } from './ui.js';

export function ensureButtons() {
    if (!els.resultModal) return;
    const againBtn = $('#btnAgain');
    const container = againBtn?.parentElement;
    if (!container) return;

    let shareBtn = $('#btnShare');
    if (!shareBtn) {
        shareBtn = document.createElement('button');
        shareBtn.id = 'btnShare';
        shareBtn.className = 'btn disabled';
        shareBtn.textContent = 'Share';
        shareBtn.disabled = true;
        container.insertBefore(shareBtn, againBtn);
    }
    shareBtn.style.display = 'inline-block';
}

export function resetReveal() {
    if (state.clip1Url) { URL.revokeObjectURL(state.clip1Url); state.clip1Url = null; }
    if (state.clip2Url) { URL.revokeObjectURL(state.clip2Url); state.clip2Url = null; }
    state.clip1Blob = null;
    state.clip2Blob = null;

    const v1 = $('#clip1Video');
    const v2 = $('#clip2Video');
    [v1, v2].forEach(v => {
        if (!v) return;
        v.pause();
        v.removeAttribute('src');
        v.load();
    });

    const fallback = $('#videoFallback');
    if (fallback) fallback.style.display = 'none';

    const shareBtn = $('#btnShare');
    if (shareBtn) {
        shareBtn.disabled = true;
        shareBtn.classList.add('disabled');
        shareBtn.classList.remove('yellow');
    }
}

export function fileExtension() {
    if (state.clipMimeType && state.clipMimeType.includes('mp4')) return 'mp4';
    return 'webm';
}

export async function shareStory() {
    const blob = state.clip1Blob || state.clip2Blob;
    if (!blob) return;

    const ext = fileExtension();
    const file = new File([blob], `stoutscan-result.${ext}`, { type: state.clipMimeType });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: 'My StoutScan Result' });
        } catch (err) {
            console.log('Share cancelled or failed.', err);
        }
    } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stoutscan-result.${ext}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
}

export function enableShareButton() {
    const shareBtn = $('#btnShare');
    if (shareBtn) {
        shareBtn.disabled = false;
        shareBtn.classList.remove('disabled');
        shareBtn.classList.add('yellow');
    }
}

export async function composeAndReveal() {
    if (state.composing) return;
    if (!els.resultModal || getComputedStyle(els.resultModal).display === 'none') return;

    state.composing = true;
    ensureButtons();
    resetReveal();

    const v1 = $('#clip1Video');
    const v2 = $('#clip2Video');
    const fallback = $('#videoFallback');

    const hasClip1 = !!state.clip1Blob;
    const hasClip2 = !!state.clip2Blob;

    if (!hasClip1 && !hasClip2) {
        if (fallback) {
            fallback.style.display = 'block';
            fallback.textContent = 'Video recording was unavailable on this device.';
        }
        state.composing = false;
        return;
    }

    if (hasClip1 && v1) {
        state.clip1Url = URL.createObjectURL(state.clip1Blob);
        v1.src = state.clip1Url;
        v1.load();
        v1.play().catch(() => { });
    }

    if (hasClip2 && v2) {
        state.clip2Url = URL.createObjectURL(state.clip2Blob);
        v2.src = state.clip2Url;
        v2.load();
        v2.play().catch(() => { });
    }

    enableShareButton();
    state.composing = false;
}
