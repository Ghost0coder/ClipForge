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
  Play,
  Volume2,
  Zap,
  Bookmark,
  FileText,
  Download,
  Flame,
  Check,
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
import { Clip } from '../types/editor';

export const LeftPanel: React.FC = () => {
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<any>(null);

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

  // Handle local media file upload (video, image, audio)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mediaId = 'media_' + Date.now() + '_' + i;
      const url = await storeMediaBlob(mediaId, file, file.name);

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
          await new Promise<void>((resolve) => {
            mediaEl.onloadedmetadata = () => {
              if (mediaEl.duration && !isNaN(mediaEl.duration) && isFinite(mediaEl.duration)) {
                actualDuration = Math.round(mediaEl.duration * 10) / 10;
              }
              resolve();
            };
            mediaEl.onerror = () => resolve();
            setTimeout(() => resolve(), 2000);
          });
        } catch {}
      }

      // If this is the first clip on the track, start at 00:00 and align playhead
      const clipStart = targetTrack.clips.length === 0 ? 0 : currentTime;

      const newClip: Clip = {
        id: 'clip_' + Date.now() + '_' + i,
        trackId: targetTrack.id,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        name: file.name,
        start: clipStart,
        duration: actualDuration,
        sourceStart: 0,
        sourceDuration: actualDuration,
        mediaUrl: url,
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
      window.dispatchEvent(new CustomEvent('clipforge:redraw'));
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
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

        const clip: Clip = {
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
  const handleAddColorClip = (color: string, name: string) => {
    const videoTrack = project.tracks.find((t) => t.type === 'video') || project.tracks[0];
    const newClip: Clip = {
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
  const handleAddMusic = (preset: typeof MUSIC_PRESETS[0]) => {
    let audioTrack = project.tracks.find((t) => t.type === 'audio');
    if (!audioTrack) audioTrack = project.tracks[project.tracks.length - 1];

    const clip: Clip = {
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
  const handleAddSFX = (sfx: typeof SFX_PRESETS[0]) => {
    audioEngine.playSFX(sfx.id);
    let audioTrack = project.tracks.find((t) => t.type === 'audio') || project.tracks[project.tracks.length - 1];

    const clip: Clip = {
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
  const handleAddText = (styleType: string = 'default', customFont?: string) => {
    const textTrack = project.tracks.find((t) => t.type === 'text') || project.tracks[0];

    let textProps: import('../types/editor').TextClipProperties = {
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

    const newClip: Clip = {
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
  const handleAddSticker = (emoji: string) => {
    const stickerTrack = project.tracks.find((t) => t.type === 'sticker') || project.tracks[0];
    const newClip: Clip = {
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
  const handleApplyFilter = (filterId: string) => {
    if (selectedClip) {
      updateClip(selectedClip.id, { filter: filterId, filterIntensity: 80 });
    }
  };

  // Apply Transition to selected clip
  const handleApplyTransition = (transId: string) => {
    if (selectedClip) {
      updateClip(selectedClip.id, {
        transitionIn: { type: transId as any, duration: 0.5 },
      });
    }
  };

  // Apply Visual Effect to selected clip
  const handleApplyEffect = (effectId: string) => {
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

        data.scenes.forEach((sc: any, idx: number) => {
          const colorList = ['#1e1b4b', '#0f172a', '#1e293b', '#3b0764', '#172554'];
          const color = colorList[idx % colorList.length];

          // Video clip
          const vClip: Clip = {
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
            const tClip: Clip = {
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
            const sClip: Clip = {
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
    } catch (err: any) {
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

        const clip: Clip = {
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
    } catch (err: any) {
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
        const clip: Clip = {
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
    } catch (err: any) {
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

  return (
    <aside className="w-80 md:w-96 border-r border-[#222638] bg-[#12141c] flex h-full select-none shrink-0 overflow-hidden">
      {/* CapCut Vertical Tab Strip */}
      <nav className="w-16 border-r border-[#222638] bg-[#0e1017] flex flex-col items-center py-2 gap-1.5 shrink-0 z-10 overflow-y-auto">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeLeftTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveLeftTab(tab.id as any)}
              className={`flex flex-col items-center justify-center w-13 py-2 rounded-xl text-[10px] font-medium transition-all group ${
                isActive
                  ? 'bg-[#1e2233] text-white shadow-sm shadow-violet-500/10 border border-violet-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#151824]'
              } ${tab.highlight ? 'text-violet-400 hover:text-cyan-300' : ''}`}
            >
              <Icon
                className={`w-4 h-4 mb-1 transition-transform group-hover:scale-110 ${
                  isActive
                    ? 'text-violet-400'
                    : tab.highlight
                    ? 'text-cyan-400'
                    : 'text-slate-400'
                }`}
              />
              <span className="truncate max-w-[48px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab Drawer Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0 bg-[#141620]">
        {/* Drawer Header */}
        <div className="h-10 px-4 border-b border-[#222638] flex items-center justify-between shrink-0 bg-[#12141c]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {navTabs.find((t) => t.id === activeLeftTab)?.label}
          </h2>
          {aiMessage && (
            <span className="text-[11px] text-cyan-400 font-medium truncate max-w-[180px]">
              {aiMessage}
            </span>
          )}
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
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
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-3 rounded-xl border-2 border-dashed border-[#2f354c] hover:border-violet-500/70 bg-[#181b26] hover:bg-[#1c202e] flex flex-col items-center justify-center gap-1.5 transition-all text-slate-300 group cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Upload Videos, Audio, Images</span>
                  <span className="text-[10px] text-slate-500">Drag & drop files or click to browse</span>
                </button>
              </div>

              {/* Voiceover Recorder */}
              <div className="bg-[#181b26] border border-[#232738] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-rose-400" /> Voiceover Recorder
                  </span>
                  {isRecording && (
                    <span className="text-xs font-mono text-rose-400 font-bold animate-pulse">
                      {recordSeconds}s REC
                    </span>
                  )}
                </div>
                <button
                  onClick={handleToggleRecord}
                  className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : 'bg-[#222738] hover:bg-[#2c3247] text-slate-200'
                  }`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-rose-400" />}
                  {isRecording ? 'Stop & Add to Track' : 'Start Recording Voice'}
                </button>
              </div>

              {/* Color Backdrops */}
              <div>
                <span className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">
                  Color Backdrops
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: 'Obsidian', color: '#090a0f' },
                    { name: 'Deep Violet', color: '#1e103c' },
                    { name: 'Neon Cyan', color: '#042f2e' },
                    { name: 'Sunset Amber', color: '#451a03' },
                    { name: 'Crimson Night', color: '#3f0713' },
                    { name: 'Emerald Forest', color: '#022c22' },
                    { name: 'Pure White', color: '#ffffff' },
                    { name: 'Studio Grey', color: '#1e293b' },
                  ].map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleAddColorClip(c.color, c.name)}
                      className="group relative flex flex-col items-center gap-1 p-1.5 rounded-lg bg-[#181b26] border border-[#232738] hover:border-violet-500/50 transition-all text-left"
                    >
                      <div
                        className="w-full h-10 rounded border border-white/10"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-[10px] text-slate-300 truncate w-full text-center">
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
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-900/60 to-cyan-900/60 border border-cyan-500/30 hover:border-cyan-400 flex items-center justify-between text-xs text-white font-semibold transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-cyan-400" />
                  <span>Auto Beat-Sync Markers</span>
                </div>
                <span className="text-[10px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/40">
                  128 BPM
                </span>
              </button>

              {/* Music Library */}
              <div>
                <span className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">
                  Royalty-Free Music
                </span>
                <div className="space-y-1.5">
                  {MUSIC_PRESETS.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#181b26] border border-[#232738] hover:border-violet-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-violet-950 flex items-center justify-center shrink-0 border border-violet-500/20">
                          <Music className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{m.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {m.genre} · {m.bpm} BPM
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMusic(m)}
                        className="p-1.5 rounded-md bg-[#222738] hover:bg-violet-600 text-slate-300 hover:text-white transition-colors shrink-0"
                        title="Add to timeline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sound Effects */}
              <div>
                <span className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">
                  Sound Effects (SFX)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {SFX_PRESETS.map((sfx) => (
                    <button
                      key={sfx.id}
                      onClick={() => handleAddSFX(sfx)}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#181b26] border border-[#232738] hover:border-cyan-500/40 transition-colors text-left group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{sfx.name}</p>
                        <p className="text-[9px] text-slate-500">{sfx.category}</p>
                      </div>
                      <Volume2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
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
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-violet-600/20"
              >
                <Plus className="w-4 h-4" /> Add Standard Title
              </button>

              {/* Text Templates */}
              <div>
                <span className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">
                  Stylized Typography
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Cyber Neon', style: 'neon', preview: 'NEON', bg: 'bg-rose-950/40 text-rose-400' },
                    { label: 'Comic Impact', style: 'comic', preview: 'BOOM!', bg: 'bg-amber-950/40 text-amber-300' },
                    { label: 'Vibrant Wave', style: 'gradient', preview: 'WAVE', bg: 'bg-violet-950/40 text-cyan-300' },
                    { label: 'Subtitle Box', style: 'sub', preview: 'Sub Box', bg: 'bg-slate-900 text-white' },
                  ].map((t) => (
                    <button
                      key={t.label}
                      onClick={() => handleAddText(t.style)}
                      className={`h-16 rounded-xl border border-[#232738] hover:border-violet-500/60 p-2 flex flex-col justify-between items-center transition-all ${t.bg}`}
                    >
                      <span className="font-bold text-sm tracking-wide">{t.preview}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 50+ Google Fonts Quick Add */}
              <div>
                <span className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">
                  Google Fonts Collection
                </span>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {GOOGLE_FONTS.map((font) => (
                    <button
                      key={font.name}
                      onClick={() => handleAddText('default', font.name)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-[#181b26] border border-[#232738] hover:border-violet-500/40 text-left transition-colors"
                    >
                      <span
                        className="text-sm text-slate-200 truncate"
                        style={{ fontFamily: font.name }}
                      >
                        {font.name}
                      </span>
                      <span className="text-[10px] text-slate-500">{font.category}</span>
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
                  <span className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">
                    {pack.category}
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {pack.items.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddSticker(emoji)}
                        className="h-11 rounded-lg bg-[#181b26] border border-[#232738] hover:border-violet-500/50 hover:bg-[#202433] flex items-center justify-center text-xl transition-all cursor-pointer"
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
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Visual Effects ({EFFECTS_LIST.length})
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                Select a clip on the timeline to apply effect
              </p>
              <div className="grid grid-cols-2 gap-2">
                {EFFECTS_LIST.map((fx) => (
                  <button
                    key={fx.id}
                    onClick={() => handleApplyEffect(fx.id)}
                    className="p-2.5 rounded-xl bg-[#181b26] border border-[#232738] hover:border-violet-500/60 hover:bg-[#1e2233] text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-200">{fx.name}</span>
                      <Zap className="w-3.5 h-3.5 text-violet-400 group-hover:scale-125 transition-transform" />
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">{fx.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: TRANSITIONS */}
          {activeLeftTab === 'transitions' && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Transitions
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                Select a clip to apply an in-transition cut
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITIONS_LIST.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleApplyTransition(t.id)}
                    className="p-3 rounded-xl bg-[#181b26] border border-[#232738] hover:border-cyan-500/60 hover:bg-[#1e2233] flex flex-col items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <Shuffle className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">{t.name}</span>
                    <span className="text-[10px] text-slate-500">{t.duration}s</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: FILTERS */}
          {activeLeftTab === 'filters' && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Color Grading Filters ({FILTERS_LIST.length})
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                Select a clip on timeline to apply filter
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FILTERS_LIST.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleApplyFilter(f.id)}
                    className="p-2 rounded-xl bg-[#181b26] border border-[#232738] hover:border-violet-500/60 transition-all text-left group"
                  >
                    <div
                      className="w-full h-12 rounded-lg mb-1.5 border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-inner"
                      style={{ backgroundColor: f.previewColor }}
                    >
                      {f.name}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-300 truncate">{f.name}</p>
                    <p className="text-[9px] text-slate-500">{f.category}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: CAPTIONS */}
          {activeLeftTab === 'captions' && (
            <div className="space-y-4">
              <div className="bg-[#181b26] border border-[#232738] rounded-xl p-3 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Subtitles className="w-3.5 h-3.5 text-cyan-400" /> Auto Captions Generator
                </span>
                <p className="text-[11px] text-slate-400">
                  Generate rhythmic, viral TikTok/Reels karaoke subtitles from script text or audio.
                </p>

                <textarea
                  value={captionInput}
                  onChange={(e) => setCaptionInput(e.target.value)}
                  placeholder="Paste script speech or lyrics here..."
                  className="w-full h-20 bg-[#12141c] border border-[#2a2f42] rounded-lg p-2 text-xs text-slate-200 outline-none resize-none focus:border-cyan-500/50"
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
                        data.captions.forEach((c: any, i: number) => {
                          const capClip: Clip = {
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
                    } catch (err: any) {
                      setAiMessage(`Error: ${err.message}`);
                    } finally {
                      setAiLoading(false);
                      setTimeout(() => setAiMessage(''), 4000);
                    }
                  }}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-sm"
                >
                  Create Auto-Captions
                </button>
              </div>

              {/* SRT Export & Import */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Export all text clips as SRT format
                    let srtContent = '';
                    let idx = 1;
                    project.tracks.forEach((t) => {
                      if (t.type === 'text') {
                        t.clips.forEach((c) => {
                          if (c.textProps) {
                            const formatTime = (sec: number) => {
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
                  className="flex-1 py-2 px-2 rounded-lg bg-[#181b26] border border-[#232738] hover:border-slate-500 text-[11px] text-slate-300 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" /> Export .SRT
                </button>
              </div>
            </div>
          )}

          {/* TAB: TEMPLATES */}
          {activeLeftTab === 'templates' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                1-Click Templates
              </span>
              <div className="space-y-2">
                {TEMPLATES_LIST.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-3 rounded-xl bg-[#181b26] border border-[#232738] hover:border-violet-500/50 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white">{tpl.title}</h3>
                      <span className="text-[10px] bg-violet-950 text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/30">
                        {tpl.aspectRatio}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{tpl.description}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-[#232738]">
                      <span className="text-[10px] text-slate-500">{tpl.duration}s length</span>
                      <button
                        onClick={() => {
                          const newProj = createDefaultProject();
                          newProj.name = tpl.title;
                          newProj.aspectRatio = tpl.aspectRatio;
                          setProject(newProj);
                        }}
                        className="px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold transition-colors"
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
              <div className="p-3 rounded-xl bg-gradient-to-br from-[#1c1836] to-[#12141c] border border-violet-500/40 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AI Script-to-Video
                  </span>
                  <span className="text-[9px] bg-violet-900/60 text-violet-300 px-1.5 py-0.5 rounded font-mono">
                    Gemini 3.8
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Enter a topic or script; AI builds a multi-track sequence with titles, cuts, and filters.
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. 5 Tech Gadgets of 2026 That Feel Like Magic"
                  className="w-full h-16 bg-[#0f111a] border border-[#2a2f46] rounded-lg p-2 text-xs text-white outline-none resize-none focus:border-violet-500/60"
                />
                <button
                  onClick={handleGenerateScriptToVideo}
                  disabled={aiLoading}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {aiLoading ? (
                    <span className="animate-spin text-sm">✦</span>
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  )}
                  {aiLoading ? 'Generating Scenes...' : 'Generate Scenes on Timeline'}
                </button>
              </div>

              {/* Feature 2: Studio AI Voiceover */}
              <div className="p-3 rounded-xl bg-[#181b26] border border-[#232738] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-emerald-400" /> Studio Voiceover (TTS)
                  </span>
                  <select
                    value={aiVoice}
                    onChange={(e) => setAiVoice(e.target.value)}
                    className="bg-[#12141c] text-[11px] text-slate-300 border border-[#272b3c] rounded px-1.5 py-0.5 outline-none"
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
                  className="w-full h-16 bg-[#12141c] border border-[#2a2f42] rounded-lg p-2 text-xs text-slate-200 outline-none resize-none focus:border-emerald-500/50"
                />
                <button
                  onClick={handleGenerateTTS}
                  disabled={aiLoading}
                  className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Generate AI Voice Clip
                </button>
              </div>

              {/* Feature 3: AI Overlay Asset Generator */}
              <div className="p-3 rounded-xl bg-[#181b26] border border-[#232738] space-y-2.5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-cyan-400" /> AI Visual Overlay Generator
                </span>
                <input
                  type="text"
                  value={aiOverlayPrompt}
                  onChange={(e) => setAiOverlayPrompt(e.target.value)}
                  placeholder="e.g. Glowing holographic gaming skull badge"
                  className="w-full bg-[#12141c] border border-[#2a2f42] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={handleGenerateOverlay}
                  disabled={aiLoading}
                  className="w-full py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate & Insert Graphic
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
