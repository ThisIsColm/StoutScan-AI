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
    if (state.stitchedUrl) { URL.revokeObjectURL(state.stitchedUrl); state.stitchedUrl = null; }
    state.clip1Blob = null;
    state.clip2Blob = null;
    state.stitchedBlob = null;

    if (els.stitchedVideo) {
        els.stitchedVideo.pause();
        els.stitchedVideo.removeAttribute('src');
        els.stitchedVideo.load();
    }

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
    const blob = state.stitchedBlob;
    if (!blob) return;

    const ext = fileExtension();
    const file = new File([blob], `stoutscan-result.${ext}`, { type: blob.type || state.clipMimeType });

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

    // Clean up any old views but keep blobs temporarily for stitching
    if (state.stitchedUrl) { URL.revokeObjectURL(state.stitchedUrl); state.stitchedUrl = null; }
    if (els.stitchedVideo) {
        els.stitchedVideo.pause();
        els.stitchedVideo.removeAttribute('src');
    }
    const fallback = $('#videoFallback');
    if (fallback) fallback.style.display = 'none';

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

    // Stitch the videos!
    try {
        state.stitchedBlob = await stitchBlobs(
            hasClip1 ? state.clip1Blob : null,
            hasClip2 ? state.clip2Blob : null
        );

        if (state.stitchedBlob && els.stitchedVideo) {
            state.stitchedUrl = URL.createObjectURL(state.stitchedBlob);
            els.stitchedVideo.src = state.stitchedUrl;
            els.stitchedVideo.load();
            els.stitchedVideo.play().catch(() => { });
            enableShareButton();
        } else {
            throw new Error('Stitching failed to produce a blob');
        }

    } catch (err) {
        console.error('Failed to stitch blobs', err);
        if (fallback) {
            fallback.style.display = 'block';
            fallback.textContent = 'Video generation failed.';
        }
    }

    state.composing = false;
}

/**
 * Creates a canvas, captures its stream, and records it while independently 
 * playing back Blob 1 and Blob 2 into the canvas sequentially.
 */
async function stitchBlobs(blob1, blob2) {
    return new Promise(async (resolve, reject) => {
        const blobsToPlay = [blob1, blob2].filter(b => b); // Remove nulls
        if (blobsToPlay.length === 0) return reject('No blobs provided');
        if (blobsToPlay.length === 1) return resolve(blobsToPlay[0]); // Nothing to stitch

        // 1. Setup Canvas (Match typical mobile selfie proportions)
        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 1280;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Setup Recording Stream
        const stream = canvas.captureStream(30); // 30 FPS
        const mimeType = state.clipMimeType || 'video/webm';

        let recorderMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' :
            MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' :
                MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';

        const recorder = new MediaRecorder(stream, recorderMime ? { mimeType: recorderMime } : undefined);
        const recordedChunks = [];

        recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };

        recorder.onstop = () => {
            const finalMime = recorderMime || 'video/webm';
            const stitchedBlob = new Blob(recordedChunks, { type: finalMime });
            resolve(stitchedBlob);
        };

        recorder.onerror = e => reject(e.error);

        recorder.start();

        // 3. Playback mechanism for playing a video into canvas
        const playBlobToCanvas = async (blob) => {
            return new Promise((res, rej) => {
                const videoUrl = URL.createObjectURL(blob);
                const vid = document.createElement('video');
                vid.src = videoUrl;
                vid.muted = true;
                vid.playsInline = true;

                vid.onloadedmetadata = () => {
                    vid.play().catch(rej);
                };

                vid.onended = () => {
                    cancelAnimationFrame(renderId);
                    URL.revokeObjectURL(videoUrl);
                    res();
                };

                vid.onerror = (e) => {
                    cancelAnimationFrame(renderId);
                    URL.revokeObjectURL(videoUrl);
                    rej(e);
                };

                let renderId;
                const renderLoop = () => {
                    if (!vid.paused && !vid.ended) {
                        // Calculate aspect ratio crop to fill canvas without distortion
                        const vRatio = vid.videoWidth / vid.videoHeight;
                        const cRatio = canvas.width / canvas.height;
                        let drawWidth = canvas.width;
                        let drawHeight = canvas.height;
                        let offsetX = 0;
                        let offsetY = 0;

                        if (vRatio > cRatio) {
                            drawWidth = canvas.height * vRatio;
                            offsetX = (canvas.width - drawWidth) / 2;
                        } else {
                            drawHeight = canvas.width / vRatio;
                            offsetY = (canvas.height - drawHeight) / 2;
                        }

                        ctx.fillRect(0, 0, canvas.width, canvas.height); // Clear
                        ctx.drawImage(vid, offsetX, offsetY, drawWidth, drawHeight);
                    }
                    renderId = requestAnimationFrame(renderLoop);
                };

                vid.addEventListener('play', () => { renderLoop(); });
            });
        };

        // 4. Sequentially render blobs
        try {
            for (const b of blobsToPlay) {
                await playBlobToCanvas(b);
            }
            // Done! Stop recording
            recorder.stop();
            stream.getTracks().forEach(t => t.stop());
        } catch (err) {
            recorder.stop(); // Clean up if failed
            stream.getTracks().forEach(t => t.stop());
            reject(err);
        }
    });
}
