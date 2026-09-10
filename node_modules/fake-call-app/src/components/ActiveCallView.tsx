import React, { useState, useEffect } from 'react';
import { FakeCallConfig, audioSynthesizer } from '@fakecall/shared';
import {
  Mic,
  MicOff,
  Volume2,
  Grid,
  UserPlus,
  Video,
  Users,
  Delete
} from 'lucide-react';
import { PhoneDeclineGlyph } from './PhoneGlyphs';
import { StatusBar } from './StatusBar';
import { FallingHearts } from './FallingHearts';

interface ActiveCallViewProps {
  config: FakeCallConfig;
  callStartTime: number;
  onEndCall: (finalSeconds?: number) => void;
  onToggleMute: (muted: boolean) => void;
  onToggleSpeaker: (speaker: boolean) => void;
  voiceProgress?: { current: number; total: number };
}

export const ActiveCallView: React.FC<ActiveCallViewProps> = ({
  config,
  callStartTime,
  onEndCall,
  onToggleMute,
  onToggleSpeaker
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [typedDigits, setTypedDigits] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<{ icon: 'mute' | 'speaker'; text: string } | null>(null);
  const [isNearEar, setIsNearEar] = useState(false);

  const isRomantic = config.callSettings.theme === 'romantic';
  const showHearts = config.callSettings.fallingHeartsEnabled ?? true;

  // Authentic Proximity Detection: Blank screen when phone is held against ear in earpiece mode
  useEffect(() => {
    let sensor: any = null;
    try {
      if (typeof window !== 'undefined' && 'ProximitySensor' in window) {
        sensor = new (window as any).ProximitySensor();
        sensor.addEventListener('reading', () => {
          if (!isSpeaker) {
            setIsNearEar(Boolean(sensor.near));
          }
        });
        sensor.start();
      }
    } catch { }

    return () => {
      try {
        sensor?.stop();
      } catch { }
    };
  }, [isSpeaker]);

  // Robust live in-call timer: counts up continuously every second from mount
  useEffect(() => {
    const start = callStartTime && callStartTime > 0 ? callStartTime : Date.now();
    const updateElapsedTime = () => {
      setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };

    updateElapsedTime();
    const interval = window.setInterval(updateElapsedTime, 500);
    return () => window.clearInterval(interval);
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMuteClick = () => {
    const next = !isMuted;
    setIsMuted(next);
    onToggleMute(next);

    setFeedbackToast({
      icon: 'mute',
      text: next ? 'Call Muted' : 'Call Resumed'
    });
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
    setTimeout(() => {
      setFeedbackToast(null);
    }, 1400);
  };

  const handleSpeakerClick = () => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    setIsNearEar(false);
    onToggleSpeaker(next);

    setFeedbackToast({
      icon: 'speaker',
      text: next ? 'Speaker On' : 'Earpiece Mode'
    });
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
    setTimeout(() => {
      setFeedbackToast(null);
    }, 1400);
  };

  const handleKeyPress = (num: string) => {
    setTypedDigits((prev) => prev + num);
    audioSynthesizer.playDtmf(num);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const keypadKeys = [
    { num: '1', sub: '' },
    { num: '2', sub: 'A B C' },
    { num: '3', sub: 'D E F' },
    { num: '4', sub: 'G H I' },
    { num: '5', sub: 'J K L' },
    { num: '6', sub: 'M N O' },
    { num: '7', sub: 'P Q R S' },
    { num: '8', sub: 'T U V' },
    { num: '9', sub: 'W X Y Z' },
    { num: '*', sub: '' },
    { num: '0', sub: '+' },
    { num: '#', sub: '' }
  ];

  const bgGradient = isRomantic
    ? 'bg-gradient-to-b from-rose-950 via-pink-900/80 to-purple-950'
    : 'bg-slate-950';

  return (
    <div className={`relative flex flex-col justify-between items-center w-full h-full min-h-screen ${bgGradient} text-white select-none overflow-hidden font-sans`}>
      {/* Real Gaussian Frosted Ambient Glow of Caller Photo */}
      {config.callerImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-125 opacity-35 pointer-events-none"
          style={{ backgroundImage: `url(${config.callerImage})` }}
        />
      ) : null}
      <div
        className={`absolute inset-0 pointer-events-none ${isRomantic
            ? 'bg-gradient-to-b from-rose-950/70 via-pink-950/50 to-black/80'
            : 'bg-gradient-to-b from-black/80 via-black/90 to-black'
          }`}
      />

      {/* Red & Pink Falling Hearts Shower */}
      {showHearts && <FallingHearts />}

      {/* Feedback Toast for Mute & Speaker */}
      {feedbackToast && (
        <div className="absolute top-14 z-50 px-4 py-2 rounded-full bg-slate-900/90 backdrop-blur-2xl border border-white/30 text-white text-xs font-bold tracking-wide shadow-2xl animate-fade-in flex items-center gap-2 select-none">
          {feedbackToast.icon === 'mute' ? (
            <MicOff className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{feedbackToast.text}</span>
        </div>
      )}

      {/* Top Authentic Status Bar with Live In-Call Green Pill */}
      <StatusBar isCallActive={true} />

      {!showKeypad ? (
        /* ================= DEFAULT ACTIVE CALL VIEW ================= */
        <>
          {/* Caller Details & Live Real Call Timer */}
          <div className="relative z-10 flex flex-col items-center text-center mt-6 sm:mt-8 px-6 w-full animate-fade-in">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-md">
              {config.callerName || 'Call in Progress'}
            </h1>
            {config.callerPhone ? (
              <p className="text-sm text-rose-200/90 font-mono mt-1">
                {config.callerPhone}
              </p>
            ) : null}
            <span className="text-base sm:text-lg text-white font-medium tracking-wide mt-2 font-mono">
              {formatTimer(seconds)}
            </span>
          </div>

          {/* Middle Portrait (Authentic Real Mobile Scale) */}
          <div className="relative z-10 mt-3 sm:mt-5 mb-auto py-1 flex flex-col items-center animate-fade-in">
            <div
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden backdrop-blur-md border-2 shadow-2xl transition-all duration-500 ${isRomantic
                  ? 'border-rose-400/80 shadow-rose-950/80 ring-4 ring-rose-500/30'
                  : 'border-white/40 shadow-black/80 ring-4 ring-white/15'
                }`}
            >
              {config.callerImage ? (
                <img
                  src={config.callerImage}
                  alt={config.callerName || 'Caller'}
                  className="w-full h-full object-cover bg-slate-900"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-20 h-20">
                    <circle cx="50" cy="40" r="18" fill="currentColor" />
                    <path d="M22 84c0-16 12-26 28-26s28 10 28 26z" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>

      {/* Authentic Mobile Proximity Ear Blackout (When placed against ear in earpiece mode) */}
      {isNearEar && !isSpeaker && (
        <div
          className="fixed inset-0 bg-black z-[100] cursor-pointer flex items-center justify-center"
          onClick={() => setIsNearEar(false)}
          title="Phone against ear - Screen off (tap to awaken)"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-800 animate-pulse" />
        </div>
      )}

      {/* Dynamic Voice Activity Indicator */}
      <div className="mt-4 flex items-center gap-1.5 h-6">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${isRomantic ? 'bg-pink-400' : 'bg-emerald-400'}`}
            style={{
              height: isMuted ? '4px' : `${4 + Math.abs(Math.sin((i + seconds * 3) * 0.9)) * 16}px`,
              opacity: isMuted ? 0.25 : 0.9
            }}
          />
        ))}
      </div>
    </div>

    {/* Authentic iOS In-Call Controls Matrix */}
    <div className="relative z-10 w-full max-w-xs flex flex-col items-center gap-8 px-4 pb-12 animate-fade-in">
      <div className="grid grid-cols-3 gap-y-6 gap-x-8 w-full justify-items-center">
        {/* 1. Mute Button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            id="mute-toggle-btn"
            type="button"
            onClick={handleMuteClick}
            aria-label="Toggle Mute"
            className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation select-none active:scale-90 ${isMuted
                ? 'bg-white text-slate-950 shadow-2xl shadow-white/50 ring-4 ring-white/30 scale-105'
                : 'bg-white/15 backdrop-blur-2xl hover:bg-white/25 active:bg-white/30 text-white border border-white/20'
              }`}
          >
            {isMuted ? <MicOff className="w-7 h-7 text-slate-950 stroke-[2.5]" /> : <Mic className="w-7 h-7" />}
          </button>
          <span className={`text-xs font-medium ${isMuted ? 'text-white font-bold' : 'text-white/80'}`}>
            {isMuted ? 'muted' : 'mute'}
          </span>
        </div>

        {/* 2. Keypad Button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowKeypad(true)}
            aria-label="Open Keypad"
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/15 backdrop-blur-2xl hover:bg-white/25 active:scale-90 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer touch-manipulation select-none"
          >
            <Grid className="w-7 h-7" />
          </button>
          <span className="text-xs font-medium text-white/80">keypad</span>
        </div>

        {/* 3. Speaker / Earpiece Button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            id="speaker-toggle-btn"
            type="button"
            onClick={handleSpeakerClick}
            aria-label="Toggle Speaker"
            className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation select-none active:scale-90 ${isSpeaker
                ? 'bg-white text-slate-950 shadow-2xl shadow-white/50 ring-4 ring-white/30 scale-105'
                : 'bg-white/15 backdrop-blur-2xl hover:bg-white/25 active:bg-white/30 text-white border border-white/20'
              }`}
          >
            <Volume2 className={`w-7 h-7 ${isSpeaker ? 'text-slate-950 stroke-[2.5]' : ''}`} />
          </button>
          <span className={`text-xs font-medium ${isSpeaker ? 'text-white font-bold' : 'text-white/80'}`}>
            {isSpeaker ? 'speaker' : 'earpiece'}
          </span>
        </div>

              {/* 4. Authentic iOS Add Call Button */}
              <div className="flex flex-col items-center gap-1.5 opacity-60">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl text-white border border-white/15 flex items-center justify-center">
                  <UserPlus className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-white/80">add call</span>
              </div>

              {/* 5. FaceTime / Video Button */}
              <div className="flex flex-col items-center gap-1.5 opacity-60">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl text-white border border-white/15 flex items-center justify-center">
                  <Video className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-white/80">FaceTime</span>
              </div>

              {/* 6. Contacts Button */}
              <div className="flex flex-col items-center gap-1.5 opacity-60">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl text-white border border-white/15 flex items-center justify-center">
                  <Users className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-white/80">contacts</span>
              </div>
            </div>

            {/* End Call Circular Red Button (Authentic Apple/Android #FF3B30) */}
            <div className="pt-2">
              <button
                id="end-call-btn"
                type="button"
                onClick={() => onEndCall(seconds)}
                aria-label="End Call"
                className="w-[74px] h-[74px] sm:w-[78px] sm:h-[78px] rounded-full bg-[#FF3B30] hover:bg-[#E0342B] active:bg-[#D32F2F] active:scale-90 flex items-center justify-center text-white shadow-2xl shadow-red-950/80 transition-transform duration-100 border border-white/15"
              >
                <PhoneDeclineGlyph className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow" />
              </button>
            </div>
          </div>

        </>
      ) : (
        /* ================= AUTHENTIC IN-CALL KEYPAD VIEW ================= */
        <>
          {/* Top In-Call Header with Live Dialed Digits */}
          <div className="relative z-10 flex flex-col items-center text-center mt-3 sm:mt-5 px-6 w-full animate-fade-in">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
              {config.callerName || 'Unknown Caller'}
            </h2>
            <span className="text-xs sm:text-sm text-rose-200/90 font-mono mt-0.5">
              {formatTimer(seconds)}
            </span>

            {/* Live DTMF Number Dial Display */}
            <div className="h-10 mt-2 flex items-center justify-center gap-2">
              {typedDigits ? (
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl sm:text-3xl font-mono font-bold tracking-widest text-white drop-shadow">
                    {typedDigits}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTypedDigits((prev) => prev.slice(0, -1))}
                    aria-label="Delete last digit"
                    className="p-1.5 rounded-full text-white/70 hover:text-white transition active:scale-90"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-white/50 tracking-wide font-medium">
                  Touch Tone DTMF Keypad
                </span>
              )}
            </div>
          </div>

          {/* Authentic iOS In-Call Keypad (Frosted Glass & Proportions) */}
          <div className="relative z-10 w-full max-w-xs flex flex-col items-center my-auto py-1 animate-fade-in">
            <div className="grid grid-cols-3 gap-y-3.5 gap-x-6 w-full justify-items-center">
              {keypadKeys.map((k) => (
                <button
                  key={k.num}
                  type="button"
                  onClick={() => handleKeyPress(k.num)}
                  className={`w-[72px] h-[72px] sm:w-[78px] sm:h-[78px] rounded-full flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xl ${isRomantic
                      ? 'bg-rose-900/30 hover:bg-rose-800/40 active:bg-rose-500/50 border border-rose-300/30 text-white shadow-rose-950/50'
                      : 'bg-white/12 hover:bg-white/22 active:bg-white/35 border border-white/20 text-white shadow-black/50'
                    } backdrop-blur-xl`}
                >
                  <span className="text-3xl font-light sm:font-normal leading-none drop-shadow">
                    {k.num}
                  </span>
                  {k.sub && (
                    <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-white/70 mt-0.5">
                      {k.sub}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* In-Call Keypad Bottom Bar (Hide + Red End Call Button) */}
          <div className="relative z-10 w-full max-w-xs grid grid-cols-3 items-center px-4 pb-8 sm:pb-10 animate-fade-in">
            {/* Left Clear Button */}
            <div className="flex justify-center">
              {typedDigits && (
                <button
                  type="button"
                  onClick={() => setTypedDigits('')}
                  className="text-xs font-semibold text-white/70 hover:text-white transition active:scale-95"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Center Red End Call Button */}
            <div className="flex justify-center">
              <button
                id="end-call-keypad-btn"
                type="button"
                onClick={() => onEndCall(seconds)}
                aria-label="End Call"
                className="w-[74px] h-[74px] sm:w-[78px] sm:h-[78px] rounded-full bg-[#FF3B30] hover:bg-[#E0342B] active:bg-[#D32F2F] active:scale-90 flex items-center justify-center text-white shadow-2xl shadow-red-950/80 transition-transform duration-100 border border-white/15"
              >
                <PhoneDeclineGlyph className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow" />
              </button>
            </div>

            {/* Right Hide Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowKeypad(false)}
                className="text-sm font-semibold text-white/85 hover:text-white py-2 px-3 rounded-full hover:bg-white/10 active:scale-95 transition"
              >
                Hide
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
