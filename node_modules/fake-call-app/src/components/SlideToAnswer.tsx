import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { PhoneAcceptGlyph } from './PhoneGlyphs';

interface SlideToAnswerProps {
  onAnswer: () => void;
}

export const SlideToAnswer: React.FC<SlideToAnswerProps> = ({ onAnswer }) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentDragRef = useRef(0);
  const hasTriggeredRef = useRef(false);

  // Compute maximum drag distance based on track and knob widths
  const getMaxDrag = useCallback(() => {
    if (!trackRef.current || !knobRef.current) return 220;
    const trackWidth = trackRef.current.clientWidth;
    const knobWidth = knobRef.current.clientWidth;
    // 6px padding on each side (p-1.5 = 6px)
    return Math.max(100, trackWidth - knobWidth - 12);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    hasTriggeredRef.current = false;
    startXRef.current = e.clientX - currentDragRef.current;

    // Gentle tactile haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || hasTriggeredRef.current) return;

      const maxDrag = getMaxDrag();
      const rawX = e.clientX - startXRef.current;
      const clampedX = Math.max(0, Math.min(rawX, maxDrag));

      currentDragRef.current = clampedX;
      setDragX(clampedX);

      // Trigger answer when dragged past 82% of track
      if (clampedX >= maxDrag * 0.82) {
        hasTriggeredRef.current = true;
        setIsDragging(false);
        setDragX(maxDrag);
        currentDragRef.current = maxDrag;

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([30, 20, 50]);
        }

        setTimeout(() => {
          onAnswer();
        }, 120);
      }
    };

    const handlePointerUp = () => {
      if (!isDragging) return;
      setIsDragging(false);

      const maxDrag = getMaxDrag();
      if (!hasTriggeredRef.current && currentDragRef.current < maxDrag * 0.82) {
        // Silky-smooth spring snap back to start
        currentDragRef.current = 0;
        setDragX(0);
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, getMaxDrag, onAnswer]);

  const maxDrag = getMaxDrag();
  const progress = maxDrag > 0 ? Math.min(1, dragX / maxDrag) : 0;
  // Text dynamically dissolves as the knob glides towards it
  const textOpacity = Math.max(0, 1 - progress * 1.6);

  return (
    <div
      ref={trackRef}
      className="relative w-full max-w-[330px] sm:max-w-[350px] h-[72px] sm:h-[76px] rounded-full bg-slate-900/40 backdrop-blur-2xl border border-white/20 p-1.5 flex items-center select-none shadow-2xl overflow-hidden cursor-pointer touch-none"
      onClick={() => {
        // Fallback tap if clicked directly without drag
        if (dragX === 0) {
          onAnswer();
        }
      }}
    >
      {/* Dynamic Green Glow Track Fill that follows knob */}
      <div
        className="absolute inset-y-1.5 left-1.5 rounded-full bg-gradient-to-r from-[#34C759]/35 to-[#34C759]/60 pointer-events-none transition-opacity duration-150"
        style={{
          width: `calc(62px + ${dragX}px)`,
          opacity: progress > 0.03 ? 1 : 0
        }}
      />

      {/* Shimmering Animated Text: "slide to answer" */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none pl-14 pr-5 transition-opacity duration-150"
        style={{ opacity: textOpacity }}
      >
        <span
          className="text-base sm:text-[17px] font-normal tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white/30 via-white/95 to-white/30 animate-shimmer select-none"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmerSweep 2.2s infinite linear'
          }}
        >
          slide to answer
        </span>
        <div className="flex items-center text-white/50 ml-1.5">
          <ChevronRight className="w-4 h-4 animate-pulse" />
          <ChevronRight className="w-4 h-4 -ml-2.5 animate-pulse" style={{ animationDelay: '0.2s' }} />
          <ChevronRight className="w-4 h-4 -ml-2.5 animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      {/* Draggable Apple Green Answer Knob */}
      <div
        ref={knobRef}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging
            ? 'none'
            : 'transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.15)'
        }}
        onPointerDown={handlePointerDown}
        className="relative z-10 w-[60px] h-[60px] sm:w-[64px] sm:h-[64px] rounded-full bg-[#34C759] hover:bg-[#2EBD53] active:bg-[#28A745] flex items-center justify-center text-white shadow-2xl shadow-green-950/80 cursor-grab active:cursor-grabbing border border-white/25 active:scale-95 transition-transform"
      >
        {/* Soft breathing pulse ring when idle */}
        {!isDragging && dragX === 0 && (
          <div
            className="absolute inset-0 rounded-full bg-[#34C759]/40 animate-ping pointer-events-none"
            style={{ animationDuration: '2.5s' }}
          />
        )}
        <PhoneAcceptGlyph className="w-8 h-8 sm:w-8 sm:h-8 text-white drop-shadow relative z-10" />
      </div>
    </div>
  );
};
