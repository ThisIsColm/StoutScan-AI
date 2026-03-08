import { state } from './state.js';
import { stopRearCamera, ensureRearPreview } from './camera.js';
import { els } from './ui.js';

export function pickMimeType() {
    const candidates = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
        ''
    ];
    for (const mime of candidates) {
        if (mime === '' || MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return '';
}

export async function recordFrontClip(durationMs) {
    let frontStream = null;
    try {
        stopRearCamera();

        frontStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });

        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(frontStream, mimeType ? { mimeType } : undefined);
        const chunks = [];

        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

        const stopped = new Promise((resolve, reject) => {
            recorder.onstop = resolve;
            recorder.onerror = e => reject(e.error || e);
        });

        recorder.start();

        await new Promise(r => setTimeout(r, durationMs));
        if (recorder.state === 'recording') recorder.stop();

        await stopped;

        frontStream.getTracks().forEach(t => t.stop());
        frontStream = null;

        const actualMime = mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: actualMime });
        return { blob, mimeType: actualMime };
    } catch (err) {
        console.error('recordFrontClip failed:', err);
        if (frontStream) frontStream.getTracks().forEach(t => t.stop());
        return null;
    }
}

export async function recordClip(clipIndex, durationMs) {
    try {
        const result = await recordFrontClip(durationMs);
        if (!result) return;

        if (clipIndex === 1) {
            state.clip1Blob = result.blob;
            state.clipMimeType = result.mimeType;
        } else {
            state.clip2Blob = result.blob;
            state.clipMimeType = result.mimeType;
        }
    } catch (err) {
        console.error(`recordClip(${clipIndex}) failed:`, err);
    }

    try {
        await ensureRearPreview();
        if (els.video) els.video.style.display = 'block';
    } catch { /* ignore */ }
}

export function captureRearFrameCanvas() {
    if (!els.video || !els.video.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = els.video.videoWidth; c.height = els.video.videoHeight;
    c.getContext('2d').drawImage(els.video, 0, 0, c.width, c.height);
    return c;
}
