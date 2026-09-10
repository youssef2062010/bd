import React, { useRef, useState } from 'react';
import { FakeCallConfig, BrandingConfig } from '@fakecall/shared';
import {
  Smartphone,
  Upload,
  Check,
  Sparkles,
  Phone,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { mediaService } from '../services/mediaService';

interface BrandingCardProps {
  config: FakeCallConfig;
  onChange: (partial: Partial<FakeCallConfig>) => void;
}

interface IconPreset {
  id: string;
  name: string;
  badge?: string;
  type: 'image' | 'preset';
  src?: string;
  bgGradient?: string;
  icon?: 'phone' | 'sparkles';
}

const PRESET_ICONS: IconPreset[] = [
  {
    id: 'phone-green',
    name: 'Phone Green',
    badge: 'iOS Classic',
    type: 'preset',
    bgGradient: 'from-emerald-500 to-teal-600',
    icon: 'phone'
  },
  {
    id: 'phone-classic',
    name: 'Phone Blue',
    badge: 'Royal Blue',
    type: 'preset',
    bgGradient: 'from-blue-600 to-indigo-600',
    icon: 'phone'
  },
  {
    id: 'phone-dark',
    name: 'Stealth Dark',
    badge: 'Obsidian',
    type: 'preset',
    bgGradient: 'from-slate-700 to-slate-950',
    icon: 'phone'
  },
  {
    id: 'phone-gold',
    name: 'VIP Gold',
    badge: 'Luxury',
    type: 'preset',
    bgGradient: 'from-amber-400 to-yellow-600',
    icon: 'sparkles'
  }
];

export const BrandingCard: React.FC<BrandingCardProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const branding: BrandingConfig = config.branding || {
    appDisplayName: '',
    appIcon: '',
    customIconUri: ''
  };

  const currentDisplayName = branding.appDisplayName || '';
  const currentIconId = branding.appIcon || '';
  const currentCustomUri = branding.customIconUri;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextName = e.target.value.slice(0, 30);
    onChange({
      branding: {
        ...branding,
        appDisplayName: nextName
      }
    });
  };

  const handleSelectPreset = (preset: IconPreset) => {
    onChange({
      branding: {
        ...branding,
        appIcon: preset.id,
        customIconUri: ''
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploading(true);
    try {
      const uri = await mediaService.processImageFile(file);
      onChange({ branding: { ...branding, appIcon: 'custom', customIconUri: uri } });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Image upload failed.');
    } finally { setIsUploading(false); }
  };

  // Determine what icon image/preview to show
  const isCustomUpload = currentIconId === 'custom' && !!currentCustomUri;
  return (
    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 p-[2px] shadow-lg shadow-rose-500/25 shrink-0">
            <div className="w-full h-full bg-[#0c1220] rounded-[14px] flex items-center justify-center text-rose-400">
              <Smartphone className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                App Name & Launcher Logo
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                PWA Mobile Identity
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Change the name and app icon that appears on the mobile home screen and install page
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Synced to Database</span>
          </span>
        </div>
      </div>

      {/* Grid: Settings on Left, Mobile Home Screen Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Inputs & Icon Presets) - 7 cols */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* App Display Name Input */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>App Display Name</span>
                <span className="text-rose-400 font-normal">*</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {currentDisplayName.length}/30
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={currentDisplayName}
                onChange={handleNameChange}
                placeholder="Enter app name"
                maxLength={30}
                className="w-full h-12 px-4 rounded-xl bg-slate-950/70 border border-white/10 text-white font-bold text-base focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600"
              />
              {currentDisplayName && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <Check className="w-3 h-3" />
                  <span>Live</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              This exact text will appear under the app icon on the phone's home screen and in the title bar.
            </p>
          </div>

          {/* App Launcher Icon Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>App Launcher Icon / Logo</span>
              <span className="text-rose-400 font-normal">*</span>
            </label>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_ICONS.map((preset) => {
                const isSelected = currentIconId === preset.id && !currentCustomUri;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`relative p-3 rounded-2xl border text-left transition-all flex flex-col items-center gap-2.5 group active:scale-95 ${isSelected
                      ? 'bg-gradient-to-b from-emerald-500/15 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-950/50 border-white/10 hover:border-white/25 hover:bg-slate-950/80'
                      }`}
                  >
                    {/* Icon Container */}
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg p-0.5 relative shrink-0">
                      {preset.type === 'image' ? (
                        <img
                          src={preset.src}
                          alt={preset.name}
                          className="w-full h-full object-cover rounded-[14px]"
                        />
                      ) : (
                        <div
                          className={`w-full h-full rounded-[14px] bg-gradient-to-tr ${preset.bgGradient} flex items-center justify-center text-white shadow-inner`}
                        >
                          {preset.icon === 'sparkles' ? (
                            <Sparkles className="w-7 h-7 drop-shadow" />
                          ) : (
                            <Phone className="w-7 h-7 fill-current drop-shadow" />
                          )}
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-xs font-bold text-white leading-tight">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {preset.badge}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Custom Image Upload Card */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`relative p-3 rounded-2xl border text-left transition-all flex flex-col items-center justify-center gap-2.5 group active:scale-95 ${isCustomUpload
                  ? 'bg-gradient-to-b from-emerald-500/15 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-950/50 border-dashed border-white/20 hover:border-emerald-400 hover:bg-slate-950/80'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg p-0.5 relative shrink-0">
                  {isCustomUpload && currentCustomUri ? (
                    <img
                      src={currentCustomUri}
                      alt="Custom Icon"
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  ) : (
                    <div className="w-full h-full rounded-[14px] bg-slate-800/80 border border-white/10 flex flex-col items-center justify-center text-slate-400 group-hover:text-emerald-300">
                      <Upload className="w-6 h-6" />
                    </div>
                  )}

                  {isCustomUpload && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <div className="text-xs font-bold text-white leading-tight flex items-center justify-center gap-1">
                    <span>{isUploading ? 'Uploading...' : isCustomUpload ? 'Custom Active' : 'Upload Icon'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Any Image / Photo
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: High-Fidelity Mobile Home Screen Live Preview - 5 cols */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Phone Home Screen Preview</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">Pixel-Perfect</span>
          </label>

          {/* Smartphone Mockup Window */}
          <div className="w-full bg-[#080d19] border-2 border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
            {/* Ambient Wallpaper Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-purple-950/20 to-slate-950 pointer-events-none" />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Status Bar */}
            <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 px-3 pb-8 z-10">
              <span className="font-bold text-white">9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">5G</span>
                <span className="w-4 h-2 border border-slate-400 rounded-sm inline-block relative after:absolute after:inset-[1px] after:bg-white after:w-2" />
              </div>
            </div>

            {/* App Icon + App Label on Home Screen */}
            <div className="flex flex-col items-center gap-2 z-10 my-4 transform transition-transform hover:scale-105">
              {/* App Icon Squircle */}
              <div className="relative group cursor-pointer">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[22px] sm:rounded-[26px] overflow-hidden shadow-2xl border border-white/20 p-0.5 bg-gradient-to-tr from-white/20 to-transparent">
                  {currentCustomUri ? (
                    <img
                      src={currentCustomUri}
                      alt={currentDisplayName}
                      className="w-full h-full object-cover rounded-[20px] sm:rounded-[24px]"
                    />
                  ) : currentIconId ? (
                    <div
                      className={`w-full h-full rounded-[20px] sm:rounded-[24px] bg-gradient-to-tr ${PRESET_ICONS.find((p) => p.id === currentIconId)?.bgGradient ||
                        'from-emerald-500 to-teal-600'
                        } flex items-center justify-center text-white shadow-inner`}
                    >
                      {currentIconId === 'phone-gold' ? (
                        <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md" />
                      ) : (
                        <Phone className="w-10 h-10 sm:w-12 sm:h-12 fill-current drop-shadow-md" />
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-[20px] sm:rounded-[24px] bg-slate-800 flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                  )}
                </div>

                {/* Subtle gloss overlay */}
                <div className="absolute inset-0 rounded-[22px] sm:rounded-[26px] bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none" />
              </div>

              {/* App Label */}
              <div className="text-center max-w-[130px]">
                <span className="text-xs sm:text-sm font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-tight truncate block">
                  {currentDisplayName || 'App name'}
                </span>
              </div>
            </div>

            {/* Home indicator bar at bottom */}
            <div className="w-28 h-1 bg-white/30 rounded-full mt-8 z-10" />

            <div className="text-[11px] text-slate-400 text-center mt-3 z-10 font-medium">
              Real-time representation on iOS & Android
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
