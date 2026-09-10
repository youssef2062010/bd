import React from 'react';
import { FakeCallConfig } from '@fakecall/shared';
import {
  Smartphone,
  ExternalLink,
  Radio,
  Volume2,
  Bell,
  CheckCircle2,
  User,
  Activity
} from 'lucide-react';

interface LiveSnapshotHeroProps {
  config: FakeCallConfig;
  onlineDevicesCount: number;
  devicesCount: number;
  onOpenTestCall: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const LiveSnapshotHero: React.FC<LiveSnapshotHeroProps> = ({
  config,
  onlineDevicesCount,
  devicesCount,
  onOpenTestCall,
  onNavigateToTab
}) => {
  const appName = config.branding?.appDisplayName || '';
  const appIconUri = config.branding?.customIconUri || '';

  return (
    <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/70 to-indigo-950/40 border border-white/[0.08] rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 shadow-2xl backdrop-blur-2xl">
      {/* Left: Combined App & Caller Identity */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        {/* Dual Avatars Cluster (App Icon + Caller Avatar) */}
        <div className="flex items-center -space-x-3 shrink-0">
          {/* App Launcher Icon */}
          <div
            onClick={() => onNavigateToTab('branding')}
            className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-rose-500/60 p-0.5 bg-slate-900 shadow-xl cursor-pointer hover:scale-105 transition-transform"
            title="Click to edit App Name & Logo"
          >
            {appIconUri ? <img src={appIconUri} alt={appName || 'App icon'} className="w-full h-full rounded-[12px] object-cover" /> : <Smartphone className="w-7 h-7 m-auto text-slate-500" />}
          </div>

          {/* Caller Photo Avatar */}
          <div
            onClick={() => onNavigateToTab('caller')}
            className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-400 p-0.5 bg-slate-900 shadow-xl cursor-pointer hover:scale-105 transition-transform relative z-10 flex items-center justify-center"
            title="Click to edit Caller Profile"
          >
            {config.callerImage ? (
              <img
                src={config.callerImage}
                alt={config.callerName || 'Caller'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-slate-400" />
            )}
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-950" />
          </div>
        </div>

        {/* Text Details */}
        <div>
          {/* Top Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              {config.callerName || 'No Caller Name Set'}
            </h2>
            {config.callerPhone && (
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                {config.callerPhone}
              </span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Ready to Call</span>
            </span>
          </div>

          {/* Bottom Metas */}
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-slate-400 mt-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-rose-400" />
              <span>App:</span>
              <strong className="text-white font-bold">{appName}</strong>
            </span>
            <span>•</span>
            <span>
              UI: <strong className="text-slate-200 uppercase">{config.callSettings.uiStyle === 'ios' ? 'Apple iOS' : 'Samsung'}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-blue-400" />
              <span>{config.ringtone.name}</span>
            </span>
            {config.voiceAudio?.name && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-300">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Voice Note Loaded</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Telemetry & Instant Action */}
      <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
        {/* Online Devices Radar Pill */}
        <button
          type="button"
          onClick={() => onNavigateToTab('devices')}
          className="h-11 px-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-2 shadow-sm transition-all"
        >
          {onlineDevicesCount > 0 ? (
            <>
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-emerald-400">{onlineDevicesCount} Online</span>
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 text-slate-400" />
              <span>{devicesCount} Devices Logged</span>
            </>
          )}
        </button>

        {/* Test Call Screen Button */}
        <button
          type="button"
          onClick={onOpenTestCall}
          className="h-11 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-emerald-950/60 transition-all active:scale-95"
        >
          <span>Launch Simulator</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
