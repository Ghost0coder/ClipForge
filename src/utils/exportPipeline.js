import { ASPECT_RATIOS } from '../types/editor';
import { renderFrame } from './previewRenderer';
import { applyAudioFilters } from './audioFilterUtils';
import { toastError } from '../store/toastStore';

/**
 * Helper to slice and reverse an AudioBuffer for reversed clips
 */
function createReversedAudioSegment(ctx, originalBuffer, startSec, durSec) {
  const sr = originalBuffer.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sr));
  const numSamples = Math.min(originalBuffer.length - startSample, Math.ceil(durSec * sr));
  if (numSamples <= 0) return originalBuffer;

  const revBuffer = ctx.createBuffer(originalBuffer.numberOfChannels, numSamples, sr);
  for (let ch = 0; ch < originalBuffer.numberOfChannels; ch++) {
    const srcChannel = originalBuffer.getChannelData(ch);
    const destChannel = revBuffer.getChannelData(ch);
    for (let i = 0; i < numSamples; i++) {
      destChannel[i] = srcChannel[startSample + numSamples - 1 - i] || 0;
    }
  }
  return revBuffer;
}

/**
 * Calculates effective playback rate incorporating clip speed, pitch shift, and voice changer presets
 */
function getClipPlaybackRate(clip) {
  const speed = clip.speed || 1.0;
  const pitchShiftSt = clip.audioProps?.pitchShift || 0;
  const voiceChanger = clip.audioProps?.voiceChanger || 'none';
  let pitchMultiplier = Math.pow(2, pitchShiftSt / 12);
  if (voiceChanger === 'deep') pitchMultiplier *= 0.82;
  else if (voiceChanger === 'high') pitchMultiplier *= 1.25;
  else if (voiceChanger === 'chipmunk') pitchMultiplier *= 1.55;
  else if (voiceChanger === 'robot') pitchMultiplier *= 0.95;
  return Math.max(0.2, Math.min(speed * pitchMultiplier, 4.0));
}

/**
 * Schedules volume, keyframes, fade-in, and fade-out automation onto a GainNode
 */
function applyVolumeAutomation(gainNode, clip, track, when, duration) {
  const trackVol = track.volume !== undefined ? track.volume : 1.0;
  const baseClipVol = clip.audioProps?.volume !== undefined ? clip.audioProps.volume : 1.0;
  const targetVol = Math.max(0, Math.min(baseClipVol * trackVol, 2.0));

  const volKfs = (clip.keyframes || [])
    .filter((k) => k.property === 'volume')
    .sort((a, b) => a.time - b.time);

  if (volKfs.length > 0) {
    gainNode.gain.setValueAtTime(volKfs[0].value * trackVol, when);
    for (const kf of volKfs) {
      const kfTime = when + Math.min(duration, Math.max(0, kf.time));
      gainNode.gain.linearRampToValueAtTime(kf.value * trackVol, kfTime);
    }
  } else {
    gainNode.gain.setValueAtTime(targetVol, when);
  }

  const fadeIn = clip.audioProps?.fadeIn || 0;
  const fadeOut = clip.audioProps?.fadeOut || 0;

  if (fadeIn > 0) {
    gainNode.gain.setValueAtTime(0, when);
    gainNode.gain.linearRampToValueAtTime(targetVol, when + Math.min(fadeIn, duration));
  }
  if (fadeOut > 0) {
    const fadeOutStart = when + Math.max(0, duration - fadeOut);
    gainNode.gain.setValueAtTime(targetVol, fadeOutStart);
    gainNode.gain.linearRampToValueAtTime(0, when + duration);
  }
}

export class ExportPipeline {
  constructor() {
    this.isCancelled = false;
    this.audioCtx = null;
  }

  cancel() {
    this.isCancelled = true;
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
  }

  async exportProject(project, settings, onProgress) {
    this.isCancelled = false;
    console.log('[ClipForge:Export] Pipeline starting exportProject:', {
      projectName: project.name,
      duration: project.duration,
      format: settings.format,
      resolution: settings.resolution,
      fps: settings.fps,
      quality: settings.quality,
      watermark: settings.watermark,
    });

    // Handle single frame PNG capture
    if (settings.format === 'png-frame') {
      return this.exportSingleFramePNG(project, settings, onProgress);
    }

    // Handle audio-only MP3 / WAV capture
    if (settings.format === 'mp3') {
      return this.exportAudioOnly(project, settings, onProgress);
    }

    // Resolution dimensions
    const ratioConfig = ASPECT_RATIOS[project.aspectRatio] || { width: 1920, height: 1080 };
    let targetWidth = ratioConfig.width;
    let targetHeight = ratioConfig.height;

    if (settings.resolution === '480p') {
      const scale = 480 / targetHeight;
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = 480;
    } else if (settings.resolution === '720p') {
      const scale = 720 / targetHeight;
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = 720;
    } else if (settings.resolution === '1080p') {
      // standard 1080p base
    } else if (settings.resolution === '2K') {
      targetWidth = Math.round(targetWidth * 1.33);
      targetHeight = Math.round(targetHeight * 1.33);
    } else if (settings.resolution === '4K') {
      targetWidth = Math.round(targetWidth * 2);
      targetHeight = Math.round(targetHeight * 2);
    }

    // Ensure even dimensions for video codecs
    targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
    targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

    // Setup off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    const fps = settings.fps || 30;
    const totalDuration = Math.max(project.duration, 0.5);
    const totalFrames = Math.max(1, Math.floor(totalDuration * fps));

    // 1. Setup Audio Mixing via Web Audio API & MediaStreamDestination
    let audioCtx = null;
    let audioDest = null;
    const isVideoFormat = settings.format === 'mp4' || settings.format === 'webm';

    if (isVideoFormat) {
      onProgress({
        percentage: 0,
        currentFrame: 0,
        totalFrames,
        statusText: 'Preparing timeline audio mix...',
        etaText: 'Starting...',
        isComplete: false,
      });

      // Gather all audible clips on unmuted tracks
      const audibleClips = [];
      project.tracks.forEach((track) => {
        if (track.muted || track.hidden) return;
        track.clips.forEach((clip) => {
          if ((clip.type === 'audio' || clip.type === 'video') && clip.mediaUrl && !clip.audioProps?.mute) {
            audibleClips.push({ clip, track });
          }
        });
      });

      if (audibleClips.length > 0) {
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          audioCtx = new AudioContextClass({ sampleRate: 44100 });
          this.audioCtx = audioCtx;
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          audioDest = audioCtx.createMediaStreamDestination();

          // Master Output Bus & Limiter
          const masterGain = audioCtx.createGain();
          masterGain.gain.setValueAtTime(project.masterVolume !== undefined ? project.masterVolume : 1.0, audioCtx.currentTime);

          if (project.masterLimiter !== false) {
            const limiter = audioCtx.createDynamicsCompressor();
            limiter.threshold.setValueAtTime(-1.0, audioCtx.currentTime);
            limiter.knee.setValueAtTime(0, audioCtx.currentTime);
            limiter.ratio.setValueAtTime(20, audioCtx.currentTime);
            limiter.attack.setValueAtTime(0.003, audioCtx.currentTime);
            limiter.release.setValueAtTime(0.1, audioCtx.currentTime);
            masterGain.connect(limiter);
            limiter.connect(audioDest);
          } else {
            masterGain.connect(audioDest);
          }

          // Fetch and decode audio buffers
          const decodedBuffers = new Map();
          for (const { clip } of audibleClips) {
            if (!decodedBuffers.has(clip.mediaUrl)) {
              const resp = await fetch(clip.mediaUrl);
              if (!resp.ok) throw new Error(`Could not load audio for clip "${clip.name}"`);
              const arrayBuf = await resp.arrayBuffer();
              const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
              decodedBuffers.set(clip.mediaUrl, audioBuf);
            }
          }

          // Detect voice presence for Auto-Ducking
          const autoDucking = project.autoDucking;
          const hasAutoDucking = autoDucking && autoDucking.enabled;
          const voiceIntervals = [];
          if (hasAutoDucking) {
            project.tracks.forEach((t) => {
              if (t.muted || t.hidden) return;
              if (t.type === 'video' || t.name.toLowerCase().includes('voice')) {
                t.clips.forEach((c) => {
                  if (c.mediaUrl && !c.audioProps?.mute) {
                    voiceIntervals.push({ start: c.start, end: c.start + c.duration });
                  }
                });
              }
            });
          }

          // Schedule each clip with volume, keyframes, fades, speed, reverse, pan, and filter chain
          const audioStartTime = audioCtx.currentTime + 0.05;
          for (const { clip, track } of audibleClips) {
            const fullBuffer = decodedBuffers.get(clip.mediaUrl);
            if (!fullBuffer) continue;

            const speed = clip.speed || 1.0;
            const sourceDuration = clip.duration * speed;
            const sourceStart = clip.sourceStart || 0;
            const playbackRate = getClipPlaybackRate(clip);

            const sourceNode = audioCtx.createBufferSource();
            if (clip.reverse) {
              const revBuffer = createReversedAudioSegment(audioCtx, fullBuffer, sourceStart, sourceDuration);
              sourceNode.buffer = revBuffer;
              sourceNode.playbackRate.value = playbackRate;
              sourceNode.start(audioStartTime + clip.start, 0, clip.duration);
            } else {
              sourceNode.buffer = fullBuffer;
              sourceNode.playbackRate.value = playbackRate;
              sourceNode.start(audioStartTime + clip.start, sourceStart, sourceDuration);
            }

            const gainNode = audioCtx.createGain();
            applyVolumeAutomation(gainNode, clip, track, audioStartTime + clip.start, clip.duration);

            // Apply Auto-Ducking attenuation to music tracks during voice
            if (hasAutoDucking && track.type === 'audio') {
              const duckMult = Math.max(0.1, 1 - (autoDucking.amount || 60) / 100);
              const fadeDur = autoDucking.fadeDuration || 0.4;
              voiceIntervals.forEach((interval) => {
                const overlapStart = Math.max(clip.start, interval.start);
                const overlapEnd = Math.min(clip.start + clip.duration, interval.end);
                if (overlapEnd > overlapStart) {
                  const tStart = audioStartTime + overlapStart;
                  const tEnd = audioStartTime + overlapEnd;
                  const curGain = gainNode.gain.value;
                  gainNode.gain.setValueAtTime(curGain, Math.max(audioStartTime + clip.start, tStart - fadeDur));
                  gainNode.gain.linearRampToValueAtTime(curGain * duckMult, tStart);
                  gainNode.gain.setValueAtTime(curGain * duckMult, tEnd);
                  gainNode.gain.linearRampToValueAtTime(curGain, Math.min(audioStartTime + clip.start + clip.duration, tEnd + fadeDur));
                }
              });
            }

            // Connect filter chain: sourceNode -> [Noise Reduction & Equalizer] -> gainNode
            applyAudioFilters(audioCtx, clip, sourceNode, gainNode);

            // Apply Track Pan
            if (audioCtx.createStereoPanner && track.pan !== undefined && track.pan !== 0) {
              const panner = audioCtx.createStereoPanner();
              panner.pan.setValueAtTime(Math.max(-1, Math.min(1, track.pan)), audioStartTime);
              gainNode.connect(panner);
              panner.connect(masterGain);
            } else {
              gainNode.connect(masterGain);
            }
          }
        } catch (audioMixErr) {
          console.error('[ClipForge:Export] Audio mixing failed:', audioMixErr);
          toastError(
            `Audio mixing failed: ${audioMixErr.message}. Please check media files.`,
            'Audio Export Error'
          );
          throw new Error(`Audio mixing failed: ${audioMixErr.message}`);
        }
      }
    }

    // 2. Setup Canvas Capture & MediaRecorder with Mixed Audio Track
    const stream = canvas.captureStream(fps);
    if (audioDest) {
      const audioTracks = audioDest.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        stream.addTrack(audioTracks[0]);
        console.log('[ClipForge:Export] Successfully added mixed audio track to video stream.');
      }
    }

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }
      }
    }

    const recordedChunks = [];
    let bitrate = 5000000; // 5 Mbps default
    if (settings.quality === 'ultra') bitrate = 20000000;
    else if (settings.quality === 'high') bitrate = 10000000;
    else if (settings.quality === 'low') bitrate = 2000000;

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrate,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    recorder.start(100);

    // Frame-by-frame rendering loop synchronized with real-time audio playback
    const frameInterval = 1 / fps;
    const frameDelayMs = 1000 / fps;
    const exportStartTime = performance.now();

    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) {
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch (e) {}
        if (audioCtx) {
          try {
            audioCtx.close();
          } catch (e) {}
          this.audioCtx = null;
        }
        onProgress({
          percentage: 0,
          currentFrame: frame,
          totalFrames,
          statusText: 'Export cancelled',
          etaText: '0s',
          isComplete: false,
        });
        return null;
      }

      const currentTime = frame * frameInterval;
      renderFrame(ctx, project, currentTime, {
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        isExporting: true,
        showSafeGuides: false,
      });

      // Optional Watermark Overlay
      if (settings.watermark && settings.watermark.enabled) {
        const wmText = settings.watermark.text || 'ClipForge';
        ctx.save();
        ctx.globalAlpha = settings.watermark.opacity !== undefined ? settings.watermark.opacity : 0.75;
        const fontSize = Math.max(13, Math.round(targetHeight * 0.024));
        ctx.font = `600 ${fontSize}px Inter, -apple-system, sans-serif`;
        const padX = Math.round(fontSize * 0.75);
        const padY = Math.round(fontSize * 0.35);
        const txtWidth = ctx.measureText(wmText).width;
        const boxW = txtWidth + padX * 2;
        const boxH = fontSize + padY * 2;
        let x = targetWidth - boxW - padX * 1.5;
        let y = targetHeight - boxH - padY * 1.5;
        if (settings.watermark.position === 'top-right') {
          x = targetWidth - boxW - padX * 1.5;
          y = padY * 1.5;
        } else if (settings.watermark.position === 'bottom-left') {
          x = padX * 1.5;
          y = targetHeight - boxH - padY * 1.5;
        } else if (settings.watermark.position === 'top-left') {
          x = padX * 1.5;
          y = padY * 1.5;
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, boxW, boxH, 4);
        else ctx.rect(x, y, boxW, boxH);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(wmText, x + padX, y + boxH / 2);
        ctx.restore();
      }

      const percentage = Math.round(((frame + 1) / totalFrames) * 100);

      // ETA computation
      const elapsedMs = performance.now() - exportStartTime;
      const avgMsPerFrame = elapsedMs / (frame + 1);
      const remainingFrames = totalFrames - (frame + 1);
      const remainingSec = Math.max(0, Math.round((remainingFrames * avgMsPerFrame) / 1000));
      const etaText = remainingSec > 60
        ? `${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s`
        : `${remainingSec}s`;

      onProgress({
        percentage,
        currentFrame: frame + 1,
        totalFrames,
        statusText: `Encoding frame ${frame + 1}/${totalFrames} (${percentage}%)...`,
        etaText: `${etaText} remaining`,
        isComplete: false,
      });

      // Synchronize video frame delivery with real-time Web Audio clock for frame-perfect AV sync
      const targetTimeMs = (frame + 1) * frameDelayMs;
      const actualElapsedMs = performance.now() - exportStartTime;
      const waitMs = targetTimeMs - actualElapsedMs;
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, waitMs));
      } else {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    return new Promise((resolve, reject) => {
      recorder.onerror = (err) => {
        console.error('[ClipForge:Export] MediaRecorder error event:', err);
        if (audioCtx) {
          try {
            audioCtx.close();
          } catch (e) {}
        }
        reject(err);
      };

      recorder.onstop = () => {
        if (audioCtx) {
          try {
            audioCtx.close();
          } catch (e) {}
        }
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        console.log('[ClipForge:Export] Pipeline completed successfully! Final blob size:', finalBlob.size, 'bytes');
        const downloadUrl = URL.createObjectURL(finalBlob);

        onProgress({
          percentage: 100,
          currentFrame: totalFrames,
          totalFrames,
          statusText: 'Export complete!',
          etaText: '0s',
          isComplete: true,
          downloadUrl,
        });

        // Trigger download
        const a = document.createElement('a');
        a.href = downloadUrl;
        const ext = settings.format === 'gif' ? 'gif' : settings.format === 'mp4' ? 'mp4' : 'webm';
        a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_${settings.resolution || '1080p'}.${ext}`;
        a.click();

        resolve(downloadUrl);
      };

      try {
        recorder.stop();
      } catch (e) {
        if (audioCtx) {
          try {
            audioCtx.close();
          } catch (e) {}
        }
        reject(e);
      }
    });
  }

  async exportAudioOnly(project, settings, onProgress) {
    onProgress({
      percentage: 20,
      currentFrame: 1,
      totalFrames: 5,
      statusText: 'Synthesizing timeline audio tracks with EQ & filters...',
      etaText: 'A few seconds',
      isComplete: false,
    });

    try {
      const sampleRate = 44100;
      const durationSec = Math.max(project.duration, 1);
      const totalSamples = Math.ceil(sampleRate * durationSec);
      const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, totalSamples, sampleRate);

      // Play clips that have audio into offline context
      for (const track of project.tracks) {
        if (track.muted || track.hidden) continue;
        for (const clip of track.clips) {
          if ((clip.type === 'audio' || clip.type === 'video') && clip.mediaUrl && !clip.audioProps?.mute) {
            try {
              const resp = await fetch(clip.mediaUrl);
              const arrayBuf = await resp.arrayBuffer();
              const fullBuffer = await offlineCtx.decodeAudioData(arrayBuf);

              const speed = clip.speed || 1.0;
              const sourceDuration = clip.duration * speed;
              const sourceStart = clip.sourceStart || 0;
              const playbackRate = getClipPlaybackRate(clip);

              const source = offlineCtx.createBufferSource();
              if (clip.reverse) {
                const revBuffer = createReversedAudioSegment(offlineCtx, fullBuffer, sourceStart, sourceDuration);
                source.buffer = revBuffer;
                source.playbackRate.value = playbackRate;
                source.start(clip.start, 0, clip.duration);
              } else {
                source.buffer = fullBuffer;
                source.playbackRate.value = playbackRate;
                source.start(clip.start, sourceStart, sourceDuration);
              }

              const gain = offlineCtx.createGain();
              applyVolumeAutomation(gain, clip, track, clip.start, clip.duration);

              // Apply noise reduction and equalizer to offline context
              applyAudioFilters(offlineCtx, clip, source, gain);
              gain.connect(offlineCtx.destination);
            } catch (e) {
              console.warn('[ExportAudio] Clip decode warning:', clip.name, e);
            }
          }
        }
      }

      onProgress({
        percentage: 60,
        currentFrame: 3,
        totalFrames: 5,
        statusText: 'Rendering audio mixdown...',
        etaText: 'Almost done',
        isComplete: false,
      });

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = this.audioBufferToWavBlob(renderedBuffer);
      const downloadUrl = URL.createObjectURL(wavBlob);

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_audio.mp3`;
      a.click();

      onProgress({
        percentage: 100,
        currentFrame: 5,
        totalFrames: 5,
        statusText: 'Audio exported successfully!',
        etaText: '0s',
        isComplete: true,
        downloadUrl,
      });

      return downloadUrl;
    } catch (err) {
      console.error('[ExportAudio] Audio render error:', err);
      toastError(`Audio export failed: ${err.message}`, 'Export Error');
      throw new Error(`Audio mixdown failed: ${err.message}`);
    }
  }

  audioBufferToWavBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const sample = Math.max(-1, Math.min(1, channels[c][i]));
        const intSample = sample < 0 ? sample * 32768 : sample * 32767;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  async exportSingleFramePNG(project, settings, onProgress) {
    onProgress({
      percentage: 30,
      currentFrame: 1,
      totalFrames: 1,
      statusText: 'Rendering high-resolution frame...',
      etaText: 'Instant',
      isComplete: false,
    });

    const ratioConfig = ASPECT_RATIOS[project.aspectRatio] || { width: 1920, height: 1080 };
    const canvas = document.createElement('canvas');
    canvas.width = ratioConfig.width;
    canvas.height = ratioConfig.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    renderFrame(ctx, project, settings.time || 0, {
      canvasWidth: ratioConfig.width,
      canvasHeight: ratioConfig.height,
      isExporting: true,
      showSafeGuides: false,
    });

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const downloadUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_frame_${(settings.time || 0).toFixed(1)}s.png`;
    a.click();

    onProgress({
      percentage: 100,
      currentFrame: 1,
      totalFrames: 1,
      statusText: 'PNG Frame exported!',
      etaText: '0s',
      isComplete: true,
      downloadUrl,
    });

    return downloadUrl;
  }
}

export const exportPipeline = new ExportPipeline();
