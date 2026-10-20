 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import React, { useState, useRef } from 'react';
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
  createDefaultProject,
} from '../utils/sampleData';
import { audioEngine } from '../utils/audioEngine';
import { storeMediaBlob } from '../utils/storage';

import { toastError, toastSuccess, } from '../store/toastStore';
import { generateSampleVideoBlob } from '../utils/sampleVideo';






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
  } = useEditorStore();

  const fileInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef(null);

  // AI Generation States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTtsText, setAiTtsText] = useState('');
  const [aiVoice, setAiVoice] = useState('Kore');
  const [aiOverlayPrompt, setAiOverlayPrompt] = useState('');
  const [aiMessage, setAiMessage] = useState('');

  // Captions States
  const [captionInput, setCaptionInput] = useState('');
  const [captionDuration, setCaptionDuration] = useState(2.5);

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

  // Add sticker emoji
  const handleAddSticker = (emoji) => {
    const stickerTrack = project.tracks.find((t) => t.type === 'sticker') || project.tracks[0];
    const newClip = {
      id: 'clip_sticker_' + Date.now(),
      trackId: stickerTrack.id,
      type: 'sticker',
      name: `Sticker ${emoji}`,
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
      keyframes: [],
    };
    addClipToTrack(stickerTrack.id, newClip);
  };

  // Apply Filter to selected clip or add effect
  const handleApplyFilter = (filterId) => {
    if (selectedClip) {
      updateClip(selectedClip.id, { filter: filterId, filterIntensity: 80 });
    }
  };

  // Apply Transition to selected clip
  const handleApplyTransition = (transId) => {
    if (selectedClip) {
      updateClip(selectedClip.id, {
        transitionIn: { type: transId , duration: 0.5 },
      });
    }
  };

  // Apply Visual Effect to selected clip
  const handleApplyEffect = (effectId) => {
    if (selectedClip) {
      updateClip(selectedClip.id, { effectType: effectId, effectIntensity: 50 });
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

  // AI Overlay Image Generation
  const handleGenerateOverlay = async () => {
    if (!aiOverlayPrompt.trim()) return;
    setAiLoading(true);
    setAiMessage('Generating transparent overlay asset with Gemini...');

    try {
      const res = await fetch('/api/ai/generate-overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiOverlayPrompt }),
      });
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
        setAiMessage('AI Graphic added to timeline!');
      } else {
        setAiMessage(data.error || 'Failed to generate overlay');
      }
    } catch (err) {
      setAiMessage(`Error: ${err.message || 'Failed'}`);
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
              {/* Beat sync feature button */}
              <button
                onClick={handleAutoBeatDetect}
                className="w-full py-2 px-3 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] flex items-center justify-between text-xs text-[#171717] dark:text-[#EDEDED] font-normal transition-colors cursor-pointer"
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
              <button
                onClick={() => handleAddText('default')}
                className="w-full py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> Add Standard Title
              </button>

              {/* Text Templates */}
              <div>
                <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] mb-2 block">
                  Stylized Typography
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Minimal Clean', style: 'default', preview: 'CLEAN', bg: 'bg-[#F5F5F5] dark:bg-[#222222] text-[#171717] dark:text-[#EDEDED]' },
                    { label: 'Headline Heavy', style: 'comic', preview: 'HEADLINE', bg: 'bg-[#F5F5F5] dark:bg-[#222222] text-[#171717] dark:text-[#EDEDED]' },
                    { label: 'Soft Accent', style: 'gradient', preview: 'ACCENT', bg: 'bg-blue-50 dark:bg-blue-950/40 text-[#3B82F6]' },
                    { label: 'Subtitle Box', style: 'sub', preview: 'SUBTITLE', bg: 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717]' },
                  ].map((t) => (
                    <button
                      key={t.label}
                      onClick={() => handleAddText(t.style)}
                      className={`h-14 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] p-2 flex flex-col justify-between items-center transition-colors cursor-pointer ${t.bg}`}
                    >
                      <span className="font-medium text-xs tracking-wide">{t.preview}</span>
                      <span className="text-[10px] opacity-75 font-normal">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 50+ Google Fonts Quick Add */}
              <div>
                <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] mb-2 block">
                  Google Fonts Collection
                </span>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {GOOGLE_FONTS.map((font) => (
                    <button
                      key={font.name}
                      onClick={() => handleAddText('default', font.name)}
                      className="w-full flex items-center justify-between p-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-left transition-colors cursor-pointer"
                    >
                      <span
                        className="text-xs text-[#171717] dark:text-[#EDEDED] truncate font-normal"
                        style={{ fontFamily: font.name }}
                      >
                        {font.name}
                      </span>
                      <span className="text-[10px] text-[#A3A3A3] dark:text-[#737373]">{font.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: STICKERS */}
          {activeLeftTab === 'stickers' && (
            <div className="space-y-3">
              {STICKER_PACKS.map((pack) => (
                <div key={pack.category}>
                  <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] mb-1.5 block">
                    {pack.category}
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {pack.items.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddSticker(emoji)}
                        className="h-10 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] flex items-center justify-center text-lg transition-colors cursor-pointer"
                        title={`Add ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: EFFECTS */}
          {activeLeftTab === 'effects' && (
            <div className="space-y-2">
              <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block">
                Visual Effects ({EFFECTS_LIST.length})
              </span>
              <p className="text-[11px] text-[#A3A3A3] dark:text-[#737373] mb-2 font-normal">
                Select a clip on the timeline to apply effect
              </p>
              <div className="grid grid-cols-2 gap-2">
                {EFFECTS_LIST.map((fx) => (
                  <button
                    key={fx.id}
                    onClick={() => handleApplyEffect(fx.id)}
                    className="p-2.5 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">{fx.name}</span>
                      <Zap className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1] group-hover:text-[#171717] dark:group-hover:text-[#EDEDED] transition-colors" strokeWidth={1.5} />
                    </div>
                    <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1] line-clamp-2">{fx.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: TRANSITIONS */}
          {activeLeftTab === 'transitions' && (
            <div className="space-y-2">
              <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block">
                Transitions
              </span>
              <p className="text-[11px] text-[#A3A3A3] dark:text-[#737373] mb-2 font-normal">
                Select a clip to apply an in-transition cut
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITIONS_LIST.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleApplyTransition(t.id)}
                    className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] flex flex-col items-center justify-center gap-1.5 transition-colors text-center cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                    <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">{t.name}</span>
                    <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums">{t.duration}s</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: FILTERS */}
          {activeLeftTab === 'filters' && (
            <div className="space-y-2">
              <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block">
                Color Grading Filters ({FILTERS_LIST.length})
              </span>
              <p className="text-[11px] text-[#A3A3A3] dark:text-[#737373] mb-2 font-normal">
                Select a clip on timeline to apply filter
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FILTERS_LIST.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleApplyFilter(f.id)}
                    className="p-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] transition-colors text-left group cursor-pointer"
                  >
                    <div
                      className="w-full h-10 rounded-[4px] mb-1.5 border border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-center text-[11px] font-medium text-white shadow-xs"
                      style={{ backgroundColor: f.previewColor }}
                    >
                      {f.name}
                    </div>
                    <p className="text-[11px] font-medium text-[#171717] dark:text-[#EDEDED] truncate">{f.name}</p>
                    <p className="text-[9px] text-[#737373] dark:text-[#A1A1A1]">{f.category}</p>
                  </button>
                ))}
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

              {/* SRT Export & Import */}
              <div className="flex gap-2">
                <button
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
                    const blob = new Blob([srtContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${project.name}_subtitles.srt`;
                    a.click();
                  }}
                  className="flex-1 py-2 px-2 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs text-[#171717] dark:text-[#EDEDED] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> Export .SRT
                </button>
              </div>
            </div>
          )}

          {/* TAB: TEMPLATES */}
          {activeLeftTab === 'templates' && (
            <div className="space-y-3">
              <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block">
                1-Click Templates
              </span>
              <div className="space-y-2">
                {TEMPLATES_LIST.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6] transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">{tpl.title}</h3>
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                        {tpl.aspectRatio}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">{tpl.description}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                      <span className="text-[10px] text-[#A3A3A3] dark:text-[#737373] tabular-nums">{tpl.duration}s length</span>
                      <button
                        onClick={() => {
                          const newProj = createDefaultProject();
                          newProj.name = tpl.title;
                          newProj.aspectRatio = tpl.aspectRatio;
                          setProject(newProj);
                        }}
                        className="px-2.5 py-1 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Load Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: AI STUDIO */}
          {activeLeftTab === 'ai' && (
            <div className="space-y-4">
              {/* Feature 1: Script-to-Video */}
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> AI Script-to-Video
                  </span>
                  <span className="text-[9px] text-[#737373] dark:text-[#A1A1A1] bg-[#F5F5F5] dark:bg-[#222222] px-1.5 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    Gemini
                  </span>
                </div>
                <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  Enter a topic or script; AI builds a multi-track sequence with titles, cuts, and filters.
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. 5 Tech Gadgets of 2026 That Feel Like Magic"
                  className="w-full h-16 bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none resize-none focus:border-[#171717] dark:focus:border-[#EDEDED]"
                />
                <button
                  onClick={handleGenerateScriptToVideo}
                  disabled={aiLoading}
                  className="w-full py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {aiLoading ? (
                    <span className="animate-spin text-sm">✦</span>
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  {aiLoading ? 'Generating Scenes...' : 'Generate Scenes on Timeline'}
                </button>
              </div>

              {/* Feature 2: Studio AI Voiceover */}
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> Studio Voiceover (TTS)
                  </span>
                  <select
                    value={aiVoice}
                    onChange={(e) => setAiVoice(e.target.value)}
                    className="bg-[#FAFAFA] dark:bg-[#151515] text-[11px] text-[#171717] dark:text-[#EDEDED] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[4px] px-1.5 py-0.5 outline-none"
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
                  className="w-full h-16 bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none resize-none focus:border-[#171717] dark:focus:border-[#EDEDED]"
                />
                <button
                  onClick={handleGenerateTTS}
                  disabled={aiLoading}
                  className="w-full py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Generate AI Voice Clip
                </button>
              </div>

              {/* Feature 3: AI Overlay Asset Generator */}
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
                <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> AI Visual Overlay Generator
                </span>
                <input
                  type="text"
                  value={aiOverlayPrompt}
                  onChange={(e) => setAiOverlayPrompt(e.target.value)}
                  placeholder="e.g. Camera lens flare, border accent badge"
                  className="w-full bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2.5 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none focus:border-[#171717] dark:focus:border-[#EDEDED]"
                />
                <button
                  onClick={handleGenerateOverlay}
                  disabled={aiLoading}
                  className="w-full py-2 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Generate & Insert Graphic
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
