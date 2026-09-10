import React, { useState, useRef } from 'react';
import { FakeCallConfig, RINGTONE_PRESETS, audioSynthesizer } from '@fakecall/shared';
import { Bell, Volume2, Play, Square, Upload, Music, Trash2 } from 'lucide-react';
import { mediaService } from '../services/mediaService';

interface RingtoneCardProps {
  config: FakeCallConfig;
  onChange: (updated: Partial<FakeCallConfig>) => void;
}

export const RingtoneCard: React.FC<RingtoneCardProps> = ({ config, onChange }) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const ringtoneFileInputRef = useRef<HTMLInputElement>(null);
  const customAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const currentRingtone = config.ringtone;
  const isCustom = currentRingtone.id === 'custom';

  const handleToggleEnabled = () => {
    stopPreview();
    onChange({
      ringtone: {
        ...currentRingtone,
        enabled: !currentRingtone.enabled
      }
    });
  };

  const handleSelectPreset = (id: string) => {
    stopPreview();
    const preset = RINGTONE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    onChange({
      ringtone: {
        ...preset,
        enabled: currentRingtone.enabled,
        volume: currentRingtone.volume
      }
    });
  };

  const handleUploadRingtone = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      stopPreview();
      const voiceConfig = await mediaService.processAudioFile(file);
      onChange({
        ringtone: {
          id: 'custom',
          name: file.name.replace(/\.[^/.]+$/, ''),
          uri: voiceConfig.uri,
          enabled: true,
          volume: currentRingtone.volume
        }
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ringtone upload failed.');
    }
  };

  const handleDeleteCustomRingtone = () => {
    stopPreview();
    handleSelectPreset('modern');
  };

  const handleVolumeChange = (vol: number) => {
    onChange({
      ringtone: {
        ...currentRingtone,
        volume: vol
      }
    });
    if (customAudioPlayerRef.current) {
      customAudioPlayerRef.current.volume = vol;
    }
  };

  const togglePreview = () => {
    if (isPlayingPreview) {
      stopPreview();
      return;
    }

    if (isCustom && currentRingtone.uri) {
      try {
        const audio = new Audio(currentRingtone.uri);
        customAudioPlayerRef.current = audio;
        audio.volume = currentRingtone.volume;
        audio.loop = true;
        audio.onended = () => setIsPlayingPreview(false);
        audio.onerror = () => setIsPlayingPreview(false);
        audio.play().then(() => setIsPlayingPreview(true)).catch(() => setIsPlayingPreview(false));
      } catch {
        setIsPlayingPreview(false);
      }
    } else {
      audioSynthesizer.startRingtone(currentRingtone.id, currentRingtone.volume);
      setIsPlayingPreview(true);
    }
  };

  const stopPreview = () => {
    if (customAudioPlayerRef.current) {
      customAudioPlayerRef.current.pause();
      customAudioPlayerRef.current = null;
    }
    audioSynthesizer.stopRingtone();
    setIsPlayingPreview(false);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-2xl transition-all">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Ringtone & Audio Chime
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Upload custom ringtone audio or select from authentic system chimes
            </p>
          </div>
        </div>

        {/* Enable / Disable Toggle */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-300">
            {currentRingtone.enabled ? 'Ringtone Active' : 'Muted'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={currentRingtone.enabled}
              onChange={handleToggleEnabled}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Custom Uploaded Ringtone Card */}
      {isCustom && (
        <div className="bg-slate-950/80 rounded-2xl border border-blue-500/40 p-5 mb-6 shadow-xl shadow-blue-950/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
                <Music className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-white">{currentRingtone.name}</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400">
                    Custom Ringtone
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Plays through speakers or headphones when the fake call rings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => ringtoneFileInputRef.current?.click()}
                className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/[0.08] transition active:scale-95"
              >
                Change File
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomRingtone}
                className="h-9 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition active:scale-95"
                title="Remove Custom Ringtone"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ringtone Presets Selector */}
      <div className="mb-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
          Available Sound Presets:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RINGTONE_PRESETS.map((preset) => {
            const isSelected = !isCustom && currentRingtone.id === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all active:scale-95 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/50 text-white shadow-md shadow-blue-950/40 ring-1 ring-blue-500/40'
                    : 'border-white/[0.08] bg-slate-950/70 text-slate-400 hover:border-white/[0.15] hover:text-white'
                }`}
              >
                <div>
                  <div className="text-sm font-bold">{preset.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">High-fidelity chime</div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-blue-500 bg-blue-500/20' : 'border-slate-700'
                  }`}
                >
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Custom Ringtone Button */}
      <input
        ref={ringtoneFileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleUploadRingtone}
      />
      <div className="mb-6">
        <button
          type="button"
          onClick={() => ringtoneFileInputRef.current?.click()}
          className="h-12 w-full rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 hover:text-blue-200 border border-blue-500/30 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Custom Ringtone File (.mp3, .wav, .m4a)</span>
        </button>
      </div>

      {/* Preview & Volume Slider Toolbar */}
      <div className="bg-slate-950/80 rounded-2xl border border-white/[0.08] p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
        {/* Preview Button */}
        <button
          type="button"
          onClick={togglePreview}
          disabled={!currentRingtone.enabled}
          className={`h-11 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition active:scale-95 ${
            !currentRingtone.enabled
              ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
              : isPlayingPreview
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/60'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/60'
          }`}
        >
          {isPlayingPreview ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Preview</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Preview Selected Ringtone</span>
            </>
          )}
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-3.5 w-full sm:w-72">
          <Volume2 className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={currentRingtone.volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono font-bold text-slate-200 w-12 text-right shrink-0">
            {Math.round(currentRingtone.volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
