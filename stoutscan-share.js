(() => {
  const $ = (s, r = document) => r.querySelector(s);

  // Bump the ?v= value whenever you update the PNG to avoid stale caches.
  const BRANDING = {
    overlayUrl: '/assets/share-overlay.png?v=2025-08-11-2',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
    textColor: '#FFFFFF',
    strokeColor: 'rgba(0,0,0,0.55)'
  };

  let fullResBlob = null, placeholderUrl = null, fullResUrl = null;
  let composing = false;
  let cameraReady = false;
  let userInitiated = false;

  function ensureButtons() {
    const modal = $('#resultModal');
    if (!modal) return;
    const againBtn = $('#btnAgain');
    const container = againBtn?.parentElement;
    if (!container) return;
    
    let shareBtn = $('#btnShare');
    if (!shareBtn) {
      shareBtn = document.createElement('button');
      shareBtn.id = 'btnShare';
      shareBtn.className = 'btn disabled';
      shareBtn.textContent = 'Share'; // Shortened text for side-by-side
      shareBtn.disabled = true;
      // Insert Share button before the 'Scan Again' button
      container.insertBefore(shareBtn, againBtn);
    }
    shareBtn.style.display = 'inline-block';
  }

  // ---------- CAMERA SELECTION (robust, but only after user click) ----------
  async function pickRearDeviceId() {
    const cached = sessionStorage.getItem('rearDeviceId');
    if (cached) return cached;

    if (userInitiated) {
      try {
        const hasStream = !!($('#video')?.srcObject);
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

  async function ensureRearPreview() {
    const rearVideo = $('#video');
    if (!rearVideo) return;

    const active = !!(rearVideo.srcObject && rearVideo.srcObject.getVideoTracks && rearVideo.srcObject.getVideoTracks().some(t => t.readyState === 'live'));
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
      rearVideo.playsInline = true;
      rearVideo.muted = true;
      rearVideo.srcObject = rs;
      await rearVideo.play();
      cameraReady = true;
    } catch (err) {
      console.error('ensureRearPreview failed:', err);
    }
  }

  // Expose a user-initiated starter to keep your existing button flow.
  window.startCamera = async function startCamera() {
    userInitiated = true;
    await ensureRearPreview();
    const video = $('#video'), overlay = $('#overlay'), inactive = $('#inactive');
    if (video) video.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
    if (inactive) inactive.style.display = 'none';
  };

  function captureRearFrameCanvas() {
    const video = $('#video');
    if (!video || !video.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    return c;
  }

  async function captureSelfieFrameCanvas() {
    const tmpStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false
    });
    const v = document.createElement('video');
    v.srcObject = tmpStream; v.playsInline = true; v.muted = true; await v.play();
    await new Promise(r => setTimeout(r, 200));
    const c = document.createElement('canvas');
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    tmpStream.getTracks().forEach(t => t.stop());
    await ensureRearPreview();
    return c;
  }

  function drawCroppedCenter(ctx, srcCanvas, targetW, targetH, xOffset, yOffset) {
    const scale = Math.max(targetW / srcCanvas.width, targetH / srcCanvas.height);
    const sx = (srcCanvas.width - targetW / scale) / 2;
    const sy = (srcCanvas.height - targetH / scale) / 2;
    ctx.drawImage(srcCanvas, sx, sy, targetW / scale, targetH / scale, xOffset, yOffset, targetW, targetH);
  }

  function wrapText(ctx, text, maxWidth) {
    const words = (text || '').trim().split(/\s+/).filter(Boolean);
    let lines = [], line = '';
    for (const word of words) {
      const tentative = line ? `${line} ${word}` : word;
      if (ctx.measureText(tentative).width <= maxWidth) {
        line = tentative;
      } else {
        if(line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function fitMultiline(ctx, text, maxWidth, maxHeight, fontFamily, weight) {
    let lo = 8, hi = Math.floor(maxHeight), best = 8, bestLines = [''];
    const LINE_HEIGHT = 1.15;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      ctx.font = `${weight} ${mid}px ${fontFamily}`;
      const lines = wrapText(ctx, text, maxWidth);
      const totalH = lines.length * (mid * LINE_HEIGHT);
      if (totalH <= maxHeight) {
        best = mid; bestLines = lines; lo = mid + 1;
      } else hi = mid - 1;
    }
    return { fontSize: best, lines: bestLines, lineHeight: best * LINE_HEIGHT };
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath();
  }

  async function drawOverlay(ctx, W, H, url) {
    try {
      const f = new Image(); f.crossOrigin = 'anonymous'; f.src = url; await f.decode();
      ctx.drawImage(f, 0, 0, W, H);
    } catch { /* ignore cache-busting for now */ }
  }

  async function buildFramedImage(pintCanvas, selfieCanvas, W, H, messageText, quality = 0.92) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const headerHeight = Math.round(H * 0.28), footerHeight = Math.round(H * 0.12);
    const contentHeight = H - headerHeight - footerHeight;
    const inset = Math.round(Math.min(W, H) * 0.03);
    const rectX = inset, rectY = headerHeight + inset, rectW = W - inset * 2, rectH = contentHeight - inset * 2;
    const radius = Math.round(Math.min(rectW, rectH) * 0.04);
    ctx.save();
    roundedRectPath(ctx, rectX, rectY, rectW, rectH, radius);
    ctx.clip();
    const halfW = Math.floor(rectW / 2);
    drawCroppedCenter(ctx, pintCanvas, halfW, rectH, rectX, rectY);
    drawCroppedCenter(ctx, selfieCanvas, rectW - halfW, rectH, rectX + halfW, rectY);
    ctx.restore();
    if (BRANDING.overlayUrl) await drawOverlay(ctx, W, H, BRANDING.overlayUrl);
    ctx.fillStyle = BRANDING.textColor; ctx.strokeStyle = BRANDING.strokeColor;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const targetH = Math.floor(headerHeight * 0.80), targetW = Math.floor(W * 0.90);
    const msg = (messageText || '').trim();
    if (msg) {
      const { fontSize, lines, lineHeight } = fitMultiline(ctx, msg, targetW, targetH, BRANDING.fontFamily, '800');
      ctx.font = `800 ${fontSize}px ${BRANDING.fontFamily}`;
      ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.08));
      let y = Math.floor(headerHeight / 2 - (lines.length * lineHeight) / 2 + lineHeight / 2);
      for (const L of lines) {
        ctx.strokeText(L, W / 2, y); ctx.fillText(L, W / 2, y); y += lineHeight;
      }
    }
    return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', quality));
  }
  
  async function shareStory() {
    if (!fullResBlob) return;
    const file = new File([fullResBlob], 'stoutscan-result.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My StoutScan Result' });
      } catch (err) {
        console.log('Share cancelled or failed.', err);
      }
    } else {
      // Fallback for desktop or browsers that can't share files
      const a = document.createElement('a');
      a.href = fullResUrl;
      a.download = 'stoutscan-result.jpg';
      a.click();
    }
  }

  function enableShareButton() {
    const shareBtn = $('#btnShare');
    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.classList.remove('disabled');
      shareBtn.classList.add('yellow');
    }
  }

  function resetReveal() {
    // Revoke old URLs to free memory
    if (placeholderUrl) URL.revokeObjectURL(placeholderUrl);
    if (fullResUrl) URL.revokeObjectURL(fullResUrl);
    fullResBlob = null; placeholderUrl = null; fullResUrl = null;

    const revealImage = $('#revealImage');
    if (revealImage) {
      revealImage.classList.remove('resolved');
      revealImage.style.backgroundImage = 'none';
    }
    
    const shareBtn = $('#btnShare');
    if (shareBtn) {
      shareBtn.disabled = true;
      shareBtn.classList.add('disabled');
      shareBtn.classList.remove('yellow');
    }
  }

  async function composeAndReveal() {
    if (!cameraReady || composing) return;
    const modal = $('#resultModal');
    if (!modal || getComputedStyle(modal).display === 'none') return;
    if (!$('#video') || $('#video').readyState < 2) return;
    
    composing = true;
    ensureButtons();
    resetReveal();

    const pintCanvas = captureRearFrameCanvas();
    if (!pintCanvas) {
      composing = false;
      return;
    }

    const revealImage = $('#revealImage');
    const message = ($('#resultModal')?.dataset.message || '').trim();

    // 1. Generate a tiny, blurry placeholder image first.
    const placeholderBlob = await buildFramedImage(pintCanvas, pintCanvas, 27, 48, '', 0.1);
    placeholderUrl = URL.createObjectURL(placeholderBlob);
    revealImage.style.backgroundImage = `url(${placeholderUrl})`;

    // 2. In parallel, capture selfie and create the full quality image.
    const selfieCanvas = await captureSelfieFrameCanvas();
    fullResBlob = await buildFramedImage(pintCanvas, selfieCanvas, 720, 1280, message, 0.92);
    fullResUrl = URL.createObjectURL(fullResBlob);
    
    // 3. Trigger the reveal animation.
    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        revealImage.style.backgroundImage = `url(${fullResUrl})`;
        revealImage.classList.add('resolved');
        enableShareButton();
        composing = false;
      };
      img.src = fullResUrl;
    }, 200); // A small delay to ensure the placeholder is rendered.
  }

  function observeModal() {
    const modal = $('#resultModal');
    if (!modal) return;
    new MutationObserver(() => {
      if (getComputedStyle(modal).display !== 'none') {
        composeAndReveal();
      }
    }).observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  document.addEventListener('DOMContentLoaded', () => {
    observeModal();
    document.addEventListener('click', e => {
      if (e.target.id === 'btnShare') shareStory();
      if (e.target.id === 'btnAgain') {
        // The main `resetScan` in index.html already hides the modal.
        // We just need to clean up our generated assets.
        resetReveal();
      }
    });
  });

})();