import { getInterpolatedProperty } from './previewRenderer';

class AudioEngine {constructor() { AudioEngine.prototype.__init.call(this);AudioEngine.prototype.__init2.call(this);AudioEngine.prototype.__init3.call(this);AudioEngine.prototype.__init4.call(this);AudioEngine.prototype.__init5.call(this);AudioEngine.prototype.__init6.call(this);AudioEngine.prototype.__init7.call(this); }
   __init() {this.ctx = null}
   __init2() {this.activeSources = new Map()}
   __init3() {this.mediaElements = new Map()}
   __init4() {this.isPlaying = false}
   __init5() {this.mediaRecorder = null}
   __init6() {this.micStream = null}
   __init7() {this.recordedChunks = []}

   getContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window ).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play synthetic preview sound effects
   playSFX(type) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      if (type === 'whoosh') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + 0.15);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.15);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.1);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'impact') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.8);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      } else if (type === 'ding') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.setValueAtTime(1600, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
      } else if (type === 'laser') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        // Default click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch (e2) {
      // Audio autoplay restrictions might silence initial SFX
    }
  }

  // Synchronize playing audio tracks with playhead
   syncPlayback(tracks, currentTime, isPlaying) {
    this.isPlaying = isPlaying;
    if (!isPlaying) {
      this.stopAll();
      return;
    }

    const ctx = this.getContext();

    // Check each audio clip
    tracks.forEach((track) => {
      if (track.muted || track.hidden) return;

      track.clips.forEach((clip) => {
        const isAudioType = clip.type === 'audio';
        if (!isAudioType) return;

        const clipStart = clip.start;
        const clipEnd = clip.start + clip.duration;

        if (currentTime >= clipStart && currentTime < clipEnd) {
          const timeIntoClip = (currentTime - clipStart) * clip.speed + clip.sourceStart;
          this.playClipAudio(clip, track, timeIntoClip, currentTime);
          const audioEl = this.mediaElements.get(clip.id);
          if (audioEl) {
            const baseVol = (clip.audioProps && clip.audioProps.volume != null) ? clip.audioProps.volume : 1;
            const dynVol = getInterpolatedProperty(clip, 'volume', currentTime, baseVol);
            const trackVol = track.volume != null ? track.volume : 1;
            const isMute = Boolean(clip.audioProps && clip.audioProps.mute);
            audioEl.volume = isMute ? 0 : Math.min(Math.max(dynVol * trackVol, 0), 1);
          }
        } else {
          this.stopClipAudio(clip.id);
        }
      });
    });
  }

   playClipAudio(clip, track, offset, currentTime = 0) {
    if (this.activeSources.has(clip.id)) {
      return; // Already playing
    }

    const ctx = this.getContext();
    const baseVol = (clip.audioProps && clip.audioProps.volume != null) ? clip.audioProps.volume : 1;
    const dynVol = getInterpolatedProperty(clip, 'volume', currentTime, baseVol);
    const clipVolume = dynVol * (track.volume != null ? track.volume : 1);
    if (clip.audioProps && clip.audioProps.mute) return;

    if (clip.mediaUrl) {
      // Real media URL audio playback
      let audioEl = this.mediaElements.get(clip.id);
      if (!audioEl) {
        audioEl = new Audio(clip.mediaUrl);
        this.mediaElements.set(clip.id, audioEl);
      }
      try {
        audioEl.volume = Math.min(Math.max(clipVolume, 0), 1);
        audioEl.playbackRate = clip.speed || 1;
        // Only seek if audio has drifted significantly (> 0.25s) or is unstarted/paused
        if (audioEl.paused || Math.abs(audioEl.currentTime - offset) > 0.25) {
          audioEl.currentTime = offset;
        }
        if (audioEl.paused) {
          audioEl.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Audio play error:', err);
      }
    } else {
      // Synthesized background music loop for demo / empty tracks
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = clipVolume * 0.15; // gentle ambient bed
      osc.type = 'triangle';
      
      // Melody based on clip id / offset
      const baseFreq = clip.name.includes('Lofi') ? 220 : 164.81;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.activeSources.set(clip.id, {
        source: osc,
        gain,
        cleanup: () => {
          try {
            osc.stop();
            osc.disconnect();
          } catch (e3) {}
        },
      });
    }
  }

   stopClipAudio(clipId) {
    const active = this.activeSources.get(clipId);
    if (active) {
      active.cleanup();
      this.activeSources.delete(clipId);
    }
    const audioEl = this.mediaElements.get(clipId);
    if (audioEl && !audioEl.paused) {
      audioEl.pause();
    }
  }

   stopAll() {
    this.activeSources.forEach((active) => active.cleanup());
    this.activeSources.clear();
    this.mediaElements.forEach((el) => {
      if (!el.paused) {
        el.pause();
      }
    });
  }

  // Voiceover Recording using navigator.mediaDevices
   async startRecording(onDataAvailable) {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(this.micStream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
          _optionalChain([onDataAvailable, 'optionalCall', _5 => _5(e.data)]);
        }
      };

      this.mediaRecorder.start(100);
      return true;
    } catch (err) {
      console.error('Microphone access denied:', err);
      return false;
    }
  }

   stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('No active recorder'));
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        if (this.micStream) {
          this.micStream.getTracks().forEach((track) => track.stop());
          this.micStream = null;
        }

        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          resolve({ blob, url, duration: tempAudio.duration || 5 });
        };
        tempAudio.onerror = () => {
          resolve({ blob, url, duration: 5 });
        };
      };

      this.mediaRecorder.stop();
    });
  }

  // Beat Detection Algorithm for Automatic Music Marker Sync
   detectBeats(bpm = 120, totalDuration = 15) {
    const beats = [];
    const interval = 60 / bpm;
    let t = 0;
    while (t < totalDuration) {
      beats.push(parseFloat(t.toFixed(3)));
      t += interval;
    }
    return beats;
  }
}

export const audioEngine = new AudioEngine();
