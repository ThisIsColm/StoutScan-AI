import { initUIElements, els } from './ui.js';
import { startCamera } from './camera.js';
import { analyzePint, resetScan } from './flow.js';
import { shareStory, composeAndReveal } from './result.js';

function observeModal() {
    if (!els.resultModal) return;
    new MutationObserver(() => {
        if (getComputedStyle(els.resultModal).display !== 'none') {
            composeAndReveal();
        }
    }).observe(els.resultModal, { attributes: true, attributeFilter: ['style', 'class'] });
}

document.addEventListener('DOMContentLoaded', () => {
    initUIElements();
    observeModal();

    if (els.enableBtn) {
        els.enableBtn.addEventListener('click', startCamera);
    }

    if (els.analyzeBtn) {
        els.analyzeBtn.addEventListener('click', analyzePint);
    }

    if (els.btnAgain) {
        els.btnAgain.addEventListener('click', resetScan);
    }

    if (els.chipContainer) {
        els.chipContainer.addEventListener('click', e => {
            if (e.target.classList.contains('chip')) {
                e.target.classList.toggle('active');
            }
        });
    }

    // Delegated events for dynamic buttons inside the modal
    document.addEventListener('click', e => {
        if (e.target.id === 'btnShare') shareStory();
        if (e.target.id === 'btnAgain') resetScan();
    });
});
