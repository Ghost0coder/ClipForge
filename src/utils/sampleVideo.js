/**
 * Built-in test video generator for ClipForge.
 * Generates an actual 4-second animated video clip (1280x720) with dynamic graphics,
 * animated timecode, geometric visualizers, and synth audio track, without requiring external network requests.
 */
export async function generateSampleVideoBlob() {
  console.log('[ClipForge:Upload] Generating built-in sample test video clip...');

  const width = 1280;
  const height = 720;
  const fps = 30;
  const durationSec = 4;
  const totalFrames = fps * durationSec;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available for sample video creation');
  }

  // Setup Web Audio synthesizer for test audio tone in the video stream
  let audioTrack = null;
  let audioContext = null;
  try {
    const AudioCtx = window.AudioContext || (window ).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      const dest = audioContext.createMediaStreamDestination();
      
      // Play a pleasant ambient chime chord
      const freqs = [330, 440, 554.37, 659.25]; // E, A, C#, E
      freqs.forEach((freq, idx) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, audioContext.currentTime);
        
        // Soft pulsing envelope
        gain.gain.setValueAtTime(0.04, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, audioContext.currentTime + durationSec);
        
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        osc.stop(audioContext.currentTime + durationSec);
      });

      if (dest.stream.getAudioTracks().length > 0) {
        audioTrack = dest.stream.getAudioTracks()[0];
      }
    }
  } catch (audioErr) {
    console.warn('[ClipForge:Upload] Web Audio generation note:', audioErr);
  }

  // Choose supported MIME type
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }
    }
  }

  const canvasStream = canvas.captureStream(fps);
  if (audioTrack) {
    canvasStream.addTrack(audioTrack);
  }

  const chunks = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    videoBitsPerSecond: 6000000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  recorder.start(100);

  // Render each frame of animation onto the canvas
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / fps; // Current time in seconds (0.0 to 4.0)
    const progress = t / durationSec;

    // 1. Dynamic background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    const hue1 = (250 + progress * 80) % 360;
    const hue2 = (180 + progress * 60) % 360;
    bgGrad.addColorStop(0, `hsl(${hue1}, 65%, 12%)`);
    bgGrad.addColorStop(0.5, `hsl(${(hue1 + hue2) / 2}, 70%, 8%)`);
    bgGrad.addColorStop(1, `hsl(${hue2}, 75%, 10%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Animated grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 64;
    const gridOffset = (progress * 128) % gridSize;
    for (let x = gridOffset; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = gridOffset; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Central pulsing neon geometric circles
    const centerX = width / 2;
    const centerY = height / 2 - 30;
    for (let ring = 1; ring <= 4; ring++) {
      const radius = 60 * ring + Math.sin(t * 3 + ring) * 15;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = ring % 2 === 0 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2 + ring;
      ctx.stroke();
    }

    // 4. Rotating motion badge
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(t * 1.5);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.strokeRect(-40, -40, 80, 80);
    ctx.restore();

    // 5. Title & branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLIPFORGE SAMPLE VIDEO', centerX, centerY + 160);

    ctx.font = '600 20px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('1080p • 30 FPS • ProRes Test Pattern', centerX, centerY + 200);

    // 6. Large digital timecode display
    const mins = '00';
    const secs = String(Math.floor(t)).padStart(2, '0');
    const ms = String(Math.floor((t % 1) * 100)).padStart(2, '0');
    const timecode = `${mins}:${secs}.${ms}`;

    // Timecode box
    const boxW = 280;
    const boxH = 54;
    const boxX = centerX - boxW / 2;
    const boxY = height - 120;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 30px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(timecode, centerX, boxY + 38);

    // 7. Visual audio-spectrum bars at the bottom
    const barCount = 32;
    const barWidth = 12;
    const barSpacing = 8;
    const totalBarsWidth = barCount * (barWidth + barSpacing);
    const startX = (width - totalBarsWidth) / 2;
    for (let b = 0; b < barCount; b++) {
      const barH = 10 + Math.abs(Math.sin(t * 8 + b * 0.4)) * 38;
      const x = startX + b * (barWidth + barSpacing);
      const y = height - 35 - barH;
      ctx.fillStyle = b % 2 === 0 ? '#818cf8' : '#22d3ee';
      ctx.fillRect(x, y, barWidth, barH);
    }

    // Small delay to allow the MediaRecorder to process frames smoothly
    await new Promise((r) => setTimeout(r, 12));
  }

  return new Promise((resolve, reject) => {
    recorder.onerror = (e) => {
      console.error('[ClipForge:Upload] Sample video recorder error:', e);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      reject(new Error('Sample video recording failed'));
    };

    recorder.onstop = () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      console.log('[ClipForge:Upload] Sample test video generated successfully!', {
        size: blob.size,
        duration: durationSec,
        mimeType,
      });
      resolve({ blob, url, duration: durationSec });
    };

    recorder.stop();
  });
}
