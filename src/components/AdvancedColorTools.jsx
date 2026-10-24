import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Eye, Upload, Trash2, Check, Sparkles } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import {
  HSL_COLOR_RANGES,
  PRESET_LUTS,
  parseCubeLUT,
} from '../utils/colorGradingUtils';
import { toastSuccess, toastError } from '../store/toastStore';

export const AdvancedColorTools = ({ clip, updateClip }) => {
  const { compareOriginal, setCompareOriginal } = useEditorStore();
  const [colorSubTab, setColorSubTab] = useState('curves'); // 'curves' | 'hsl' | 'wheels' | 'lut'

  // Curves State
  const [curveChannel, setCurveChannel] = useState('rgb'); // 'rgb' | 'red' | 'green' | 'blue'
  const defaultCurve = [
    { x: 0, y: 0 },
    { x: 255, y: 255 },
  ];
  const colorCurves = clip.colorCurves || {
    rgb: defaultCurve,
    red: defaultCurve,
    green: defaultCurve,
    blue: defaultCurve,
  };
  const activeCurvePoints = colorCurves[curveChannel] || defaultCurve;

  // HSL State
  const [selectedHslColor, setSelectedHslColor] = useState('red');
  const hslData = clip.hsl || {};
  const currentHsl = hslData[selectedHslColor] || { hue: 0, sat: 0, light: 0 };

  // Color Wheels State
  const colorWheels = clip.colorWheels || {
    shadows: { r: 0, g: 0, b: 0, brightness: 0 },
    midtones: { r: 0, g: 0, b: 0, brightness: 0 },
    highlights: { r: 0, g: 0, b: 0, brightness: 0 },
  };

  // LUT State
  const [userLuts, setUserLuts] = useState(() => {
    try {
      const stored = localStorage.getItem('clipforge_user_luts');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const fileInputRef = useRef(null);

  /* =========================================================================
     CURVES LOGIC
     ========================================================================= */
  const curveSvgRef = useRef(null);
  const [selectedCurvePtIdx, setSelectedCurvePtIdx] = useState(null);

  const handleCurvePtDown = (idx, e) => {
    e.stopPropagation();
    setSelectedCurvePtIdx(idx);

    const onMove = (moveEv) => {
      if (!curveSvgRef.current) return;
      const rect = curveSvgRef.current.getBoundingClientRect();
      const normX = Math.max(0, Math.min(1, (moveEv.clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, 1 - (moveEv.clientY - rect.top) / rect.height));

      const newX = idx === 0 ? 0 : idx === activeCurvePoints.length - 1 ? 255 : Math.round(normX * 255);
      const newY = Math.round(normY * 255);

      const nextPoints = activeCurvePoints.map((p, i) => (i === idx ? { x: newX, y: newY } : p));
      nextPoints.sort((a, b) => a.x - b.x);

      updateClip(clip.id, {
        colorCurves: {
          ...colorCurves,
          [curveChannel]: nextPoints,
        },
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleCurveSvgClick = (e) => {
    if (!curveSvgRef.current) return;
    const rect = curveSvgRef.current.getBoundingClientRect();
    const clickX = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 255);
    const clickY = Math.round(Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height)) * 255);

    if (activeCurvePoints.length < 8) {
      const nextPts = [...activeCurvePoints, { x: clickX, y: clickY }].sort((a, b) => a.x - b.x);
      updateClip(clip.id, {
        colorCurves: {
          ...colorCurves,
          [curveChannel]: nextPts,
        },
      });
      const newIdx = nextPts.findIndex((p) => Math.abs(p.x - clickX) < 5);
      setSelectedCurvePtIdx(newIdx);
    }
  };

  const resetCurrentCurve = () => {
    updateClip(clip.id, {
      colorCurves: {
        ...colorCurves,
        [curveChannel]: defaultCurve,
      },
    });
    setSelectedCurvePtIdx(null);
  };

  const resetAllCurves = () => {
    updateClip(clip.id, {
      colorCurves: {
        rgb: defaultCurve,
        red: defaultCurve,
        green: defaultCurve,
        blue: defaultCurve,
      },
    });
    setSelectedCurvePtIdx(null);
  };

  // Build SVG path for curves
  const sortedCurvePts = [...activeCurvePoints].sort((a, b) => a.x - b.x);
  let curvePathD = '';
  sortedCurvePts.forEach((pt, i) => {
    const sx = (pt.x / 255) * 180 + 10;
    const sy = 190 - (pt.y / 255) * 180;
    if (i === 0) curvePathD += `M ${sx} ${sy}`;
    else {
      const prev = sortedCurvePts[i - 1];
      const px = (prev.x / 255) * 180 + 10;
      const py = 190 - (prev.y / 255) * 180;
      const cpX1 = px + (sx - px) * 0.45;
      const cpX2 = sx - (sx - px) * 0.45;
      curvePathD += ` C ${cpX1} ${py}, ${cpX2} ${sy}, ${sx} ${sy}`;
    }
  });

  /* =========================================================================
     HSL LOGIC
     ========================================================================= */
  const handleHslChange = (prop, val) => {
    updateClip(clip.id, {
      hsl: {
        ...hslData,
        [selectedHslColor]: {
          ...currentHsl,
          [prop]: parseInt(val) || 0,
        },
      },
    });
  };

  const resetHslColor = () => {
    updateClip(clip.id, {
      hsl: {
        ...hslData,
        [selectedHslColor]: { hue: 0, sat: 0, light: 0 },
      },
    });
  };

  const resetAllHsl = () => {
    updateClip(clip.id, { hsl: {} });
  };

  /* =========================================================================
     COLOR WHEELS LOGIC
     ========================================================================= */
  const handleWheelPointerDown = (wheelKey, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    const updateFromPos = (clientX, clientY) => {
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));
      const normDist = dist / radius; // 0..1
      const angle = Math.atan2(dy, dx); // radians

      // Convert polar angle & dist to RGB tint offsets (-1 to +1)
      const rOffset = Math.cos(angle) * normDist;
      const gOffset = Math.cos(angle - (2 * Math.PI) / 3) * normDist;
      const bOffset = Math.cos(angle + (2 * Math.PI) / 3) * normDist;

      updateClip(clip.id, {
        colorWheels: {
          ...colorWheels,
          [wheelKey]: {
            ...colorWheels[wheelKey],
            r: Math.round(rOffset * 100) / 100,
            g: Math.round(gOffset * 100) / 100,
            b: Math.round(bOffset * 100) / 100,
          },
        },
      });
    };

    updateFromPos(e.clientX, e.clientY);

    const onMove = (moveEv) => updateFromPos(moveEv.clientX, moveEv.clientY);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleWheelBrightnessChange = (wheelKey, val) => {
    updateClip(clip.id, {
      colorWheels: {
        ...colorWheels,
        [wheelKey]: {
          ...colorWheels[wheelKey],
          brightness: parseInt(val) || 0,
        },
      },
    });
  };

  const resetWheel = (wheelKey) => {
    updateClip(clip.id, {
      colorWheels: {
        ...colorWheels,
        [wheelKey]: { r: 0, g: 0, b: 0, brightness: 0 },
      },
    });
  };

  /* =========================================================================
     LUT LOGIC
     ========================================================================= */
  const handleLutUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCubeLUT(text, file.name);
      if (!parsed) throw new Error('Invalid .cube format or unsupported syntax');

      const newLutEntry = {
        id: `lut_${Date.now()}`,
        name: file.name.replace(/\.cube$/i, ''),
        cubeData: text,
      };

      const nextUserLuts = [...userLuts, newLutEntry];
      setUserLuts(nextUserLuts);
      try {
        localStorage.setItem('clipforge_user_luts', JSON.stringify(nextUserLuts));
      } catch (err) {}

      updateClip(clip.id, {
        lut: {
          id: newLutEntry.id,
          name: newLutEntry.name,
          cubeData: text,
          intensity: 100,
        },
      });
      toastSuccess(`Imported LUT: ${newLutEntry.name}`, 'LUT Imported');
    } catch (err) {
      toastError(`Failed to load .cube file: ${err.message}`, 'LUT Error');
    }
  };

  const applyPresetLut = (preset) => {
    updateClip(clip.id, {
      lut: {
        id: preset.id,
        name: preset.name,
        type: preset.type,
        filterCss: preset.filterCss,
        intensity: clip.lut?.intensity ?? 100,
      },
    });
  };

  const removeLut = () => {
    updateClip(clip.id, { lut: null });
  };

  return (
    <div className="space-y-3 pt-1 select-none">
      {/* Before / After Compare Button */}
      <div className="p-2 rounded-[6px] bg-[#FAFAFA] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-[#171717] dark:text-[#EDEDED] block">Original Compare</span>
          <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">Hold to view raw unfiltered source</span>
        </div>
        <button
          type="button"
          onPointerDown={() => setCompareOriginal(true)}
          onPointerUp={() => setCompareOriginal(false)}
          onPointerLeave={() => setCompareOriginal(false)}
          className={`px-3 py-1.5 rounded-[6px] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs select-none active:scale-95 ${
            compareOriginal
              ? 'bg-amber-500 text-white ring-2 ring-amber-400'
              : 'bg-[#171717] text-white hover:bg-[#262626] dark:bg-[#EDEDED] dark:text-[#171717] dark:hover:bg-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{compareOriginal ? 'Showing Original' : 'Hold to Compare'}</span>
        </button>
      </div>

      {/* Sub-Tabs: Curves | HSL | Wheels | LUT */}
      <div className="grid grid-cols-4 p-0.5 rounded-[6px] bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#2A2A2A] text-xs">
        {[
          { id: 'curves', label: 'Curves' },
          { id: 'hsl', label: 'HSL' },
          { id: 'wheels', label: 'Wheels' },
          { id: 'lut', label: 'LUT' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setColorSubTab(tab.id)}
            className={`py-1 rounded-[4px] font-normal transition-colors cursor-pointer text-center ${
              colorSubTab === tab.id
                ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#EDEDED] shadow-2xs'
                : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CURVES SUB-TAB */}
      {colorSubTab === 'curves' && (
        <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-3">
          {/* Channel Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'rgb', label: 'RGB', color: '#171717', border: '#737373' },
                { id: 'red', label: 'Red', color: '#EF4444', border: '#EF4444' },
                { id: 'green', label: 'Green', color: '#10B981', border: '#10B981' },
                { id: 'blue', label: 'Blue', color: '#3B82F6', border: '#3B82F6' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setCurveChannel(ch.id);
                    setSelectedCurvePtIdx(null);
                  }}
                  className={`px-2 py-1 rounded-[4px] text-[11px] font-medium border transition-colors cursor-pointer ${
                    curveChannel === ch.id
                      ? 'bg-[#F5F5F5] dark:bg-[#262626] border-[#171717] dark:border-[#EDEDED] text-[#171717] dark:text-[#EDEDED]'
                      : 'border-transparent text-[#737373] dark:text-[#A1A1A1] hover:bg-[#FAFAFA] dark:hover:bg-[#202020]'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: ch.color }}
                  />
                  {ch.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetCurrentCurve}
                className="p-1 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
                title="Reset Channel Curve"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* SVG Curves Graph */}
          <div className="relative bg-[#FAFAFA] dark:bg-[#141414] rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-hidden flex items-center justify-center p-2 cursor-crosshair">
            <svg
              ref={curveSvgRef}
              viewBox="0 0 200 200"
              className="w-48 h-48 touch-none select-none"
              onClick={handleCurveSvgClick}
            >
              {/* Grid 4x4 */}
              <line x1="10" y1="55" x2="190" y2="55" stroke="#E5E5E5" strokeDasharray="2 2" />
              <line x1="10" y1="100" x2="190" y2="100" stroke="#E5E5E5" strokeDasharray="2 2" />
              <line x1="10" y1="145" x2="190" y2="145" stroke="#E5E5E5" strokeDasharray="2 2" />
              <line x1="55" y1="10" x2="55" y2="190" stroke="#E5E5E5" strokeDasharray="2 2" />
              <line x1="100" y1="10" x2="100" y2="190" stroke="#E5E5E5" strokeDasharray="2 2" />
              <line x1="145" y1="10" x2="145" y2="190" stroke="#E5E5E5" strokeDasharray="2 2" />

              {/* Diagonal Neutral Guide */}
              <line x1="10" y1="190" x2="190" y2="10" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />

              {/* Curve Line */}
              <path
                d={curvePathD}
                fill="none"
                stroke={
                  curveChannel === 'red'
                    ? '#EF4444'
                    : curveChannel === 'green'
                    ? '#10B981'
                    : curveChannel === 'blue'
                    ? '#3B82F6'
                    : '#171717'
                }
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Points */}
              {sortedCurvePts.map((pt, idx) => {
                const cx = (pt.x / 255) * 180 + 10;
                const cy = 190 - (pt.y / 255) * 180;
                const isSelected = selectedCurvePtIdx === idx;
                const ptColor =
                  curveChannel === 'red'
                    ? '#EF4444'
                    : curveChannel === 'green'
                    ? '#10B981'
                    : curveChannel === 'blue'
                    ? '#3B82F6'
                    : '#171717';

                return (
                  <g key={idx}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={14}
                      fill="transparent"
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={(e) => handleCurvePtDown(idx, e)}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 6 : 4}
                      fill={isSelected ? ptColor : '#FFFFFF'}
                      stroke={ptColor}
                      strokeWidth={isSelected ? 3 : 2}
                      className="cursor-grab transition-all"
                      onPointerDown={(e) => handleCurvePtDown(idx, e)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#737373] dark:text-[#A1A1A1]">
            <span>Click to add curve points • Drag to adjust tone</span>
            <button
              type="button"
              onClick={resetAllCurves}
              className="text-xs hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
            >
              Reset All
            </button>
          </div>
        </div>
      )}

      {/* HSL SUB-TAB */}
      {colorSubTab === 'hsl' && (
        <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-3">
          {/* 8 Color Range Swatches */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-normal text-[#171717] dark:text-[#EDEDED]">Select Color Range</span>
              <button
                type="button"
                onClick={resetHslColor}
                className="text-[10px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(HSL_COLOR_RANGES).map(([key, col]) => {
                const isSelected = selectedHslColor === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedHslColor(key)}
                    className={`py-1 px-1.5 rounded-[4px] border text-[10px] font-normal flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F5F5F5] dark:bg-[#262626] border-[#171717] dark:border-[#EDEDED] text-[#171717] dark:text-[#EDEDED]'
                        : 'border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:bg-[#FAFAFA] dark:hover:bg-[#202020]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: col.dotColor }}
                    />
                    <span className="truncate">{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hue, Saturation, Lightness Sliders */}
          <div className="space-y-2.5 pt-1 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
            {/* Hue */}
            <div>
              <div className="flex justify-between text-[11px] text-[#171717] dark:text-[#EDEDED] mb-1">
                <span>Hue Shift</span>
                <span className="tabular-nums font-mono text-[10px] text-[#737373] dark:text-[#A1A1A1]">
                  {currentHsl.hue > 0 ? `+${currentHsl.hue}` : currentHsl.hue}°
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={currentHsl.hue}
                onChange={(e) => handleHslChange('hue', e.target.value)}
                className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-[11px] text-[#171717] dark:text-[#EDEDED] mb-1">
                <span>Saturation</span>
                <span className="tabular-nums font-mono text-[10px] text-[#737373] dark:text-[#A1A1A1]">
                  {currentHsl.sat > 0 ? `+${currentHsl.sat}` : currentHsl.sat}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={currentHsl.sat}
                onChange={(e) => handleHslChange('sat', e.target.value)}
                className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
              />
            </div>

            {/* Lightness */}
            <div>
              <div className="flex justify-between text-[11px] text-[#171717] dark:text-[#EDEDED] mb-1">
                <span>Lightness</span>
                <span className="tabular-nums font-mono text-[10px] text-[#737373] dark:text-[#A1A1A1]">
                  {currentHsl.light > 0 ? `+${currentHsl.light}` : currentHsl.light}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={currentHsl.light}
                onChange={(e) => handleHslChange('light', e.target.value)}
                className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
              />
            </div>
          </div>

          <div className="text-right pt-1">
            <button
              type="button"
              onClick={resetAllHsl}
              className="text-[10px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
            >
              Reset All HSL Ranges
            </button>
          </div>
        </div>
      )}

      {/* COLOR WHEELS SUB-TAB */}
      {colorSubTab === 'wheels' && (
        <div className="space-y-3">
          {[
            { id: 'shadows', label: 'Shadows (Lift)' },
            { id: 'midtones', label: 'Midtones (Gamma)' },
            { id: 'highlights', label: 'Highlights (Gain)' },
          ].map((wheel) => {
            const data = colorWheels[wheel.id] || { r: 0, g: 0, b: 0, brightness: 0 };
            // Calculate puck offset position inside 70px wheel circle
            const rPx = 35;
            const puckX = rPx + data.r * 28;
            const puckY = rPx + (data.b - data.g) * 20;

            return (
              <div
                key={wheel.id}
                className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#171717] dark:text-[#EDEDED]">{wheel.label}</span>
                  <button
                    type="button"
                    onClick={() => resetWheel(wheel.id)}
                    className="p-1 text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
                    title={`Reset ${wheel.label}`}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Circular Tint Wheel */}
                  <div
                    onPointerDown={(e) => handleWheelPointerDown(wheel.id, e)}
                    className="relative w-[70px] h-[70px] rounded-full shadow-inner cursor-pointer shrink-0 border border-[#E5E5E5] dark:border-[#2A2A2A] touch-none"
                    style={{
                      background:
                        'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                    }}
                  >
                    {/* Inner radial gradient to white center */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, #808080 0%, transparent 75%)',
                      }}
                    />
                    {/* Center Puck */}
                    <div
                      style={{
                        left: `${Math.max(4, Math.min(62, puckX))}px`,
                        top: `${Math.max(4, Math.min(62, puckY))}px`,
                      }}
                      className="absolute w-3 h-3 rounded-full bg-white border border-[#171717] shadow-sm transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>

                  {/* Brightness Slider */}
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1]">
                      <span>Brightness</span>
                      <span className="font-mono tabular-nums">
                        {data.brightness > 0 ? `+${data.brightness}` : data.brightness}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={data.brightness}
                      onChange={(e) => handleWheelBrightnessChange(wheel.id, e.target.value)}
                      className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LUT SUB-TAB */}
      {colorSubTab === 'lut' && (
        <div className="p-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-3 text-xs">
          {/* Active LUT Status / Intensity */}
          {clip.lut ? (
            <div className="p-2.5 rounded-[6px] bg-[#FAFAFA] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1] block">Active LUT</span>
                  <span className="font-medium text-[#171717] dark:text-[#EDEDED]">{clip.lut.name}</span>
                </div>
                <button
                  type="button"
                  onClick={removeLut}
                  className="px-2 py-1 rounded-[4px] text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                >
                  Remove LUT
                </button>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1] mb-1">
                  <span>LUT Intensity</span>
                  <span className="font-mono tabular-nums">{clip.lut.intensity ?? 100}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={clip.lut.intensity ?? 100}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      lut: {
                        ...clip.lut,
                        intensity: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full cursor-pointer accent-[#171717] dark:accent-[#EDEDED]"
                />
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-[#737373] dark:text-[#A1A1A1] text-center py-1">
              No LUT currently active on this clip.
            </div>
          )}

          {/* Upload .CUBE Button */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".cube"
              onChange={handleLutUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-[6px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] border border-[#E5E5E5] dark:border-[#2A2A2A] text-xs font-normal flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} />
              <span>Import .cube LUT File</span>
            </button>
          </div>

          {/* Preset LUTs */}
          <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-1.5">
            <span className="text-[11px] font-normal text-[#171717] dark:text-[#EDEDED] block">Cinematic Preset LUTs</span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_LUTS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPresetLut(preset)}
                  className={`py-1.5 px-2 rounded-[6px] text-xs font-normal border transition-colors cursor-pointer text-left truncate ${
                    clip.lut?.id === preset.id
                      ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                      : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* My LUTs List */}
          {userLuts.length > 0 && (
            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A] space-y-1.5">
              <span className="text-[11px] font-normal text-[#171717] dark:text-[#EDEDED] block">My LUTs</span>
              <div className="space-y-1">
                {userLuts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      updateClip(clip.id, {
                        lut: {
                          id: item.id,
                          name: item.name,
                          cubeData: item.cubeData,
                          intensity: clip.lut?.intensity ?? 100,
                        },
                      })
                    }
                    className={`p-2 rounded-[4px] border flex items-center justify-between cursor-pointer transition-colors ${
                      clip.lut?.id === item.id
                        ? 'border-[#3B82F6] bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = userLuts.filter((l) => l.id !== item.id);
                        setUserLuts(next);
                        try {
                          localStorage.setItem('clipforge_user_luts', JSON.stringify(next));
                        } catch (err) {}
                        if (clip.lut?.id === item.id) removeLut();
                      }}
                      className="text-[#737373] hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
