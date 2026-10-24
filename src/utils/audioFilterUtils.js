/**
 * Audio Filter Utilities for ClipForge
 * Provides real-time and export audio processing chains:
 * 1. Noise Reduction (High-pass rumble filter + Dynamics Compressor / Noise Gate)
 * 2. 3-Band Equalizer (Bass lowshelf, Mid peaking, Treble highshelf)
 */

export function getEqualizerValues(eq = {}) {
  let bass = eq.bass !== undefined ? eq.bass : 0;
  let mid = eq.mid !== undefined ? eq.mid : 0;
  let treble = eq.treble !== undefined ? eq.treble : 0;

  // Preset fallbacks if specific slider values aren't set
  if (eq.preset === 'Voice Boost') {
    if (eq.bass === undefined || eq.bass === 0) bass = -2;
    if (eq.mid === undefined || eq.mid === 0) mid = 5;
    if (eq.treble === undefined || eq.treble === 0) treble = 3;
  } else if (eq.preset === 'Bass Boost') {
    if (eq.bass === undefined || eq.bass === 0) bass = 7;
    if (eq.mid === undefined || eq.mid === 0) mid = 0;
    if (eq.treble === undefined || eq.treble === 0) treble = -1;
  } else if (eq.preset === 'Treble Boost') {
    if (eq.bass === undefined || eq.bass === 0) bass = -2;
    if (eq.mid === undefined || eq.mid === 0) mid = 1;
    if (eq.treble === undefined || eq.treble === 0) treble = 6;
  } else if (eq.preset === 'Podcast') {
    if (eq.bass === undefined || eq.bass === 0) bass = 2;
    if (eq.mid === undefined || eq.mid === 0) mid = 4;
    if (eq.treble === undefined || eq.treble === 0) treble = 1;
  }

  return { bass, mid, treble };
}

/**
 * Builds and connects an audio processing chain between inputNode and outputNode.
 * Works uniformly with both AudioContext (live playback & video export) and OfflineAudioContext (MP3 export).
 */
export function applyAudioFilters(ctx, clip, inputNode, outputNode) {
  let currentNode = inputNode;

  // 1. Noise Reduction: High-pass filter (cuts low rumble/hum) + Dynamics Compressor
  if (clip.audioProps && clip.audioProps.noiseReduction) {
    const strength = Math.max(1, Math.min(100, clip.audioProps.noiseStrength ?? 50)) / 100;

    // Highpass filter: cuts 80Hz - 320Hz depending on noise strength
    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 80 + strength * 240;
    hpFilter.Q.value = 0.707;
    currentNode.connect(hpFilter);
    currentNode = hpFilter;

    // Dynamics compressor acting as gentle noise gate / room tone suppressor
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -30 - strength * 20; // -30dB to -50dB
    compressor.knee.value = 12;
    compressor.ratio.value = 4 + strength * 8; // 4:1 to 12:1
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    currentNode.connect(compressor);
    currentNode = compressor;
  }

  // 2. 3-Band Equalizer (Bass, Mid, Treble)
  const eq = (clip.audioProps && clip.audioProps.equalizer) || {};
  const { bass, mid, treble } = getEqualizerValues(eq);

  // Bass (lowshelf at 250Hz)
  const bassFilter = ctx.createBiquadFilter();
  bassFilter.type = 'lowshelf';
  bassFilter.frequency.value = 250;
  bassFilter.gain.value = bass;
  currentNode.connect(bassFilter);
  currentNode = bassFilter;

  // Mid (peaking at 1500Hz)
  const midFilter = ctx.createBiquadFilter();
  midFilter.type = 'peaking';
  midFilter.frequency.value = 1500;
  midFilter.Q.value = 1.0;
  midFilter.gain.value = mid;
  currentNode.connect(midFilter);
  currentNode = midFilter;

  // Treble (highshelf at 4000Hz)
  const trebleFilter = ctx.createBiquadFilter();
  trebleFilter.type = 'highshelf';
  trebleFilter.frequency.value = 4000;
  trebleFilter.gain.value = treble;
  currentNode.connect(trebleFilter);
  currentNode = trebleFilter;

  // Connect to output destination or gain node
  currentNode.connect(outputNode);

  return {
    lastNode: currentNode,
    bassFilter,
    midFilter,
    trebleFilter,
  };
}
