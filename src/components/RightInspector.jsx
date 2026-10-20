import React, { useState } from 'react';
import {
  X,
  Sliders,
  Crop,
  Volume2,
  Key,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  Diamond,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { FILTERS_LIST, GOOGLE_FONTS } from '../utils/sampleData';
import { getInterpolatedProperty } from '../utils/previewRenderer';

/**
 * CapCut-Style Diamond Keyframe Controller
 * Next to Position X/Y, Scale, Rotation, Opacity, and Volume
 */
const KeyframePropertyControl = ({
  clip,
  property,
  currentValue,
  currentTime,
  seek,
  addKeyframe,
  addPositionKeyframe,
  removeKeyframeAtTime,
  updateKeyframe,
}) => {
  if (!clip) return null;

  const relTime = Math.max(0, Math.min(clip.duration, currentTime - clip.start));
  const isPlayheadOverClip =
    currentTime >= clip.start - 0.04 && currentTime <= clip.start + clip.duration + 0.04;

  const kfs = clip.keyframes || [];
  const propKfs =
    property === 'position'
      ? kfs.filter((k) => k.property === 'x' || k.property === 'y')
      : kfs.filter((k) => k.property === property);

  const existingKfAtPlayhead = isPlayheadOverClip
    ? propKfs.find((k) => Math.abs(k.time - relTime) <= 0.04)
    : null;
  const isFilled = Boolean(existingKfAtPlayhead);

  const uniqueTimes = Array.from(
    new Set(propKfs.map((k) => Math.round(k.time * 100) / 100))
  ).sort((a, b) => a - b);

  const prevTime = uniqueTimes.filter((t) => t < relTime - 0.04).pop();
  const nextTime = uniqueTimes.find((t) => t > relTime + 0.04);

  const handlePrev = (e) => {
    e.stopPropagation();
    if (prevTime !== undefined) {
      seek(clip.start + prevTime);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (nextTime !== undefined) {
      seek(clip.start + nextTime);
    }
  };

  const handleDiamondClick = (e) => {
    e.stopPropagation();
    if (isFilled) {
      removeKeyframeAtTime(clip.id, property, relTime);
    } else {
      if (property === 'position') {
        const xVal = typeof currentValue === 'object' ? currentValue.x : clip.x;
        const yVal = typeof currentValue === 'object' ? currentValue.y : clip.y;
        addPositionKeyframe(clip.id, xVal, yVal, 'easeInOut', relTime);
      } else {
        addKeyframe(clip.id, property, currentValue, 'easeInOut', relTime);
      }
    }
  };

  const handleEasingChange = (e) => {
    e.stopPropagation();
    const newEasing = e.target.value;
    propKfs
      .filter((k) => Math.abs(k.time - relTime) <= 0.04)
      .forEach((k) => {
        updateKeyframe(clip.id, k.id, { easing: newEasing });
      });
  };

  return (
    <div className="flex items-center gap-0.5 shrink-0 select-none">
      <button
        type="button"
        onClick={handlePrev}
        disabled={prevTime === undefined}
        title={prevTime !== undefined ? `Previous keyframe (${(clip.start + prevTime).toFixed(2)}s)` : 'No previous keyframe'}
        className="p-0.5 rounded-[4px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]"
      >
        <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>

      <button
        type="button"
        onClick={handleDiamondClick}
        title={isFilled ? 'Keyframe exists at playhead (click to remove)' : 'Add keyframe at playhead'}
        className={`p-0.5 rounded-[4px] transition-colors cursor-pointer ${
          isFilled
            ? 'text-[#3B82F6]'
            : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
        }`}
      >
        <Diamond
          className={`w-3.5 h-3.5 ${isFilled ? 'fill-[#3B82F6] text-[#3B82F6]' : 'text-[#737373] dark:text-[#A1A1A1]'}`}
          strokeWidth={1.5}
        />
      </button>

      <button
        type="button"
        onClick={handleNext}
        disabled={nextTime === undefined}
        title={nextTime !== undefined ? `Next keyframe (${(clip.start + nextTime).toFixed(2)}s)` : 'No next keyframe'}
        className="p-0.5 rounded-[4px] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]"
      >
        <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>

      {isFilled && (
        <select
          value={existingKfAtPlayhead?.easing || 'easeInOut'}
          onChange={handleEasingChange}
          title="Keyframe Easing: Linear, Ease In, Ease Out, Ease In-Out"
          className="ml-1 text-[9px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] rounded-[4px] px-1 py-0.5 focus:outline-none cursor-pointer"
        >
          <option value="linear">Linear</option>
          <option value="easeIn">Ease In</option>
          <option value="easeOut">Ease Out</option>
          <option value="easeInOut">Ease In-Out</option>
        </select>
      )}
    </div>
  );
};

export const RightInspector = ({ mobileDrawer = false, onClose }) => {
  const {
    getSelectedClip,
    updateClip,
    deselectAll,
    currentTime,
    seek,
    addKeyframe,
    addPositionKeyframe,
    removeKeyframe,
    removeKeyframeAtTime,
    updateKeyframe,
    extractAudioFromClip,
    autoReframe,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState('transform');

  const clip = getSelectedClip();

  if (!clip) {
    if (mobileDrawer) return null;
    return (
      <aside className="w-72 md:w-80 border-l border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] p-6 flex flex-col items-center justify-center text-center text-[#737373] dark:text-[#A1A1A1] select-none shrink-0 h-full overflow-hidden transition-colors">
        <Sliders className="w-7 h-7 text-[#A3A3A3] dark:text-[#555555] mb-2" strokeWidth={1.5} />
        <h3 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">No Clip Selected</h3>
        <p className="text-xs text-[#737373] dark:text-[#A1A1A1] mt-1 max-w-[200px]">
          Click on any video, text, sticker or audio clip on the timeline to inspect and edit properties.
        </p>
      </aside>
    );
  }

  const isText = clip.type === 'text';
  const isAudioOrVideo = clip.type === 'audio' || clip.type === 'video';
  const isVisual = clip.type !== 'audio';

  const currentX = getInterpolatedProperty(clip, 'x', currentTime, clip.x);
  const currentY = getInterpolatedProperty(clip, 'y', currentTime, clip.y);
  const currentScale = getInterpolatedProperty(clip, 'scale', currentTime, clip.scale);
  const currentRotation = getInterpolatedProperty(clip, 'rotation', currentTime, clip.rotation);
  const currentOpacity = getInterpolatedProperty(clip, 'opacity', currentTime, clip.opacity);
  const baseVol = (clip.audioProps && clip.audioProps.volume != null) ? clip.audioProps.volume : 1;
  const currentVolume = getInterpolatedProperty(clip, 'volume', currentTime, baseVol);

  const inspectorContent = (
    <>
      {/* Inspector Header */}
      <div className="h-10 px-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between shrink-0 bg-white dark:bg-[#1A1A1A]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-normal uppercase px-1.5 py-0.5 rounded-[4px] bg-[#F5F5F5] dark:bg-[#222222] text-[#737373] dark:text-[#A1A1A1] border border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0">
            {clip.type}
          </span>
          <span className="text-xs font-normal text-[#171717] dark:text-[#EDEDED] truncate">{clip.name}</span>
        </div>
        <button
          onClick={() => {
            deselectAll();
            _optionalChain([onClose, 'optionalCall', _ => _()]);
          }}
          className="p-1.5 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-[4px] transition-colors cursor-pointer"
          title="Deselect"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Tab Selector Strip */}
      <div className="flex border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#111111] p-1 gap-1 overflow-x-auto text-xs shrink-0">
        {isVisual && (
          <button
            onClick={() => setActiveTab('transform')}
            className={`px-2 py-1 rounded-[4px] text-[11px] font-normal transition-colors cursor-pointer ${
              activeTab === 'transform'
                ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] border-b-2 border-b-[#3B82F6] shadow-sm'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
          >
            Transform
          </button>
        )}
        {isText && (
          <button
            onClick={() => setActiveTab('text')}
            className={`px-2 py-1 rounded-[4px] text-[11px] font-normal transition-colors cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] border-b-2 border-b-[#3B82F6] shadow-sm'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
          >
            Text
          </button>
        )}
        {isVisual && (
          <button
            onClick={() => setActiveTab('color')}
            className={`px-2 py-1 rounded-[4px] text-[11px] font-normal transition-colors cursor-pointer ${
              activeTab === 'color'
                ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] border-b-2 border-b-[#3B82F6] shadow-sm'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
          >
            Color/Filter
          </button>
        )}
        {isAudioOrVideo && (
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-2 py-1 rounded-[4px] text-[11px] font-normal transition-colors cursor-pointer ${
              activeTab === 'audio'
                ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] border-b-2 border-b-[#3B82F6] shadow-sm'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
          >
            Audio
          </button>
        )}
        {isVisual && (
          <button
            onClick={() => setActiveTab('speed')}
            className={`px-2 py-1 rounded-[4px] text-[11px] font-normal transition-colors cursor-pointer ${
              activeTab === 'speed'
                ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] border-b-2 border-b-[#3B82F6] shadow-sm'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
          >
            Speed
          </button>
        )}
        {isVisual && (
          <button
            onClick={() => setActiveTab('mask')}
            className={`px-2 py-1 rounded-[4px] text-[11px] font-normal transition-colors cursor-pointer ${
              activeTab === 'mask'
                ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] border-b-2 border-b-[#3B82F6] shadow-sm'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
          >
            Mask/Chroma
          </button>
        )}
        <button
          onClick={() => setActiveTab('keyframes')}
          className={`px-2 py-1 rounded-[4px] text-[11px] font-normal transition-colors cursor-pointer ${
            activeTab === 'keyframes'
              ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] border-b-2 border-b-[#3B82F6] shadow-sm'
              : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
          }`}
        >
          Keyframes
        </button>
      </div>

      {/* Tab Panels Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 min-h-0">
        {/* TRANSFORM TAB */}
        {activeTab === 'transform' && isVisual && (
          <div className="space-y-3.5 text-xs">
            {/* Position X & Y */}
            <div>
              <div className="flex items-center justify-between text-slate-300 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Position X / Y</span>
                  <KeyframePropertyControl
                    clip={clip}
                    property="position"
                    currentValue={{ x: currentX, y: currentY }}
                    currentTime={currentTime}
                    seek={seek}
                    addKeyframe={addKeyframe}
                    addPositionKeyframe={addPositionKeyframe}
                    removeKeyframeAtTime={removeKeyframeAtTime}
                    updateKeyframe={updateKeyframe}
                  />
                </div>
                <span className="font-mono text-slate-400">
                  {Math.round(currentX)}%, {Math.round(currentY)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={currentX}
                  onChange={(e) => updateClip(clip.id, { x: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={currentY}
                  onChange={(e) => updateClip(clip.id, { y: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Scale */}
            <div>
              <div className="flex items-center justify-between text-slate-300 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Scale Size</span>
                  <KeyframePropertyControl
                    clip={clip}
                    property="scale"
                    currentValue={currentScale}
                    currentTime={currentTime}
                    seek={seek}
                    addKeyframe={addKeyframe}
                    addPositionKeyframe={addPositionKeyframe}
                    removeKeyframeAtTime={removeKeyframeAtTime}
                    updateKeyframe={updateKeyframe}
                  />
                </div>
                <span className="font-mono text-slate-400">{currentScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.05"
                value={currentScale}
                onChange={(e) => updateClip(clip.id, { scale: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex items-center justify-between text-slate-300 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Rotation Angle</span>
                  <KeyframePropertyControl
                    clip={clip}
                    property="rotation"
                    currentValue={currentRotation}
                    currentTime={currentTime}
                    seek={seek}
                    addKeyframe={addKeyframe}
                    addPositionKeyframe={addPositionKeyframe}
                    removeKeyframeAtTime={removeKeyframeAtTime}
                    updateKeyframe={updateKeyframe}
                  />
                </div>
                <span className="font-mono text-slate-400">{Math.round(currentRotation)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={Math.round(currentRotation)}
                onChange={(e) => updateClip(clip.id, { rotation: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex items-center justify-between text-slate-300 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Opacity</span>
                  <KeyframePropertyControl
                    clip={clip}
                    property="opacity"
                    currentValue={currentOpacity}
                    currentTime={currentTime}
                    seek={seek}
                    addKeyframe={addKeyframe}
                    addPositionKeyframe={addPositionKeyframe}
                    removeKeyframeAtTime={removeKeyframeAtTime}
                    updateKeyframe={updateKeyframe}
                  />
                </div>
                <span className="font-mono text-slate-400">{Math.round(currentOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={currentOpacity}
                onChange={(e) => updateClip(clip.id, { opacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Flip Controls */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between">
              <span className="text-[#171717] dark:text-[#EDEDED]">Flip / Mirror</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateClip(clip.id, { flipH: !clip.flipH })}
                  className={`p-1.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] transition-colors cursor-pointer ${
                    clip.flipH
                      ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717]'
                      : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => updateClip(clip.id, { flipV: !clip.flipV })}
                  className={`p-1.5 rounded-[6px] border border-[#E5E5E5] dark:border-[#2A2A2A] transition-colors cursor-pointer ${
                    clip.flipV
                      ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717]'
                      : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Blend Mode */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
              <span className="text-[#171717] dark:text-[#EDEDED] block mb-1.5 font-normal">Blend Mode</span>
              <select
                value={clip.blendMode || 'normal'}
                onChange={(e) => updateClip(clip.id, { blendMode: e.target.value  })}
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
              >
                <option value="normal">Normal</option>
                <option value="screen">Screen (Lighten overlay)</option>
                <option value="multiply">Multiply (Darken overlay)</option>
                <option value="overlay">Overlay (High contrast)</option>
                <option value="lighten">Lighten</option>
                <option value="darken">Darken</option>
                <option value="color-dodge">Color Dodge</option>
                <option value="difference">Difference</option>
              </select>
            </div>

            {/* Crop Margins */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <span className="text-[#171717] dark:text-[#EDEDED] block font-normal">Crop Insets (%)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums">Top ({_optionalChain([clip, 'access', _2 => _2.crop, 'optionalAccess', _3 => _3.top]) || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={_optionalChain([clip, 'access', _4 => _4.crop, 'optionalAccess', _5 => _5.top]) || 0}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        crop: {
                          top: parseInt(e.target.value),
                          bottom: _optionalChain([clip, 'access', _6 => _6.crop, 'optionalAccess', _7 => _7.bottom]) || 0,
                          left: _optionalChain([clip, 'access', _8 => _8.crop, 'optionalAccess', _9 => _9.left]) || 0,
                          right: _optionalChain([clip, 'access', _10 => _10.crop, 'optionalAccess', _11 => _11.right]) || 0,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums">Bottom ({_optionalChain([clip, 'access', _12 => _12.crop, 'optionalAccess', _13 => _13.bottom]) || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={_optionalChain([clip, 'access', _14 => _14.crop, 'optionalAccess', _15 => _15.bottom]) || 0}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        crop: {
                          top: _optionalChain([clip, 'access', _16 => _16.crop, 'optionalAccess', _17 => _17.top]) || 0,
                          bottom: parseInt(e.target.value),
                          left: _optionalChain([clip, 'access', _18 => _18.crop, 'optionalAccess', _19 => _19.left]) || 0,
                          right: _optionalChain([clip, 'access', _20 => _20.crop, 'optionalAccess', _21 => _21.right]) || 0,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums">Left ({_optionalChain([clip, 'access', _22 => _22.crop, 'optionalAccess', _23 => _23.left]) || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={_optionalChain([clip, 'access', _24 => _24.crop, 'optionalAccess', _25 => _25.left]) || 0}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        crop: {
                          top: _optionalChain([clip, 'access', _26 => _26.crop, 'optionalAccess', _27 => _27.top]) || 0,
                          bottom: _optionalChain([clip, 'access', _28 => _28.crop, 'optionalAccess', _29 => _29.bottom]) || 0,
                          left: parseInt(e.target.value),
                          right: _optionalChain([clip, 'access', _30 => _30.crop, 'optionalAccess', _31 => _31.right]) || 0,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums">Right ({_optionalChain([clip, 'access', _32 => _32.crop, 'optionalAccess', _33 => _33.right]) || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={_optionalChain([clip, 'access', _34 => _34.crop, 'optionalAccess', _35 => _35.right]) || 0}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        crop: {
                          top: _optionalChain([clip, 'access', _36 => _36.crop, 'optionalAccess', _37 => _37.top]) || 0,
                          bottom: _optionalChain([clip, 'access', _38 => _38.crop, 'optionalAccess', _39 => _39.bottom]) || 0,
                          left: _optionalChain([clip, 'access', _40 => _40.crop, 'optionalAccess', _41 => _41.left]) || 0,
                          right: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions: Auto-Reframe & Extract Audio */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-1.5">
              <button
                onClick={autoReframe}
                className="w-full py-1.5 px-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] text-xs font-normal flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Crop className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> Auto-Reframe for Aspect Ratio
              </button>

              {clip.type === 'video' && (
                <button
                  onClick={() => extractAudioFromClip(clip.id)}
                  className="w-full py-1.5 px-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] text-xs font-normal flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} /> Extract Audio to Dedicated Track
                </button>
              )}
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === 'text' && isText && clip.textProps && (
          <div className="space-y-3.5 text-xs">
            {/* Text Input */}
            <div>
              <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Text Content</span>
              <textarea
                value={clip.textProps.text}
                onChange={(e) => updateClip(clip.id, { textProps: { text: e.target.value } })}
                className="w-full h-18 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none resize-none focus:border-[#171717] dark:focus:border-[#EDEDED]"
              />
            </div>

            {/* Font Family (50+ Google Fonts) */}
            <div>
              <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Font Family</span>
              <select
                value={clip.textProps.fontFamily}
                onChange={(e) => updateClip(clip.id, { textProps: { fontFamily: e.target.value } })}
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
              >
                {GOOGLE_FONTS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                <span className="font-normal">Font Size</span>
                <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.textProps.fontSize}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="140"
                value={clip.textProps.fontSize}
                onChange={(e) =>
                  updateClip(clip.id, { textProps: { fontSize: parseInt(e.target.value) } })
                }
                className="w-full"
              />
            </div>

            {/* Colors: Text & Stroke */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Text Color</span>
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-1">
                  <input
                    type="color"
                    value={clip.textProps.color}
                    onChange={(e) => updateClip(clip.id, { textProps: { color: e.target.value } })}
                    className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                  />
                  <span className="text-[11px] text-[#737373] dark:text-[#A1A1A1] uppercase tabular-nums">
                    {clip.textProps.color}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Stroke Color</span>
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-1">
                  <input
                    type="color"
                    value={clip.textProps.strokeColor || '#000000'}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        textProps: { strokeColor: e.target.value, strokeWidth: _optionalChain([clip, 'access', _42 => _42.textProps, 'optionalAccess', _43 => _43.strokeWidth]) || 2 },
                      })
                    }
                    className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                  />
                  <span className="text-[11px] text-[#737373] dark:text-[#A1A1A1] uppercase tabular-nums">
                    {clip.textProps.strokeColor || '#000000'}
                  </span>
                </div>
              </div>
            </div>

            {/* Text Animation */}
            <div>
              <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Text Animation</span>
              <select
                value={clip.textProps.animation || 'none'}
                onChange={(e) =>
                  updateClip(clip.id, { textProps: { animation: e.target.value  } })
                }
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
              >
                <option value="none">None (Static)</option>
                <option value="typewriter">Typewriter (Character by character)</option>
                <option value="bounce">Bounce In (Kinetic impact)</option>
                <option value="glow">Soft Glow Pulse</option>
                <option value="karaoke">Karaoke Word Highlight</option>
              </select>
            </div>
          </div>
        )}

        {/* COLOR & FILTERS TAB */}
        {activeTab === 'color' && isVisual && (
          <div className="space-y-3.5 text-xs">
            {/* Filter Selector */}
            <div>
              <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Filter Preset</span>
              <select
                value={clip.filter || 'none'}
                onChange={(e) => updateClip(clip.id, { filter: e.target.value })}
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
              >
                {FILTERS_LIST.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.category})
                  </option>
                ))}
              </select>
            </div>

            {clip.filter && clip.filter !== 'none' && (
              <div>
                <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                  <span className="font-normal">Filter Intensity</span>
                  <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.filterIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={clip.filterIntensity}
                  onChange={(e) =>
                    updateClip(clip.id, { filterIntensity: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            )}

            {/* Adjustments */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-3">
              <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1] block">
                Manual Color Adjustments
              </span>

              {/* Brightness */}
              <div>
                <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                  <span className="font-normal">Brightness</span>
                  <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{_optionalChain([clip, 'access', _44 => _44.adjustments, 'optionalAccess', _45 => _45.brightness]) || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={_optionalChain([clip, 'access', _46 => _46.adjustments, 'optionalAccess', _47 => _47.brightness]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, brightness: parseInt(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                  <span className="font-normal">Contrast</span>
                  <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{_optionalChain([clip, 'access', _48 => _48.adjustments, 'optionalAccess', _49 => _49.contrast]) || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={_optionalChain([clip, 'access', _50 => _50.adjustments, 'optionalAccess', _51 => _51.contrast]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, contrast: parseInt(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                  <span className="font-normal">Saturation</span>
                  <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{_optionalChain([clip, 'access', _52 => _52.adjustments, 'optionalAccess', _53 => _53.saturation]) || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={_optionalChain([clip, 'access', _54 => _54.adjustments, 'optionalAccess', _55 => _55.saturation]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, saturation: parseInt(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* Vignette */}
              <div>
                <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                  <span className="font-normal">Vignette Edge</span>
                  <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{_optionalChain([clip, 'access', _56 => _56.adjustments, 'optionalAccess', _57 => _57.vignette]) || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={_optionalChain([clip, 'access', _58 => _58.adjustments, 'optionalAccess', _59 => _59.vignette]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, vignette: parseInt(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && isAudioOrVideo && (
          <div className="space-y-3.5 text-xs">
            {/* Volume */}
            <div>
              <div className="flex items-center justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-normal">Volume</span>
                  <KeyframePropertyControl
                    clip={clip}
                    property="volume"
                    currentValue={currentVolume}
                    currentTime={currentTime}
                    seek={seek}
                    addKeyframe={addKeyframe}
                    addPositionKeyframe={addPositionKeyframe}
                    removeKeyframeAtTime={removeKeyframeAtTime}
                    updateKeyframe={updateKeyframe}
                  />
                </div>
                <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                  {Math.round(currentVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={currentVolume}
                onChange={(e) =>
                  updateClip(clip.id, { audioProps: { volume: parseFloat(e.target.value) } })
                }
                className="w-full"
              />
            </div>

            {/* Fade In & Out */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Fade In (s)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={_optionalChain([clip, 'access', _64 => _64.audioProps, 'optionalAccess', _65 => _65.fadeIn]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, { audioProps: { fadeIn: parseFloat(e.target.value) } })
                  }
                  className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
                />
              </div>
              <div>
                <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Fade Out (s)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={_optionalChain([clip, 'access', _66 => _66.audioProps, 'optionalAccess', _67 => _67.fadeOut]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, { audioProps: { fadeOut: parseFloat(e.target.value) } })
                  }
                  className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
                />
              </div>
            </div>

            {/* Pitch Shift */}
            <div>
              <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                <span className="font-normal">Pitch Shift</span>
                <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{_optionalChain([clip, 'access', _68 => _68.audioProps, 'optionalAccess', _69 => _69.pitchShift]) || 0} st</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={_optionalChain([clip, 'access', _70 => _70.audioProps, 'optionalAccess', _71 => _71.pitchShift]) || 0}
                onChange={(e) =>
                  updateClip(clip.id, { audioProps: { pitchShift: parseInt(e.target.value) } })
                }
                className="w-full"
              />
            </div>

            {/* 3-Band Equalizer */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <span className="text-[#171717] dark:text-[#EDEDED] block font-normal">3-Band Graphic Equalizer</span>
              <div>
                <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1] mb-0.5">
                  <span>Bass</span>
                  <span className="tabular-nums">{_optionalChain([clip, 'access', _72 => _72.audioProps, 'optionalAccess', _73 => _73.equalizer, 'optionalAccess', _74 => _74.bass]) || 0} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={_optionalChain([clip, 'access', _75 => _75.audioProps, 'optionalAccess', _76 => _76.equalizer, 'optionalAccess', _77 => _77.bass]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      audioProps: {
                        equalizer: {
                          bass: parseInt(e.target.value),
                          mid: _optionalChain([clip, 'access', _78 => _78.audioProps, 'optionalAccess', _79 => _79.equalizer, 'optionalAccess', _80 => _80.mid]) || 0,
                          treble: _optionalChain([clip, 'access', _81 => _81.audioProps, 'optionalAccess', _82 => _82.equalizer, 'optionalAccess', _83 => _83.treble]) || 0,
                        },
                      },
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1] mb-0.5">
                  <span>Mid</span>
                  <span className="tabular-nums">{_optionalChain([clip, 'access', _84 => _84.audioProps, 'optionalAccess', _85 => _85.equalizer, 'optionalAccess', _86 => _86.mid]) || 0} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={_optionalChain([clip, 'access', _87 => _87.audioProps, 'optionalAccess', _88 => _88.equalizer, 'optionalAccess', _89 => _89.mid]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      audioProps: {
                        equalizer: {
                          bass: _optionalChain([clip, 'access', _90 => _90.audioProps, 'optionalAccess', _91 => _91.equalizer, 'optionalAccess', _92 => _92.bass]) || 0,
                          mid: parseInt(e.target.value),
                          treble: _optionalChain([clip, 'access', _93 => _93.audioProps, 'optionalAccess', _94 => _94.equalizer, 'optionalAccess', _95 => _95.treble]) || 0,
                        },
                      },
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1] mb-0.5">
                  <span>Treble</span>
                  <span className="tabular-nums">{_optionalChain([clip, 'access', _96 => _96.audioProps, 'optionalAccess', _97 => _97.equalizer, 'optionalAccess', _98 => _98.treble]) || 0} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={_optionalChain([clip, 'access', _99 => _99.audioProps, 'optionalAccess', _100 => _100.equalizer, 'optionalAccess', _101 => _101.treble]) || 0}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      audioProps: {
                        equalizer: {
                          bass: _optionalChain([clip, 'access', _102 => _102.audioProps, 'optionalAccess', _103 => _103.equalizer, 'optionalAccess', _104 => _104.bass]) || 0,
                          mid: _optionalChain([clip, 'access', _105 => _105.audioProps, 'optionalAccess', _106 => _106.equalizer, 'optionalAccess', _107 => _107.mid]) || 0,
                          treble: parseInt(e.target.value),
                        },
                      },
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>

            {/* Voice Changer Presets */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
              <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Voice Changer Preset</span>
              <select
                value={_optionalChain([clip, 'access', _108 => _108.audioProps, 'optionalAccess', _109 => _109.voiceChanger]) || 'none'}
                onChange={(e) =>
                  updateClip(clip.id, { audioProps: { voiceChanger: e.target.value  } })
                }
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
              >
                <option value="none">None (Natural Voice)</option>
                <option value="chipmunk">Chipmunk (High pitch)</option>
                <option value="deep">Deep Cinematic (Low pitch)</option>
                <option value="robot">Robot Synthesizer</option>
                <option value="radio">Vintage Radio Walkie-Talkie</option>
                <option value="echo">Echo & Reverb</option>
              </select>
            </div>
          </div>
        )}

        {/* SPEED TAB */}
        {activeTab === 'speed' && isVisual && (
          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                <span className="font-normal">Speed Factor</span>
                <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.speed}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={clip.speed}
                onChange={(e) => updateClip(clip.id, { speed: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1.0, 2.0, 4.0].map((s) => (
                <button
                  key={s}
                  onClick={() => updateClip(clip.id, { speed: s })}
                  className={`py-1 rounded-[6px] text-xs font-normal border transition-colors cursor-pointer tabular-nums ${
                    clip.speed === s
                      ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                      : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Speed Curves */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-1.5">
              <span className="text-[#171717] dark:text-[#EDEDED] block font-normal">Speed Curves</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'constant', label: 'Constant' },
                  { id: 'flash-in', label: 'Flash In' },
                  { id: 'flash-out', label: 'Flash Out' },
                  { id: 'bullet', label: 'Bullet Time' },
                  { id: 'hero', label: 'Hero Moment' },
                  { id: 'jump', label: 'Jump Cut' },
                ].map((curve) => (
                  <button
                    key={curve.id}
                    onClick={() => updateClip(clip.id, { speedCurve: curve.id  })}
                    className={`py-1.5 px-1 text-[10px] rounded-[6px] border font-normal transition-colors cursor-pointer ${
                      (clip.speedCurve || 'constant') === curve.id
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-[#3B82F6] text-[#3B82F6]'
                        : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                    }`}
                  >
                    {curve.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-[#171717] dark:text-[#EDEDED]">
                <input
                  type="checkbox"
                  checked={clip.reverse || false}
                  onChange={(e) => updateClip(clip.id, { reverse: e.target.checked })}
                  className="rounded border-[#E5E5E5] dark:border-[#2A2A2A] accent-[#171717] dark:accent-[#EDEDED]"
                />
                <span className="font-normal">Reverse Playback</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#171717] dark:text-[#EDEDED]">
                <input
                  type="checkbox"
                  checked={clip.freezeFrame || false}
                  onChange={(e) => updateClip(clip.id, { freezeFrame: e.target.checked })}
                  className="rounded border-[#E5E5E5] dark:border-[#2A2A2A] accent-[#171717] dark:accent-[#EDEDED]"
                />
                <span className="font-normal">Freeze Frame</span>
              </label>
            </div>
          </div>
        )}

        {/* MASK & CHROMA TAB */}
        {activeTab === 'mask' && isVisual && (
          <div className="space-y-4 text-xs">
            {/* Shape Mask */}
            <div>
              <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Shape Mask</span>
              <select
                value={_optionalChain([clip, 'access', _110 => _110.mask, 'optionalAccess', _111 => _111.type]) || 'none'}
                onChange={(e) =>
                  updateClip(clip.id, {
                    mask: {
                      type: e.target.value ,
                      size: _optionalChain([clip, 'access', _112 => _112.mask, 'optionalAccess', _113 => _113.size]) || 50,
                      feather: _optionalChain([clip, 'access', _114 => _114.mask, 'optionalAccess', _115 => _115.feather]) || 10,
                      x: _optionalChain([clip, 'access', _116 => _116.mask, 'optionalAccess', _117 => _117.x]) || 0,
                      y: _optionalChain([clip, 'access', _118 => _118.mask, 'optionalAccess', _119 => _119.y]) || 0,
                    },
                  })
                }
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
              >
                <option value="none">None</option>
                <option value="circle">Circle Mask</option>
                <option value="rectangle">Rectangle Mask</option>
                <option value="heart">Heart Shape</option>
                <option value="star">Star Shape</option>
              </select>
            </div>

            {clip.mask && clip.mask.type !== 'none' && (
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                    <span className="font-normal">Mask Radius Size</span>
                    <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.mask.size}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={clip.mask.size}
                    onChange={(e) =>
                      updateClip(clip.id, { mask: { ...clip.mask, size: parseInt(e.target.value) } })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Chroma Key (Green Screen) */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <span className="text-[#171717] dark:text-[#EDEDED] block font-normal">Chroma Key (Green Screen)</span>
              <label className="flex items-center gap-2 cursor-pointer text-[#171717] dark:text-[#EDEDED]">
                <input
                  type="checkbox"
                  checked={_optionalChain([clip, 'access', _120 => _120.chromaKey, 'optionalAccess', _121 => _121.enabled]) || false}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      chromaKey: {
                        enabled: e.target.checked,
                        keyColor: _optionalChain([clip, 'access', _122 => _122.chromaKey, 'optionalAccess', _123 => _123.keyColor]) || '#00ff00',
                        similarity: _optionalChain([clip, 'access', _124 => _124.chromaKey, 'optionalAccess', _125 => _125.similarity]) || 40,
                        smoothness: _optionalChain([clip, 'access', _126 => _126.chromaKey, 'optionalAccess', _127 => _127.smoothness]) || 10,
                      },
                    })
                  }
                  className="rounded border-[#E5E5E5] dark:border-[#2A2A2A] accent-[#171717] dark:accent-[#EDEDED]"
                />
                <span className="font-normal">Enable Chroma Key Removal</span>
              </label>

              {_optionalChain([clip, 'access', _128 => _128.chromaKey, 'optionalAccess', _129 => _129.enabled]) && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#737373] dark:text-[#A1A1A1]">Key Color:</span>
                    <input
                      type="color"
                      value={clip.chromaKey.keyColor}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          chromaKey: { ...clip.chromaKey, keyColor: e.target.value },
                        })
                      }
                      className="w-7 h-7 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KEYFRAMES TAB */}
        {activeTab === 'keyframes' && (
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-[#171717] dark:text-[#EDEDED] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} /> Keyframe Animation
              </span>
              <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] tabular-nums font-normal">
                At {(currentTime - clip.start).toFixed(2)}s
              </span>
            </div>

            <p className="text-[11px] text-[#737373] dark:text-[#A1A1A1]">
              Animate clip position, scale, rotation, or opacity smoothly across time.
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => addKeyframe(clip.id, 'scale', clip.scale)}
                className="py-1.5 px-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[11px] text-[#171717] dark:text-[#EDEDED] flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>+ Scale Key</span>
                <Key className="w-3 h-3 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => addKeyframe(clip.id, 'opacity', clip.opacity)}
                className="py-1.5 px-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[11px] text-[#171717] dark:text-[#EDEDED] flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>+ Opacity Key</span>
                <Key className="w-3 h-3 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => addKeyframe(clip.id, 'rotation', clip.rotation)}
                className="py-1.5 px-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[11px] text-[#171717] dark:text-[#EDEDED] flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>+ Rotation Key</span>
                <Key className="w-3 h-3 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => addKeyframe(clip.id, 'x', clip.x)}
                className="py-1.5 px-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[11px] text-[#171717] dark:text-[#EDEDED] flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>+ Pos X Key</span>
                <Key className="w-3 h-3 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
              </button>
            </div>

            {/* List of Existing Keyframes */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
              <span className="text-[#737373] dark:text-[#A1A1A1] block mb-1.5 text-[10px] font-normal">
                Active Keyframes ({clip.keyframes ? clip.keyframes.length : 0})
              </span>
              {(!clip.keyframes || clip.keyframes.length === 0) ? (
                <p className="text-[11px] text-[#A3A3A3] dark:text-[#737373] italic">No keyframes added to this clip yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {clip.keyframes.map((kf) => (
                    <div
                      key={kf.id}
                      className="flex items-center justify-between p-2 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[11px] gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => seek(clip.start + kf.time)}
                        className="text-[#3B82F6] hover:underline text-left flex-1 truncate cursor-pointer tabular-nums"
                        title="Click to jump playhead to this keyframe"
                      >
                        <span className="font-medium text-[#171717] dark:text-[#EDEDED]">{kf.property}:</span>{' '}
                        {typeof kf.value === 'number' ? kf.value.toFixed(1) : kf.value} @ {kf.time.toFixed(2)}s
                      </button>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Easing choice */}
                        <select
                          value={kf.easing || 'easeInOut'}
                          onChange={(e) => updateKeyframe(clip.id, kf.id, { easing: e.target.value })}
                          title="Keyframe Easing: Linear, Ease In, Ease Out, Ease In-Out"
                          className="text-[9px] bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#171717] dark:text-[#EDEDED] rounded-[4px] px-1.5 py-0.5 cursor-pointer focus:outline-none"
                        >
                          <option value="linear">Linear</option>
                          <option value="easeIn">Ease In</option>
                          <option value="easeOut">Ease Out</option>
                          <option value="easeInOut">Ease In-Out</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeKeyframe(clip.id, kf.id)}
                          className="p-1 hover:text-red-500 text-[#737373] dark:text-[#A1A1A1] transition-colors cursor-pointer"
                          title="Delete keyframe"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (mobileDrawer) {
    return (
      <div className="w-full flex flex-col h-full select-none shrink-0 overflow-hidden bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] transition-colors">
        {/* Mobile Drag Handle */}
        <div className="w-8 h-1 bg-[#D4D4D4] dark:bg-[#383838] rounded-full mx-auto my-2 shrink-0 cursor-grab" />
        {inspectorContent}
      </div>
    );
  }

  return (
    <aside className="w-72 md:w-80 border-l border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] flex flex-col h-full select-none shrink-0 overflow-hidden text-[#171717] dark:text-[#EDEDED] transition-colors">
      {inspectorContent}
    </aside>
  );
};
