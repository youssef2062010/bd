import React, { useState } from 'react';
import { ChevronUp, ChevronRight, ChevronLeft } from 'lucide-react';
import { PhoneAcceptGlyph, PhoneDeclineGlyph } from './PhoneGlyphs';

interface AndroidCallControlsProps {
  onAnswer: () => void;
  onDecline: () => void;
}

export const AndroidCallControls: React.FC<AndroidCallControlsProps> = ({
  onAnswer,
  onDecline
}) => {
  const [showQuickMessages, setShowQuickMessages] = useState(false);

  const quickMessages = [
    "Sorry, I can't talk right now.",
    "I'm in a meeting. Can I call you later?",
    "I'm on my way!",
    "Please text me."
  ];

  return (
    <div className="w-full flex flex-col items-center select-none font-sans px-4">
      {/* Quick Message Swipe-up Handle (Samsung One UI Style) */}
      <div className="w-full flex flex-col items-center mb-7">
        <button
          type="button"
          onClick={() => setShowQuickMessages(!showQuickMessages)}
          className="flex flex-col items-center gap-1 opacity-75 hover:opacity-100 transition active:scale-95 text-white/80 group"
        >
          <div className="flex items-center gap-1">
            <ChevronUp className="w-4 h-4 text-white/70 animate-bounce group-hover:text-white" />
            <span className="text-xs font-semibold tracking-wide">Send message</span>
          </div>
          <div className="w-12 h-1 rounded-full bg-white/25 mt-0.5" />
        </button>

        {/* Quick Messages Popup Modal */}
        {showQuickMessages && (
          <div className="w-full max-w-xs bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/15 p-4 mt-3 shadow-2xl z-30 animate-fade-in flex flex-col gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
              Quick Decline Messages
            </div>
            {quickMessages.map((msg, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setShowQuickMessages(false);
                  onDecline();
                }}
                className="text-left text-xs text-white/90 hover:text-white py-2 px-3 rounded-xl hover:bg-white/10 transition"
              >
                {msg}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Samsung One UI / Android Modern Answer & Decline Interaction */}
      <div className="w-full max-w-sm flex items-center justify-between px-6 sm:px-10">
        {/* DECLINE BUTTON (Red with Concentric Pulse Rings & Left Swipe Hint) */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            {/* Outer Concentric Wave Rings */}
            <div
              className="absolute -inset-4 rounded-full border border-rose-500/30 animate-ping pointer-events-none"
              style={{ animationDuration: '2.5s' }}
            />
            <div className="absolute -inset-2 rounded-full bg-rose-600/15 border border-rose-500/20 pointer-events-none" />

            {/* Inner Floating Circular Button */}
            <button
              id="android-decline-btn"
              type="button"
              onClick={onDecline}
              aria-label="Decline Call"
              className="relative z-10 w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-2xl shadow-red-950/80 active:scale-90 transition-all duration-150 border-2 border-white/25 hover:scale-105"
            >
              <PhoneDeclineGlyph className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow" />
            </button>
          </div>

          <div className="flex items-center gap-1 text-white/80">
            <ChevronLeft className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-rose-300">Decline</span>
          </div>
        </div>

        {/* Center Animated Swipe Dots / Android Indicator */}
        <div className="flex items-center gap-2 opacity-50">
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
        </div>

        {/* ACCEPT BUTTON (Green with Concentric Ripple Rings & Right Swipe Hint) */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            {/* Outer Concentric Wave Rings */}
            <div
              className="absolute -inset-4 rounded-full border border-emerald-500/40 animate-ping pointer-events-none"
              style={{ animationDuration: '2s' }}
            />
            <div className="absolute -inset-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 pointer-events-none animate-pulse" />

            {/* Inner Floating Circular Button */}
            <button
              id="android-answer-btn"
              type="button"
              onClick={onAnswer}
              aria-label="Answer Call"
              className="relative z-10 w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-2xl shadow-emerald-950/80 active:scale-90 transition-all duration-150 border-2 border-white/25 hover:scale-105"
            >
              <PhoneAcceptGlyph className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow" />
            </button>
          </div>

          <div className="flex items-center gap-1 text-white/80">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-300">Answer</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
