import React from 'react';
import { MessageCircle, Clock } from 'lucide-react';
import { PhoneAcceptGlyph, PhoneDeclineGlyph } from './PhoneGlyphs';

interface IosCallControlsProps {
  onAnswer: () => void;
  onDecline: () => void;
}

export const IosCallControls: React.FC<IosCallControlsProps> = ({
  onAnswer,
  onDecline
}) => {
  return (
    <div className="w-full max-w-[340px] flex flex-col items-center select-none font-sans px-4 pb-2">
      {/* Top Row: Authentic iOS "Remind Me" and "Message" Buttons */}
      <div className="w-full flex items-center justify-between px-6 mb-10">
        {/* Remind Me */}
        <button
          type="button"
          onClick={onDecline}
          className="flex flex-col items-center gap-1.5 active:opacity-60 transition duration-150"
        >
          <div className="w-[58px] h-[58px] rounded-full bg-white/20 backdrop-blur-2xl flex items-center justify-center text-white border border-white/10 shadow-md">
            <Clock className="w-6 h-6 stroke-[2]" />
          </div>
          <span className="text-[13px] font-normal text-white tracking-tight drop-shadow-sm">
            Remind Me
          </span>
        </button>

        {/* Message */}
        <button
          type="button"
          onClick={onDecline}
          className="flex flex-col items-center gap-1.5 active:opacity-60 transition duration-150"
        >
          <div className="w-[58px] h-[58px] rounded-full bg-white/20 backdrop-blur-2xl flex items-center justify-center text-white border border-white/10 shadow-md">
            <MessageCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <span className="text-[13px] font-normal text-white tracking-tight drop-shadow-sm">
            Message
          </span>
        </button>
      </div>

      {/* Bottom Row: Authentic iOS 17/18 Decline & Accept Buttons */}
      <div className="w-full flex items-center justify-between px-4">
        {/* Decline Button (Authentic Apple iOS Red #FF3B30 with Solid Phone Down Receiver) */}
        <div className="flex flex-col items-center gap-2">
          <button
            id="ios-decline-btn"
            type="button"
            onClick={onDecline}
            aria-label="Decline"
            className="w-[76px] h-[76px] sm:w-[80px] sm:h-[80px] rounded-full bg-[#FF3B30] hover:bg-[#E0342B] active:scale-90 flex items-center justify-center text-white shadow-2xl shadow-red-950/60 transition-transform duration-100 border border-white/15"
          >
            <PhoneDeclineGlyph className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-md" />
          </button>
          <span className="text-[14px] font-normal text-white tracking-tight drop-shadow-sm">
            Decline
          </span>
        </div>

        {/* Accept Button (Authentic Apple iOS Green #34C759 with Solid Phone Accept Receiver) */}
        <div className="flex flex-col items-center gap-2">
          <button
            id="ios-accept-btn"
            type="button"
            onClick={onAnswer}
            aria-label="Accept"
            className="relative w-[76px] h-[76px] sm:w-[80px] sm:h-[80px] rounded-full bg-[#34C759] hover:bg-[#2EBD53] active:scale-90 flex items-center justify-center text-white shadow-2xl shadow-green-950/60 transition-transform duration-100 border border-white/15"
          >
            {/* Subtle soft authentic breathing ring */}
            <div
              className="absolute inset-0 rounded-full bg-[#34C759]/40 animate-ping pointer-events-none"
              style={{ animationDuration: '2.4s' }}
            />
            <PhoneAcceptGlyph className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-md relative z-10" />
          </button>
          <span className="text-[14px] font-normal text-white tracking-tight drop-shadow-sm">
            Answer
          </span>
        </div>
      </div>

      {/* Iconic iPhone Home Indicator Bar */}
      <div className="w-36 h-1 rounded-full bg-white/40 mt-10 mx-auto" />
    </div>
  );
};
