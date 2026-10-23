import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  LayoutTemplate,
  Type,
  Video,
  Image as ImageIcon,
  Check,
  Upload,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { GOOGLE_FONTS } from '../utils/sampleData';
import { storeMediaBlob } from '../utils/storage';
import { toastSuccess, toastError } from '../store/toastStore';

export const TemplateModal = () => {
  const {
    isTemplateModalOpen,
    templateModalData,
    closeTemplateModal,
    setProject,
    seek,
  } = useEditorStore();

  const [slotValues, setSlotValues] = useState({});
  const [isApplying, setIsApplying] = useState(false);

  // Initialize slot values when template opens
  useEffect(() => {
    if (templateModalData && templateModalData.slots) {
      const initial = {};
      templateModalData.slots.forEach((slot) => {
        initial[slot.id] = {
          text: slot.defaultText || '',
          color: slot.defaultColor || '#3B82F6',
          fontFamily: slot.fontFamily || 'Outfit',
          fontSize: slot.fontSize || 48,
          mediaUrl: null,
          mediaName: null,
        };
      });
      setSlotValues(initial);
    }
  }, [templateModalData]);

  if (!isTemplateModalOpen || !templateModalData) return null;

  const tpl = templateModalData;

  const handleTextChange = (slotId, text) => {
    setSlotValues((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], text },
    }));
  };

  const handleColorChange = (slotId, color) => {
    setSlotValues((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], color },
    }));
  };

  const handleFontChange = (slotId, fontFamily) => {
    setSlotValues((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], fontFamily },
    }));
  };

  const handleFileUpload = async (slotId, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const mediaId = 'tpl_slot_' + Date.now();
      const url = await storeMediaBlob(mediaId, file, file.name);
      setSlotValues((prev) => ({
        ...prev,
        [slotId]: {
          ...prev[slotId],
          mediaUrl: url,
          mediaName: file.name,
        },
      }));
      toastSuccess(`Loaded ${file.name} for slot`);
    } catch (err) {
      console.error('Slot upload error:', err);
      toastError('Failed to load file for slot');
    }
  };

  const handleApplyTemplate = () => {
    setIsApplying(true);
    try {
      useEditorStore.getState().pushHistory();

      // Build structured tracks for the template
      const duration = tpl.duration || 10;
      const videoTrack = {
        id: 'track_video_tpl_' + Date.now(),
        type: 'video',
        name: 'Video Track',
        muted: false,
        locked: false,
        visible: true,
        clips: [],
      };

      const textTrack = {
        id: 'track_text_tpl_' + Date.now(),
        type: 'text',
        name: 'Text & Titles',
        muted: false,
        locked: false,
        visible: true,
        clips: [],
      };

      const stickerTrack = {
        id: 'track_sticker_tpl_' + Date.now(),
        type: 'sticker',
        name: 'Overlays',
        muted: false,
        locked: false,
        visible: true,
        clips: [],
      };

      const audioTrack = {
        id: 'track_audio_tpl_' + Date.now(),
        type: 'audio',
        name: 'Audio Track',
        muted: false,
        locked: false,
        visible: true,
        clips: [],
      };

      let videoCursor = 0;
      let textCursor = 0.5;

      (tpl.slots || []).forEach((slot, index) => {
        const val = slotValues[slot.id] || {};
        const slotDur = slot.duration || 4;

        if (slot.type === 'video' || slot.type === 'image' || slot.type === 'color') {
          const clipId = 'clip_tpl_bg_' + index + '_' + Date.now();
          if (val.mediaUrl) {
            videoTrack.clips.push({
              id: clipId,
              trackId: videoTrack.id,
              type: slot.type === 'image' ? 'image' : 'video',
              name: val.mediaName || slot.label,
              mediaUrl: val.mediaUrl,
              start: videoCursor,
              duration: slotDur,
              sourceStart: 0,
              sourceDuration: slotDur,
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
            });
          } else {
            // Procedural aesthetic color clip
            videoTrack.clips.push({
              id: clipId,
              trackId: videoTrack.id,
              type: 'color',
              name: slot.label,
              color: val.color || slot.defaultColor || '#1e1b4b',
              start: videoCursor,
              duration: slotDur,
              sourceStart: 0,
              sourceDuration: slotDur,
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
            });
          }
          videoCursor += slotDur;
        } else if (slot.type === 'text') {
          const clipId = 'clip_tpl_text_' + index + '_' + Date.now();
          const isTitle = index === 0 || slot.label.toLowerCase().includes('title') || slot.label.toLowerCase().includes('headline');
          const isSub = !isTitle;

          textTrack.clips.push({
            id: clipId,
            trackId: textTrack.id,
            type: 'text',
            name: slot.label,
            start: textCursor,
            duration: Math.max(3, duration - 1),
            sourceStart: 0,
            sourceDuration: Math.max(3, duration - 1),
            x: 0,
            y: isTitle ? -15 : 25,
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
              text: val.text || slot.defaultText || 'Sample Headline',
              fontFamily: val.fontFamily || slot.fontFamily || 'Outfit',
              fontSize: val.fontSize || slot.fontSize || (isTitle ? 54 : 26),
              fontWeight: isTitle ? '700' : '500',
              color: '#FFFFFF',
              letterSpacing: isTitle ? 2 : 1,
              lineHeight: 1.15,
              align: 'center',
              bold: isTitle,
              italic: false,
              shadowColor: 'rgba(0,0,0,0.7)',
              shadowBlur: 12,
              shadowOffsetX: 2,
              shadowOffsetY: 3,
              animation: isTitle ? 'pop' : 'fade',
              animationIn: isTitle ? 'pop' : 'fade',
              animInDuration: 0.6,
            },
            keyframes: [],
          });
          textCursor += 0.2;
        }
      });

      // Ensure video track covers the full duration
      if (videoTrack.clips.length === 0) {
        videoTrack.clips.push({
          id: 'clip_tpl_bg_def_' + Date.now(),
          trackId: videoTrack.id,
          type: 'color',
          name: 'Template Background',
          color: '#0f172a',
          start: 0,
          duration: duration,
          sourceStart: 0,
          sourceDuration: duration,
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
        });
      }

      const newProject = {
        id: 'proj_' + Date.now(),
        name: tpl.title,
        aspectRatio: tpl.aspectRatio || '16:9',
        duration: Math.max(duration, videoCursor, 8),
        tracks: [textTrack, stickerTrack, videoTrack, audioTrack],
        background: { type: 'color', color: '#09090b' },
        markers: [],
      };

      setProject(newProject);
      seek(0);
      closeTemplateModal();
      toastSuccess(`Applied "${tpl.title}" template to timeline!`);
    } catch (err) {
      console.error('Error applying template:', err);
      toastError('Failed to apply template');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[8px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#171717] dark:text-[#EDEDED]">
        {/* Header */}
        <div className="h-13 px-4 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between shrink-0 bg-[#FAFAFA] dark:bg-[#151515]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[6px] bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] flex items-center justify-center shrink-0">
              <LayoutTemplate className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-[#171717] dark:text-[#EDEDED] truncate">
                  {tpl.title}
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#F5F5F5] dark:bg-[#222222] text-[#737373] dark:text-[#A1A1A1] border border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0 font-mono">
                  {tpl.aspectRatio}
                </span>
                <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                  {tpl.duration}s
                </span>
              </div>
              <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1] truncate mt-0.5">
                {tpl.description}
              </p>
            </div>
          </div>

          <button
            onClick={closeTemplateModal}
            className="p-1.5 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-[6px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Slots Customizer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
            <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">
              Template Placeholders ({tpl.slots ? tpl.slots.length : 0})
            </span>
            <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">
              Customize text and swap media
            </span>
          </div>

          {(tpl.slots || []).map((slot, idx) => {
            const val = slotValues[slot.id] || {};
            const isText = slot.type === 'text';

            return (
              <div
                key={slot.id}
                className="p-3 rounded-[6px] bg-[#FAFAFA] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                    {isText ? (
                      <Type className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} />
                    ) : (
                      <Video className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={1.5} />
                    )}
                    {slot.label}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[4px] bg-white dark:bg-[#202020] text-[#737373] dark:text-[#A1A1A1] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                    {slot.type}
                  </span>
                </div>

                {isText ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={val.text || ''}
                      onChange={(e) => handleTextChange(slot.id, e.target.value)}
                      placeholder="Type custom text..."
                      className="w-full bg-white dark:bg-[#1C1C1C] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2.5 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none focus:border-[#3B82F6]"
                    />

                    <div className="flex items-center gap-2">
                      <select
                        value={val.fontFamily || 'Outfit'}
                        onChange={(e) => handleFontChange(slot.id, e.target.value)}
                        className="flex-1 bg-white dark:bg-[#1C1C1C] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1 text-[11px] text-[#171717] dark:text-[#EDEDED] outline-none"
                      >
                        {GOOGLE_FONTS.slice(0, 30).map((f) => (
                          <option key={f.name} value={f.name}>
                            {f.name} ({f.category})
                          </option>
                        ))}
                      </select>

                      <div
                        className="text-[11px] font-normal px-2 py-1 bg-white dark:bg-[#1C1C1C] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] truncate max-w-[130px]"
                        style={{ fontFamily: val.fontFamily || 'Outfit' }}
                      >
                        Sample Preview
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-[#1C1C1C] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-1 shrink-0">
                      <input
                        type="color"
                        value={val.color || slot.defaultColor || '#3B82F6'}
                        onChange={(e) => handleColorChange(slot.id, e.target.value)}
                        className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                        title="Background color"
                      />
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] uppercase font-mono pr-1">
                        {val.color || slot.defaultColor || '#3B82F6'}
                      </span>
                    </div>

                    <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-[#1C1C1C] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] rounded-[6px] text-xs text-[#171717] dark:text-[#EDEDED] cursor-pointer transition-colors truncate">
                      <Upload className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1] shrink-0" strokeWidth={1.5} />
                      <span className="truncate">
                        {val.mediaName ? val.mediaName : 'Replace with Video / Photo'}
                      </span>
                      <input
                        type="file"
                        accept="video/*,image/*"
                        onChange={(e) => handleFileUpload(slot.id, e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="h-14 px-4 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between shrink-0 bg-[#FAFAFA] dark:bg-[#151515]">
          <button
            onClick={closeTemplateModal}
            className="px-3 py-1.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-xs font-normal text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] transition-colors cursor-pointer min-h-[38px]"
          >
            Cancel
          </button>

          <button
            onClick={handleApplyTemplate}
            disabled={isApplying}
            className="px-4 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer min-h-[38px] shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            Apply to Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
