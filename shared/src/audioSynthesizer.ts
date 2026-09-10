/**
 * Audio Synthesizer and WebAudio Engine for Fake Call Simulator.
 * Provides offline ringtones, DTMF tones, synthesized fallback speech, and audio helpers.
 */
export interface VoiceController {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setMuted: (muted: boolean) => void;
  setSpeaker: (speaker: boolean) => void;
}

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: number | null = null;
  private isRinging: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioContextClass = typeof window !== 'undefined'
        ? (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
        : (globalThis as any).AudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx!;
  }

  /**
   * Plays a single DTMF keypad dual-tone (0-9, *, #)
   */
  public playDtmf(key: string, durationMs: number = 180): void {
    try {
      const ctx = this.getContext();
      const frequencies: Record<string, [number, number]> = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
      };

      const freqs = frequencies[key] || [440, 480];
      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
      gainNode.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.frequency.setValueAtTime(freqs[0], now);
      osc2.frequency.setValueAtTime(freqs[1], now);
      osc1.connect(gainNode);
      osc2.connect(gainNode);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + durationMs / 1000);
      osc2.stop(now + durationMs / 1000);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  /**
   * Starts playing a synthesized ringtone continuously until stopRingtone() is called.
   */
  public startRingtone(ringtoneId: string, volume: number = 0.8): void {
    this.stopRingtone();
    this.isRinging = true;

    const playCycle = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        if (ringtoneId === 'classic') {
          // Classic dual-frequency telephone bell (440Hz + 480Hz modulated with 20Hz ringer)
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.2 * volume, now);
          gain.gain.setValueAtTime(0.2 * volume, now + 1.8);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.95);
          gain.connect(ctx.destination);

          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(480, now);
          osc1.connect(gain);
          osc2.connect(gain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.95);
          osc2.stop(now + 1.95);
        } else if (ringtoneId === 'radar') {
          // High-tech pulse sonar
          [0, 0.4, 0.8].forEach((offset) => {
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.18 * volume, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.32);
            gain.connect(ctx.destination);

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now + offset);
            osc.frequency.exponentialRampToValueAtTime(1320, now + offset + 0.3);
            osc.connect(gain);
            osc.start(now + offset);
            osc.stop(now + offset + 0.32);
          });
        } else if (ringtoneId === 'chime') {
          // Gentle marimba/chime chord progression (C5 - E5 - G5 - C6)
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const noteStart = now + idx * 0.18;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.22 * volume, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.6);
            gain.connect(ctx.destination);

            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, noteStart);
            osc.connect(gain);
            osc.start(noteStart);
            osc.stop(noteStart + 0.6);
          });
        } else {
          // Default 'modern' crisp marimba rhythmic ringtone
          const melody = [
            { f: 587.33, d: 0.14, t: 0.0 },  // D5
            { f: 783.99, d: 0.14, t: 0.16 }, // G5
            { f: 880.00, d: 0.14, t: 0.32 }, // A5
            { f: 1046.5, d: 0.22, t: 0.48 }, // C6
            { f: 880.00, d: 0.18, t: 0.80 }, // A5
            { f: 1174.66, d: 0.35, t: 1.05 } // D6
          ];

          melody.forEach((note) => {
            const noteStart = now + note.t;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.25 * volume, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + note.d + 0.1);
            gain.connect(ctx.destination);

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(note.f, noteStart);
            osc.connect(gain);
            osc.start(noteStart);
            osc.stop(noteStart + note.d + 0.1);
          });
        }
      } catch {
        // Safe fallback
      }
    };

    // Play first iteration immediately
    playCycle();
    // Repeat every 3.2 seconds
    this.ringtoneInterval = window.setInterval(playCycle, 3200);
  }

  public stopRingtone(): void {
    this.isRinging = false;
    if (this.ringtoneInterval !== null) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  /**
   * Synthesize spoken speech voice using SpeechSynthesis (if available) or AudioContext voice tones.
   * Returns a complete VoiceController for pause, resume, mute, and speaker routing.
   */
  public playSynthesizedVoice(
    text: string,
    onEnded?: () => void,
    onProgress?: (progress: number) => void
  ): VoiceController {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      // Split text into natural sentence fragments for resilient pause/resume
      const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [text];

      let currentIndex = 0;
      let isStopped = false;
      let isPaused = false;
      let isMuted = false;
      let isSpeaker = false;

      let accumulatedElapsedMs = 0;
      let lastResumeTime = Date.now();
      let timer: number | null = null;
      const estimatedDurationMs = Math.max(3000, text.split(' ').length * 360);

      const startProgressTimer = () => {
        if (timer) clearInterval(timer);
        lastResumeTime = Date.now();
        timer = window.setInterval(() => {
          if (isPaused || isStopped) return;
          const currentElapsed = accumulatedElapsedMs + (Date.now() - lastResumeTime);
          const pct = Math.min(1, currentElapsed / estimatedDurationMs);
          if (onProgress) onProgress(pct);
          if (pct >= 1 && timer) {
            clearInterval(timer);
            timer = null;
          }
        }, 100);
      };

      const pauseProgressTimer = () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        accumulatedElapsedMs += Date.now() - lastResumeTime;
      };

      const speakCurrentSentence = () => {
        if (isStopped || isPaused) return;

        if (currentIndex >= sentences.length) {
          if (timer) clearInterval(timer);
          if (onProgress) onProgress(1);
          if (onEnded) onEnded();
          return;
        }

        const sentenceText = sentences[currentIndex];
        const utterance = new SpeechSynthesisUtterance(sentenceText);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = isMuted ? 0.0 : (isSpeaker ? 1.0 : 0.40);

        utterance.onend = () => {
          if (isStopped || isPaused) return;
          currentIndex++;
          speakCurrentSentence();
        };

        utterance.onerror = () => {
          if (isStopped || isPaused) return;
          currentIndex++;
          speakCurrentSentence();
        };

        window.speechSynthesis.speak(utterance);
      };

      startProgressTimer();
      speakCurrentSentence();

      const controller: VoiceController = {
        stop: () => {
          isStopped = true;
          isPaused = true;
          if (timer) clearInterval(timer);
          try {
            window.speechSynthesis.cancel();
          } catch {}
        },
        pause: () => {
          if (isPaused || isStopped) return;
          isPaused = true;
          pauseProgressTimer();
          try {
            window.speechSynthesis.cancel();
          } catch {}
        },
        resume: () => {
          if (!isPaused || isStopped) return;
          isPaused = false;
          startProgressTimer();
          speakCurrentSentence();
        },
        setMuted: (muted: boolean) => {
          isMuted = muted;
          if (muted) {
            controller.pause();
          } else {
            controller.resume();
          }
        },
        setSpeaker: (speaker: boolean) => {
          isSpeaker = speaker;
        }
      };

      return controller;
    }

    // In Node.js / test environments without Web Audio
    if (typeof window === 'undefined' && typeof (globalThis as any).AudioContext === 'undefined') {
      const mockController: VoiceController = {
        stop: () => { onEnded?.(); },
        pause: () => {},
        resume: () => {},
        setMuted: () => {},
        setSpeaker: () => {}
      };
      return mockController;
    }

    // WebAudio simulated speech formant chatter fallback with full control
    const ctx = this.getContext();
    const durationSec = 10.0;
    let accumulatedElapsedMs = 0;
    let lastResumeTime = Date.now();
    let isStopped = false;
    let isPaused = false;
    let isMuted = false;
    let isSpeaker = false;
    let progressTimer: number | null = null;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.connect(masterGain);
    try {
      osc.start();
    } catch {}

    const startTimer = () => {
      if (progressTimer) clearInterval(progressTimer);
      lastResumeTime = Date.now();
      progressTimer = window.setInterval(() => {
        if (isPaused || isStopped) return;
        const elapsed = accumulatedElapsedMs + (Date.now() - lastResumeTime);
        const pct = Math.min(1, elapsed / (durationSec * 1000));
        if (onProgress) onProgress(pct);
        if (pct >= 1) {
          controller.stop();
          if (onEnded) onEnded();
        }
      }, 100);
    };

    startTimer();

    const controller: VoiceController = {
      stop: () => {
        isStopped = true;
        isPaused = true;
        if (progressTimer) clearInterval(progressTimer);
        try {
          masterGain.gain.setValueAtTime(0, ctx.currentTime);
          osc.stop();
          osc.disconnect();
        } catch {}
      },
      pause: () => {
        if (isPaused || isStopped) return;
        isPaused = true;
        if (progressTimer) clearInterval(progressTimer);
        accumulatedElapsedMs += Date.now() - lastResumeTime;
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
      },
      resume: () => {
        if (!isPaused || isStopped) return;
        isPaused = false;
        const target = isMuted ? 0 : (isSpeaker ? 0.18 : 0.08);
        masterGain.gain.setValueAtTime(target, ctx.currentTime);
        startTimer();
      },
      setMuted: (muted: boolean) => {
        isMuted = muted;
        if (muted) {
          controller.pause();
        } else {
          controller.resume();
        }
      },
      setSpeaker: (speaker: boolean) => {
        isSpeaker = speaker;
        if (!isPaused && !isMuted) {
          masterGain.gain.setValueAtTime(speaker ? 0.18 : 0.08, ctx.currentTime);
        }
      }
    };

    return controller;
  }
}

export const audioSynthesizer = new AudioSynthesizer();

