import React, { useState, useEffect, useRef } from 'react';
import { CallRecordingItem, sharedStorage } from '@fakecall/shared';
import {
  CircleDot,
  Play,
  Pause,
  Download,
  Trash2,
  HardDrive,
  Clock,
  Phone,
  Smartphone,
  CheckCircle2,
  Volume2
} from 'lucide-react';

export const RecordingsCard: React.FC = () => {
  const [recordings, setRecordings] = useState<CallRecordingItem[]>([]);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    sharedStorage.getRecordings().then((list) => {
      setRecordings(list);
    });

    const unsubscribe = sharedStorage.subscribeRecordings((updated) => {
      setRecordings(updated);
    });

    return () => {
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = (item: CallRecordingItem) => {
    if (activePlayingId === item.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setActivePlayingId(null);
      setPlaybackTime(0);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(item.audioDataUri);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        setPlaybackTime(audio.currentTime);
      };

      audio.onended = () => {
        setActivePlayingId(null);
        setPlaybackTime(0);
      };

      audio.play().then(() => {
        setActivePlayingId(item.id);
      }).catch((e) => {
        console.warn('Playback error:', e);
      });
    }
  };

  const handleDownload = async (item: CallRecordingItem) => {
    try {
      const res = await fetch(item.audioDataUri);
      const blob = await res.blob();
      const file = new File([blob], item.fileName, { type: item.mimeType || 'audio/webm' });

      // Check Mobile Web Share API
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: item.fileName,
            text: `Call Recording with ${item.callerName} (${item.callerPhone})`
          });
          setToastMessage('Saved via Device Share Sheet');
          setTimeout(() => setToastMessage(null), 2500);
          return;
        } catch (e: unknown) {
          if (e instanceof Error && e.name === 'AbortError') return;
        }
      }

      // Standard direct file download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = item.fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 500);

      setToastMessage('Saved to Device Storage');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this call recording permanently?')) {
      if (activePlayingId === id && audioRef.current) {
        audioRef.current.pause();
        setActivePlayingId(null);
      }
      await sharedStorage.deleteRecording(id);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-2xl transition-all flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
            <CircleDot className="w-6 h-6 text-rose-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Call Recordings Archive
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {recordings.length} {recordings.length === 1 ? 'call' : 'calls'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Playback recorded live calls and save original audio files directly into your device storage
            </p>
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold animate-fade-in self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Recordings List */}
      {recordings.length === 0 ? (
        <div className="p-10 rounded-2xl bg-slate-950/60 border border-dashed border-white/[0.08] flex flex-col items-center justify-center text-center gap-3 text-slate-400">
          <Volume2 className="w-10 h-10 text-slate-600 mb-1" />
          <div className="text-base font-bold text-white">No recorded calls yet</div>
          <div className="text-xs sm:text-sm text-slate-500 max-w-md">
            Answer a simulated call with Auto-Record enabled, or tap the <strong className="text-rose-400">Record</strong> button during any live call. The audio will automatically appear here!
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {recordings.map((rec) => {
            const isThisPlaying = activePlayingId === rec.id;
            return (
              <div
                key={rec.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isThisPlaying
                    ? 'bg-rose-950/30 border-rose-500/50 shadow-xl shadow-rose-950/30'
                    : 'bg-slate-950/80 border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                {/* Left: Caller Info & Audio Control */}
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleTogglePlay(rec)}
                    aria-label={isThisPlaying ? 'Pause' : 'Play'}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-lg shrink-0 active:scale-95 cursor-pointer ${
                      isThisPlaying
                        ? 'bg-rose-600 text-white ring-4 ring-rose-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.08]'
                    }`}
                  >
                    {isThisPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-bold text-white truncate">
                        {rec.callerName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-white/[0.08]">
                        {rec.fileSizeText || 'Audio'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3.5 text-xs text-slate-400 font-mono mt-1 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {rec.callerPhone}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(rec.timestamp)}
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        {isThisPlaying
                          ? `${formatTimer(playbackTime)} / ${formatTimer(rec.durationSeconds)}`
                          : formatTimer(rec.durationSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleDownload(rec)}
                    className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition"
                  >
                    <Smartphone className="w-4 h-4" />
                    <Download className="w-4 h-4" />
                    <span>Save to Device</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(rec.id)}
                    aria-label="Delete recording"
                    className="h-10 px-3 rounded-xl bg-slate-850 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-white/[0.08] transition active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-white/[0.08]">
        <span className="flex items-center gap-1.5">
          <HardDrive className="w-4 h-4" />
          Offline Persistent Archive (LocalStorage & IndexedDB)
        </span>
        <span>Auto-synced across devices</span>
      </div>
    </div>
  );
};
