import React, { useState, useRef, useEffect } from 'react';
import { FakeCallConfig } from '@fakecall/shared';
import { Mic, Upload, Play, Square, Trash2, CheckCircle2, Volume2, Pause, Music2 } from 'lucide-react';
import { mediaService } from '../services/mediaService';

interface VoiceCardProps {
  config: FakeCallConfig;
  onChange: (updated: Partial<FakeCallConfig>) => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({ config, onChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopPreview();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      stopPreview();
      const voiceConfig = await mediaService.processAudioFile(file);
      onChange({ voiceAudio: voiceConfig });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Audio upload failed.');
    }
  };

  const handleStartRecording = async () => {
    try {
      stopPreview();
      await mediaService.startVoiceRecording();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is required to record voice.');
      console.error(err);
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    try {
      const voiceConfig = await mediaService.stopVoiceRecording();
      onChange({ voiceAudio: voiceConfig });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Recording upload failed.');
    }
  };

  const togglePreview = () => {
    if (isPlayingPreview) {
      stopPreview();
      return;
    }

    if (!config.voiceAudio?.uri) return;

    if (config.voiceAudio.uri.startsWith('synth:')) {
      setIsPlayingPreview(true);
      setPreviewProgress(0);
      const timer = setInterval(() => {
        setPreviewProgress((p) => {
          if (p >= 100) {
            clearInterval(timer);
            setIsPlayingPreview(false);
            return 0;
          }
          return p + 10;
        });
      }, 300);
      return;
    }

    try {
      const audio = new Audio(config.voiceAudio.uri);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPreviewProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlayingPreview(false);
        setPreviewProgress(0);
      };

      audio.onerror = () => {
        setIsPlayingPreview(false);
      };

      audio.play();
      setIsPlayingPreview(true);
    } catch {
      setIsPlayingPreview(false);
    }
  };

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPlayingPreview(false);
    setPreviewProgress(0);
  };

  const handleDeleteVoice = () => {
    stopPreview();
    onChange({ voiceAudio: null });
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-2xl transition-all">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Caller Voice Audio
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Exclusive audio track that plays through the receiver when the call is answered
            </p>
          </div>
        </div>

        {config.voiceAudio && (
          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Active Exclusive Voice</span>
          </span>
        )}
      </div>

      {/* Active Voice Card or Empty State */}
      {config.voiceAudio ? (
        <div className="bg-slate-950/80 rounded-2xl border border-white/[0.08] p-5 mb-6 shadow-inner">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={togglePreview}
                className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-950/60 transition active:scale-95 cursor-pointer"
                title={isPlayingPreview ? 'Pause Audio' : 'Play Audio'}
              >
                {isPlayingPreview ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-white">{config.voiceAudio.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300">
                    Active On Call
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
                  Duration: {formatSeconds(Math.round(config.voiceAudio.durationMs / 1000))} • Plays immediately upon answering
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/[0.08] transition active:scale-95"
              >
                Replace Audio
              </button>
              <button
                type="button"
                onClick={handleDeleteVoice}
                className="h-9 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition active:scale-95"
                title="Remove Voice Audio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Wave Bar */}
          {isPlayingPreview && (
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-100"
                  style={{ width: `${previewProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-950/60 rounded-2xl border border-dashed border-white/[0.1] p-8 text-center mb-6">
          <Music2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No voice audio added yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Record a voice note or upload an audio file (.mp3, .wav) to play when answered.
          </p>
        </div>
      )}

      {/* Action Controls: Record Voice & Select File */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Record Voice Button */}
        {isRecording ? (
          <button
            type="button"
            onClick={handleStopRecording}
            className="h-12 w-full rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/80 transition animate-pulse"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop Recording ({formatSeconds(recordingSeconds)})</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartRecording}
            className="h-12 w-full rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/30 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span>Record Voice Note Now</span>
          </button>
        )}

        {/* Upload Audio File */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleAudioUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-12 w-full rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/[0.08] font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Audio File (.mp3, .wav)</span>
        </button>
      </div>
    </div>
  );
};
