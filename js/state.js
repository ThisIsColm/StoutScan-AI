export const state = {
    clip1Blob: null,
    clip2Blob: null,
    clip1Url: null,
    clip2Url: null,
    clipMimeType: 'video/webm',
    composing: false,
    cameraReady: false,
    userInitiated: false,

    // UI status
    fpsInterval: null,
    scanAnim: null,
    pos: 0,
    dir: 1,

    // AR tracking
    trackingState: {
        active: false,
        animationFrameId: null,
        points: [],
        cx: 0,
        cy: 0,
        targetX: 0,
        targetY: 0,
        lastUpdate: 0
    }
};
