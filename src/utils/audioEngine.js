function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

import { getInterpolatedProperty } from './previewRenderer';
import { applyAudioFilters, getEqualizerValues } from './audioFilterUtils';

class AudioEngine {constructor() { AudioEngine.prototype.__init.call(this);AudioEngine.prototype.__init2.call(this);AudioEngine.prototype.__init3.call(this);AudioEngine.prototype.__init4.call(this);AudioEngine.prototype.__init5.call(this);AudioEngine.prototype.__init6.call(this);AudioEngine.prototype.__init7.call(this);AudioEngine.prototype.__init8.call(this); }
   __init() {this.ctx = null}
   __init2() {this.activeSources = new Map()}
   __init3() {this.mediaElements = new Map()}
   __init4() {this.mediaElementChains = new Map()}
   __init5() {this.isPlaying = false}
   __init6() {this.mediaRecorder = null}
   __init7() {this.micStream = null}
   __init8() {this.recordedChunks = []}

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

            // Compute dynamic Fade In / Fade Out envelope with Transition crossfade
            const clipElapsed = currentTime - clipStart;
            const clipRemaining = clipEnd - currentTime;
            let fadeGain = 1.0;
            const fadeInDur = Math.max(
              _optionalChain([clip, 'access', _ => _.audioProps, 'optionalAccess', _2 => _2.fadeIn]) || 0,
              (clip.transitionIn && clip.transitionIn.duration) ? clip.transitionIn.duration : 0
            );
            const fadeOutDur = Math.max(
              _optionalChain([clip, 'access', _3 => _3.audioProps, 'optionalAccess', _4 => _4.fadeOut]) || 0,
              (clip.transitionOut && clip.transitionOut.duration) ? clip.transitionOut.duration : 0
            );
            if (fadeInDur > 0 && clipElapsed < fadeInDur) {
              fadeGain = Math.max(0, clipElapsed / fadeInDur);
            }
            if (fadeOutDur > 0 && clipRemaining < fadeOutDur) {
              fadeGain = Math.min(fadeGain, Math.max(0, clipRemaining / fadeOutDur));
            }

            audioEl.volume = isMute ? 0 : Math.min(Math.max(dynVol * trackVol * fadeGain, 0), 1);
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
        const clipElapsed = Math.max(0, currentTime - clip.start);
        const clipRemaining = Math.max(0, clip.duration - clipElapsed);
        let fadeGain = 1.0;
        const fadeInDur = Math.max(
          _optionalChain([clip, 'access', _5 => _5.audioProps, 'optionalAccess', _6 => _6.fadeIn]) || 0,
          (clip.transitionIn && clip.transitionIn.duration) ? clip.transitionIn.duration : 0
        );
        const fadeOutDur = Math.max(
          _optionalChain([clip, 'access', _7 => _7.audioProps, 'optionalAccess', _8 => _8.fadeOut]) || 0,
          (clip.transitionOut && clip.transitionOut.duration) ? clip.transitionOut.duration : 0
        );
        if (fadeInDur > 0 && clipElapsed < fadeInDur) {
          fadeGain = Math.max(0, clipElapsed / fadeInDur);
        }
        if (fadeOutDur > 0 && clipRemaining < fadeOutDur) {
          fadeGain = Math.min(fadeGain, Math.max(0, clipRemaining / fadeOutDur));
        }

        // Connect Web Audio filter chain for Noise Reduction & 3-Band Equalizer
        if (!this.masterBus) {
          const masterGain = ctx.createGain();
          const limiter = ctx.createDynamicsCompressor();
          limiter.threshold.value = -1.0;
          limiter.knee.value = 0;
          limiter.ratio.value = 20;
          limiter.attack.value = 0.003;
          limiter.release.value = 0.1;
          masterGain.connect(limiter);
          limiter.connect(ctx.destination);
          this.masterBus = { masterGain, limiter };
        }

        let chain = this.mediaElementChains.get(clip.id);
        if (!chain) {
          try {
            const sourceNode = ctx.createMediaElementSource(audioEl);
            const gainNode = ctx.createGain();
            const filterNodes = applyAudioFilters(ctx, clip, sourceNode, gainNode);
            if (ctx.createStereoPanner && track.pan !== undefined && track.pan !== 0) {
              const panner = ctx.createStereoPanner();
              panner.pan.value = Math.max(-1, Math.min(1, track.pan));
              gainNode.connect(panner);
              panner.connect(this.masterBus.masterGain);
            } else {
              gainNode.connect(this.masterBus.masterGain);
            }
            chain = { sourceNode, gainNode, filterNodes };
            this.mediaElementChains.set(clip.id, chain);
          } catch (chainErr) {
            // MediaElementSource may already be attached or cross-origin
          }
        }

        if (chain && chain.gainNode) {
          chain.gainNode.gain.value = Math.min(Math.max(clipVolume * fadeGain, 0), 1);
          // Keep equalizer reactive to live slider updates
          const eq = (clip.audioProps && clip.audioProps.equalizer) || {};
          const { bass, mid, treble } = getEqualizerValues(eq);
          if (chain.filterNodes.bassFilter) chain.filterNodes.bassFilter.gain.value = bass;
          if (chain.filterNodes.midFilter) chain.filterNodes.midFilter.gain.value = mid;
          if (chain.filterNodes.trebleFilter) chain.filterNodes.trebleFilter.gain.value = treble;
        } else {
          audioEl.volume = Math.min(Math.max(clipVolume * fadeGain, 0), 1);
        }

        // Voice changer & Pitch shift calculation
        const pitchShiftSt = _optionalChain([clip, 'access', _9 => _9.audioProps, 'optionalAccess', _10 => _10.pitchShift]) || 0;
        const voiceChanger = _optionalChain([clip, 'access', _11 => _11.audioProps, 'optionalAccess', _12 => _12.voiceChanger]) || 'none';
        let pitchMultiplier = Math.pow(2, pitchShiftSt / 12);
        if (voiceChanger === 'deep') pitchMultiplier *= 0.82;
        else if (voiceChanger === 'high') pitchMultiplier *= 1.25;
        else if (voiceChanger === 'chipmunk') pitchMultiplier *= 1.55;
        else if (voiceChanger === 'robot') pitchMultiplier *= 0.95;

        const effectiveSpeed = (clip.speed || 1) * pitchMultiplier;
        audioEl.playbackRate = Math.max(0.2, Math.min(effectiveSpeed, 4.0));

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

      applyAudioFilters(ctx, clip, osc, gain);
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
