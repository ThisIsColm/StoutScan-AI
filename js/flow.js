import { state } from './state.js';
import { els, updateFpsConf, startScanLine, startTracking, stopScanLine, launchConfetti, $ } from './ui.js';
import { startFrontRecording } from './capture.js';
import { ensureRearPreview } from './camera.js';

const messages = [
    "Would ya ever just drink the fucking thing?", "Drink it, you dry-shite.", "Neck it, ya melt.", "Drink up before it goes warm, ya bollox.", "Neck it before I call yer mam to shame ye.", "You’re waitin’ for the head to write back to ya? Drink it.", "Jesus wept, I’ve seen toddlers finish their milk quicker.", "Jaysus, I’ve seen corpses drink faster.", "You’re slower than a funeral in the rain. Lash it into you!", "Stop starin’ at it like it owes ya money. Drink the pint.", "It’s a pint, not your long-lost father. Stop starin’ at it.", "Stop starin’ at the creamy head like it’s a feckin’ miracle.", "That pint’s been through more photo shoots than Kate Moss — drink it.", "Jaysus, it’s only a pint, not a work of art.", "This is a pub, not a feckin’ art gallery. Drink the pint. Now.", "You’re not savin’ it for your grandkids, drink it.", "If you loved it any more you’d have to marry the feckin’ thing.", "It’s a Guinness, not a feckin’ hostage — stop negotiatin’ and drink it.", "Stop fingering the glass and swallow it, ya gobshite.", "Quit fondling it like it’s your first shift. Get it into ye.", "Stop flirting with it and lash it back.", "Quit treatin’ it like a Tinder date and neck it.", "It’s not foreplay, it’s a feckin’ pint. Get it in ye.", "Stop making love to it and sink it you dry shite.", "Feck sake, you’d bore the head off it. Just drink it.", "Jaysus, you’d suck the craic out of a room. Just drink the pint.", "The head’s gone flatter than your love life, ya clown.", "You’re makin’ sobriety look like a chore.", "Christ, you’d be faster breastfeeding a pint than drinkin’ it.", "You’re holdin’ it like you’re afraid it’ll bite. It’s not a badger, drink it.", "You’re sittin’ there like a wet shite and drink it.", "Less Instagram, more alcoholism.", "It’s not communion wine, ya bollox, down it.", "Don’t be nursin’ it like a sick calf. Get it into ye.", "Don’t make me put it in a baby’s bottle for you. Just drink it.", "Would ya stop takin’ photos, it’s not goin’ in your OnlyFans — drink it.", "That pint’s been in your hand longer than your last relationship.", "Drink it before I rent it out as a feckin’ Airbnb.", "I’ve seen glaciers melt quicker — lash it back.", "If that pint was any older, it’d qualify for a pension.", "You’re guarding that pint like it’s a kilo of coke in a Garda raid.", "Drink it before I baptise you in it.", "I’ve seen nuns sin faster — get it into ye.", "That pint’s been in more selfies than a Love Island contestant.", "The foam’s writing its will, just drink it.", "It’s not a feckin’ candlelit dinner, it’s a pint.", "Holdin’ it like you’re expecting it to propose — just drink it."
];

const jargon = [
    'Calibrating foam displacement vectors', 'Extracting serif alignment matrix', 'Computing pint-level spectral density', 'Analyzing bubble distribution gradients', 'Mapping liquid meniscus curvature', 'Evaluating pour velocity regression model', 'Isolating G-character pixel clusters', 'Applying stout-tone histogram equalization', 'Detecting foam-liquid interface anomalies', 'Cross-referencing pint signature in database', 'Running pint integrity checksum', 'Synchronizing pour-phase oscillation patterns', 'Interpolating Guinness viscosity coefficients', 'Rendering head-retention spline curves', 'Scanning for pint-origin geotag anomalies', 'Simulating nitrogen cascade decay model', 'Measuring sip-latency throughput', 'Optimizing foam stratification index', 'Decrypting froth entropy packets', 'Integrating pint-level telemetry data', 'Applying stout-turbulence Fourier transform', 'Calibrating head-density eigenvectors', 'Analyzing pint waveform harmonics', 'Reconstructing pour-angle hologram', 'Quantifying malt-phase spectral shift', 'Running head-foam compression algorithm', 'Normalizing bubble anisotropy matrix', 'Performing stout DNA sequence mapping', 'Aligning pour-path vector field', 'Generating pint hydration blockchain record'
];

export async function analyzePint() {
    els.stepsPanel.innerHTML = '';
    els.analyzeBtn.textContent = 'Analysis in progress…';
    els.analyzeBtn.classList.add('disabled');
    state.fpsInterval = setInterval(updateFpsConf, 500);
    startScanLine();
    startTracking();

    const addStep = (msg) => {
        if (els.stepsPanel) {
            els.stepsPanel.innerHTML += msg + '<br>';
            els.stepsPanel.scrollTop = els.stepsPanel.scrollHeight;
        }
    };

    const runFakeProgress = async (durationMs, startPercent, endPercent) => {
        return new Promise(resolve => {
            const steps = 60;
            const intervalMs = durationMs / steps;
            let currentStep = 0;
            const timer = setInterval(() => {
                currentStep++;
                const p = startPercent + (endPercent - startPercent) * (currentStep / steps);
                if (els.bar) els.bar.style.width = `${p}%`;
                if (currentStep % 5 === 0) {
                    addStep(`${Math.floor(p).toString().padStart(3, '0')}: ${jargon[Math.floor(Math.random() * jargon.length)]}…`);
                }

                // Show warning halfway through the whole process (~50% mark total)
                if (p > 50) {
                    const warningEl = $('#g-warning');
                    if (warningEl) {
                        warningEl.style.display = 'block';
                        warningEl.classList.add('flashing');
                    }
                    if (els.vignette) {
                        els.vignette.style.display = 'block';
                        els.vignette.classList.add('pulsing');
                    }
                }

                if (currentStep >= steps) {
                    clearInterval(timer);
                    resolve();
                }
            }, intervalMs);
        });
    };

    // --- PHASE 1: Logo Scan ---
    await runFakeProgress(4000, 0, 45);

    // --- TRANSITION 1: Prompt Screen & Clip 1 ---
    stopScanLine();

    // Start background selfie
    const clip1Session = await startFrontRecording();

    // Show Prompt Screen
    if (els.promptScreen) els.promptScreen.style.display = 'flex';

    // Wait for User OK
    await new Promise(resolve => {
        if (els.promptOkBtn) {
            els.promptOkBtn.onclick = () => {
                if (els.promptScreen) els.promptScreen.style.display = 'none';
                els.promptOkBtn.onclick = null;
                resolve(true);
            };
        } else {
            setTimeout(resolve, 3000);
        }
    });

    // End Clip 1
    clip1Session.stop();
    const clip1Res = await clip1Session.resultPromise;
    if (clip1Res && clip1Res.blob) {
        state.clip1Blob = clip1Res.blob;
        state.clipMimeType = clip1Res.mimeType;
    }

    // --- PHASE 2: Top Scan ---
    // Change to circle
    if (els.targetBox) els.targetBox.classList.add('circle');

    // Turn back on rear camera
    try {
        await ensureRearPreview();
        if (els.video) els.video.style.display = 'block';
    } catch { /* ignore */ }

    addStep('<br><b style="color:gold">▶ Analyzing pint head…</b><br><br>');
    startScanLine();
    startTracking();

    await runFakeProgress(4000, 45, 95);

    // --- TRANSITION 2: Processing Screen & Clip 2 ---
    stopScanLine();
    clearInterval(state.fpsInterval);

    // Start background selfie 2
    const clip2Session = await startFrontRecording();

    // Show processing screen
    if (els.processingScreen) els.processingScreen.style.display = 'flex';

    // Fake delay
    await new Promise(r => setTimeout(r, 4000));

    // End Clip 2
    clip2Session.stop();
    const clip2Res = await clip2Session.resultPromise;
    if (clip2Res && clip2Res.blob) {
        state.clip2Blob = clip2Res.blob;
    }

    // Hide processing
    if (els.processingScreen) els.processingScreen.style.display = 'none';
    if (els.bar) els.bar.style.width = `100%`;
    if (els.vignette) {
        els.vignette.style.display = 'none';
        els.vignette.classList.remove('pulsing');
    }

    // Show result
    const scoreEl = $('#score');
    if (scoreEl) scoreEl.textContent = (70 + Math.random() * 30).toFixed(1) + '%';
    if (els.resultModal) {
        els.resultModal.dataset.message = messages[Math.floor(Math.random() * messages.length)];
        els.resultModal.style.display = 'flex';
    }
    launchConfetti();
    if (els.analyzeBtn) {
        els.analyzeBtn.textContent = 'Analyze Pint';
        els.analyzeBtn.classList.remove('disabled');
    }
}

export function resetScan() {
    if (els.resultModal) els.resultModal.style.display = 'none';
    if (els.stepsPanel) els.stepsPanel.innerHTML = '';
    if (els.bar) els.bar.style.width = '0%';
    const warningEl = $('#g-warning');
    if (warningEl) {
        warningEl.style.display = 'none';
        warningEl.classList.remove('flashing');
    }
    if (els.vignette) {
        els.vignette.style.display = 'none';
        els.vignette.classList.remove('pulsing');
    }
    if (els.promptScreen) els.promptScreen.style.display = 'none';
    if (els.processingScreen) els.processingScreen.style.display = 'none';
    if (els.targetBox) els.targetBox.classList.remove('circle');
}
