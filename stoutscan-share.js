(() => {
  const $ = (s, r = document) => r.querySelector(s);

  // ---------- State ----------
  let clip1Blob = null, clip2Blob = null;
  let clip1Url = null, clip2Url = null;
  let clipMimeType = 'video/webm';
  let composing = false;
  let cameraReady = false;
  let userInitiated = false;

  // ---------- UI helpers ----------
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
      shareBtn.textContent = 'Share';
      shareBtn.disabled = true;
      container.insertBefore(shareBtn, againBtn);
    }
    shareBtn.style.display = 'inline-block';
  }

  // ---------- CAMERA SELECTION ----------
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

  // ---------- Rear camera stop ----------
  function stopRearCamera() {
    const rearVideo = $('#video');
    if (rearVideo && rearVideo.srcObject) {
      rearVideo.srcObject.getTracks().forEach(t => t.stop());
      rearVideo.srcObject = null;
    }
  }

  // ---------- Front-camera video recording ----------
  function pickMimeType() {
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

  /**
   * Records a front-camera clip for `durationMs` milliseconds.
   * Returns { blob, mimeType } or null if recording fails.
   */
  async function recordFrontClip(durationMs) {
    let frontStream = null;
    try {
      // Stop the rear camera first — mobile browsers typically can't use two cameras at once.
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

      // Record for the requested duration, then stop.
      await new Promise(r => setTimeout(r, durationMs));
      if (recorder.state === 'recording') recorder.stop();

      await stopped;

      // Clean up front-camera stream.
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

  // ---------- Exposed hook for analyzePint phases ----------
  /**
   * Called from analyzePint() during each analysis phase.
   * clipIndex: 1 or 2
   * durationMs: how long to record
   */
  window._stoutScanRecordClip = async function(clipIndex, durationMs) {
    try {
      const result = await recordFrontClip(durationMs);
      if (!result) return;

      if (clipIndex === 1) {
        clip1Blob = result.blob;
        clipMimeType = result.mimeType;
      } else {
        clip2Blob = result.blob;
        clipMimeType = result.mimeType;
      }
    } catch (err) {
      console.error(`_stoutScanRecordClip(${clipIndex}) failed:`, err);
    }

    // Restart rear camera for continued analysis display.
    try {
      await ensureRearPreview();
      const vid = $('#video');
      if (vid) vid.style.display = 'block';
    } catch { /* ignore */ }
  };

  // ---------- Capture pint freeze-frame (still used) ----------
  function captureRearFrameCanvas() {
    const video = $('#video');
    if (!video || !video.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    return c;
  }

  // ---------- Share / Download ----------
  function fileExtension() {
    if (clipMimeType.includes('mp4')) return 'mp4';
    return 'webm';
  }

  async function shareStory() {
    const blob = clip1Blob || clip2Blob;
    if (!blob) return;

    const ext = fileExtension();
    const file = new File([blob], `stoutscan-result.${ext}`, { type: clipMimeType });

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

  function enableShareButton() {
    const shareBtn = $('#btnShare');
    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.classList.remove('disabled');
      shareBtn.classList.add('yellow');
    }
  }

  // ---------- Reset ----------
  function resetReveal() {
    // Revoke old clip URLs
    if (clip1Url) { URL.revokeObjectURL(clip1Url); clip1Url = null; }
    if (clip2Url) { URL.revokeObjectURL(clip2Url); clip2Url = null; }
    clip1Blob = null;
    clip2Blob = null;

    // Reset video elements
    const v1 = $('#clip1Video');
    const v2 = $('#clip2Video');
    [v1, v2].forEach(v => {
      if (!v) return;
      v.pause();
      v.removeAttribute('src');
      v.load();
    });

    // Hide the fallback message if present
    const fallback = $('#videoFallback');
    if (fallback) fallback.style.display = 'none';

    const shareBtn = $('#btnShare');
    if (shareBtn) {
      shareBtn.disabled = true;
      shareBtn.classList.add('disabled');
      shareBtn.classList.remove('yellow');
    }
  }

  // ---------- Compose & Reveal (video version) ----------
  async function composeAndReveal() {
    if (composing) return;
    const modal = $('#resultModal');
    if (!modal || getComputedStyle(modal).display === 'none') return;

    composing = true;
    ensureButtons();
    resetReveal();

    const v1 = $('#clip1Video');
    const v2 = $('#clip2Video');
    const fallback = $('#videoFallback');

    const hasClip1 = !!clip1Blob;
    const hasClip2 = !!clip2Blob;

    if (!hasClip1 && !hasClip2) {
      // No clips recorded — show fallback
      if (fallback) {
        fallback.style.display = 'block';
        fallback.textContent = 'Video recording was unavailable on this device.';
      }
      composing = false;
      return;
    }

    if (hasClip1 && v1) {
      clip1Url = URL.createObjectURL(clip1Blob);
      v1.src = clip1Url;
      v1.load();
      v1.play().catch(() => {});
    }

    if (hasClip2 && v2) {
      clip2Url = URL.createObjectURL(clip2Blob);
      v2.src = clip2Url;
      v2.load();
      v2.play().catch(() => {});
    }

    enableShareButton();
    composing = false;
  }

  // ---------- Observer ----------
  function observeModal() {
    const modal = $('#resultModal');
    if (!modal) return;
    new MutationObserver(() => {
      if (getComputedStyle(modal).display !== 'none') {
        composeAndReveal();
      }
    }).observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', () => {
    observeModal();
    document.addEventListener('click', e => {
      if (e.target.id === 'btnShare') shareStory();
      if (e.target.id === 'btnAgain') {
        resetReveal();
      }
    });
  });

})();