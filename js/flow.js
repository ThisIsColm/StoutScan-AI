import { state } from './state.js';
import { els, updateFpsConf, startScanLine, startTracking, stopScanLine, launchConfetti, $ } from './ui.js';
import { recordClip } from './capture.js';

const messages = [
    "Would ya ever just drink the fucking thing?", "Drink it, you dry-shite.", "Neck it, ya melt.", "Drink up before it goes warm, ya bollox.", "Neck it before I call yer mam to shame ye.", "You’re waitin’ for the head to write back to ya? Drink it.", "Jesus wept, I’ve seen toddlers finish their milk quicker.", "Jaysus, I’ve seen corpses drink faster.", "You’re slower than a funeral in the rain. Lash it into you!", "Stop starin’ at it like it owes ya money. Drink the pint.", "It’s a pint, not your long-lost father. Stop starin’ at it.", "Stop starin’ at the creamy head like it’s a feckin’ miracle.", "That pint’s been through more photo shoots than Kate Moss — drink it.", "Jaysus, it’s only a pint, not a work of art.", "This is a pub, not a feckin’ art gallery. Drink the pint. Now.", "You’re not savin’ it for your grandkids, drink it.", "If you loved it any more you’d have to marry the feckin’ thing.", "It’s a Guinness, not a feckin’ hostage — stop negotiatin’ and drink it.", "Stop fingering the glass and swallow it, ya gobshite.", "Quit fondling it like it’s your first shift. Get it into ye.", "Stop flirting with it and lash it back.", "Quit treatin’ it like a Tinder date and neck it.", "It’s not foreplay, it’s a feckin’ pint. Get it in ye.", "Stop making love to it and sink it you dry shite.", "Feck sake, you’d bore the head off it. Just drink it.", "Jaysus, you’d suck the craic out of a room. Just drink the pint.", "The head’s gone flatter than your love life, ya clown.", "You’re makin’ sobriety look like a chore.", "Christ, you’d be faster breastfeeding a pint than drinkin’ it.", "You’re holdin’ it like you’re afraid it’ll bite. It’s not a badger, drink it.", "You’re sittin’ there like a wet shite and drink it.", "Less Instagram, more alcoholism.", "It’s not communion wine, ya bollox, down it.", "Don’t be nursin’ it like a sick calf. Get it into ye.", "Don’t make me put it in a baby’s bottle for you. Just drink it.", "Would ya stop takin’ photos, it’s not goin’ in your OnlyFans — drink it.", "That pint’s been in your hand longer than your last relationship.", "Drink it before I rent it out as a feckin’ Airbnb.", "I’ve seen glaciers melt quicker — lash it back.", "If that pint was any older, it’d qualify for a pension.", "You’re guarding that pint like it’s a kilo of coke in a Garda raid.", "Drink it before I baptise you in it.", "I’ve seen nuns sin faster — get it into ye.", "That pint’s been in more selfies than a Love Island contestant.", "The foam’s writing its will, just drink it.", "It’s not a feckin’ candlelit dinner, it’s a pint.", "Holdin’ it like you’re expecting it to propose — just drink it."
];

export function analyzePint() {
    els.stepsPanel.innerHTML = '';
    els.analyzeBtn.textContent = 'Analysis in progress…';
    els.analyzeBtn.classList.add('disabled');
    state.fpsInterval = setInterval(updateFpsConf, 500);
    startScanLine();
    startTracking();

    const jargon = [
        'Calibrating foam displacement vectors', 'Extracting serif alignment matrix', 'Computing pint-level spectral density', 'Analyzing bubble distribution gradients', 'Mapping liquid meniscus curvature', 'Evaluating pour velocity regression model', 'Isolating G-character pixel clusters', 'Applying stout-tone histogram equalization', 'Detecting foam-liquid interface anomalies', 'Cross-referencing pint signature in database', 'Running pint integrity checksum', 'Synchronizing pour-phase oscillation patterns', 'Interpolating Guinness viscosity coefficients', 'Rendering head-retention spline curves', 'Scanning for pint-origin geotag anomalies', 'Simulating nitrogen cascade decay model', 'Measuring sip-latency throughput', 'Optimizing foam stratification index', 'Decrypting froth entropy packets', 'Integrating pint-level telemetry data', 'Applying stout-turbulence Fourier transform', 'Calibrating head-density eigenvectors', 'Analyzing pint waveform harmonics', 'Reconstructing pour-angle hologram', 'Quantifying malt-phase spectral shift', 'Running head-foam compression algorithm', 'Normalizing bubble anisotropy matrix', 'Performing stout DNA sequence mapping', 'Aligning pour-path vector field', 'Generating pint hydration blockchain record'
    ];
    const totalSteps = 130;
    const phase1End = 65;
    const stepIntervalMs = 70;
    const clipDurationMs = Math.floor(phase1End * stepIntervalMs); // ~4550ms per clip
    const fakeSteps = [];
    for (let i = 1; i <= totalSteps; i++) {
        fakeSteps.push(`${i.toString().padStart(3, '0')}: ${jargon[Math.floor(Math.random() * jargon.length)]}…`);
    }

    let idx = 0;
    let clip1Started = false;
    let clip2Started = false;
    let phase1Paused = false;

    clip1Started = true;
    recordClip(1, clipDurationMs);

    const interval = setInterval(() => {
        if (phase1Paused) return;

        const progressPercent = (idx / fakeSteps.length) * 100;
        const warningEl = $('#g-warning');
        if (progressPercent >= 50) {
            if (warningEl) {
                warningEl.style.display = 'block';
                warningEl.classList.add('flashing');
            }
            if (els.vignette) {
                els.vignette.style.display = 'block';
                els.vignette.classList.add('pulsing');
            }
        }

        if (els.stepsPanel) {
            els.stepsPanel.innerHTML += fakeSteps[idx] + '<br>';
            els.stepsPanel.scrollTop = els.stepsPanel.scrollHeight;
        }
        idx++;
        if (els.bar) els.bar.style.width = `${progressPercent}%`;

        if (idx === phase1End && !clip2Started) {
            phase1Paused = true;
            clip2Started = true;
            if (els.stepsPanel) {
                els.stepsPanel.innerHTML += '<br><b style="color:gold">▶ Analyzing pint head…</b><br><br>';
                els.stepsPanel.scrollTop = els.stepsPanel.scrollHeight;
            }

            setTimeout(() => {
                recordClip(2, clipDurationMs);
                phase1Paused = false;
            }, 1000);
            return;
        }

        if (idx >= fakeSteps.length) {
            clearInterval(interval);
            clearInterval(state.fpsInterval);
            stopScanLine();
            setTimeout(() => {
                if (els.vignette) {
                    els.vignette.style.display = 'none';
                    els.vignette.classList.remove('pulsing');
                }
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
            }, 500);
        }
    }, stepIntervalMs);
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
}
