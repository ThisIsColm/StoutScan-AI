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

export async function startFrontRecording() {
    let frontStream = null;
    let recorder = null;

    stopRearCamera();
    if (els.video) els.video.style.display = 'none';

    try {
        frontStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
    } catch (err) {
        console.error('startFrontRecording failed:', err);
        return { stop: () => { }, resultPromise: Promise.resolve(null) };
    }

    const mimeType = pickMimeType();
    recorder = new MediaRecorder(frontStream, mimeType ? { mimeType } : undefined);
    const chunks = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = e => reject(e.error || e);
    });

    recorder.start();

    const resultPromise = stopped.then(() => {
        frontStream.getTracks().forEach(t => t.stop());
        const actualMime = mimeType || 'video/webm';
        return { blob: new Blob(chunks, { type: actualMime }), mimeType: actualMime };
    }).catch(err => {
        console.error('recorder stopped error:', err);
        frontStream.getTracks().forEach(t => t.stop());
        return null;
    });

    return {
        stop: () => {
            if (recorder && recorder.state === 'recording') {
                recorder.stop();
            }
        },
        resultPromise
    };
}

export async function captureRearFrameCanvas() {
    if (!els.video || !els.video.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = els.video.videoWidth; c.height = els.video.videoHeight;
    c.getContext('2d').drawImage(els.video, 0, 0, c.width, c.height);
    return c;
}
