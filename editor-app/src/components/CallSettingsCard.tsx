import React from 'react';
import { FakeCallConfig, AppTheme, CallUiStyle, AnswerMethod, LaunchAction } from '@fakecall/shared';
import { Vibrate, Clock, Smartphone, PhoneCall, Radio, Heart } from 'lucide-react';

interface CallSettingsCardProps {
  config: FakeCallConfig;
  onChange: (updated: Partial<FakeCallConfig>) => void;
}

export const CallSettingsCard: React.FC<CallSettingsCardProps> = ({ config, onChange }) => {
  const settings = config.callSettings;

  const updateSettings = (partial: Partial<typeof settings>) => {
    onChange({
      callSettings: {
        ...settings,
        ...partial
      }
    });
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-2xl transition-all">
      {/* Card Header */}
      <div className="flex items-center gap-3.5 mb-7">
        <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 shrink-0">
          <Heart className="w-6 h-6 fill-pink-500 text-pink-400" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Call Simulation & Atmosphere Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure phone operating system UI, visual themes, answering mechanics, and realism filters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Theme Atmosphere */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/[0.08]">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
            <span>Visual Theme Atmosphere</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'romantic', label: 'Romantic Rose' },
              { id: 'dark', label: 'Dark Velvet' },
              { id: 'amoled', label: 'OLED Black' },
              { id: 'light', label: 'Clean Light' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => updateSettings({ theme: t.id as AppTheme })}
                className={`py-3 px-2 text-xs font-bold rounded-xl border transition active:scale-95 ${settings.theme === t.id
                    ? 'border-pink-500 bg-pink-950/50 text-pink-300 shadow-md ring-1 ring-pink-500/40'
                    : 'border-white/[0.08] bg-slate-900/80 text-slate-400 hover:border-white/[0.15] hover:text-white'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Launch Action */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/[0.08] lg:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-rose-400" />
            <span>Action On App Launch</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'incoming', label: 'Show Incoming Call' },
              { id: 'answer', label: 'Answer Directly' },
              { id: 'decline', label: 'Decline Directly' }
            ].map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => updateSettings({ launchAction: action.id as LaunchAction })}
                className={`py-3 px-3 text-xs sm:text-sm font-bold rounded-xl border transition active:scale-95 ${settings.launchAction === action.id
                    ? 'border-rose-500 bg-rose-950/50 text-rose-300 shadow-md ring-1 ring-rose-500/40'
                    : 'border-white/[0.08] bg-slate-900/80 text-slate-400 hover:border-white/[0.15] hover:text-white'
                  }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Falling Hearts Rain Switch */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400">
              <Heart className="w-5 h-5 fill-pink-500 text-pink-400" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-white">Falling Hearts Rain</div>
              <div className="text-xs text-slate-400 mt-0.5">Gentle romantic hearts drifting across the screen</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={settings.fallingHeartsEnabled ?? true}
              onChange={(e) => updateSettings({ fallingHeartsEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>

        {/* 3. Authentic UI Style Selector (iOS vs Android) */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/[0.08]">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Mobile Interface Style</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: 'ios', label: 'Apple iPhone (iOS)' },
              { id: 'android', label: 'Samsung One UI (Android)' }
            ].map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => updateSettings({ uiStyle: style.id as CallUiStyle })}
                className={`py-3 px-3 text-xs sm:text-sm font-bold rounded-xl border transition active:scale-95 ${settings.uiStyle === style.id
                    ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 shadow-md ring-1 ring-emerald-500/40'
                    : 'border-white/[0.08] bg-slate-900/80 text-slate-400 hover:border-white/[0.15] hover:text-white'
                  }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Answer Interaction Method */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/[0.08]">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-blue-400" />
            <span>Answer Interaction Method</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: 'slide', label: 'Slide to Answer (Iconic)' },
              { id: 'buttons', label: 'Decline / Accept Buttons' }
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => updateSettings({ answerMethod: method.id as AnswerMethod })}
                className={`py-3 px-3 text-xs sm:text-sm font-bold rounded-xl border transition active:scale-95 ${settings.answerMethod === method.id
                    ? 'border-blue-500 bg-blue-950/50 text-blue-300 shadow-md ring-1 ring-blue-500/40'
                    : 'border-white/[0.08] bg-slate-900/80 text-slate-400 hover:border-white/[0.15] hover:text-white'
                  }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Cellular Earpiece Acoustic Filter */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-white">Cellular Earpiece Filter</div>
              <div className="text-xs text-slate-400 mt-0.5">Applies authentic 300Hz–3400Hz phone speaker acoustics</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={settings.realisticVoiceFilter ?? true}
              onChange={(e) => updateSettings({ realisticVoiceFilter: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* 6. Auto-End When Audio Finishes */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-sm sm:text-base font-bold text-white">Auto-End When Voice Finishes</div>
            <div className="text-xs text-slate-400 mt-0.5">Automatically terminates call once voice message completes</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={settings.autoEndWhenAudioFinishes}
              onChange={(e) => updateSettings({ autoEndWhenAudioFinishes: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* 7. Vibration Pulses */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
              <Vibrate className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-white">Incoming Vibration Pulses</div>
              <div className="text-xs text-slate-400 mt-0.5">Rhythmic tactile haptic vibration while ringing</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={settings.vibrationEnabled}
              onChange={(e) => updateSettings({ vibrationEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        {/* 8. Auto-Answer Timer Delay */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/[0.08] lg:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Auto-Answer Timer Delay</span>
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Manual Answer Only', val: 0 },
              { label: 'Auto 3s', val: 3 },
              { label: 'Auto 5s', val: 5 },
              { label: 'Auto 10s', val: 10 }
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => updateSettings({ autoAnswerDelaySeconds: opt.val })}
                className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-xl border transition active:scale-95 ${settings.autoAnswerDelaySeconds === opt.val
                    ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 shadow-md ring-1 ring-emerald-500/40'
                    : 'border-white/[0.08] bg-slate-900/80 text-slate-400 hover:border-white/[0.15] hover:text-white'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

