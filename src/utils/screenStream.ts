/**
 * Real-time screen capture stream utility.
 * Allows 1-tap automated screen capture without manual file upload.
 */

let activeStream: MediaStream | null = null;
let videoElement: HTMLVideoElement | null = null;

export function isScreenCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  );
}

export function isScreenStreamActive(): boolean {
  if (!activeStream) return false;
  const tracks = activeStream.getVideoTracks();
  return tracks.length > 0 && tracks[0].readyState === 'live';
}

export async function initScreenStream(): Promise<boolean> {
  if (!isScreenCaptureSupported()) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor',
      } as any,
      audio: false,
    });

    activeStream = stream;

    // Track termination handler (e.g. user clicks "Stop sharing")
    stream.getVideoTracks()[0].onended = () => {
      stopScreenStream();
    };

    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.setAttribute('autoplay', '');
      videoElement.setAttribute('playsinline', '');
      videoElement.muted = true;
    }

    videoElement.srcObject = stream;
    await videoElement.play();

    return true;
  } catch (err) {
    console.warn('Screen capture prompt dismissed or failed:', err);
    return false;
  }
}

export function captureCurrentScreenFrame(): string | null {
  if (!videoElement || !activeStream) {
    return null;
  }

  const track = activeStream.getVideoTracks()[0];
  if (!track || track.readyState !== 'live') {
    return null;
  }

  const width = videoElement.videoWidth || 1080;
  const height = videoElement.videoHeight || 1920;

  if (width === 0 || height === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(videoElement, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function stopScreenStream(): void {
  if (activeStream) {
    activeStream.getTracks().forEach((t) => t.stop());
    activeStream = null;
  }
  if (videoElement) {
    videoElement.srcObject = null;
    videoElement = null;
  }
}
