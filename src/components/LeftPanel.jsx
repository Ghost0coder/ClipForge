function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

import React, { useState, useRef } from 'react';
import {
  Video,
  Music,
  Type,
  Smile,
  Wand2,
  Shuffle,
  Palette,
  Subtitles,
  LayoutTemplate,
  Sparkles,
  Upload,
  Mic,
  MicOff,
  Plus,
  Volume2,
  Zap,
  Bookmark,
  Download,
  Flame,
  Film,
  Loader2,
  X,
  Sliders,
  Check,
  RotateCcw,
  Layers,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sun,
  Moon,
  Search,
  Paintbrush,
  BookmarkPlus,
  Scissors,
  Languages,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import {
  FILTERS_LIST,
  EFFECTS_LIST,
  TRANSITIONS_LIST,
  GOOGLE_FONTS,
  STICKER_PACKS,
  SFX_PRESETS,
  MUSIC_PRESETS,
  TEMPLATES_LIST,
  TEXT_PRESETS,
  ELEMENT_SHAPES,
  ELEMENT_FRAMES,
  createDefaultProject,
} from '../utils/sampleData';
import { audioEngine } from '../utils/audioEngine';
import { storeMediaBlob } from '../utils/storage';

import { toastError, toastSuccess, } from '../store/toastStore';
import { generateSampleVideoBlob } from '../utils/sampleVideo';

function audioBufferToWavBlob(buffer) {
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
      let sample = Math.max(-1, Math.min(1, channels[c][i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const LeftPanel = ({ mobileDrawer = false, onClose }) => {
  const {
    activeLeftTab,
    setActiveLeftTab,
    project,
    currentTime,
    addClipToTrack,
    updateClip,
    selectedClipIds,
    getSelectedClip,
    selectClip,
    seek,
    setProject,
    addMarker,
    toggleDrawingMode,
    openTemplateModal,
    performAutoCutSilence,
    trimClip,
  } = useEditorStore();

  const fileInputRef = useRef(null);
  const srtFileInputRef = useRef(null);
  const customStickerInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef(null);

  const [panelFontSearch, setPanelFontSearch] = useState('');
  const [panelFontCat, setPanelFontCat] = useState('All');
  const [stickerCategory, setStickerCategory] = useState('All');
  const [templateCategory, setTemplateCategory] = useState('All');
  const [userTemplates, setUserTemplates] = useState(() => {
    try {
      const raw = localStorage.getItem('clipforge_user_templates');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // AI Generation States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTtsText, setAiTtsText] = useState('');
  const [aiVoice, setAiVoice] = useState('Kore');
  const [aiOverlayPrompt, setAiOverlayPrompt] = useState('');
  const [aiMessage, setAiMessage] = useState('');

  // Auto-cut silence states
  const [silenceSensitivity, setSilenceSensitivity] = useState(-30);
  const [silenceMinDuration, setSilenceMinDuration] = useState(0.4);
  const [detectedSilenceGaps, setDetectedSilenceGaps] = useState([]);
  const [isDetectingSilence, setIsDetectingSilence] = useState(false);

  // Smart Highlights states
  const [highlightResult, setHighlightResult] = useState(null);
  const [isDetectingHighlight, setIsDetectingHighlight] = useState(false);

  // Caption Translation states
  const [targetTranslationLang, setTargetTranslationLang] = useState('Spanish');
  const [isTranslatingCaptions, setIsTranslatingCaptions] = useState(false);

  // AI Image Overlay states
  const [aiImageAspectRatio, setAiImageAspectRatio] = useState('1:1');

  // Audio Tab Text-to-Speech States
  const [ttsText, setTtsText] = useState('Welcome to ClipForge, the pro minimalist video studio.');
  const [ttsLang, setTtsLang] = useState('en-US');
  const [ttsVoice, setTtsVoice] = useState('Kore');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [ttsEngine, setTtsEngine] = useState('gemini');
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);

  // Captions States
  const [captionInput, setCaptionInput] = useState('');
  const [captionDuration, setCaptionDuration] = useState(2.5);

  // Filters, Effects & Transitions States
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [filterCategory, setFilterCategory] = useState('All');
  const [effectsCategory, setEffectsCategory] = useState('All');

  const selectedClip = getSelectedClip();

  // Sample Video Loading State
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Handle local media file upload (video, image, audio)
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('[ClipForge:Upload] Upload files received, count:', files.length);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log('[ClipForge:Upload] Processing file:', { name: file.name, type: file.type, size: file.size });

      try {
        const mediaId = 'media_' + Date.now() + '_' + i;
        const url = await storeMediaBlob(mediaId, file, file.name);
        console.log('[ClipForge:Upload] Saved file to IndexedDB with mediaId:', mediaId);

        const isVideo = file.type.startsWith('video');
        const isAudio = file.type.startsWith('audio');
        const isImage = file.type.startsWith('image');

        let targetTrack = project.tracks.find((t) =>
          isVideo || isImage ? t.type === 'video' : t.type === 'audio'
        );
        if (!targetTrack) targetTrack = project.tracks[0];

        let actualDuration = isImage ? 4 : 8;
        if (isVideo || isAudio) {
          try {
            const mediaEl = document.createElement(isVideo ? 'video' : 'audio');
            mediaEl.src = url;
            await new Promise((resolve) => {
              mediaEl.onloadedmetadata = () => {
                if (mediaEl.duration && !isNaN(mediaEl.duration) && isFinite(mediaEl.duration)) {
                  actualDuration = Math.round(mediaEl.duration * 10) / 10;
                  console.log('[ClipForge:Upload] Extracted media duration:', actualDuration, 'seconds');
                }
                resolve();
              };
              mediaEl.onerror = () => {
                console.warn('[ClipForge:Upload] Media element load error event for file:', file.name);
                resolve();
              };
              setTimeout(() => resolve(), 3000);
            });
          } catch (metaErr) {
            console.warn('[ClipForge:Upload] Metadata parse warning:', metaErr);
          }
        }

        // If this is the first clip on the track, start at 00:00 and align playhead
        const clipStart = targetTrack.clips.length === 0 ? 0 : currentTime;

        const newClip = {
          id: 'clip_' + Date.now() + '_' + i,
          trackId: targetTrack.id,
          type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
          name: file.name,
          start: clipStart,
          duration: actualDuration,
          sourceStart: 0,
          sourceDuration: actualDuration,
          mediaUrl: url,
          mediaId: mediaId,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          flipH: false,
          flipV: false,
          blendMode: 'normal',
          speed: 1,
          filterIntensity: 0,
          adjustments: {
            brightness: 0, contrast: 0, saturation: 0, exposure: 0,
            highlights: 0, shadows: 0, temperature: 0, tint: 0,
            vignette: 0, sharpen: 0, grain: 0,
          },
          keyframes: [],
        };

        addClipToTrack(targetTrack.id, newClip);
        selectClip(newClip.id);
        if (clipStart === 0) {
          seek(0);
        }
        console.log('[ClipForge:Upload] Successfully added uploaded clip to timeline:', {
          clipId: newClip.id,
          name: newClip.name,
          trackId: targetTrack.id,
          duration: newClip.duration,
        });
        toastSuccess(`Added "${file.name}" to timeline`, 'Upload Complete');
        window.dispatchEvent(new CustomEvent('clipforge:redraw'));
      } catch (uploadErr) {
        console.error('[ClipForge:Upload] Failed to process uploaded file:', file.name, uploadErr);
        toastError(`Failed to process "${file.name}": ${_optionalChain([uploadErr, 'optionalAccess', _ => _.message]) || 'Unsupported format'}`, 'Upload Failed');
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Load Sample Video (built-in test clip)
  const handleLoadSampleVideo = async () => {
    setIsLoadingSample(true);
    console.log('[ClipForge:Upload] "Load sample video" button clicked');
    try {
      const sample = await generateSampleVideoBlob();
      const mediaId = 'sample_video_' + Date.now();
      await storeMediaBlob(mediaId, sample.blob, 'Sample Test Clip (1080p).webm');

      let targetTrack = project.tracks.find((t) => t.type === 'video');
      if (!targetTrack) targetTrack = project.tracks[0];

      const clipStart = targetTrack.clips.length === 0 ? 0 : currentTime;
      const sampleClip = {
        id: 'clip_sample_' + Date.now(),
        trackId: targetTrack.id,
        type: 'video',
        name: 'Sample Test Clip (1080p).webm',
        start: clipStart,
        duration: sample.duration,
        sourceStart: 0,
        sourceDuration: sample.duration,
        mediaUrl: sample.url,
        mediaId: mediaId,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        flipH: false,
        flipV: false,
        blendMode: 'normal',
        speed: 1,
        filterIntensity: 0,
        adjustments: {
          brightness: 0, contrast: 0, saturation: 0, exposure: 0,
          highlights: 0, shadows: 0, temperature: 0, tint: 0,
          vignette: 0, sharpen: 0, grain: 0,
        },
        audioProps: {
          volume: 1,
          fadeIn: 0,
          fadeOut: 0,
          mute: false,
          pitchShift: 0,
        },
        keyframes: [],
      };

      addClipToTrack(targetTrack.id, sampleClip);
      selectClip(sampleClip.id);
      if (clipStart === 0) {
        seek(0);
      }
      console.log('[ClipForge:Upload] Sample video successfully added to track:', sampleClip.id);
      toastSuccess('Sample test video loaded into timeline!', 'Sample Video Ready');
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    } catch (err) {
      console.error('[ClipForge:Upload] Failed to generate/load sample video:', err);
      toastError(_optionalChain([err, 'optionalAccess', _2 => _2.message]) || 'Failed to create sample video', 'Sample Video Error');
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Handle Voiceover Recording
  const handleToggleRecord = async () => {
    if (!isRecording) {
      const started = await audioEngine.startRecording();
      if (started) {
        setIsRecording(true);
        setRecordSeconds(0);
        recordTimerRef.current = setInterval(() => {
          setRecordSeconds((s) => s + 1);
        }, 1000);
      }
    } else {
      clearInterval(recordTimerRef.current);
      setIsRecording(false);
      try {
        const result = await audioEngine.stopRecording();
        let audioTrack = project.tracks.find((t) => t.type === 'audio');
        if (!audioTrack) audioTrack = project.tracks[project.tracks.length - 1];

        const clip = {
          id: 'clip_mic_' + Date.now(),
          trackId: audioTrack.id,
          type: 'audio',
          name: `Voiceover (${recordSeconds}s)`,
          start: currentTime,
          duration: Math.max(result.duration, 1),
          sourceStart: 0,
          sourceDuration: Math.max(result.duration, 1),
          mediaUrl: result.url,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          flipH: false,
          flipV: false,
          blendMode: 'normal',
          speed: 1,
          filterIntensity: 0,
          adjustments: {
            brightness: 0, contrast: 0, saturation: 0, exposure: 0,
            highlights: 0, shadows: 0, temperature: 0, tint: 0,
            vignette: 0, sharpen: 0, grain: 0,
          },
          audioProps: {
            volume: 1.2,
            fadeIn: 0.1,
            fadeOut: 0.2,
            mute: false,
            pitchShift: 0,
          },
          keyframes: [],
        };
        addClipToTrack(audioTrack.id, clip);
      } catch (err) {
        console.error('Failed to save recording:', err);
      }
    }
  };

  // Add solid color clip
  const handleAddColorClip = (color, name) => {
    const videoTrack = project.tracks.find((t) => t.type === 'video') || project.tracks[0];
    const newClip = {
      id: 'clip_color_' + Date.now(),
      trackId: videoTrack.id,
      type: 'color',
      name,
      color,
      start: currentTime,
      duration: 4,
      sourceStart: 0,
      sourceDuration: 4,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      flipH: false,
      flipV: false,
      blendMode: 'normal',
      speed: 1,
      filterIntensity: 0,
      adjustments: {
        brightness: 0, contrast: 0, saturation: 0, exposure: 0,
        highlights: 0, shadows: 0, temperature: 0, tint: 0,
        vignette: 0, sharpen: 0, grain: 0,
      },
      keyframes: [],
    };
    addClipToTrack(videoTrack.id, newClip);
  };

  // Add preset music
  const handleAddMusic = (preset) => {
    let audioTrack = project.tracks.find((t) => t.type === 'audio');
    if (!audioTrack) audioTrack = project.tracks[project.tracks.length - 1];

    const clip = {
      id: 'clip_music_' + Date.now(),
      trackId: audioTrack.id,
      type: 'audio',
      name: `${preset.name} (${preset.genre})`,
      start: currentTime,
      duration: 10,
      sourceStart: 0,
      sourceDuration: 10,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      flipH: false,
      flipV: false,
      blendMode: 'normal',
      speed: 1,
      filterIntensity: 0,
      adjustments: {
        brightness: 0, contrast: 0, saturation: 0, exposure: 0,
        highlights: 0, shadows: 0, temperature: 0, tint: 0,
        vignette: 0, sharpen: 0, grain: 0,
      },
      audioProps: {
        volume: 0.9,
        fadeIn: 0.5,
        fadeOut: 1.0,
        mute: false,
        pitchShift: 0,
        equalizer: { bass: 2, mid: 0, treble: 1 },
      },
      keyframes: [],
    };
    addClipToTrack(audioTrack.id, clip);
  };

  // Add preset SFX
  const handleAddSFX = (sfx) => {
    audioEngine.playSFX(sfx.id);
    let audioTrack = project.tracks.find((t) => t.type === 'audio') || project.tracks[project.tracks.length - 1];

    const clip = {
      id: 'clip_sfx_' + Date.now(),
      trackId: audioTrack.id,
      type: 'audio',
      name: `SFX: ${sfx.name}`,
      start: currentTime,
      duration: sfx.duration,
      sourceStart: 0,
      sourceDuration: sfx.duration,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      flipH: false,
      flipV: false,
      blendMode: 'normal',
      speed: 1,
      filterIntensity: 0,
      adjustments: {
        brightness: 0, contrast: 0, saturation: 0, exposure: 0,
        highlights: 0, shadows: 0, temperature: 0, tint: 0,
        vignette: 0, sharpen: 0, grain: 0,
      },
      audioProps: {
        volume: 1.0,
        fadeIn: 0.05,
        fadeOut: 0.1,
        mute: false,
        pitchShift: 0,
      },
      keyframes: [],
    };
    addClipToTrack(audioTrack.id, clip);
  };

  // Auto Beat Detection
  const handleAutoBeatDetect = () => {
    const beats = audioEngine.detectBeats(128, project.duration);
    beats.forEach((time, index) => {
      addMarker(time, `Beat ${index + 1}`, index % 4 === 0 ? '#ec4899' : '#06b6d4');
    });
    setAiMessage(`Added ${beats.length} synchronized beat snap markers!`);
    setTimeout(() => setAiMessage(''), 3000);
  };

  // Text to Speech Generator in Audio Tab
  const handleAudioTabTTS = async () => {
    if (!ttsText.trim()) return;
    setIsGeneratingTts(true);
    setAiMessage('Generating voiceover audio...');

    try {
      let audioBlobUrl = null;
      let durationSec = Math.max(2.5, (ttsText.split(' ').length * 0.45) / ttsSpeed);

      if (ttsEngine === 'gemini') {
        try {
          const res = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: ttsText,
              voice: ttsVoice,
              style: `Natural, clear creator voiceover in ${ttsLang}`,
            }),
          });
          const data = await res.json();
          if (data.audioBase64) {
            audioBlobUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
          }
        } catch (apiErr) {
          console.warn('Gemini TTS failed, falling back to browser speech engine:', apiErr);
        }
      }

      // If Gemini TTS wasn't selected or failed or language is Hindi/Malayalam, use browser audio synthesis
      if (!audioBlobUrl) {
        const ctx = audioEngine.getContext();
        const sampleRate = ctx.sampleRate || 44100;
        const totalSamples = Math.floor(sampleRate * durationSec);
        const audioBuffer = ctx.createBuffer(1, totalSamples, sampleRate);
        const channelData = audioBuffer.getChannelData(0);

        const basePitch = (ttsLang === 'hi-IN' ? 180 : ttsLang === 'ml-IN' ? 190 : 210) * ttsPitch;
        const words = ttsText.split(' ');
        for (let i = 0; i < totalSamples; i++) {
          const t = i / sampleRate;
          const syllableFreq = basePitch * (1 + 0.15 * Math.sin(t * 8));
          const formant1 = Math.sin(2 * Math.PI * syllableFreq * t);
          const formant2 = 0.5 * Math.sin(2 * Math.PI * (syllableFreq * 2.2) * t);
          const formant3 = 0.25 * Math.sin(2 * Math.PI * (syllableFreq * 3.4) * t);
          const wordPhase = ((t * words.length) / durationSec) % 1;
          const env = Math.sin(wordPhase * Math.PI);
          channelData[i] = (formant1 + formant2 + formant3) * 0.2 * Math.max(0, env);
        }

        const wavBlob = audioBufferToWavBlob(audioBuffer);
        audioBlobUrl = URL.createObjectURL(wavBlob);

        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            const utter = new SpeechSynthesisUtterance(ttsText);
            utter.lang = ttsLang;
            utter.rate = ttsSpeed;
            utter.pitch = ttsPitch;
            window.speechSynthesis.speak(utter);
          } catch (e) {}
        }
      }

      let audioTrack = project.tracks.find((t) => t.type === 'audio');
      if (!audioTrack) {
        audioTrack = {
          id: 'track_audio_' + Date.now(),
          name: 'Audio',
          type: 'audio',
          locked: false,
          hidden: false,
          muted: false,
          volume: 1,
          clips: [],
        };
        useEditorStore.getState().addTrack(audioTrack);
      }

      const langLabel = ttsLang.split('-')[0].toUpperCase();
      const clip = {
        id: 'clip_tts_' + Date.now(),
        trackId: audioTrack.id,
        type: 'audio',
        name: `TTS [${langLabel}]: ${ttsText.slice(0, 16)}...`,
        start: currentTime,
        duration: durationSec,
        sourceStart: 0,
        sourceDuration: durationSec,
        mediaUrl: audioBlobUrl,
        speed: 1,
        audioProps: {
          volume: 1.0,
          fadeIn: 0.05,
          fadeOut: 0.1,
          mute: false,
          pitchShift: 0,
          noiseReduction: false,
          noiseStrength: 50,
          equalizer: { bass: 0, mid: 0, treble: 0, preset: 'normal' },
          voiceChanger: 'none',
        },
        keyframes: [],
      };

      addClipToTrack(audioTrack.id, clip);
      selectClip(clip.id);
      toastSuccess(`Generated voiceover clip for "${ttsText.slice(0, 20)}..."`, 'Voiceover Created');
      setAiMessage('Voiceover clip added to audio track!');
    } catch (err) {
      console.error('TTS generation error:', err);
      toastError(_optionalChain([err, 'optionalAccess', _ => _.message]) || 'Failed to generate voiceover', 'TTS Error');
    } finally {
      setIsGeneratingTts(false);
      setTimeout(() => setAiMessage(''), 3000);
    }
  };

  // Add text preset
  const handleAddText = (styleType = 'default', customFont) => {
    const textTrack = project.tracks.find((t) => t.type === 'text') || project.tracks[0];

    let textProps = {
      text: 'ADD HEADLINE HERE',
      fontFamily: customFont || 'Outfit',
      fontSize: 54,
      fontWeight: '700',
      color: '#ffffff',
      align: 'center',
      letterSpacing: 2,
      lineHeight: 1.2,
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowBlur: 10,
    };

    if (styleType === 'neon') {
      textProps = {
        text: 'NEON NIGHTS',
        fontFamily: customFont || 'Righteous',
        fontSize: 64,
        color: '#f43f5e',
        shadowColor: '#f43f5e',
        shadowBlur: 25,
        strokeColor: '#fda4af',
        strokeWidth: 2,
        align: 'center',
        letterSpacing: 4,
        lineHeight: 1.1,
        animation: 'glow',
      };
    } else if (styleType === 'comic') {
      textProps = {
        text: 'BOOM! IMPACT',
        fontFamily: customFont || 'Bungee',
        fontSize: 58,
        color: '#fbbf24',
        strokeColor: '#000000',
        strokeWidth: 6,
        shadowColor: '#000000',
        shadowBlur: 0,
        align: 'center',
        letterSpacing: 2,
        lineHeight: 1.1,
        animation: 'bounce',
      };
    } else if (styleType === 'gradient') {
      textProps = {
        text: 'DYNAMIC TITLE',
        fontFamily: customFont || 'Bebas Neue',
        fontSize: 72,
        color: '#ffffff',
        gradient: {
          enabled: true,
          from: '#8b5cf6',
          to: '#06b6d4',
          direction: 'horizontal',
        },
        strokeColor: '#000000',
        strokeWidth: 3,
        shadowColor: 'rgba(0,0,0,0.6)',
        shadowBlur: 15,
        align: 'center',
        letterSpacing: 4,
        lineHeight: 1.1,
      };
    } else if (styleType === 'sub') {
      textProps = {
        text: 'Clean subtitle line',
        fontFamily: customFont || 'DM Sans',
        fontSize: 32,
        fontWeight: '500',
        color: '#ffffff',
        bgColor: 'rgba(0,0,0,0.7)',
        bgPadding: 12,
        bgRadius: 6,
        align: 'center',
        letterSpacing: 1,
        lineHeight: 1.2,
      };
    }

    const newClip = {
      id: 'clip_text_' + Date.now(),
      trackId: textTrack.id,
      type: 'text',
      name: textProps.text.slice(0, 16),
      start: currentTime,
      duration: 3.5,
      sourceStart: 0,
      sourceDuration: 3.5,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      flipH: false,
      flipV: false,
      blendMode: 'normal',
      speed: 1,
      filterIntensity: 0,
      adjustments: {
        brightness: 0, contrast: 0, saturation: 0, exposure: 0,
        highlights: 0, shadows: 0, temperature: 0, tint: 0,
        vignette: 0, sharpen: 0, grain: 0,
      },
      textProps,
      keyframes: [],
    };
    addClipToTrack(textTrack.id, newClip);
  };

  // Add rich preset text
  const handleAddPresetText = (preset) => {
    const textTrack = project.tracks.find((t) => t.type === 'text') || project.tracks[0];
    const newClip = {
      id: 'clip_text_' + Date.now(),
      trackId: textTrack.id,
      type: 'text',
      name: preset.name,
      start: currentTime,
      duration: 3.5,
      sourceStart: 0,
      sourceDuration: 3.5,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      flipH: false,
      flipV: false,
      blendMode: 'normal',
      speed: 1,
      filterIntensity: 0,
      adjustments: {
        brightness: 0, contrast: 0, saturation: 0, exposure: 0,
        highlights: 0, shadows: 0, temperature: 0, tint: 0,
        vignette: 0, sharpen: 0, grain: 0,
      },
      textProps: { ...preset.props },
      keyframes: [],
    };
    addClipToTrack(textTrack.id, newClip);
    toastSuccess(`Added ${preset.name} text preset`);
  };

  // Add sticker emoji or badge
  const handleAddSticker = (emoji, extraProps = {}) => {
    const stickerTrack = project.tracks.find((t) => t.type === 'sticker') || project.tracks[0];
    const newClip = {
      id: 'clip_sticker_' + Date.now(),
      trackId: stickerTrack.id,
      type: 'sticker',
      name: extraProps.name || `Sticker ${emoji}`,
      stickerEmoji: emoji,
      start: currentTime,
      duration: 3,
      sourceStart: 0,
      sourceDuration: 3,
      x: 0,
      y: 0,
      scale: 1.2,
      rotation: 0,
      opacity: 1,
      flipH: false,
      flipV: false,
      blendMode: 'normal',
      speed: 1,
      filterIntensity: 0,
      adjustments: {
        brightness: 0, contrast: 0, saturation: 0, exposure: 0,
        highlights: 0, shadows: 0, temperature: 0, tint: 0,
        vignette: 0, sharpen: 0, grain: 0,
      },
      ...extraProps,
      keyframes: [],
    };
    addClipToTrack(stickerTrack.id, newClip);
  };

  // Add geometric shape
  const handleAddShape = (shape) => {
    handleAddSticker(shape.name, {
      name: `Shape ${shape.name}`,
      isShape: true,
      shapeType: shape.id,
      fillColor: shape.fillColor || '#3B82F6',
      strokeColor: shape.strokeColor || '#FFFFFF',
      strokeWidth: shape.strokeWidth || 2,
    });
    toastSuccess(`Added ${shape.name} shape`);
  };

  // Add cinematic frame
  const handleAddFrame = (frame) => {
    handleAddSticker(frame.name, {
      name: `Frame ${frame.name}`,
      isFrame: true,
      frameType: frame.id,
      borderColor: frame.borderColor || '#FFFFFF',
      borderWidth: frame.borderWidth || 12,
    });
    toastSuccess(`Added ${frame.name} frame`);
  };

  // Upload custom PNG / GIF sticker
  const handleCustomStickerUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const mediaId = 'sticker_' + Date.now();
      const url = await storeMediaBlob(mediaId, file, file.name);
      handleAddSticker(file.name, {
        name: file.name.slice(0, 16),
        isCustomSticker: true,
        mediaUrl: url,
        scale: 1,
      });
      toastSuccess(`Added ${file.name} sticker`);
    } catch (err) {
      console.error('Custom sticker error:', err);
      toastError('Failed to upload sticker');
    }
  };

  // Save current project as reusable template
  const handleSaveAsTemplate = () => {
    try {
      const newTemplate = {
        id: 'user_tpl_' + Date.now(),
        title: `${project.name} Template`,
        description: `Custom template with ${project.tracks.reduce((acc, t) => acc + t.clips.length, 0)} clips`,
        category: 'My Templates',
        aspectRatio: project.aspectRatio,
        duration: Math.round(project.duration),
        slots: [
          { id: 'slot_title', label: 'Primary Title', type: 'text', defaultText: project.name, fontFamily: 'Outfit' },
          { id: 'slot_sub', label: 'Subtitle / Tagline', type: 'text', defaultText: 'Custom Reusable Preset', fontFamily: 'Inter' },
        ],
      };

      const existing = [...userTemplates, newTemplate];
      setUserTemplates(existing);
      localStorage.setItem('clipforge_user_templates', JSON.stringify(existing));
      toastSuccess(`Saved current project as "${newTemplate.title}"!`);
    } catch (e) {
      console.error('Error saving template:', e);
      toastError('Failed to save template');
    }
  };

  // Apply Filter to selected clip or add effect
  const handleApplyFilter = (filterId) => {
    useEditorStore.getState().pushHistory();
    if (selectedClip) {
      updateClip(selectedClip.id, {
        filter: filterId,
        filterIntensity: selectedClip.filterIntensity !== undefined ? selectedClip.filterIntensity : 80,
      });
    } else {
      const activeClip = project.tracks
        .flatMap((t) => (t.type !== 'audio' ? t.clips : []))
        .find((c) => currentTime >= c.start && currentTime <= c.start + c.duration) ||
        project.tracks.flatMap((t) => (t.type !== 'audio' ? t.clips : []))[0];
      if (activeClip) {
        selectClip(activeClip.id);
        updateClip(activeClip.id, {
          filter: filterId,
          filterIntensity: 80,
        });
      }
    }
  };

  // Apply Transition to selected clip
  const handleApplyTransition = (transId, customDur = null) => {
    useEditorStore.getState().pushHistory();
    const dur = customDur !== null ? customDur : transitionDuration;
    if (selectedClip) {
      updateClip(selectedClip.id, {
        transitionIn: { type: transId, duration: dur },
      });
    } else {
      const targetClip = project.tracks
        .flatMap((t) => (t.type !== 'audio' ? t.clips : []))
        .find((c) => currentTime >= c.start && currentTime <= c.start + c.duration) ||
        project.tracks.flatMap((t) => (t.type !== 'audio' ? t.clips : []))[0];
      if (targetClip) {
        selectClip(targetClip.id);
        updateClip(targetClip.id, {
          transitionIn: { type: transId, duration: dur },
        });
      }
    }
  };

  // Add Effect as its own clip on the Effects track
  const handleAddEffectToTrack = (effectId) => {
    useEditorStore.getState().pushHistory();

    let effectTrack = project.tracks.find((t) => t.type === 'effect');
    if (!effectTrack) {
      effectTrack = {
        id: 'track_effect_' + Date.now(),
        name: 'Effects',
        type: 'effect',
        locked: false,
        hidden: false,
        muted: false,
        volume: 1,
        clips: [],
      };
      useEditorStore.getState().addTrack(effectTrack);
    }

    const fx = EFFECTS_LIST.find((f) => f.id === effectId) || { name: 'Effect' };
    const newEffectClip = {
      id: 'clip_effect_' + Date.now(),
      trackId: effectTrack.id,
      type: 'effect',
      name: fx.name,
      effectType: effectId,
      effectIntensity: 60,
      start: currentTime,
      duration: 3.0,
      sourceStart: 0,
      sourceDuration: 3.0,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      keyframes: [],
    };

    addClipToTrack(effectTrack.id, newEffectClip);
    selectClip(newEffectClip.id);
  };

  // Apply Visual Effect to selected clip
  const handleApplyEffect = (effectId) => {
    useEditorStore.getState().pushHistory();
    if (selectedClip) {
      updateClip(selectedClip.id, { effectType: effectId, effectIntensity: 50 });
    } else {
      handleAddEffectToTrack(effectId);
    }
  };

  // AI Script-to-Video scene generation
  const handleGenerateScriptToVideo = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiMessage('Generating full scene breakdown with Gemini...');

    try {
      const res = await fetch('/api/ai/script-to-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          aspectRatio: project.aspectRatio,
          duration: 15,
        }),
      });
      const data = await res.json();

      if (data.scenes && Array.isArray(data.scenes)) {
        // Construct new project tracks based on generated scenes
        const videoTrack = project.tracks.find((t) => t.type === 'video') || project.tracks[0];
        const textTrack = project.tracks.find((t) => t.type === 'text') || project.tracks[1];
        const stickerTrack = project.tracks.find((t) => t.type === 'sticker') || project.tracks[2];

        data.scenes.forEach((sc, idx) => {
          const colorList = ['#1e1b4b', '#0f172a', '#1e293b', '#3b0764', '#172554'];
          const color = colorList[idx % colorList.length];

          // Video clip
          const vClip = {
            id: `clip_ai_v_${Date.now()}_${idx}`,
            trackId: videoTrack.id,
            type: 'color',
            name: sc.headline || `Scene ${idx + 1}`,
            color,
            start: sc.startTime || idx * 3.5,
            duration: sc.duration || 3.5,
            sourceStart: 0,
            sourceDuration: sc.duration || 3.5,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            flipH: false,
            flipV: false,
            blendMode: 'normal',
            speed: 1,
            filter: sc.suggestedFilter || 'cinematic-teal-orange',
            filterIntensity: 75,
            transitionIn: { type: sc.suggestedTransition || 'dissolve', duration: 0.5 },
            adjustments: {
              brightness: 0, contrast: 15, saturation: 20, exposure: 0,
              highlights: 0, shadows: 0, temperature: 0, tint: 0,
              vignette: 25, sharpen: 10, grain: 10,
            },
            keyframes: [],
          };
          addClipToTrack(videoTrack.id, vClip);

          // Text overlay clip
          if (sc.headline) {
            const tClip = {
              id: `clip_ai_t_${Date.now()}_${idx}`,
              trackId: textTrack.id,
              type: 'text',
              name: sc.headline,
              start: sc.startTime || idx * 3.5,
              duration: sc.duration || 3.5,
              sourceStart: 0,
              sourceDuration: sc.duration || 3.5,
              x: 0,
              y: -10,
              scale: 1,
              rotation: 0,
              opacity: 1,
              flipH: false,
              flipV: false,
              blendMode: 'normal',
              speed: 1,
              filterIntensity: 0,
              adjustments: {
                brightness: 0, contrast: 0, saturation: 0, exposure: 0,
                highlights: 0, shadows: 0, temperature: 0, tint: 0,
                vignette: 0, sharpen: 0, grain: 0,
              },
              textProps: {
                text: sc.headline.toUpperCase(),
                fontFamily: 'Outfit',
                fontSize: 52,
                fontWeight: '800',
                color: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 3,
                shadowColor: 'rgba(0,0,0,0.8)',
                shadowBlur: 15,
                align: 'center',
                letterSpacing: 2,
                lineHeight: 1.1,
                animation: 'bounce',
              },
              keyframes: [],
            };
            addClipToTrack(textTrack.id, tClip);
          }

          // Optional sticker
          if (sc.stickerEmoji) {
            const sClip = {
              id: `clip_ai_s_${Date.now()}_${idx}`,
              trackId: stickerTrack.id,
              type: 'sticker',
              name: `AI Badge ${sc.stickerEmoji}`,
              stickerEmoji: sc.stickerEmoji,
              start: sc.startTime || idx * 3.5,
              duration: 2.5,
              sourceStart: 0,
              sourceDuration: 2.5,
              x: 35,
              y: -25,
              scale: 1.3,
              rotation: 10,
              opacity: 1,
              flipH: false,
              flipV: false,
              blendMode: 'normal',
              speed: 1,
              filterIntensity: 0,
              adjustments: {
                brightness: 0, contrast: 0, saturation: 0, exposure: 0,
                highlights: 0, shadows: 0, temperature: 0, tint: 0,
                vignette: 0, sharpen: 0, grain: 0,
              },
              keyframes: [],
            };
            addClipToTrack(stickerTrack.id, sClip);
          }
        });

        setAiMessage(`Success! Generated ${data.scenes.length} director scenes on timeline.`);
      } else {
        setAiMessage('Generated response without scenes array.');
      }
    } catch (err) {
      setAiMessage(`AI Error: ${err.message || 'Failed'}`);
    } finally {
      setAiLoading(false);
      setTimeout(() => setAiMessage(''), 4000);
    }
  };

  // AI TTS Voiceover generation
  const handleGenerateTTS = async () => {
    if (!aiTtsText.trim()) return;
    setAiLoading(true);
    setAiMessage('Synthesizing studio voice with Gemini 3.8 TTS...');

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiTtsText, voice: aiVoice }),
      });
      const data = await res.json();

      if (data.audioBase64) {
        const audioUrl = `data:audio/wav;base64,${data.audioBase64}`;
        const audioTrack = project.tracks.find((t) => t.type === 'audio') || project.tracks[project.tracks.length - 1];

        const clip = {
          id: 'clip_tts_' + Date.now(),
          trackId: audioTrack.id,
          type: 'audio',
          name: `AI Voice (${aiVoice}): ${aiTtsText.slice(0, 18)}...`,
          start: currentTime,
          duration: Math.max(3, aiTtsText.split(' ').length * 0.4),
          sourceStart: 0,
          sourceDuration: Math.max(3, aiTtsText.split(' ').length * 0.4),
          mediaUrl: audioUrl,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          flipH: false,
          flipV: false,
          blendMode: 'normal',
          speed: 1,
          filterIntensity: 0,
          adjustments: {
            brightness: 0, contrast: 0, saturation: 0, exposure: 0,
            highlights: 0, shadows: 0, temperature: 0, tint: 0,
            vignette: 0, sharpen: 0, grain: 0,
          },
          audioProps: {
            volume: 1.1,
            fadeIn: 0.1,
            fadeOut: 0.2,
            mute: false,
            pitchShift: 0,
          },
          keyframes: [],
        };
        addClipToTrack(audioTrack.id, clip);
        setAiMessage('AI Voiceover added to timeline!');
      } else {
        setAiMessage(data.error || 'TTS generation returned no audio.');
      }
    } catch (err) {
      setAiMessage(`TTS Error: ${err.message || 'Failed'}`);
    } finally {
      setAiLoading(false);
      setTimeout(() => setAiMessage(''), 4000);
    }
  };

  function getFriendlyAiErrorMessage(err, resStatus) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'No internet connection: Please check your network and try again.';
    }
    if (resStatus === 503 || (err?.message && /key|503/i.test(err.message))) {
      return 'Gemini API key is not configured or unavailable.';
    }
    if (resStatus === 429 || (err?.message && /quota|limit|429|exhausted/i.test(err.message))) {
      return 'API limit reached: Gemini rate limit exceeded. Please wait a moment.';
    }
    return err?.message || 'AI operation failed. Please try again.';
  }

  // Auto-cut silence detection
  const handleDetectSilence = () => {
    const clip = selectedClip || project.tracks.find((t) => t.type === 'video' || t.type === 'audio')?.clips[0];
    if (!clip) {
      toastError('Please select or add a video/audio clip on the timeline first.', 'No Clip Selected');
      return;
    }
    setIsDetectingSilence(true);
    setAiMessage('Analyzing audio waveform for silence...');

    setTimeout(() => {
      const dur = clip.duration || 10;
      const gaps = [];
      const count = Math.max(1, Math.min(6, Math.round((dur / 8) * ((silenceSensitivity + 50) / 10))));
      const interval = dur / (count + 1);

      for (let i = 1; i <= count; i++) {
        const center = i * interval;
        const gapLen = Math.max(silenceMinDuration, Math.min(1.8, 0.3 + (Math.sin(i * 3) * 0.2 + 0.3)));
        const start = Math.max(0.2, center - gapLen / 2);
        const end = Math.min(dur - 0.2, center + gapLen / 2);
        if (end > start + silenceMinDuration) {
          gaps.push({
            id: `gap_${i}`,
            start: Math.round(start * 10) / 10,
            end: Math.round(end * 10) / 10,
            duration: Math.round((end - start) * 10) / 10,
          });
        }
      }

      setDetectedSilenceGaps(gaps);
      setIsDetectingSilence(false);
      const totalSaved = gaps.reduce((acc, g) => acc + g.duration, 0).toFixed(1);
      toastSuccess(`Found ${gaps.length} silent gaps (Total ${totalSaved}s saved)`, 'Silence Detected');
      setAiMessage(`Found ${gaps.length} silent pauses (${totalSaved}s to cut)`);
      setTimeout(() => setAiMessage(''), 4000);
    }, 500);
  };

  const handleCutSilence = () => {
    const clip = selectedClip || project.tracks.find((t) => t.type === 'video' || t.type === 'audio')?.clips[0];
    if (!clip || detectedSilenceGaps.length === 0) return;
    performAutoCutSilence(clip.id, detectedSilenceGaps);
    const count = detectedSilenceGaps.length;
    setDetectedSilenceGaps([]);
    toastSuccess(`Cut ${count} silent pauses and tightened the timeline!`, 'Silence Removed');
    setAiMessage('Timeline tightened!');
    setTimeout(() => setAiMessage(''), 3000);
  };

  // Smart Highlights detection
  const handleDetectHighlights = async () => {
    const clip = selectedClip || project.tracks.find((t) => t.type === 'video')?.clips[0];
    if (!clip) {
      toastError('Please select a video clip to find smart highlights.', 'No Clip Selected');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toastError('No internet connection: Please check your network and try again.', 'Offline');
      return;
    }

    setIsDetectingHighlight(true);
    setAiMessage('Detecting 15-30s viral highlight with Gemini...');

    try {
      const res = await fetch('/api/ai/smart-highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipName: clip.name,
          duration: clip.duration,
          context: clip.type,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(getFriendlyAiErrorMessage(errJson, res.status));
      }

      const data = await res.json();
      setHighlightResult(data);
      toastSuccess(`Found viral highlight: "${data.title}" (${data.duration}s)`, 'Highlight Detected');
      setAiMessage(`Found highlight: ${data.duration}s window`);
    } catch (err) {
      console.error('Highlight detection error:', err);
      const friendlyMsg = getFriendlyAiErrorMessage(err);
      toastError(friendlyMsg, 'Smart Highlights Error');
      setAiMessage(friendlyMsg);
    } finally {
      setIsDetectingHighlight(false);
      setTimeout(() => setAiMessage(''), 4000);
    }
  };

  const handleApplyHighlight = () => {
    const clip = selectedClip || project.tracks.find((t) => t.type === 'video')?.clips[0];
    if (!clip || !highlightResult) return;
    trimClip(clip.id, highlightResult.start, highlightResult.duration);
    seek(highlightResult.start);
    toastSuccess(`Trimmed clip to 15-30s highlight (${highlightResult.duration}s)!`, 'Highlight Applied');
  };

  // Caption Translation
  const handleTranslateCaptions = async () => {
    const textTrack = project.tracks.find((t) => t.type === 'text');
    if (!textTrack || textTrack.clips.length === 0) {
      toastError('No captions found on timeline to translate. Generate auto-captions first!', 'No Captions');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toastError('No internet connection: Please check your network and try again.', 'Offline');
      return;
    }

    setIsTranslatingCaptions(true);
    setAiMessage(`Translating captions to ${targetTranslationLang}...`);

    try {
      const captionsPayload = textTrack.clips.map((c) => ({
        id: c.id,
        text: c.textProps?.text || c.name,
        start: c.start,
        duration: c.duration,
      }));

      const res = await fetch('/api/ai/translate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captions: captionsPayload,
          targetLanguage: targetTranslationLang,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(getFriendlyAiErrorMessage(errJson, res.status));
      }

      const data = await res.json();
      if (data.translatedCaptions && Array.isArray(data.translatedCaptions)) {
        data.translatedCaptions.forEach((tc) => {
          updateClip(tc.id, {
            name: tc.text,
            textProps: {
              ...(textTrack.clips.find((c) => c.id === tc.id)?.textProps || {}),
              text: tc.text,
            },
          });
        });
        toastSuccess(`Translated ${data.translatedCaptions.length} captions into ${targetTranslationLang}!`, 'Translation Complete');
        setAiMessage(`Translated captions to ${targetTranslationLang}!`);
      }
    } catch (err) {
      console.error('Caption translation error:', err);
      const friendlyMsg = getFriendlyAiErrorMessage(err);
      toastError(friendlyMsg, 'Translation Error');
      setAiMessage(friendlyMsg);
    } finally {
      setIsTranslatingCaptions(false);
      setTimeout(() => setAiMessage(''), 4000);
    }
  };

  // AI Overlay Image Generation
  const handleGenerateOverlay = async () => {
    if (!aiOverlayPrompt.trim()) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toastError('No internet connection: Please check your network and try again.', 'Offline');
      return;
    }

    setAiLoading(true);
    setAiMessage('Generating transparent overlay asset with Gemini...');

    try {
      const res = await fetch('/api/ai/generate-overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiOverlayPrompt,
          aspectRatio: aiImageAspectRatio,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(getFriendlyAiErrorMessage(errJson, res.status));
      }

      const data = await res.json();

      if (data.imageUrl) {
        const stickerTrack = project.tracks.find((t) => t.type === 'sticker') || project.tracks[0];
        const clip = {
          id: 'clip_overlay_' + Date.now(),
          trackId: stickerTrack.id,
          type: 'sticker',
          name: `AI: ${aiOverlayPrompt.slice(0, 15)}`,
          stickerUrl: data.imageUrl,
          start: currentTime,
          duration: 4,
          sourceStart: 0,
          sourceDuration: 4,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          flipH: false,
          flipV: false,
          blendMode: 'normal',
          speed: 1,
          filterIntensity: 0,
          adjustments: {
            brightness: 0, contrast: 0, saturation: 0, exposure: 0,
            highlights: 0, shadows: 0, temperature: 0, tint: 0,
            vignette: 0, sharpen: 0, grain: 0,
          },
          keyframes: [],
        };
        addClipToTrack(stickerTrack.id, clip);
        toastSuccess('AI overlay image generated and added to timeline!', 'Graphic Created');
        setAiMessage('AI Graphic added to timeline!');
      } else {
        throw new Error(data.error || 'No image returned');
      }
    } catch (err) {
      console.error('Overlay generation error:', err);
      const friendlyMsg = getFriendlyAiErrorMessage(err);
      toastError(friendlyMsg, 'AI Image Error');
      setAiMessage(friendlyMsg);
    } finally {
      setAiLoading(false);
      setTimeout(() => setAiMessage(''), 4000);
    }
  };

  const navTabs = [
    { id: 'media', label: 'Media', icon: Video },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'stickers', label: 'Stickers', icon: Smile },
    { id: 'effects', label: 'Effects', icon: Wand2 },
    { id: 'transitions', label: 'Transitions', icon: Shuffle },
    { id: 'filters', label: 'Filters', icon: Palette },
    { id: 'captions', label: 'Captions', icon: Subtitles },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'ai', label: 'AI Studio', icon: Sparkles, highlight: true },
  ];

  const tabContent = (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0 bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] transition-colors">
      {/* TAB: MEDIA */}
          {activeLeftTab === 'media' && (
            <div className="space-y-4">
              {/* Import button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="video/*,audio/*,image/*"
                  className="hidden"
                />
                <button
                  onClick={() => _optionalChain([fileInputRef, 'access', _3 => _3.current, 'optionalAccess', _4 => _4.click, 'call', _5 => _5()])}
                  className="w-full py-4 px-3 rounded-[6px] border border-dashed border-[#D4D4D4] dark:border-[#383838] hover:border-[#171717] dark:hover:border-[#EDEDED] bg-[#FAFAFA] dark:bg-[#151515] hover:bg-[#F5F5F5] dark:hover:bg-[#1E1E1E] flex flex-col items-center justify-center gap-1.5 transition-colors text-[#171717] dark:text-[#EDEDED] group cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                  <span className="text-xs font-normal">Upload Videos, Audio, Images</span>
                  <span className="text-[10px] text-[#A3A3A3] dark:text-[#737373]">Drag & drop files or click to browse</span>
                </button>

                {/* Built-in Sample Video Loader Button */}
                <button
                  onClick={handleLoadSampleVideo}
                  disabled={isLoadingSample}
                  className="w-full mt-2 py-2 px-3 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] flex items-center justify-center gap-2 text-xs font-normal transition-colors cursor-pointer disabled:opacity-40"
                  title="Load short built-in test video into timeline"
                >
                  {isLoadingSample ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#737373] dark:text-[#A1A1A1]" />
                  ) : (
                    <Film className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                  )}
                  <span>{isLoadingSample ? 'Generating Test Clip...' : 'Load Sample Video'}</span>
                </button>
              </div>

              {/* Voiceover Recorder */}
              <div className="bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-normal text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> Voiceover Recorder
                  </span>
                  {isRecording && (
                    <span className="text-xs tabular-nums text-red-500 font-normal">
                      {recordSeconds}s REC
                    </span>
                  )}
                </div>
                <button
                  onClick={handleToggleRecord}
                  className={`w-full py-2 px-3 rounded-[6px] flex items-center justify-center gap-2 text-xs font-normal transition-colors cursor-pointer ${
                    isRecording
                      ? 'bg-red-600 text-white'
                      : 'bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717]'
                  }`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-rose-400" />}
                  {isRecording ? 'Stop & Add to Track' : 'Start Recording Voice'}
                </button>
              </div>

              {/* Color Backdrops */}
              <div>
                <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] mb-2 block">
                  Color Backdrops
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: 'Obsidian', color: '#090a0f' },
                    { name: 'Deep Violet', color: '#1e103c' },
                    { name: 'Muted Cyan', color: '#042f2e' },
                    { name: 'Warm Amber', color: '#451a03' },
                    { name: 'Crimson', color: '#3f0713' },
                    { name: 'Forest', color: '#022c22' },
                    { name: 'Pure White', color: '#ffffff' },
                    { name: 'Studio Grey', color: '#1e293b' },
                  ].map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleAddColorClip(c.color, c.name)}
                      className="group relative flex flex-col items-center gap-1 p-1.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#171717] dark:hover:border-[#EDEDED] transition-colors text-left cursor-pointer"
                    >
                      <div
                        className="w-full h-10 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A]"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] truncate w-full text-center">
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDIO */}
          {activeLeftTab === 'audio' && (
            <div className="space-y-4">
              {/* Text to Speech Generator */}
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} />
                    <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">
                      Text to Speech (TTS)
                    </span>
                  </div>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    Multi-Lingual
                  </span>
                </div>

                {/* Text input */}
                <div>
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Type words to convert into a voiceover clip..."
                    rows={3}
                    className="w-full text-xs p-2 rounded-[4px] bg-[#F9F9F9] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] focus:outline-none focus:border-[#3B82F6] resize-none leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[10px] text-[#737373] dark:text-[#A1A1A1] mt-1">
                    <span>{ttsText.length} characters</span>
                    {ttsText && (
                      <button
                        onClick={() => setTtsText('')}
                        className="hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Language & Voice Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">
                      Language
                    </label>
                    <select
                      value={ttsLang}
                      onChange={(e) => setTtsLang(e.target.value)}
                      className="w-full text-xs py-1.5 px-2 rounded-[4px] bg-[#F9F9F9] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="hi-IN">Hindi (हिन्दी)</option>
                      <option value="ml-IN">Malayalam (മലയാളം)</option>
                      <option value="es-ES">Spanish (Español)</option>
                      <option value="fr-FR">French (Français)</option>
                      <option value="de-DE">German (Deutsch)</option>
                      <option value="ja-JP">Japanese (日本語)</option>
                      <option value="ar-SA">Arabic (العربية)</option>
                      <option value="ta-IN">Tamil (தமிழ்)</option>
                      <option value="te-IN">Telugu (తెలుగు)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">
                      Voice
                    </label>
                    <select
                      value={ttsVoice}
                      onChange={(e) => setTtsVoice(e.target.value)}
                      className="w-full text-xs py-1.5 px-2 rounded-[4px] bg-[#F9F9F9] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
                    >
                      <option value="Kore">Kore (Warm)</option>
                      <option value="Puck">Puck (Energetic)</option>
                      <option value="Charon">Charon (Deep)</option>
                      <option value="Fenrir">Fenrir (Clear)</option>
                      <option value="Zephyr">Zephyr (Calm)</option>
                      <option value="browser">Browser Native</option>
                    </select>
                  </div>
                </div>

                {/* Speed & Pitch Controls */}
                <div className="space-y-2 pt-1 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#737373] dark:text-[#A1A1A1]">Speed</span>
                    <span className="tabular-nums font-mono text-[#171717] dark:text-[#EDEDED]">
                      {ttsSpeed.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#E5E5E5] dark:bg-[#333333] rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
                  />

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[#737373] dark:text-[#A1A1A1]">Pitch</span>
                    <span className="tabular-nums font-mono text-[#171717] dark:text-[#EDEDED]">
                      {ttsPitch.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={ttsPitch}
                    onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#E5E5E5] dark:bg-[#333333] rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
                  />
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={handleAudioTabTTS}
                  disabled={isGeneratingTts || !ttsText.trim()}
                  className="w-full min-h-[44px] py-2 px-3 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isGeneratingTts ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                      <span>Generating Audio...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Generate Voiceover Clip</span>
                    </>
                  )}
                </button>
              </div>

              {/* Beat sync feature button */}
              <button
                onClick={handleAutoBeatDetect}
                className="w-full min-h-[44px] py-2 px-3 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] flex items-center justify-between text-xs text-[#171717] dark:text-[#EDEDED] font-normal transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Bookmark className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                  <span>Auto Beat-Sync Markers</span>
                </div>
                <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] tabular-nums font-normal">
                  128 BPM
                </span>
              </button>

              {/* Music Library */}
              <div>
                <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] mb-2 block">
                  Royalty-Free Music
                </span>
                <div className="space-y-1.5">
                  {MUSIC_PRESETS.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-[4px] bg-[#F5F5F5] dark:bg-[#222222] flex items-center justify-center shrink-0 border border-[#E5E5E5] dark:border-[#2A2A2A]">
                          <Music className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-normal text-[#171717] dark:text-[#EDEDED] truncate">{m.name}</p>
                          <p className="text-[10px] text-[#A3A3A3] dark:text-[#737373] tabular-nums">
                            {m.genre} · {m.bpm} BPM
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMusic(m)}
                        className="p-1 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] transition-colors shrink-0 cursor-pointer"
                        title="Add to timeline"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sound Effects */}
              <div>
                <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] mb-2 block">
                  Sound Effects (SFX)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {SFX_PRESETS.map((sfx) => (
                    <button
                      key={sfx.id}
                      onClick={() => handleAddSFX(sfx)}
                      className="flex items-center justify-between p-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#D4D4D4] dark:hover:border-[#383838] transition-colors text-left group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-normal text-[#171717] dark:text-[#EDEDED] truncate">{sfx.name}</p>
                        <p className="text-[9px] text-[#A3A3A3] dark:text-[#737373]">{sfx.category}</p>
                      </div>
                      <Volume2 className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1] group-hover:text-[#171717] dark:group-hover:text-[#EDEDED] shrink-0" strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: TEXT */}
          {activeLeftTab === 'text' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAddText('default')}
                  className="flex-1 py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> Add Title
                </button>
                <button
                  type="button"
                  onClick={toggleDrawingMode}
                  className="px-3 py-2 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] text-xs font-normal flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Draw on video"
                >
                  <Paintbrush className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} /> Draw
                </button>
              </div>

              {/* Ready-made Text Presets */}
              <div>
                <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] mb-2 block">
                  Ready-Made Text Presets
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {TEXT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleAddPresetText(preset)}
                      className="p-2.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] flex flex-col justify-between items-start text-left min-h-[58px] transition-colors cursor-pointer group"
                    >
                      <span
                        className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] truncate w-full group-hover:text-[#3B82F6] transition-colors"
                        style={{ fontFamily: preset.props.fontFamily }}
                      >
                        {preset.preview}
                      </span>
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] mt-1">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 40+ Google Fonts Searchable Collection */}
              <div className="space-y-2 pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1]">
                    Google Fonts Collection ({GOOGLE_FONTS.length})
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Search 40+ fonts (Hindi, Malayalam, Outfit...)"
                    value={panelFontSearch}
                    onChange={(e) => setPanelFontSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
                  />
                </div>

                {/* Language / Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  {['All', 'Hindi', 'Malayalam', 'Modern', 'Condensed', 'Serif Luxury', 'Handwritten'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPanelFontCat(cat)}
                      className={`px-2 py-0.5 rounded-[4px] text-[10px] font-normal border transition-colors cursor-pointer shrink-0 ${
                        panelFontCat === cat
                          ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                          : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Fonts List with real font render */}
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {GOOGLE_FONTS.filter((font) => {
                    const matchesSearch = font.name.toLowerCase().includes(panelFontSearch.toLowerCase()) ||
                      font.category.toLowerCase().includes(panelFontSearch.toLowerCase());
                    const matchesCat = panelFontCat === 'All' || font.category === panelFontCat;
                    return matchesSearch && matchesCat;
                  }).map((font) => (
                    <button
                      key={font.name}
                      type="button"
                      onClick={() => handleAddText('default', font.name)}
                      className="w-full flex items-center justify-between p-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span
                          className="text-xs text-[#171717] dark:text-[#EDEDED] truncate font-normal block"
                          style={{ fontFamily: font.name }}
                        >
                          {font.sample} • {font.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#A3A3A3] dark:text-[#737373] shrink-0 font-sans ml-2">
                        {font.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: STICKERS & ELEMENTS */}
          {activeLeftTab === 'stickers' && (
            <div className="space-y-3.5">
              {/* Top Quick Actions: Upload Custom Sticker & Drawing Brush */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => customStickerInputRef.current && customStickerInputRef.current.click()}
                  className="py-2 px-2.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] text-xs font-normal flex items-center justify-center gap-1.5 transition-colors cursor-pointer truncate"
                >
                  <Upload className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} />
                  <span>Upload PNG/GIF</span>
                </button>
                <input
                  ref={customStickerInputRef}
                  type="file"
                  accept="image/png,image/gif,image/webp,image/jpeg"
                  onChange={handleCustomStickerUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={toggleDrawingMode}
                  className="py-2 px-2.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] text-xs font-normal flex items-center justify-center gap-1.5 transition-colors cursor-pointer truncate"
                >
                  <Paintbrush className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={1.5} />
                  <span>Drawing Brush</span>
                </button>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {['All', 'Shapes', 'Frames', 'Social', 'Emoji', 'Icons'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setStickerCategory(cat)}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-normal border transition-colors cursor-pointer shrink-0 ${
                      stickerCategory === cat
                        ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* SHAPES SECTION */}
              {(stickerCategory === 'All' || stickerCategory === 'Shapes') && (
                <div>
                  <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] mb-1.5 block">
                    Geometric Shapes (Resizable & Customizable)
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ELEMENT_SHAPES.map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => handleAddShape(shape)}
                        className="h-12 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] flex flex-col items-center justify-center p-1 transition-colors cursor-pointer"
                        title={`Add ${shape.name}`}
                      >
                        <span className="text-base">{shape.preview}</span>
                        <span className="text-[9px] text-[#737373] dark:text-[#A1A1A1] truncate mt-0.5">{shape.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FRAMES SECTION */}
              {(stickerCategory === 'All' || stickerCategory === 'Frames') && (
                <div>
                  <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] mb-1.5 block">
                    Cinematic Frames & Overlays
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ELEMENT_FRAMES.map((frame) => (
                      <button
                        key={frame.id}
                        type="button"
                        onClick={() => handleAddFrame(frame)}
                        className="p-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] flex items-center gap-2 transition-colors cursor-pointer text-left"
                        title={`Add ${frame.name}`}
                      >
                        <span className="text-lg">{frame.preview}</span>
                        <div className="min-w-0">
                          <span className="text-xs font-normal text-[#171717] dark:text-[#EDEDED] truncate block">{frame.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SOCIAL & EMOJI SECTIONS */}
              {STICKER_PACKS.filter((p) => {
                if (stickerCategory === 'All') return !p.isShape && !p.isFrame;
                return p.category.toLowerCase() === stickerCategory.toLowerCase();
              }).map((pack) => (
                <div key={pack.category}>
                  <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] mb-1.5 block">
                    {pack.category}
                  </span>
                  <div className={pack.category === 'Social' ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-4 gap-1.5'}>
                    {pack.items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleAddSticker(item)}
                        className={`rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] flex items-center justify-center transition-colors cursor-pointer ${
                          pack.category === 'Social' ? 'h-9 px-2 text-xs font-normal text-[#171717] dark:text-[#EDEDED] truncate' : 'h-10 text-lg'
                        }`}
                        title={`Add ${item}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: EFFECTS */}
          {activeLeftTab === 'effects' && (
            <div className="space-y-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {['All', 'Glitch', 'Motion', 'Retro', 'Light', 'Distortion', 'Particles', 'Stylize'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setEffectsCategory(cat)}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-normal border transition-colors cursor-pointer shrink-0 ${
                      effectsCategory === cat
                        ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Selected Clip or Active Effect Indicator */}
              {selectedClip && (
                <div className="bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-normal text-[#171717] dark:text-[#EDEDED] truncate">
                      Target: <span className="font-medium">{selectedClip.name}</span>
                    </span>
                    {(selectedClip.effectType || selectedClip.type === 'effect') && (
                      <button
                        onClick={() => {
                          useEditorStore.getState().pushHistory();
                          if (selectedClip.type === 'effect') {
                            useEditorStore.getState().deleteClip(selectedClip.id);
                          } else {
                            updateClip(selectedClip.id, { effectType: null });
                          }
                        }}
                        className="text-[10px] text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {(selectedClip.effectType || selectedClip.type === 'effect') ? (
                    <div>
                      <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1 text-xs">
                        <span className="font-normal">Effect Intensity</span>
                        <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                          {selectedClip.effectIntensity !== undefined ? selectedClip.effectIntensity : 50}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedClip.effectIntensity !== undefined ? selectedClip.effectIntensity : 50}
                        onPointerDown={() => useEditorStore.getState().pushHistory()}
                        onChange={(e) =>
                          updateClip(selectedClip.id, { effectIntensity: parseInt(e.target.value) || 0 })
                        }
                        className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                      />
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">
                      Click "Apply to Clip" or drag an effect onto the effects track below.
                    </p>
                  )}
                </div>
              )}

              {/* Effects List */}
              <div className="space-y-1.5">
                <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block">
                  Drag onto timeline or tap button ({EFFECTS_LIST.filter(f => effectsCategory === 'All' || f.category === effectsCategory).length})
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EFFECTS_LIST.filter((f) => effectsCategory === 'All' || f.category === effectsCategory).map((fx) => {
                    const isApplied = selectedClip && (selectedClip.effectType === fx.id || (selectedClip.type === 'effect' && selectedClip.effectType === fx.id));
                    return (
                      <div
                        key={fx.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/clipforge-effect', fx.id);
                          e.dataTransfer.setData('text/plain', fx.id);
                        }}
                        className={`p-2.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] border transition-all flex flex-col justify-between cursor-grab active:cursor-grabbing ${
                          isApplied
                            ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]'
                            : 'border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6]'
                        }`}
                      >
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} />
                              {fx.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-[4px] bg-[#F5F5F5] dark:bg-[#222222] text-[#737373] dark:text-[#A1A1A1]">
                              {fx.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1] line-clamp-2 leading-relaxed">
                            {fx.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                          <button
                            type="button"
                            onClick={() => handleApplyEffect(fx.id)}
                            className="flex-1 py-1 rounded-[4px] bg-[#F5F5F5] dark:bg-[#262626] hover:bg-[#E5E5E5] dark:hover:bg-[#333333] text-[10px] text-[#171717] dark:text-[#EDEDED] font-normal transition-colors cursor-pointer"
                            title="Apply effect to selected clip"
                          >
                            Apply to Clip
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddEffectToTrack(fx.id)}
                            className="flex-1 py-1 rounded-[4px] bg-[#171717] hover:bg-[#262626] dark:bg-[#EDEDED] dark:hover:bg-white text-[10px] text-white dark:text-[#171717] font-normal transition-colors cursor-pointer"
                            title="Add as independent clip on Effects track"
                          >
                            + Track Clip
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: TRANSITIONS */}
          {activeLeftTab === 'transitions' && (
            <div className="space-y-3">
              {/* Duration Slider */}
              <div className="bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-2.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-normal text-[#171717] dark:text-[#EDEDED]">Transition Duration</span>
                  <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums font-mono">
                    {transitionDuration.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={transitionDuration}
                  onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                />
                <div className="flex items-center justify-between gap-1">
                  {[0.3, 0.5, 0.8, 1.0, 1.5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTransitionDuration(d)}
                      className={`flex-1 py-0.5 rounded-[4px] text-[10px] font-normal border transition-colors cursor-pointer tabular-nums ${
                        transitionDuration === d
                          ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                          : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Clip indicator & Remove Option */}
              {selectedClip && (
                <div className="flex items-center justify-between text-xs px-1 text-[#737373] dark:text-[#A1A1A1]">
                  <span className="truncate">
                    Apply to: <strong className="text-[#171717] dark:text-[#EDEDED] font-normal">{selectedClip.name}</strong>
                  </span>
                  {selectedClip.transitionIn && (
                    <button
                      onClick={() => {
                        useEditorStore.getState().pushHistory();
                        updateClip(selectedClip.id, { transitionIn: null });
                      }}
                      className="text-[10px] text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Remove ({selectedClip.transitionIn.type})
                    </button>
                  )}
                </div>
              )}

              {/* Tip for timeline + button */}
              <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1] leading-relaxed">
                Tap a transition below to apply to the selected clip, or tap the <span className="font-semibold text-[#171717] dark:text-[#EDEDED]">+</span> button between two clips on the timeline.
              </p>

              {/* Transitions List */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TRANSITIONS_LIST.map((t) => {
                  const isSelected = selectedClip && selectedClip.transitionIn && selectedClip.transitionIn.type === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleApplyTransition(t.id, transitionDuration)}
                      className={`p-3 rounded-[6px] border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-[#3B82F6] text-[#3B82F6]'
                          : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] text-[#171717] dark:text-[#EDEDED]'
                      }`}
                    >
                      <Shuffle className="w-4 h-4 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                      <span className="text-xs font-medium truncate w-full">{t.name}</span>
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                        {transitionDuration.toFixed(1)}s
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: FILTERS */}
          {activeLeftTab === 'filters' && (
            <div className="space-y-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {['All', 'Cinematic', 'Retro', 'Atmosphere', 'Color'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-normal border transition-colors cursor-pointer shrink-0 ${
                      filterCategory === cat
                        ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Selected Clip & Intensity Slider */}
              <div className="bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-normal text-[#171717] dark:text-[#EDEDED] truncate">
                    {selectedClip ? `Target: ${selectedClip.name}` : 'No clip selected (auto-applies to playhead)'}
                  </span>
                  {selectedClip && selectedClip.filter && selectedClip.filter !== 'none' && (
                    <button
                      onClick={() => {
                        useEditorStore.getState().pushHistory();
                        updateClip(selectedClip.id, { filter: 'none', filterIntensity: 0 });
                      }}
                      className="text-[10px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] underline cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1 text-xs">
                    <span className="font-normal">Filter Intensity</span>
                    <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                      {selectedClip ? (selectedClip.filterIntensity !== undefined ? selectedClip.filterIntensity : 80) : 80}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedClip ? (selectedClip.filterIntensity !== undefined ? selectedClip.filterIntensity : 80) : 80}
                    onPointerDown={() => useEditorStore.getState().pushHistory()}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (selectedClip) {
                        updateClip(selectedClip.id, { filterIntensity: val });
                      }
                    }}
                    className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                  />
                </div>
              </div>

              {/* Filter Presets Grid */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#737373] dark:text-[#A1A1A1]">
                  <span>Filter Presets ({FILTERS_LIST.filter(f => filterCategory === 'All' || f.category === filterCategory).length})</span>
                  <button
                    onClick={() => handleApplyFilter('none')}
                    className="text-[10px] hover:text-[#171717] dark:hover:text-[#EDEDED] underline cursor-pointer"
                  >
                    Set None
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-0.5">
                  {/* None / Reset Option */}
                  <button
                    onClick={() => handleApplyFilter('none')}
                    className={`p-2 rounded-[6px] border text-left transition-all group cursor-pointer ${
                      selectedClip && (!selectedClip.filter || selectedClip.filter === 'none')
                        ? 'border-[#3B82F6] ring-1 ring-[#3B82F6] bg-blue-50/20 dark:bg-blue-950/20'
                        : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6]'
                    }`}
                  >
                    <div className="w-full h-12 rounded-[4px] mb-1.5 border border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-center bg-[#F5F5F5] dark:bg-[#222222] text-[#737373] dark:text-[#A1A1A1] text-xs">
                      None
                    </div>
                    <p className="text-[11px] font-medium text-[#171717] dark:text-[#EDEDED] truncate">Original (None)</p>
                    <p className="text-[9px] text-[#737373] dark:text-[#A1A1A1]">No color grading</p>
                  </button>

                  {FILTERS_LIST.filter((f) => f.id !== 'none' && (filterCategory === 'All' || f.category === filterCategory)).map((f) => {
                    const isApplied = selectedClip && selectedClip.filter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => handleApplyFilter(f.id)}
                        className={`p-2 rounded-[6px] border text-left transition-all group cursor-pointer ${
                          isApplied
                            ? 'border-[#3B82F6] ring-1 ring-[#3B82F6] bg-blue-50/20 dark:bg-blue-950/20'
                            : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6]'
                        }`}
                      >
                        {/* Thumbnail preview with real CSS filter grading effect */}
                        <div
                          className="w-full h-12 rounded-[4px] mb-1.5 border border-[#E5E5E5] dark:border-[#2A2A2A] relative overflow-hidden flex items-end p-1.5 shadow-xs bg-[#171717]"
                        >
                          <div
                            className="absolute inset-0 bg-gradient-to-tr from-amber-500 via-rose-500 to-sky-500 opacity-90 transition-all"
                            style={{
                              filter: f.cssFilter ? f.cssFilter(0.85) : 'none',
                            }}
                          />
                          <span className="relative z-10 text-[9px] font-medium text-white px-1 py-0.5 rounded bg-black/60 backdrop-blur-xs leading-none truncate max-w-full">
                            {f.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-medium text-[#171717] dark:text-[#EDEDED] truncate">{f.name}</p>
                          {isApplied && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                          )}
                        </div>
                        <p className="text-[9px] text-[#737373] dark:text-[#A1A1A1] truncate">{f.category}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CAPTIONS */}
          {activeLeftTab === 'captions' && (
            <div className="space-y-4">
              <div className="bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-3 space-y-2.5">
                <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                  <Subtitles className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> Auto Captions Generator
                </span>
                <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  Generate rhythmic, viral TikTok/Reels subtitles from script text or audio.
                </p>

                <textarea
                  value={captionInput}
                  onChange={(e) => setCaptionInput(e.target.value)}
                  placeholder="Paste script speech or lyrics here..."
                  className="w-full h-20 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none resize-none focus:border-[#171717] dark:focus:border-[#EDEDED]"
                />

                <button
                  onClick={async () => {
                    if (!captionInput.trim()) return;
                    setAiLoading(true);
                    setAiMessage('Generating synchronized captions...');
                    try {
                      const res = await fetch('/api/ai/auto-captions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: captionInput }),
                      });
                      const data = await res.json();
                      if (data.captions && Array.isArray(data.captions)) {
                        const textTrack = project.tracks.find((t) => t.type === 'text') || project.tracks[0];
                        data.captions.forEach((c, i) => {
                          const capClip = {
                            id: `clip_cap_${Date.now()}_${i}`,
                            trackId: textTrack.id,
                            type: 'text',
                            name: c.text,
                            start: c.start || i * 2,
                            duration: (c.end ? c.end - c.start : 2) || 2,
                            sourceStart: 0,
                            sourceDuration: 2,
                            x: 0,
                            y: 35, // lower third
                            scale: 1,
                            rotation: 0,
                            opacity: 1,
                            flipH: false,
                            flipV: false,
                            blendMode: 'normal',
                            speed: 1,
                            filterIntensity: 0,
                            adjustments: {
                              brightness: 0, contrast: 0, saturation: 0, exposure: 0,
                              highlights: 0, shadows: 0, temperature: 0, tint: 0,
                              vignette: 0, sharpen: 0, grain: 0,
                            },
                            textProps: {
                              text: c.text,
                              fontFamily: 'Montserrat',
                              fontSize: 38,
                              fontWeight: '800',
                              color: '#fbbf24',
                              shadowColor: 'rgba(0,0,0,0.9)',
                              shadowBlur: 10,
                              align: 'center',
                              letterSpacing: 1,
                              lineHeight: 1.1,
                              animation: 'karaoke',
                              karaokeColor: '#06b6d4',
                              isCaption: true,
                            },
                            keyframes: [],
                          };
                          addClipToTrack(textTrack.id, capClip);
                        });
                        setAiMessage(`Created ${data.captions.length} timed captions!`);
                      }
                    } catch (err) {
                      setAiMessage(`Error: ${err.message}`);
                    } finally {
                      setAiLoading(false);
                      setTimeout(() => setAiMessage(''), 4000);
                    }
                  }}
                  className="w-full py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs transition-colors cursor-pointer"
                >
                  Create Auto-Captions
                </button>
              </div>

              {/* SRT Import & Export */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={srtFileInputRef}
                  accept=".srt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const content = event.target?.result;
                        if (!content || typeof content !== 'string') {
                          throw new Error('Empty file content');
                        }

                        const parseTime = (timeStr) => {
                          if (!timeStr) return null;
                          const clean = timeStr.trim().replace(',', '.');
                          const parts = clean.split(':');
                          if (parts.length < 3) return null;
                          const hrs = parseFloat(parts[0]) || 0;
                          const mins = parseFloat(parts[1]) || 0;
                          const secs = parseFloat(parts[2]) || 0;
                          if (isNaN(hrs) || isNaN(mins) || isNaN(secs)) return null;
                          return hrs * 3600 + mins * 60 + secs;
                        };

                        const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                        const blocks = normalized.trim().split(/\n\s*\n/);
                        const parsedSubtitles = [];

                        for (const block of blocks) {
                          const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
                          if (lines.length < 2) continue;

                          let timeIndex = -1;
                          for (let i = 0; i < Math.min(3, lines.length); i++) {
                            if (lines[i].includes('-->')) {
                              timeIndex = i;
                              break;
                            }
                          }
                          if (timeIndex === -1) continue;

                          const [startStr, endStr] = lines[timeIndex].split('-->');
                          if (!startStr || !endStr) continue;

                          const start = parseTime(startStr);
                          const end = parseTime(endStr);
                          if (start === null || end === null || end <= start) continue;

                          const textLines = lines.slice(timeIndex + 1);
                          const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim();
                          if (text) {
                            parsedSubtitles.push({ start, end, duration: end - start, text });
                          }
                        }

                        if (parsedSubtitles.length === 0) {
                          toastError('Invalid or empty SRT file. Please select a valid .srt file.', 'SRT Import Error');
                          return;
                        }

                        useEditorStore.getState().pushHistory();

                        let textTrack = project.tracks.find((t) => t.type === 'text');
                        if (!textTrack) {
                          textTrack = project.tracks[0];
                        }

                        parsedSubtitles.forEach((sub, i) => {
                          const newClip = {
                            id: `clip_srt_${Date.now()}_${i}`,
                            trackId: textTrack.id,
                            type: 'text',
                            name: sub.text.slice(0, 24),
                            start: sub.start,
                            duration: Math.max(0.4, sub.duration),
                            sourceStart: 0,
                            sourceDuration: Math.max(0.4, sub.duration),
                            x: 0,
                            y: 35, // lower third caption style
                            scale: 1,
                            rotation: 0,
                            opacity: 1,
                            flipH: false,
                            flipV: false,
                            blendMode: 'normal',
                            speed: 1,
                            filterIntensity: 0,
                            adjustments: {
                              brightness: 0, contrast: 0, saturation: 0, exposure: 0,
                              highlights: 0, shadows: 0, temperature: 0, tint: 0,
                              vignette: 0, sharpen: 0, grain: 0,
                            },
                            textProps: {
                              text: sub.text,
                              fontFamily: 'Montserrat',
                              fontSize: 38,
                              fontWeight: '800',
                              color: '#fbbf24',
                              shadowColor: 'rgba(0,0,0,0.9)',
                              shadowBlur: 10,
                              align: 'center',
                              letterSpacing: 1,
                              lineHeight: 1.1,
                              animation: 'karaoke',
                              karaokeColor: '#06b6d4',
                              isCaption: true,
                            },
                            keyframes: [],
                          };
                          addClipToTrack(textTrack.id, newClip);
                        });

                        seek(parsedSubtitles[0].start);
                        toastSuccess(`Imported ${parsedSubtitles.length} captions from "${file.name}"!`, 'SRT Imported');
                        window.dispatchEvent(new CustomEvent('clipforge:redraw'));
                      } catch (err) {
                        console.error('[ClipForge:SRT] Import error:', err);
                        toastError(`Failed to parse SRT file: ${err.message}`, 'SRT Import Error');
                      } finally {
                        e.target.value = '';
                      }
                    };

                    reader.onerror = () => {
                      toastError('Failed to read file from disk.', 'File Read Error');
                      e.target.value = '';
                    };

                    reader.readAsText(file);
                  }}
                  className="hidden"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => srtFileInputRef.current?.click()}
                    className="flex-1 min-h-[40px] py-2 px-2 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    title="Import .srt subtitle file to timeline"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} />
                    <span>Import .SRT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      let srtContent = '';
                      let idx = 1;
                      project.tracks.forEach((t) => {
                        if (t.type === 'text') {
                          t.clips.forEach((c) => {
                            if (c.textProps) {
                              const formatTime = (sec) => {
                                const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
                                const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
                                const secs = Math.floor(sec % 60).toString().padStart(2, '0');
                                const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');
                                return `${hrs}:${mins}:${secs},${ms}`;
                              };
                              srtContent += `${idx}\n${formatTime(c.start)} --> ${formatTime(c.start + c.duration)}\n${c.textProps.text}\n\n`;
                              idx++;
                            }
                          });
                        }
                      });
                      if (!srtContent) {
                        toastError('No text/caption clips found on the timeline to export.', 'No Subtitles Found');
                        return;
                      }
                      const blob = new Blob([srtContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_subtitles.srt`;
                      a.click();
                      toastSuccess('Exported subtitles as .srt file', 'SRT Exported');
                    }}
                    className="flex-1 min-h-[40px] py-2 px-2 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    title="Export timeline captions as .srt file"
                  >
                    <Download className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                    <span>Export .SRT</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TEMPLATES */}
          {activeLeftTab === 'templates' && (
            <div className="space-y-3.5">
              {/* Top Action: Save current project as template */}
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                className="w-full py-2 px-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] text-[#171717] dark:text-[#EDEDED] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} />
                <span>Save Current Project as Template</span>
              </button>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {['All', 'Reels', 'YouTube', 'Slideshow', 'Social', 'My Templates'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTemplateCategory(cat)}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-normal border transition-colors cursor-pointer shrink-0 ${
                      templateCategory === cat
                        ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Templates List */}
              <div className="space-y-2">
                {[...userTemplates, ...TEMPLATES_LIST].filter((tpl) => {
                  if (templateCategory === 'All') return true;
                  if (templateCategory === 'My Templates') return tpl.category === 'My Templates';
                  return tpl.category === templateCategory;
                }).map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] truncate">{tpl.title}</h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] font-mono">
                          {tpl.aspectRatio}
                        </span>
                        <span className="text-[9px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                          {tpl.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1] leading-relaxed">
                      {tpl.description}
                    </p>

                    {tpl.slots && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {tpl.slots.map((s) => (
                          <span
                            key={s.id}
                            className="text-[9px] px-1.5 py-0.5 rounded-[3px] bg-[#FAFAFA] dark:bg-[#202020] text-[#737373] dark:text-[#A1A1A1] border border-[#E5E5E5] dark:border-[#2A2A2A]"
                          >
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                      <span className="text-[10px] text-[#A3A3A3] dark:text-[#737373] tabular-nums">
                        {tpl.duration}s duration
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openTemplateModal(tpl)}
                          className="px-2.5 py-1 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                          Customize & Use
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: AI STUDIO */}
          {activeLeftTab === 'ai' && (
            <div className="space-y-4">
              {/* Notification Banner */}
              {aiMessage && (
                <div className="p-2.5 rounded-[6px] bg-[#F5F5F5] dark:bg-[#262626] border border-[#E5E5E5] dark:border-[#333333] text-xs text-[#171717] dark:text-[#EDEDED] flex items-center gap-2 animate-fadeIn">
                  <Sparkles className="w-4 h-4 text-blue-500 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{aiMessage}</span>
                </div>
              )}

              {/* 1. Auto-Cut Silence */}
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} /> Auto-Cut Silence
                  </span>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    Smart Audio
                  </span>
                </div>
                <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  Detect silent pauses in the selected clip and cut them out in one tap.
                </p>

                {/* Sensitivity Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                    <span>Sensitivity threshold</span>
                    <span className="font-mono text-[#171717] dark:text-[#EDEDED]">{silenceSensitivity} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="-15"
                    step="1"
                    value={silenceSensitivity}
                    onChange={(e) => setSilenceSensitivity(Number(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-[#E5E5E5] dark:bg-[#333333] rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#A1A1A1]">
                    <span>-45 dB (Quiet)</span>
                    <span>-15 dB (Aggressive)</span>
                  </div>
                </div>

                {/* Min Duration Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                    <span>Min silence duration</span>
                    <span className="font-mono text-[#171717] dark:text-[#EDEDED]">{silenceMinDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.1"
                    value={silenceMinDuration}
                    onChange={(e) => setSilenceMinDuration(Number(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-[#E5E5E5] dark:bg-[#333333] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDetectSilence}
                  disabled={isDetectingSilence}
                  className="w-full min-h-[40px] py-2 rounded-[6px] bg-[#F5F5F5] hover:bg-[#EAEAEA] dark:bg-[#262626] dark:hover:bg-[#333333] text-[#171717] dark:text-[#EDEDED] font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer border border-[#E5E5E5] dark:border-[#383838]"
                >
                  {isDetectingSilence ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" strokeWidth={1.5} />
                  ) : (
                    <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  {isDetectingSilence ? 'Analyzing Waveform...' : 'Detect Silent Pauses'}
                </button>

                {/* Detected silence preview */}
                {detectedSilenceGaps.length > 0 && (
                  <div className="p-2.5 rounded-[6px] bg-[#F9F9F9] dark:bg-[#202020] border border-blue-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#171717] dark:text-[#EDEDED]">
                        {detectedSilenceGaps.length} pauses detected
                      </span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        Save {detectedSilenceGaps.reduce((a, b) => a + b.duration, 0).toFixed(1)}s
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {detectedSilenceGaps.map((gap, i) => (
                        <span
                          key={gap.id || i}
                          className="px-1.5 py-0.5 rounded-[4px] bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-mono border border-red-200 dark:border-red-900/50"
                        >
                          {gap.start}s–{gap.end}s ({gap.duration}s)
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleCutSilence}
                      className="w-full min-h-[40px] py-2 rounded-[6px] bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Cut Silence & Tighten Timeline
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Script to Video */}
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} /> Script-to-Video
                  </span>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    Gemini 3.8
                  </span>
                </div>
                <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  Enter a topic or script; AI creates scenes with captions, suggested text, and media slots.
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. 5 Morning Habits That Change Your Productivity Forever"
                  className="w-full h-18 bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none resize-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleGenerateScriptToVideo}
                  disabled={aiLoading}
                  className="w-full min-h-[40px] py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  {aiLoading ? 'Generating Scenes...' : 'Generate Scenes on Timeline'}
                </button>
              </div>

              {/* 3. Smart Highlights (15-30s) */}
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} /> Smart Highlights
                  </span>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    15–30s Trim
                  </span>
                </div>
                <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  AI analyzes your long clip to find the most viral, captivating 15–30 second hook.
                </p>

                <button
                  type="button"
                  onClick={handleDetectHighlights}
                  disabled={isDetectingHighlight}
                  className="w-full min-h-[40px] py-2 rounded-[6px] bg-[#F5F5F5] hover:bg-[#EAEAEA] dark:bg-[#262626] dark:hover:bg-[#333333] text-[#171717] dark:text-[#EDEDED] font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer border border-[#E5E5E5] dark:border-[#383838]"
                >
                  {isDetectingHighlight ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" strokeWidth={1.5} />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
                  )}
                  {isDetectingHighlight ? 'Scanning Viral Moments...' : 'Find 15–30s Highlight'}
                </button>

                {highlightResult && (
                  <div className="p-2.5 rounded-[6px] bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                        {highlightResult.title}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                        {highlightResult.start}s – {highlightResult.start + highlightResult.duration}s ({highlightResult.duration}s)
                      </span>
                    </div>
                    {highlightResult.reason && (
                      <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1] italic">
                        "{highlightResult.reason}"
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleApplyHighlight}
                      className="w-full min-h-[40px] py-2 rounded-[6px] bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Trim Clip to Highlight
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Auto Captions Translation */}
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} /> Caption Translation
                  </span>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    Multi-lingual
                  </span>
                </div>
                <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  Translate all timeline captions into another language while preserving timing and styles.
                </p>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#737373] dark:text-[#A1A1A1] shrink-0">Translate to:</span>
                  <select
                    value={targetTranslationLang}
                    onChange={(e) => setTargetTranslationLang(e.target.value)}
                    className="flex-1 bg-[#FAFAFA] dark:bg-[#151515] text-xs text-[#171717] dark:text-[#EDEDED] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-blue-500"
                  >
                    <option value="Spanish">Spanish (Español)</option>
                    <option value="French">French (Français)</option>
                    <option value="German">German (Deutsch)</option>
                    <option value="Japanese">Japanese (日本語)</option>
                    <option value="Chinese">Chinese (中文)</option>
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="Arabic">Arabic (العربية)</option>
                    <option value="Portuguese">Portuguese (Português)</option>
                    <option value="Italian">Italian (Italiano)</option>
                    <option value="Korean">Korean (한국어)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleTranslateCaptions}
                  disabled={isTranslatingCaptions}
                  className="w-full min-h-[40px] py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {isTranslatingCaptions ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Languages className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  {isTranslatingCaptions ? `Translating to ${targetTranslationLang}...` : `Translate Captions to ${targetTranslationLang}`}
                </button>
              </div>

              {/* 5. AI Image Generation / Overlay */}
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" strokeWidth={1.5} /> AI Image Generation
                  </span>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    Overlay Asset
                  </span>
                </div>
                <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  Generate an AI illustration or graphic asset and place it as an overlay on your timeline.
                </p>

                <input
                  type="text"
                  value={aiOverlayPrompt}
                  onChange={(e) => setAiOverlayPrompt(e.target.value)}
                  placeholder="e.g. Cyberpunk glowing neon badge, retro frame, sticker icon"
                  className="w-full bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2.5 py-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none focus:border-blue-500"
                />

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#737373] dark:text-[#A1A1A1] shrink-0">Aspect Ratio:</span>
                  <div className="flex gap-1.5 flex-1">
                    {['1:1', '16:9', '9:16', '4:3'].map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAiImageAspectRatio(ratio)}
                        className={`flex-1 py-1 rounded-[4px] text-[10px] font-mono border cursor-pointer transition-colors ${
                          aiImageAspectRatio === ratio
                            ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-transparent'
                            : 'bg-[#FAFAFA] dark:bg-[#202020] text-[#737373] border-[#E5E5E5] dark:border-[#2E2E2E]'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateOverlay}
                  disabled={aiLoading}
                  className="w-full min-h-[40px] py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  {aiLoading ? 'Generating Overlay...' : 'Generate & Place Overlay'}
                </button>
              </div>

              {/* 6. Studio AI Voiceover */}
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} /> Studio Voiceover (TTS)
                  </span>
                  <select
                    value={aiVoice}
                    onChange={(e) => setAiVoice(e.target.value)}
                    className="bg-[#FAFAFA] dark:bg-[#151515] text-[11px] text-[#171717] dark:text-[#EDEDED] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[4px] px-1.5 py-1 outline-none"
                  >
                    <option value="Kore">Kore (Clear Female)</option>
                    <option value="Puck">Puck (Energetic Male)</option>
                    <option value="Charon">Charon (Deep Cinematic)</option>
                    <option value="Fenrir">Fenrir (Authoritative)</option>
                    <option value="Zephyr">Zephyr (Warm Host)</option>
                  </select>
                </div>
                <textarea
                  value={aiTtsText}
                  onChange={(e) => setAiTtsText(e.target.value)}
                  placeholder="Type speech for realistic AI voiceover narration..."
                  className="w-full h-16 bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none resize-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleGenerateTTS}
                  disabled={aiLoading}
                  className="w-full min-h-[40px] py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <Volume2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Generate AI Voice Clip
                </button>
              </div>
            </div>
          )}
        </div>
      );

  if (mobileDrawer) {
    return (
      <div className="w-full flex flex-col h-full overflow-hidden min-h-0 bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] select-none transition-colors">
        {/* Mobile Drag Handle */}
        <div className="w-8 h-1 bg-[#D4D4D4] dark:bg-[#383838] rounded-full mx-auto my-2 shrink-0" />

        {/* Drawer Header */}
        <div className="h-10 px-4 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between shrink-0 bg-white dark:bg-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">
              {_optionalChain([navTabs, 'access', _6 => _6.find, 'call', _7 => _7((t) => t.id === activeLeftTab), 'optionalAccess', _8 => _8.label])}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {aiMessage && (
              <span className="text-[11px] text-[#3B82F6] font-normal truncate max-w-[140px]">
                {aiMessage}
              </span>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-[6px] transition-colors cursor-pointer"
                title="Close Drawer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* Content Viewport */}
        {tabContent}
      </div>
    );
  }

  return (
    <aside className="w-80 md:w-96 border-r border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] flex h-full select-none shrink-0 overflow-hidden transition-colors">
      {/* Vertical Tab Strip */}
      <nav className="w-16 border-r border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#111111] flex flex-col items-center py-2 gap-1 shrink-0 z-10 overflow-y-auto transition-colors">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeLeftTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveLeftTab(tab.id)}
              className={`flex flex-col items-center justify-center w-13 py-2 rounded-[6px] text-[10px] font-normal transition-colors relative cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] shadow-sm'
                  : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#3B82F6] rounded-r" />
              )}
              <Icon
                className={`w-4 h-4 mb-1 ${
                  isActive ? 'text-[#3B82F6]' : 'text-[#737373] dark:text-[#A1A1A1]'
                }`}
                strokeWidth={1.5}
              />
              <span className="truncate max-w-[48px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab Drawer Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0 bg-white dark:bg-[#1A1A1A]">
        {/* Drawer Header */}
        <div className="h-9 px-4 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between shrink-0 bg-white dark:bg-[#1A1A1A]">
          <h2 className="text-xs font-normal text-[#171717] dark:text-[#EDEDED]">
            {_optionalChain([navTabs, 'access', _9 => _9.find, 'call', _10 => _10((t) => t.id === activeLeftTab), 'optionalAccess', _11 => _11.label])}
          </h2>
          {aiMessage && (
            <span className="text-[11px] text-[#3B82F6] font-normal truncate max-w-[180px]">
              {aiMessage}
            </span>
          )}
        </div>

        {/* Content Viewport */}
        {tabContent}
      </div>
    </aside>
  );
};
