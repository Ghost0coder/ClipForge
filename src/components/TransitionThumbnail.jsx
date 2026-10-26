import React, { useRef, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { drawTransitionThumbnail } from '../utils/transitions';

export const TransitionThumbnail = ({
  transition,
  isSelected = false,
  isFavorite = false,
  onToggleFavorite,
  onSelect,
  duration = 0.6,
}) => {
  const canvasRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!isHovered) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      startTimeRef.current = null;
      // Draw middle frame preview
      drawTransitionThumbnail(canvas, transition.id, 0.5);
      return;
    }

    // Play animation loop when hovered or tapped
    let active = true;
    const animate = (timestamp) => {
      if (!active) return;
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const cycleDuration = Math.max(0.4, duration * 1.5);
      // Smooth 0 -> 1 sawtooth loop with a brief hold at ends
      const loopTime = elapsed % cycleDuration;
      const progress = Math.min(1, Math.max(0, loopTime / (cycleDuration * 0.85)));

      drawTransitionThumbnail(canvas, transition.id, progress);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isHovered, transition.id, duration]);

  return (
    <div
      onClick={() => onSelect && onSelect(transition)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => {
        setTimeout(() => setIsHovered(false), 2000);
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'transition', transitionId: transition.id }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className={`group relative flex flex-col p-1.5 rounded-[6px] border transition-all cursor-pointer select-none ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950/40 border-[#3B82F6] ring-1 ring-[#3B82F6]'
          : 'bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#3B82F6]'
      }`}
    >
      {/* Canvas Animated Preview Container */}
      <div className="relative w-full aspect-[16/10] rounded-[4px] overflow-hidden bg-[#0A0A0A] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={112}
          height={70}
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Favorite Star Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite && onToggleFavorite(transition.id);
          }}
          className={`absolute top-1 right-1 p-1 rounded-[4px] backdrop-blur-xs transition-all z-10 ${
            isFavorite
              ? 'text-amber-400 bg-black/60 opacity-100'
              : 'text-white/60 hover:text-amber-400 bg-black/40 opacity-0 group-hover:opacity-100'
          }`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className="w-3 h-3 fill-current" strokeWidth={1.5} />
        </button>

        {/* Play indicator pill on hover */}
        {isHovered && (
          <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded-[3px] bg-black/70 text-[9px] text-white/90 backdrop-blur-xs font-mono">
            Preview
          </div>
        )}
      </div>

      {/* Info Label */}
      <div className="mt-1 flex items-center justify-between min-w-0">
        <span className="text-[11px] font-normal text-[#171717] dark:text-[#EDEDED] truncate" title={transition.name}>
          {transition.name}
        </span>
        <span className="text-[9px] text-[#737373] dark:text-[#A1A1A1] tabular-nums shrink-0 font-mono ml-1">
          {transition.defaultDuration}s
        </span>
      </div>
    </div>
  );
};
