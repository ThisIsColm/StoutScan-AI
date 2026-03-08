import { state } from './state.js';
import { els, setupArElements } from './ui.js';

export async function pickRearDeviceId() {
    const cached = sessionStorage.getItem('rearDeviceId');
    if (cached) return cached;

    if (state.userInitiated) {
        try {
            const hasStream = !!(els.video?.srcObject);
            if (!hasStream) {
                const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                probe.getTracks().forEach(t => t.stop());
            }
        } catch { /* ignore */ }
    }

    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    const rearRegex = /(back|rear|environment|world)/i;
    let rear = devices.find(d => rearRegex.test(d.label));
    if (!rear && devices.length > 1) rear = devices[devices.length - 1];
    const chosen = rear || devices[0];
    if (chosen?.deviceId) sessionStorage.setItem('rearDeviceId', chosen.deviceId);
    return chosen?.deviceId || null;
}

export async function ensureRearPreview() {
    if (!els.video) return;

    const active = !!(els.video.srcObject && els.video.srcObject.getVideoTracks && els.video.srcObject.getVideoTracks().some(t => t.readyState === 'live'));
    if (active) return;

    try {
        let rs = null;
        try {
            rs = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });
        } catch {
            const deviceId = await pickRearDeviceId();
            rs = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });
        }
        els.video.playsInline = true;
        els.video.muted = true;
        els.video.srcObject = rs;
        await els.video.play();
        state.cameraReady = true;
    } catch (err) {
        console.error('ensureRearPreview failed:', err);
        // Fallback logic
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            els.video.srcObject = stream;
            els.video.playsInline = true;
            els.video.muted = true;
            await els.video.play();
            state.cameraReady = true;
        } catch (err2) {
            console.error('Fallback camera failed:', err2);
        }
    }
}

export async function startCamera() {
    state.userInitiated = true;

    const footer = document.getElementById('siteFooter');
    if (footer) footer.style.display = 'none';

    await ensureRearPreview();
    if (els.video) els.video.style.display = 'block';
    if (els.overlay) els.overlay.style.display = 'block';
    if (els.inactive) els.inactive.style.display = 'none';

    if (els.video) {
        els.video.addEventListener('playing', () => {
            window.addEventListener('resize', setupArElements, { passive: true });
        }, { once: true });
    }
}

export function stopRearCamera() {
    if (els.video && els.video.srcObject) {
        els.video.srcObject.getTracks().forEach(t => t.stop());
        els.video.srcObject = null;
    }
}
