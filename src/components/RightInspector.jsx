function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

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
  RotateCcw,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Search,
  Play,
  Pipette,
  Music,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { toastSuccess, toastInfo, toastError } from '../store/toastStore';
import { FILTERS_LIST, GOOGLE_FONTS, EFFECTS_LIST } from '../utils/sampleData';
import { getInterpolatedProperty } from '../utils/previewRenderer';
import { SpeedCurveEditor } from './SpeedCurveEditor';
import { AdvancedColorTools } from './AdvancedColorTools';

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
  const [fontSearch, setFontSearch] = useState('');
  const [fontFilter, setFontFilter] = useState('All');
  const [colorMode, setColorMode] = useState('advanced');

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
  const isEffect = clip.type === 'effect';
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
        {isEffect && (
          <button
            onClick={() => setActiveTab('effect')}
            className={`px-2 py-1 rounded-[4px] text-[11px] font-normal transition-colors cursor-pointer ${
              activeTab === 'effect'
                ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] border-b-2 border-b-[#3B82F6] shadow-sm'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
          >
            Effect
          </button>
        )}
        {isVisual && !isEffect && (
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
        {isVisual && !isEffect && (
          <button
            onClick={() => setActiveTab('color')}
            className={`px-2 py-1 rounded-[4px] text-[11px] font-normal transition-colors cursor-pointer ${
              activeTab === 'color'
                ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] border-b-2 border-b-[#3B82F6] shadow-sm'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
          >
            Adjust
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
        {isVisual && (
          <button
            onClick={() => setActiveTab('animation')}
            className={`px-2 py-1 rounded-[4px] text-[11px] font-normal transition-colors cursor-pointer ${
              activeTab === 'animation'
                ? 'bg-white dark:bg-[#1A1A1A] text-[#171717] dark:text-[#EDEDED] border-b-2 border-b-[#3B82F6] shadow-sm'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
          >
            Animation
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
                onChange={(e) => updateClip(clip.id, { blendMode: e.target.value })}
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer"
              >
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
                <option value="soft-light">Soft Light</option>
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
                value={clip.textProps.text || ''}
                onChange={(e) => updateClip(clip.id, { textProps: { text: e.target.value } })}
                className="w-full h-18 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-2 text-xs text-[#171717] dark:text-[#EDEDED] outline-none resize-none focus:border-[#171717] dark:focus:border-[#EDEDED]"
                placeholder="Type text here..."
              />
            </div>

            {/* Font Family (Searchable with Hindi & Malayalam tags) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#171717] dark:text-[#EDEDED] font-normal">Font Family</span>
                <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">{clip.textProps.fontFamily}</span>
              </div>

              {/* Search input & Category filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#737373] dark:text-[#A1A1A1]" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search 40+ fonts (Hindi, Malayalam, etc.)..."
                  value={fontSearch}
                  onChange={(e) => setFontSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
                />
              </div>

              {/* Language / Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {['All', 'Hindi', 'Malayalam', 'Modern', 'Condensed', 'Serif Luxury', 'Handwritten'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFontFilter(cat)}
                    className={`px-2 py-0.5 rounded-[4px] text-[10px] font-normal border transition-colors cursor-pointer shrink-0 ${
                      fontFilter === cat
                        ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Searchable Dropdown / Scroll list */}
              <div className="max-h-36 overflow-y-auto border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] divide-y divide-[#E5E5E5] dark:divide-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
                {GOOGLE_FONTS.filter((f) => {
                  const matchesSearch = f.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
                    f.category.toLowerCase().includes(fontSearch.toLowerCase());
                  const matchesCat = fontFilter === 'All' || f.category === fontFilter;
                  return matchesSearch && matchesCat;
                }).map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => updateClip(clip.id, { textProps: { fontFamily: f.name } })}
                    className={`w-full px-2.5 py-1.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                      clip.textProps.fontFamily === f.name
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-[#3B82F6]'
                        : 'hover:bg-[#F5F5F5] dark:hover:bg-[#222222] text-[#171717] dark:text-[#EDEDED]'
                    }`}
                  >
                    <span className="text-xs truncate" style={{ fontFamily: f.name }}>
                      {f.name}
                    </span>
                    <span className="text-[10px] opacity-70 shrink-0 font-sans ml-2">
                      {f.sample}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size & Weight / Formatting (Bold, Italic, Alignment) */}
            <div className="space-y-2 pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
              <div className="flex justify-between text-[#171717] dark:text-[#EDEDED]">
                <span className="font-normal">Font Size</span>
                <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.textProps.fontSize || 48}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="160"
                value={clip.textProps.fontSize || 48}
                onChange={(e) =>
                  updateClip(clip.id, { textProps: { fontSize: parseInt(e.target.value) || 48 } })
                }
                className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
              />

              {/* Bold, Italic & Alignment Buttons */}
              <div className="flex items-center justify-between gap-1 pt-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateClip(clip.id, { textProps: { bold: !clip.textProps.bold } })}
                    className={`w-8 h-8 rounded-[6px] border flex items-center justify-center transition-colors cursor-pointer ${
                      clip.textProps.bold
                        ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1]'
                    }`}
                    title="Toggle Bold"
                  >
                    <Bold className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateClip(clip.id, { textProps: { italic: !clip.textProps.italic } })}
                    className={`w-8 h-8 rounded-[6px] border flex items-center justify-center transition-colors cursor-pointer ${
                      clip.textProps.italic
                        ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1]'
                    }`}
                    title="Toggle Italic"
                  >
                    <Italic className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-1">
                  {[
                    { align: 'left', icon: AlignLeft },
                    { align: 'center', icon: AlignCenter },
                    { align: 'right', icon: AlignRight },
                  ].map(({ align, icon: Icon }) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => updateClip(clip.id, { textProps: { align } })}
                      className={`w-8 h-8 rounded-[6px] border flex items-center justify-center transition-colors cursor-pointer ${
                        (clip.textProps.align || 'center') === align
                          ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                          : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1]'
                      }`}
                      title={`Align ${align}`}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Letter Spacing & Line Height */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
              <div>
                <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                  <span className="font-normal text-[11px]">Letter Space</span>
                  <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.textProps.letterSpacing || 0}px</span>
                </div>
                <input
                  type="range"
                  min="-4"
                  max="24"
                  value={clip.textProps.letterSpacing || 0}
                  onChange={(e) =>
                    updateClip(clip.id, { textProps: { letterSpacing: parseInt(e.target.value) || 0 } })
                  }
                  className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                  <span className="font-normal text-[11px]">Line Height</span>
                  <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.textProps.lineHeight || 1.15}</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="2.5"
                  step="0.05"
                  value={clip.textProps.lineHeight || 1.15}
                  onChange={(e) =>
                    updateClip(clip.id, { textProps: { lineHeight: parseFloat(e.target.value) || 1.15 } })
                  }
                  className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                />
              </div>
            </div>

            {/* Solid Color & Gradient Fill */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#171717] dark:text-[#EDEDED] font-normal">Color Fill</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  <input
                    type="checkbox"
                    checked={Boolean(clip.textProps.useGradient)}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        textProps: {
                          useGradient: e.target.checked,
                          gradientFrom: clip.textProps.gradientFrom || clip.textProps.color || '#3B82F6',
                          gradientTo: clip.textProps.gradientTo || '#8B5CF6',
                          gradientDirection: clip.textProps.gradientDirection || 'vertical',
                        },
                      })
                    }
                    className="rounded text-[#3B82F6]"
                  />
                  Gradient Fill
                </label>
              </div>

              {!clip.textProps.useGradient ? (
                <div className="flex items-center gap-2 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-1.5">
                  <input
                    type="color"
                    value={clip.textProps.color || '#FFFFFF'}
                    onChange={(e) => updateClip(clip.id, { textProps: { color: e.target.value } })}
                    className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={clip.textProps.color || '#FFFFFF'}
                    onChange={(e) => updateClip(clip.id, { textProps: { color: e.target.value } })}
                    className="flex-1 bg-transparent text-xs text-[#171717] dark:text-[#EDEDED] uppercase font-mono outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-2 p-2 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">Color From</span>
                      <div className="flex items-center gap-1 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[4px] p-1">
                        <input
                          type="color"
                          value={clip.textProps.gradientFrom || '#3B82F6'}
                          onChange={(e) => updateClip(clip.id, { textProps: { gradientFrom: e.target.value } })}
                          className="w-5 h-5 rounded cursor-pointer"
                        />
                        <span className="text-[10px] uppercase font-mono truncate">{clip.textProps.gradientFrom || '#3B82F6'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">Color To</span>
                      <div className="flex items-center gap-1 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[4px] p-1">
                        <input
                          type="color"
                          value={clip.textProps.gradientTo || '#8B5CF6'}
                          onChange={(e) => updateClip(clip.id, { textProps: { gradientTo: e.target.value } })}
                          className="w-5 h-5 rounded cursor-pointer"
                        />
                        <span className="text-[10px] uppercase font-mono truncate">{clip.textProps.gradientTo || '#8B5CF6'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">Direction</span>
                    <select
                      value={clip.textProps.gradientDirection || 'vertical'}
                      onChange={(e) => updateClip(clip.id, { textProps: { gradientDirection: e.target.value } })}
                      className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[4px] px-2 py-1 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
                    >
                      <option value="vertical">Vertical (Top to Bottom)</option>
                      <option value="horizontal">Horizontal (Left to Right)</option>
                      <option value="diagonal">Diagonal (Top-Left to Bottom-Right)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Stroke / Outline */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#171717] dark:text-[#EDEDED] font-normal">Outline / Stroke</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  <input
                    type="checkbox"
                    checked={Boolean(clip.textProps.strokeWidth && clip.textProps.strokeWidth > 0)}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        textProps: {
                          strokeWidth: e.target.checked ? (clip.textProps.strokeWidth || 4) : 0,
                          strokeColor: clip.textProps.strokeColor || '#000000',
                        },
                      })
                    }
                    className="rounded text-[#3B82F6]"
                  />
                  Enable Outline
                </label>
              </div>

              {clip.textProps.strokeWidth > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">Outline Color</span>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-1">
                      <input
                        type="color"
                        value={clip.textProps.strokeColor || '#000000'}
                        onChange={(e) => updateClip(clip.id, { textProps: { strokeColor: e.target.value } })}
                        className="w-6 h-6 rounded cursor-pointer"
                      />
                      <span className="text-[10px] font-mono uppercase">{clip.textProps.strokeColor || '#000000'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-[#737373] dark:text-[#A1A1A1] mb-1">
                      <span>Width</span>
                      <span className="tabular-nums">{clip.textProps.strokeWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={clip.textProps.strokeWidth || 4}
                      onChange={(e) =>
                        updateClip(clip.id, { textProps: { strokeWidth: parseInt(e.target.value) || 0 } })
                      }
                      className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Drop Shadow */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#171717] dark:text-[#EDEDED] font-normal">Drop Shadow</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  <input
                    type="checkbox"
                    checked={Boolean(clip.textProps.shadowBlur && clip.textProps.shadowBlur > 0)}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        textProps: {
                          shadowBlur: e.target.checked ? (clip.textProps.shadowBlur || 12) : 0,
                          shadowColor: clip.textProps.shadowColor || 'rgba(0,0,0,0.7)',
                          shadowOffsetX: clip.textProps.shadowOffsetX !== undefined ? clip.textProps.shadowOffsetX : 2,
                          shadowOffsetY: clip.textProps.shadowOffsetY !== undefined ? clip.textProps.shadowOffsetY : 3,
                        },
                      })
                    }
                    className="rounded text-[#3B82F6]"
                  />
                  Enable Shadow
                </label>
              </div>

              {clip.textProps.shadowBlur > 0 && (
                <div className="space-y-2 p-2 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">Blur Radius ({clip.textProps.shadowBlur}px)</span>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={clip.textProps.shadowBlur || 0}
                        onChange={(e) => updateClip(clip.id, { textProps: { shadowBlur: parseInt(e.target.value) || 0 } })}
                        className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">Offset Y ({clip.textProps.shadowOffsetY || 0}px)</span>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        value={clip.textProps.shadowOffsetY || 0}
                        onChange={(e) => updateClip(clip.id, { textProps: { shadowOffsetY: parseInt(e.target.value) || 0 } })}
                        className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Background Box */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#171717] dark:text-[#EDEDED] font-normal">Background Box</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                  <input
                    type="checkbox"
                    checked={Boolean(clip.textProps.bgColor && clip.textProps.bgColor !== 'transparent')}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        textProps: {
                          bgColor: e.target.checked ? (clip.textProps.bgColor !== 'transparent' && clip.textProps.bgColor ? clip.textProps.bgColor : 'rgba(23, 23, 23, 0.85)') : 'transparent',
                          bgPadding: clip.textProps.bgPadding || 14,
                          bgRadius: clip.textProps.bgRadius !== undefined ? clip.textProps.bgRadius : 6,
                        },
                      })
                    }
                    className="rounded text-[#3B82F6]"
                  />
                  Enable Box
                </label>
              </div>

              {clip.textProps.bgColor && clip.textProps.bgColor !== 'transparent' && (
                <div className="space-y-2 p-2 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">Box Padding ({clip.textProps.bgPadding || 12}px)</span>
                      <input
                        type="range"
                        min="4"
                        max="40"
                        value={clip.textProps.bgPadding || 12}
                        onChange={(e) => updateClip(clip.id, { textProps: { bgPadding: parseInt(e.target.value) || 4 } })}
                        className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">Corner Radius ({clip.textProps.bgRadius || 0}px)</span>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={clip.textProps.bgRadius || 0}
                        onChange={(e) => updateClip(clip.id, { textProps: { bgRadius: parseInt(e.target.value) || 0 } })}
                        className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANIMATION TAB (for Text, Stickers, Images, Videos, Drawings) */}
        {activeTab === 'animation' && isVisual && (
          <div className="space-y-4 text-xs">
            {/* Live Test / Preview Play Button */}
            <div className="p-2.5 rounded-[6px] bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] block">Live Animation Preview</span>
                <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">Plays clip from start with live easing</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  seek(clip.start);
                  useEditorStore.getState().play();
                }}
                className="px-3 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-normal flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" strokeWidth={1.5} /> Play
              </button>
            </div>

            {/* In-Animation */}
            <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#171717] dark:text-[#EDEDED]">In Animation (Entrance)</span>
                <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] uppercase font-mono">
                  {clip.animationIn || (clip.textProps && clip.textProps.animationIn) || 'none'}
                </span>
              </div>
              <select
                value={clip.animationIn || (clip.textProps && clip.textProps.animationIn) || 'none'}
                onChange={(e) => {
                  const val = e.target.value;
                  updateClip(clip.id, {
                    animationIn: val,
                    textProps: clip.textProps ? { ...clip.textProps, animationIn: val, animation: val } : undefined,
                  });
                }}
                className="w-full bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer"
              >
                <option value="none">None (Immediate)</option>
                <option value="fade">Fade In</option>
                <option value="slide-up">Slide Up</option>
                <option value="slide-left">Slide Left</option>
                <option value="pop">Pop In</option>
                <option value="typewriter">Typewriter (Text only)</option>
                <option value="bounce">Bounce In</option>
                <option value="blur-in">Blur In</option>
              </select>

              {(clip.animationIn !== 'none' || (clip.textProps && clip.textProps.animationIn !== 'none')) && (
                <div>
                  <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1] mb-1">
                    <span>In Duration</span>
                    <span className="tabular-nums font-mono font-medium text-[#171717] dark:text-[#EDEDED]">
                      {(clip.animInDuration || (clip.textProps && clip.textProps.animInDuration) || 0.5).toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={clip.animInDuration || (clip.textProps && clip.textProps.animInDuration) || 0.5}
                    onChange={(e) => {
                      const dur = parseFloat(e.target.value) || 0.5;
                      updateClip(clip.id, {
                        animInDuration: dur,
                        textProps: clip.textProps ? { ...clip.textProps, animInDuration: dur } : undefined,
                      });
                    }}
                    className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                  />
                </div>
              )}
            </div>

            {/* Out-Animation */}
            <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#171717] dark:text-[#EDEDED]">Out Animation (Exit)</span>
                <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] uppercase font-mono">
                  {clip.animationOut || 'none'}
                </span>
              </div>
              <select
                value={clip.animationOut || 'none'}
                onChange={(e) => updateClip(clip.id, { animationOut: e.target.value })}
                className="w-full bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer"
              >
                <option value="none">None (Static to End)</option>
                <option value="fade">Fade Out</option>
                <option value="slide-down">Slide Down</option>
                <option value="shrink">Shrink Out</option>
                <option value="blur-out">Blur Out</option>
              </select>

              {clip.animationOut && clip.animationOut !== 'none' && (
                <div>
                  <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1] mb-1">
                    <span>Out Duration</span>
                    <span className="tabular-nums font-mono font-medium text-[#171717] dark:text-[#EDEDED]">
                      {(clip.animOutDuration || 0.5).toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={clip.animOutDuration || 0.5}
                    onChange={(e) => updateClip(clip.id, { animOutDuration: parseFloat(e.target.value) || 0.5 })}
                    className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                  />
                </div>
              )}
            </div>

            {/* Loop Animation */}
            <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#171717] dark:text-[#EDEDED]">Loop Animation (Continuous)</span>
                <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] uppercase font-mono">
                  {clip.animationLoop || 'none'}
                </span>
              </div>
              <select
                value={clip.animationLoop || 'none'}
                onChange={(e) => updateClip(clip.id, { animationLoop: e.target.value })}
                className="w-full bg-[#FAFAFA] dark:bg-[#151515] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer"
              >
                <option value="none">None (No Continuous Motion)</option>
                <option value="pulse">Pulse (Breathing Scale)</option>
                <option value="float">Float (Gentle Bobbing)</option>
                <option value="shake">Shake (Subtle Kinetic)</option>
              </select>

              {clip.animationLoop && clip.animationLoop !== 'none' && (
                <div>
                  <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1] mb-1">
                    <span>Loop Speed</span>
                    <span className="tabular-nums font-mono font-medium text-[#171717] dark:text-[#EDEDED]">
                      {(clip.animLoopSpeed || 1.0).toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={clip.animLoopSpeed || 1.0}
                    onChange={(e) => updateClip(clip.id, { animLoopSpeed: parseFloat(e.target.value) || 1.0 })}
                    className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                  />
                </div>
              )}
            </div>

            {/* Sticker Shape / Frame Color Controls */}
            {clip.type === 'sticker' && (clip.shapeType || clip.isShape || clip.frameType || clip.isFrame) && (
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
                <span className="font-medium text-[#171717] dark:text-[#EDEDED] block">Shape / Frame Styling</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">Fill Color</span>
                    <input
                      type="color"
                      value={clip.fillColor || '#3B82F6'}
                      onChange={(e) => updateClip(clip.id, { fillColor: e.target.value })}
                      className="w-full h-8 rounded border border-[#E5E5E5] dark:border-[#2A2A2A] cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block mb-1">Stroke / Border</span>
                    <input
                      type="color"
                      value={clip.strokeColor || clip.borderColor || '#FFFFFF'}
                      onChange={(e) => updateClip(clip.id, { strokeColor: e.target.value, borderColor: e.target.value })}
                      className="w-full h-8 rounded border border-[#E5E5E5] dark:border-[#2A2A2A] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
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
              <div className="flex items-center justify-between">
                <span className="text-xs font-normal text-[#737373] dark:text-[#A1A1A1]">
                  Color Adjustments
                </span>
                <button
                  type="button"
                  onClick={() => {
                    useEditorStore.getState().pushHistory();
                    updateClip(clip.id, {
                      adjustments: {
                        brightness: 0,
                        contrast: 0,
                        saturation: 0,
                        exposure: 0,
                        highlights: 0,
                        shadows: 0,
                        temperature: 0,
                        tint: 0,
                        sharpen: 0,
                        vignette: 0,
                        grain: 0,
                      },
                    });
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#171717] dark:hover:border-[#EDEDED] text-[10px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
                  title="Reset all color adjustment sliders to 0"
                >
                  <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
                  <span>Reset all</span>
                </button>
              </div>

              {[
                { key: 'brightness', label: 'Brightness', min: -100, max: 100, unit: '' },
                { key: 'contrast', label: 'Contrast', min: -100, max: 100, unit: '' },
                { key: 'saturation', label: 'Saturation', min: -100, max: 100, unit: '' },
                { key: 'exposure', label: 'Exposure', min: -100, max: 100, unit: '' },
                { key: 'highlights', label: 'Highlights', min: -100, max: 100, unit: '' },
                { key: 'shadows', label: 'Shadows', min: -100, max: 100, unit: '' },
                { key: 'temperature', label: 'Temperature', min: -100, max: 100, unit: '' },
                { key: 'tint', label: 'Tint', min: -100, max: 100, unit: '' },
                { key: 'sharpen', label: 'Sharpen', min: 0, max: 100, unit: '' },
                { key: 'vignette', label: 'Vignette', min: 0, max: 100, unit: '%' },
                { key: 'grain', label: 'Grain', min: 0, max: 100, unit: '%' },
              ].map((item) => {
                const currentVal = (_optionalChain([clip, 'access', _a => _a.adjustments, 'optionalAccess', _b => _b[item.key]])) || 0;
                const isModified = currentVal !== 0;

                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                      <span className="font-normal">{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums text-[11px]">
                          {currentVal > 0 && item.min < 0 ? `+${currentVal}` : currentVal}
                          {item.unit}
                        </span>
                        <button
                          type="button"
                          disabled={!isModified}
                          onClick={() => {
                            useEditorStore.getState().pushHistory();
                            updateClip(clip.id, {
                              adjustments: {
                                ...(clip.adjustments || {}),
                                [item.key]: 0,
                              },
                            });
                          }}
                          className={`p-1 rounded-[4px] transition-colors cursor-pointer ${
                            isModified
                              ? 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                              : 'opacity-20 cursor-default'
                          }`}
                          title={`Reset ${item.label}`}
                        >
                          <RotateCcw className="w-2.5 h-2.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      value={currentVal}
                      onPointerDown={() => useEditorStore.getState().pushHistory()}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          adjustments: {
                            ...(clip.adjustments || {}),
                            [item.key]: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && isAudioOrVideo && (
          <div className="space-y-3.5 text-xs">
            {/* Extract Audio from Video Clip */}
            {clip.type === 'video' && (
              <div className="pb-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
                <button
                  type="button"
                  onClick={() => useEditorStore.getState().extractAudioFromClip(clip.id)}
                  className="w-full py-2 px-3 rounded-[6px] bg-[#171717] hover:bg-[#262626] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#171717] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Music className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Extract Audio to Track</span>
                </button>
              </div>
            )}

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
                className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
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
                    updateClip(clip.id, { audioProps: { ...clip.audioProps, fadeIn: parseFloat(e.target.value) || 0 } })
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
                    updateClip(clip.id, { audioProps: { ...clip.audioProps, fadeOut: parseFloat(e.target.value) || 0 } })
                  }
                  className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] p-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
                />
              </div>
            </div>

            {/* Noise Reduction */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-normal text-[#171717] dark:text-[#EDEDED]">Noise Reduction</span>
                <input
                  type="checkbox"
                  checked={_optionalChain([clip, 'access', _nr => _nr.audioProps, 'optionalAccess', _nr2 => _nr2.noiseReduction]) || false}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      audioProps: { ...(clip.audioProps || {}), noiseReduction: e.target.checked },
                    })
                  }
                  className="rounded border-[#E5E5E5] dark:border-[#2A2A2A] accent-[#171717] dark:accent-[#EDEDED]"
                />
              </label>
              {_optionalChain([clip, 'access', _nr3 => _nr3.audioProps, 'optionalAccess', _nr4 => _nr4.noiseReduction]) && (
                <div>
                  <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1] mb-1">
                    <span>Noise Strength</span>
                    <span className="tabular-nums">
                      {(_optionalChain([clip, 'access', _ns => _ns.audioProps, 'optionalAccess', _ns2 => _ns2.noiseStrength])) ?? 50}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={(_optionalChain([clip, 'access', _ns3 => _ns3.audioProps, 'optionalAccess', _ns4 => _ns4.noiseStrength])) ?? 50}
                    onChange={(e) =>
                      updateClip(clip.id, {
                        audioProps: { ...(clip.audioProps || {}), noiseStrength: parseInt(e.target.value) || 50 },
                      })
                    }
                    className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                  />
                </div>
              )}
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
                  updateClip(clip.id, { audioProps: { ...(clip.audioProps || {}), pitchShift: parseInt(e.target.value) } })
                }
                className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
              />
            </div>

            {/* Equalizer Presets */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <span className="text-[#171717] dark:text-[#EDEDED] block font-normal">Equalizer Presets</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { name: 'Voice Boost', bass: -2, mid: 5, treble: 3 },
                  { name: 'Bass Boost', bass: 7, mid: 0, treble: -1 },
                  { name: 'Treble Boost', bass: -2, mid: 1, treble: 6 },
                  { name: 'Podcast', bass: 2, mid: 4, treble: 1 },
                ].map((eq) => {
                  const isCurrent =
                    _optionalChain([clip, 'access', _c => _c.audioProps, 'optionalAccess', _c2 => _c2.equalizer, 'optionalAccess', _c3 => _c3.preset]) === eq.name;
                  return (
                    <button
                      key={eq.name}
                      type="button"
                      onClick={() =>
                        updateClip(clip.id, {
                          audioProps: {
                            ...(clip.audioProps || {}),
                            equalizer: {
                              preset: eq.name,
                              bass: eq.bass,
                              mid: eq.mid,
                              treble: eq.treble,
                            },
                          },
                        })
                      }
                      className={`py-1 px-2 rounded-[6px] border text-[11px] font-normal transition-colors cursor-pointer text-center ${
                        isCurrent
                          ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                          : 'bg-white dark:bg-[#1A1A1A] text-[#737373] dark:text-[#A1A1A1] border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                      }`}
                    >
                      {eq.name}
                    </button>
                  );
                })}
              </div>

              {/* 3-Band Equalizer Sliders */}
              <div className="pt-1.5 space-y-2">
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
                          ...(clip.audioProps || {}),
                          equalizer: {
                            bass: parseInt(e.target.value),
                            mid: _optionalChain([clip, 'access', _78 => _78.audioProps, 'optionalAccess', _79 => _79.equalizer, 'optionalAccess', _80 => _80.mid]) || 0,
                            treble: _optionalChain([clip, 'access', _81 => _81.audioProps, 'optionalAccess', _82 => _82.equalizer, 'optionalAccess', _83 => _83.treble]) || 0,
                            preset: 'Custom',
                          },
                        },
                      })
                    }
                    className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
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
                          ...(clip.audioProps || {}),
                          equalizer: {
                            bass: _optionalChain([clip, 'access', _90 => _90.audioProps, 'optionalAccess', _91 => _91.equalizer, 'optionalAccess', _92 => _92.bass]) || 0,
                            mid: parseInt(e.target.value),
                            treble: _optionalChain([clip, 'access', _93 => _93.audioProps, 'optionalAccess', _94 => _94.equalizer, 'optionalAccess', _95 => _95.treble]) || 0,
                            preset: 'Custom',
                          },
                        },
                      })
                    }
                    className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
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
                          ...(clip.audioProps || {}),
                          equalizer: {
                            bass: _optionalChain([clip, 'access', _102 => _102.audioProps, 'optionalAccess', _103 => _103.equalizer, 'optionalAccess', _104 => _104.bass]) || 0,
                            mid: _optionalChain([clip, 'access', _105 => _105.audioProps, 'optionalAccess', _106 => _106.equalizer, 'optionalAccess', _107 => _107.mid]) || 0,
                            treble: parseInt(e.target.value),
                            preset: 'Custom',
                          },
                        },
                      })
                    }
                    className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                  />
                </div>
              </div>
            </div>

            {/* Voice Changer Presets */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
              <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Voice Changer Preset</span>
              <select
                value={_optionalChain([clip, 'access', _108 => _108.audioProps, 'optionalAccess', _109 => _109.voiceChanger]) || 'none'}
                onChange={(e) =>
                  updateClip(clip.id, { audioProps: { ...(clip.audioProps || {}), voiceChanger: e.target.value } })
                }
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer"
              >
                <option value="none">None (Natural Voice)</option>
                <option value="deep">Deep</option>
                <option value="high">High</option>
                <option value="robot">Robot</option>
                <option value="echo">Echo</option>
                <option value="chipmunk">Chipmunk</option>
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
                onPointerDown={() => useEditorStore.getState().pushHistory()}
                onChange={(e) => updateClip(clip.id, { speed: parseFloat(e.target.value) })}
                className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1.0, 2.0, 4.0].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    useEditorStore.getState().pushHistory();
                    updateClip(clip.id, { speed: s });
                  }}
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

            {/* Audio Pitch Note */}
            <div className="flex items-center justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1] pt-1">
              <span>Audio Pitch:</span>
              <span className="text-[#171717] dark:text-[#EDEDED] font-normal">Natural (Pitch Preserved)</span>
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
                    onClick={() => {
                      useEditorStore.getState().pushHistory();
                      updateClip(clip.id, { speedCurve: curve.id });
                    }}
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

            {/* Reverse & Smooth Slow-Mo */}
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer text-[#171717] dark:text-[#EDEDED]">
                <input
                  type="checkbox"
                  checked={clip.reverse || false}
                  onChange={(e) => {
                    useEditorStore.getState().pushHistory();
                    updateClip(clip.id, { reverse: e.target.checked });
                  }}
                  className="rounded border-[#E5E5E5] dark:border-[#2A2A2A] accent-[#171717] dark:accent-[#EDEDED]"
                />
                <span className="font-normal">Reverse Playback</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer text-[#171717] dark:text-[#EDEDED]">
                <input
                  type="checkbox"
                  checked={clip.smoothSlowMo || false}
                  onChange={(e) => {
                    useEditorStore.getState().pushHistory();
                    updateClip(clip.id, { smoothSlowMo: e.target.checked });
                  }}
                  className="rounded border-[#E5E5E5] dark:border-[#2A2A2A] accent-[#171717] dark:accent-[#EDEDED] mt-0.5"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-normal">Smooth slow motion</span>
                    {clip.speed < 0.5 && clip.smoothSlowMo && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-[#3B82F6]">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">
                    Blends frames when speed is under 0.5x for stutter-free slow motion
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#171717] dark:text-[#EDEDED]">
                <input
                  type="checkbox"
                  checked={clip.freezeFrame || false}
                  onChange={(e) => {
                    useEditorStore.getState().pushHistory();
                    updateClip(clip.id, { freezeFrame: e.target.checked });
                  }}
                  className="rounded border-[#E5E5E5] dark:border-[#2A2A2A] accent-[#171717] dark:accent-[#EDEDED]"
                />
                <span className="font-normal">Freeze Frame</span>
              </label>
            </div>
          </div>
        )}

        {/* EFFECT TAB (for effect track clips) */}
        {activeTab === 'effect' && isEffect && (
          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-[#171717] dark:text-[#EDEDED] block mb-1 font-normal">Effect Preset</span>
              <select
                value={clip.effectType || 'lens-blur'}
                onChange={(e) => {
                  useEditorStore.getState().pushHistory();
                  const targetFx = EFFECTS_LIST.find((fx) => fx.id === e.target.value);
                  updateClip(clip.id, {
                    effectType: e.target.value,
                    name: targetFx ? targetFx.name : clip.name,
                  });
                }}
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none"
              >
                {EFFECTS_LIST.map((fx) => (
                  <option key={fx.id} value={fx.id}>
                    {fx.name} ({fx.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                <span className="font-normal">Effect Intensity</span>
                <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.effectIntensity || 50}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={clip.effectIntensity || 50}
                onPointerDown={() => useEditorStore.getState().pushHistory()}
                onChange={(e) =>
                  updateClip(clip.id, { effectIntensity: parseInt(e.target.value) || 0 })
                }
                className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
              />
            </div>

            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1]">
              <span>Duration:</span>
              <span className="tabular-nums text-[#171717] dark:text-[#EDEDED]">
                {Math.round(clip.duration * 10) / 10}s
              </span>
            </div>
          </div>
        )}

        {/* MASK, CHROMA & BG REMOVAL TAB */}
        {activeTab === 'mask' && isVisual && (
          <div className="space-y-4 text-xs">
            {/* Shape Mask Section */}
            <div className="space-y-2.5">
              <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] block">
                Shape Mask
              </span>
              <div>
                <span className="text-[#737373] dark:text-[#A1A1A1] block mb-1">Mask Shape</span>
                <select
                  value={_optionalChain([clip, 'access', _110 => _110.mask, 'optionalAccess', _111 => _111.type]) || 'none'}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      mask: {
                        type: e.target.value,
                        size: _optionalChain([clip, 'access', _112 => _112.mask, 'optionalAccess', _113 => _113.size]) ?? 50,
                        feather: _optionalChain([clip, 'access', _114 => _114.mask, 'optionalAccess', _115 => _115.feather]) ?? 0,
                        rotation: _optionalChain([clip, 'access', _116 => _116.mask, 'optionalAccess', _117 => _117.rotation]) ?? 0,
                        x: _optionalChain([clip, 'access', _118 => _118.mask, 'optionalAccess', _119 => _119.x]) ?? 0,
                        y: _optionalChain([clip, 'access', _120 => _120.mask, 'optionalAccess', _121 => _121.y]) ?? 0,
                        invert: _optionalChain([clip, 'access', _122 => _122.mask, 'optionalAccess', _123 => _123.invert]) ?? false,
                      },
                    })
                  }
                  className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[6px] px-2 py-1.5 text-xs text-[#171717] dark:text-[#EDEDED] outline-none cursor-pointer"
                >
                  <option value="none">None</option>
                  <option value="circle">Circle</option>
                  <option value="rectangle">Rectangle</option>
                  <option value="heart">Heart</option>
                  <option value="star">Star</option>
                  <option value="linear">Linear (Split)</option>
                  <option value="mirror">Mirror (Parallel)</option>
                </select>
              </div>

              {clip.mask && clip.mask.type !== 'none' && (
                <div className="space-y-2.5 pt-1">
                  {/* Size */}
                  <div>
                    <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                      <span className="font-normal">Size</span>
                      <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.mask.size ?? 50}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="150"
                      value={clip.mask.size ?? 50}
                      onChange={(e) =>
                        updateClip(clip.id, { mask: { ...clip.mask, size: parseInt(e.target.value) || 50 } })
                      }
                      className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </div>

                  {/* Position X & Y */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                        <span className="font-normal">Pos X</span>
                        <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.mask.x ?? 0}%</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={clip.mask.x ?? 0}
                        onChange={(e) =>
                          updateClip(clip.id, { mask: { ...clip.mask, x: parseInt(e.target.value) || 0 } })
                        }
                        className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                        <span className="font-normal">Pos Y</span>
                        <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.mask.y ?? 0}%</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={clip.mask.y ?? 0}
                        onChange={(e) =>
                          updateClip(clip.id, { mask: { ...clip.mask, y: parseInt(e.target.value) || 0 } })
                        }
                        className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                      />
                    </div>
                  </div>

                  {/* Rotation */}
                  <div>
                    <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                      <span className="font-normal">Rotation</span>
                      <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.mask.rotation ?? 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={clip.mask.rotation ?? 0}
                      onChange={(e) =>
                        updateClip(clip.id, { mask: { ...clip.mask, rotation: parseInt(e.target.value) || 0 } })
                      }
                      className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </div>

                  {/* Feather */}
                  <div>
                    <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                      <span className="font-normal">Feather</span>
                      <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">{clip.mask.feather ?? 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={clip.mask.feather ?? 0}
                      onChange={(e) =>
                        updateClip(clip.id, { mask: { ...clip.mask, feather: parseInt(e.target.value) || 0 } })
                      }
                      className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </div>

                  {/* Invert Toggle */}
                  <label className="flex items-center justify-between cursor-pointer pt-1">
                    <span className="font-normal text-[#171717] dark:text-[#EDEDED]">Invert Mask</span>
                    <input
                      type="checkbox"
                      checked={Boolean(clip.mask.invert)}
                      onChange={(e) =>
                        updateClip(clip.id, { mask: { ...clip.mask, invert: e.target.checked } })
                      }
                      className="rounded border-[#E5E5E5] dark:border-[#2A2A2A] accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Chroma Key (Green Screen) Section */}
            <div className="pt-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">
                  Chroma Key
                </span>
                <input
                  type="checkbox"
                  checked={_optionalChain([clip, 'access', _124 => _124.chromaKey, 'optionalAccess', _125 => _125.enabled]) || false}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      chromaKey: {
                        enabled: e.target.checked,
                        keyColor: _optionalChain([clip, 'access', _126 => _126.chromaKey, 'optionalAccess', _127 => _127.keyColor]) || '#00FF00',
                        tolerance: _optionalChain([clip, 'access', _128 => _128.chromaKey, 'optionalAccess', _129 => _129.tolerance]) ?? 40,
                        softness: _optionalChain([clip, 'access', _130 => _130.chromaKey, 'optionalAccess', _131 => _131.softness]) ?? 15,
                        spillRemoval: _optionalChain([clip, 'access', _132 => _132.chromaKey, 'optionalAccess', _133 => _133.spillRemoval]) ?? 50,
                      },
                    })
                  }
                  className="rounded border-[#E5E5E5] dark:border-[#2A2A2A] accent-[#171717] dark:accent-[#EDEDED]"
                />
              </div>

              {_optionalChain([clip, 'access', _134 => _134.chromaKey, 'optionalAccess', _135 => _135.enabled]) && (
                <div className="space-y-2.5 pt-1">
                  {/* Eyedropper & Color Picker */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#737373] dark:text-[#A1A1A1]">Key Color:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.EyeDropper) {
                            try {
                              const eyeDropper = new window.EyeDropper();
                              const res = await eyeDropper.open();
                              if (res && res.sRGBHex) {
                                updateClip(clip.id, {
                                  chromaKey: { ...clip.chromaKey, keyColor: res.sRGBHex },
                                });
                                toastSuccess(`Sampled ${res.sRGBHex}`, 'Color Selected');
                              }
                            } catch (e) {}
                          } else {
                            toastInfo('Use the color picker to pick background color', 'Color Picker');
                          }
                        }}
                        className="p-1.5 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] text-[#171717] dark:text-[#EDEDED] transition-colors cursor-pointer"
                        title="Eyedropper: Pick color from screen"
                      >
                        <Pipette className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                      <input
                        type="color"
                        value={clip.chromaKey.keyColor || '#00FF00'}
                        onChange={(e) =>
                          updateClip(clip.id, {
                            chromaKey: { ...clip.chromaKey, keyColor: e.target.value },
                          })
                        }
                        className="w-7 h-7 rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Tolerance */}
                  <div>
                    <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                      <span className="font-normal">Tolerance</span>
                      <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                        {clip.chromaKey.tolerance ?? 40}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={clip.chromaKey.tolerance ?? 40}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          chromaKey: { ...clip.chromaKey, tolerance: parseInt(e.target.value) || 40 },
                        })
                      }
                      className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </div>

                  {/* Edge Softness */}
                  <div>
                    <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                      <span className="font-normal">Edge Softness</span>
                      <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                        {clip.chromaKey.softness ?? 15}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={clip.chromaKey.softness ?? 15}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          chromaKey: { ...clip.chromaKey, softness: parseInt(e.target.value) || 15 },
                        })
                      }
                      className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </div>

                  {/* Spill Removal */}
                  <div>
                    <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                      <span className="font-normal">Spill Removal</span>
                      <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                        {clip.chromaKey.spillRemoval ?? 50}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={clip.chromaKey.spillRemoval ?? 50}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          chromaKey: { ...clip.chromaKey, spillRemoval: parseInt(e.target.value) || 50 },
                        })
                      }
                      className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Background Removal Section */}
            <div className="pt-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] block">
                    Background Removal
                  </span>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">
                    Smart browser portrait cutout
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={_optionalChain([clip, 'access', _bg => _bg.bgRemoval, 'optionalAccess', _bg2 => _bg2.enabled]) || false}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    if (nextVal) {
                      toastSuccess('Background removed in browser', 'Cutout Applied');
                    }
                    updateClip(clip.id, {
                      bgRemoval: {
                        enabled: nextVal,
                        smoothing: _optionalChain([clip, 'access', _bg3 => _bg3.bgRemoval, 'optionalAccess', _bg4 => _bg4.smoothing]) ?? 15,
                      },
                    });
                  }}
                  className="rounded border-[#E5E5E5] dark:border-[#2A2A2A] accent-[#171717] dark:accent-[#EDEDED]"
                />
              </div>

              {_optionalChain([clip, 'access', _bg5 => _bg5.bgRemoval, 'optionalAccess', _bg6 => _bg6.enabled]) && (
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[#171717] dark:text-[#EDEDED] mb-1">
                      <span className="font-normal">Edge Smoothing</span>
                      <span className="text-[#737373] dark:text-[#A1A1A1] tabular-nums">
                        {clip.bgRemoval.smoothing ?? 15}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={clip.bgRemoval.smoothing ?? 15}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          bgRemoval: { ...clip.bgRemoval, smoothing: parseInt(e.target.value) || 15 },
                        })
                      }
                      className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-[4px] bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span>Cutout active (Live preview & export)</span>
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
