import React from 'react';
import { FakeCallConfig } from '@fakecall/shared';
import { RotateCcw } from 'lucide-react';
import { PhoneDeclineGlyph } from './PhoneGlyphs';

interface CallEndedViewProps {
  config: FakeCallConfig;
  durationSeconds: number;
  onRestart: () => void;
}

export const CallEndedView: React.FC<CallEndedViewProps> = ({
  config,
  durationSeconds,
  onRestart
}) => {
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col justify-between items-center w-full h-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white px-5 py-10 select-none font-sans overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col items-center text-center mt-4">
        <div className="w-14 h-14 rounded-full bg-slate-800/80 backdrop-blur-md flex items-center justify-center text-slate-400 mb-3 border border-slate-700/60 shadow-lg">
          <PhoneDeclineGlyph className="w-7 h-7 text-rose-400 drop-shadow" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Call Ended</h1>
        <p className="text-xs text-slate-400 mt-0.5">Simulated call finished</p>
      </div>

      {/* Middle Content: Caller Card */}
      <div className="w-full max-w-sm flex flex-col gap-4 my-auto py-4">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-5 flex flex-col items-center shadow-xl">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-600 mb-3 shadow-lg bg-slate-800 flex items-center justify-center">
            {config.callerImage ? (
              <img
                src={config.callerImage}
                alt={config.callerName || 'Caller'}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-16 h-16 text-slate-500">
                <circle cx="50" cy="40" r="18" fill="currentColor" />
                <path d="M22 84c0-16 12-26 28-26s28 10 28 26z" fill="currentColor" />
              </svg>
            )}
          </div>
          {config.callerName ? <div className="text-base font-bold text-white">{config.callerName}</div> : null}
          {config.callerPhone ? <div className="text-xs text-slate-400 font-mono">{config.callerPhone}</div> : null}

          <div className="mt-4 w-full pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
            <span className="text-slate-400">Call Duration:</span>
            <span className="font-mono font-semibold text-emerald-400">{formatTimer(durationSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Action: Reset / Restart Call */}
      <div className="w-full max-w-sm mb-2">
        <button
          id="restart-call-btn"
          onClick={onRestart}
          className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 shadow-lg transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Call Again</span>
        </button>
      </div>
    </div>
  );
};
