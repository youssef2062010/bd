import React from 'react';
import { FakeCallConfig } from '@fakecall/shared';
import { Heart, Clock, MessageCircle } from 'lucide-react';
import { StatusBar } from './StatusBar';
import { SlideToAnswer } from './SlideToAnswer';
import { AndroidCallControls } from './AndroidCallControls';
import { IosCallControls } from './IosCallControls';

interface IncomingCallViewProps {
  config: FakeCallConfig;
  onAnswer: () => void;
  onDecline: () => void;
}

export const IncomingCallView: React.FC<IncomingCallViewProps> = ({
  config,
  onAnswer,
  onDecline
}) => {
  const isIos = config.callSettings.uiStyle !== 'android';
  const useSlide = config.callSettings.answerMethod === 'slide';
  const isRomantic = config.callSettings.theme === 'romantic';

  // Romantic dreamy background styling vs Dark
  const bgGradient = isRomantic
    ? 'bg-gradient-to-b from-rose-950 via-pink-900/80 to-purple-950'
    : 'bg-black';

  return (
    <div className={`relative flex flex-col justify-between items-center w-full h-full min-h-screen ${bgGradient} text-white select-none overflow-hidden font-sans`}>
      {/* Real Gaussian Frosted Backdrop of Caller Photo */}
      {config.callerImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-125 opacity-40 transition-all duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${config.callerImage})` }}
        />
      ) : null}
      <div
        className={`absolute inset-0 pointer-events-none ${
          isRomantic
            ? 'bg-gradient-to-b from-rose-950/60 via-pink-950/40 to-black/70'
            : 'bg-gradient-to-b from-black/60 via-black/40 to-black/90'
        }`}
      />

      {/* Top Authentic Mobile Status Bar */}
      <StatusBar isCallActive={false} />

      {/* Top Caller Information (Authentic iOS / Android Style) */}
      <div className="relative z-10 flex flex-col items-center text-center mt-6 sm:mt-10 px-6 w-full">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium tracking-wide text-rose-200/90">
          {isRomantic && <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 animate-pulse" />}
          <span>mobile</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1 drop-shadow-lg">
          {config.callerName || 'Incoming Call'}
        </h1>
        {config.callerPhone ? (
          <p className="text-sm sm:text-base text-rose-100/90 font-normal tracking-wider mt-0.5 font-mono">
            {config.callerPhone}
          </p>
        ) : null}
      </div>

      {/* Middle Caller Avatar (Exact Real Mobile Dimensions: 140px-160px) */}
      <div className="relative z-10 mt-4 sm:mt-6 mb-auto py-2 flex flex-col items-center">
        <div
          className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden backdrop-blur-md shadow-2xl border-2 transition-all duration-500 ${
            isRomantic
              ? 'border-rose-400/80 shadow-rose-950/80 ring-4 ring-rose-500/30'
              : 'border-white/40 shadow-black/80 ring-4 ring-white/15'
          }`}
        >
          {config.callerImage ? (
            <img
              src={config.callerImage}
              alt={config.callerName || 'Caller'}
              className="w-full h-full object-cover bg-slate-900"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%231e293b"/><circle cx="50" cy="40" r="18" fill="%2364748b"/><path d="M22 84c0-16 12-26 28-26s28 10 28 26z" fill="%2364748b"/></svg>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-24 h-24">
                <circle cx="50" cy="40" r="18" fill="currentColor" />
                <path d="M22 84c0-16 12-26 28-26s28 10 28 26z" fill="currentColor" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Authentic Platform Controls */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center pb-8">
        {!isIos ? (
          /* 1. Samsung One UI / Android Modern Call Controls */
          <AndroidCallControls onAnswer={onAnswer} onDecline={onDecline} />
        ) : !useSlide ? (
          /* 2. Authentic Apple iOS 17/18 2-Column Controls (Remind Me, Message, Decline #ff3b30, Accept #34c759) */
          <IosCallControls onAnswer={onAnswer} onDecline={onDecline} />
        ) : (
          /* 3. Authentic Apple iOS Slide to Answer Mode */
          <div className="w-full flex flex-col items-center px-6">
            <div className="w-full flex justify-around px-6 text-white/90 mb-8">
              <button
                type="button"
                onClick={onDecline}
                className="flex flex-col items-center gap-1.5 opacity-85 hover:opacity-100 transition active:scale-95"
              >
                <div className={`w-[58px] h-[58px] rounded-full backdrop-blur-2xl border flex items-center justify-center ${isRomantic ? 'bg-rose-900/40 border-rose-400/30 text-white' : 'bg-white/20 border-white/10 text-white shadow-md'}`}>
                  <Clock className="w-6 h-6 stroke-[2]" />
                </div>
                <span className="text-[13px] font-normal text-white tracking-tight drop-shadow-sm">Remind Me</span>
              </button>

              <button
                type="button"
                onClick={onDecline}
                className="flex flex-col items-center gap-1.5 opacity-85 hover:opacity-100 transition active:scale-95"
              >
                <div className={`w-[58px] h-[58px] rounded-full backdrop-blur-2xl border flex items-center justify-center ${isRomantic ? 'bg-rose-900/40 border-rose-400/30 text-white' : 'bg-white/20 border-white/10 text-white shadow-md'}`}>
                  <MessageCircle className="w-6 h-6 stroke-[2]" />
                </div>
                <span className="text-[13px] font-normal text-white tracking-tight drop-shadow-sm">Message</span>
              </button>
            </div>

            <SlideToAnswer onAnswer={onAnswer} />

            <button
              type="button"
              onClick={onDecline}
              className="text-xs font-semibold text-white/70 hover:text-white transition mt-4 py-1 px-3 rounded-full hover:bg-white/10 active:scale-95"
            >
              Decline Call
            </button>

            <div className="w-36 h-1 rounded-full bg-white/40 mt-6 mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
};
