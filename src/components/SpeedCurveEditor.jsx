import React, { useState, useRef } from 'react';
import { RotateCcw, Plus, Trash2, Zap } from 'lucide-react';
import { SPEED_CURVE_PRESETS } from '../utils/colorGradingUtils';

export const SpeedCurveEditor = ({ clip, updateClip }) => {
  const points = clip.speedCurvePoints || SPEED_CURVE_PRESETS['montage']?.points || [
    { x: 0, y: 1 },
    { x: 0.3, y: 3 },
    { x: 0.7, y: 0.5 },
    { x: 1, y: 1 },
  ];

  const [selectedPointIdx, setSelectedPointIdx] = useState(null);
  const svgRef = useRef(null);

  // SVG coordinate bounds: width 240, height 120
  // X: 0..1 -> 16..224
  // Y: 0.1..8 -> 108..12
  const svgW = 240;
  const svgH = 120;
  const padX = 16;
  const padY = 14;

  const minSpeed = 0.1;
  const maxSpeed = 8.0;

  const toSvgX = (x) => padX + x * (svgW - 2 * padX);
  const toSvgY = (y) => {
    // Logarithmic or linear scale for speed
    const norm = (y - minSpeed) / (maxSpeed - minSpeed);
    return (svgH - padY) - Math.max(0, Math.min(1, norm)) * (svgH - 2 * padY);
  };

  const fromSvgX = (px) => Math.max(0, Math.min(1, (px - padX) / (svgW - 2 * padX)));
  const fromSvgY = (py) => {
    const norm = ((svgH - padY) - py) / (svgH - 2 * padY);
    const clamped = Math.max(0, Math.min(1, norm));
    return Math.round((minSpeed + clamped * (maxSpeed - minSpeed)) * 10) / 10;
  };

  const handlePointerDown = (idx, e) => {
    e.stopPropagation();
    setSelectedPointIdx(idx);

    const onPointerMove = (moveEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = moveEvent.clientX;
      const clientY = moveEvent.clientY;
      const svgX = ((clientX - rect.left) / rect.width) * svgW;
      const svgY = ((clientY - rect.top) / rect.height) * svgH;

      const newX = idx === 0 ? 0 : idx === points.length - 1 ? 1 : fromSvgX(svgX);
      const newY = Math.max(0.1, Math.min(8.0, fromSvgY(svgY)));

      const nextPoints = points.map((p, i) => (i === idx ? { x: newX, y: newY } : p));
      nextPoints.sort((a, b) => a.x - b.x);
      updateClip(clip.id, { speedCurvePoints: nextPoints, speedMode: 'curve' });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleSvgClick = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * svgW;
    const svgY = ((e.clientY - rect.top) / rect.height) * svgH;
    const clickX = fromSvgX(svgX);
    const clickY = fromSvgY(svgY);

    // If clicked away from existing points, insert new point
    if (points.length < 8) {
      const newPts = [...points, { x: clickX, y: clickY }].sort((a, b) => a.x - b.x);
      updateClip(clip.id, { speedCurvePoints: newPts, speedMode: 'curve' });
      const newIdx = newPts.findIndex((p) => Math.abs(p.x - clickX) < 0.02);
      setSelectedPointIdx(newIdx);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPointIdx === null || points.length <= 2) return;
    if (selectedPointIdx === 0 || selectedPointIdx === points.length - 1) return; // Keep edge points
    const nextPoints = points.filter((_, i) => i !== selectedPointIdx);
    updateClip(clip.id, { speedCurvePoints: nextPoints, speedMode: 'curve' });
    setSelectedPointIdx(null);
  };

  const applyPreset = (presetKey) => {
    const preset = SPEED_CURVE_PRESETS[presetKey];
    if (!preset) return;
    updateClip(clip.id, {
      speedCurvePoints: JSON.parse(JSON.stringify(preset.points)),
      speedCurvePreset: presetKey,
      speedMode: 'curve',
    });
    setSelectedPointIdx(null);
  };

  // Build SVG path
  const sortedPoints = [...points].sort((a, b) => a.x - b.x);
  let pathD = '';
  sortedPoints.forEach((pt, i) => {
    const sx = toSvgX(pt.x);
    const sy = toSvgY(pt.y);
    if (i === 0) {
      pathD += `M ${sx} ${sy}`;
    } else {
      const prev = sortedPoints[i - 1];
      const prevX = toSvgX(prev.x);
      const prevY = toSvgY(prev.y);
      const cpX1 = prevX + (sx - prevX) * 0.45;
      const cpX2 = sx - (sx - prevX) * 0.45;
      pathD += ` C ${cpX1} ${prevY}, ${cpX2} ${sy}, ${sx} ${sy}`;
    }
  });

  return (
    <div className="space-y-3 pt-1 select-none">
      {/* Presets Grid */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-normal text-[#171717] dark:text-[#EDEDED]">Speed Curve Presets</span>
          <span className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">Ramp transitions</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'montage', label: 'Montage' },
            { id: 'hero', label: 'Hero Time' },
            { id: 'bullet', label: 'Bullet' },
            { id: 'jump', label: 'Jump Cut' },
            { id: 'flash-in', label: 'Flash In' },
            { id: 'flash-out', label: 'Flash Out' },
          ].map((preset) => {
            const isCurrent = clip.speedCurvePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`py-1.5 px-2 rounded-[6px] text-xs font-normal border transition-colors cursor-pointer text-center ${
                  isCurrent
                    ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] border-[#171717] dark:border-[#EDEDED]'
                    : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editable Graph Box */}
      <div className="p-2.5 rounded-[6px] bg-[#FAFAFA] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2A2A2A] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#171717] dark:text-[#EDEDED] font-normal">Custom Speed Ramp</span>
          <div className="flex items-center gap-1.5">
            {selectedPointIdx !== null && selectedPointIdx > 0 && selectedPointIdx < points.length - 1 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                title="Delete selected point"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Point</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => applyPreset('montage')}
              className="flex items-center gap-1 text-[10px] text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              title="Reset curve"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* SVG Interactive Curve */}
        <div className="relative bg-white dark:bg-[#1A1A1A] rounded-[4px] border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-hidden cursor-crosshair">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-28 touch-none"
            onClick={handleSvgClick}
          >
            {/* Grid Lines */}
            <line x1={padX} y1={toSvgY(1)} x2={svgW - padX} y2={toSvgY(1)} stroke="#E5E5E5" strokeDasharray="3 3" />
            <line x1={padX} y1={toSvgY(4)} x2={svgW - padX} y2={toSvgY(4)} stroke="#E5E5E5" strokeDasharray="3 3" />
            <text x={padX + 2} y={toSvgY(1) - 3} fill="#737373" fontSize="8" fontFamily="sans-serif">1x</text>
            <text x={padX + 2} y={toSvgY(4) - 3} fill="#737373" fontSize="8" fontFamily="sans-serif">4x</text>

            {/* Shaded Area under Curve */}
            <path
              d={`${pathD} L ${toSvgX(1)} ${svgH - padY} L ${toSvgX(0)} ${svgH - padY} Z`}
              fill="rgba(59, 130, 246, 0.12)"
            />

            {/* Smooth Curve */}
            <path
              d={pathD}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Interactive Control Points */}
            {points.map((pt, idx) => {
              const cx = toSvgX(pt.x);
              const cy = toSvgY(pt.y);
              const isSelected = selectedPointIdx === idx;

              return (
                <g key={idx}>
                  {/* Outer touch target */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill="transparent"
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => handlePointerDown(idx, e)}
                  />
                  {/* Visual Node Puck */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 4.5}
                    fill={isSelected ? '#3B82F6' : '#FFFFFF'}
                    stroke="#3B82F6"
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-grab transition-all"
                    onPointerDown={(e) => handlePointerDown(idx, e)}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Point Value readout */}
        {selectedPointIdx !== null && points[selectedPointIdx] && (
          <div className="flex items-center justify-between text-[11px] text-[#737373] dark:text-[#A1A1A1] pt-1">
            <span>Point Time: {Math.round(points[selectedPointIdx].x * 100)}%</span>
            <span className="font-mono text-[#3B82F6] font-medium">Speed: {points[selectedPointIdx].y}x</span>
          </div>
        )}

        <div className="text-[10px] text-[#737373] dark:text-[#A1A1A1] text-center pt-0.5">
          Click along line to add points • Drag points to shape ramp • Audio pitch stays natural
        </div>
      </div>
    </div>
  );
};
