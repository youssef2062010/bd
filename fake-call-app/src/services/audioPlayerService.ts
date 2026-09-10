import { RingtoneConfig, VoiceAudioConfig, audioSynthesizer, DEFAULT_SPEECH_TEXT, VoiceController } from '@fakecall/shared';

export interface AudioPlaybackState {
  isPlaying: boolean;
  isMuted: boolean;
  isSpeaker: boolean;
  currentTime: number;
  duration: number;
}

class AudioPlayerService {
  private ringtoneAudio: HTMLAudioElement | null = null;
  private voiceAudio: HTMLAudioElement | null = null;
  private syntheticVoiceController: VoiceController | null = null;
  private isMuted: boolean = false;
  private isSpeaker: boolean = false; // Default: earpiece mode
  private onVoiceEndCallback: (() => void) | null = null;
  private onProgressCallback: ((currentTime: number, duration: number) => void) | null = null;

  private audioContext: AudioContext | null = null;
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private speakerGainNode: GainNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private recorderDestinationNode: MediaStreamAudioDestinationNode | null = null;

  /**
   * Starts playing the configured ringtone automatically on startup.
   */
  public playRingtone(config: RingtoneConfig): void {
    this.stopRingtone();
    if (!config.enabled) return;

    if (config.uri.startsWith('synth:')) {
      const type = config.id || 'modern';
      audioSynthesizer.startRingtone(type, config.volume);
    } else {
      try {
        this.ringtoneAudio = new Audio(config.uri);
        this.ringtoneAudio.loop = true;
        this.ringtoneAudio.volume = Math.max(0, Math.min(1, config.volume));
        this.ringtoneAudio.play().catch((err) => {
          console.warn('Audio play restricted by browser policy; falling back to synthesizer on interaction', err);
          audioSynthesizer.startRingtone(config.id || 'modern', config.volume);
        });
      } catch {
        audioSynthesizer.startRingtone(config.id || 'modern', config.volume);
      }
    }
  }

  public stopRingtone(): void {
    audioSynthesizer.stopRingtone();
    if (this.ringtoneAudio) {
      try {
        this.ringtoneAudio.pause();
        this.ringtoneAudio.currentTime = 0;
      } catch { }
      this.ringtoneAudio = null;
    }
  }

  /**
   * Starts playing the caller's voice immediately when call is answered.
   * Begins in authentic phone earpiece mode.
   */
  public playVoice(
    voice: VoiceAudioConfig | null,
    onFinished: () => void,
    onProgress?: (currentTime: number, duration: number) => void,
    applyTelephoneFilter: boolean = true
  ): void {
    this.stopVoice();
    this.onVoiceEndCallback = onFinished;
    this.onProgressCallback = onProgress || null;
    this.isMuted = false;
    this.isSpeaker = false; // Start in earpiece mode

    // Initialize hardware routing to earpiece
    this.setSpeaker(false);

    // If custom audio file / data URI provided and not synth
    if (voice && voice.uri && !voice.uri.startsWith('synth:')) {
      try {
        this.voiceAudio = new Audio(voice.uri);
        this.voiceAudio.crossOrigin = 'anonymous';
        this.voiceAudio.muted = this.isMuted;
        this.voiceAudio.volume = 0.40;

        this.applyAudioOutputSink(false).catch(() => { });

        // Setup WebAudio graph for real speaker / earpiece dynamics
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          this.audioContext = new AudioCtx();
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => { });
          }

          this.sourceNode = this.audioContext.createMediaElementSource(this.voiceAudio);
          this.speakerGainNode = this.audioContext.createGain();
          this.speakerGainNode.gain.setValueAtTime(0.40, this.audioContext.currentTime);

          if (applyTelephoneFilter) {
            this.highpassFilter = this.audioContext.createBiquadFilter();
            this.highpassFilter.type = 'highpass';
            this.highpassFilter.frequency.setValueAtTime(380, this.audioContext.currentTime);

            this.lowpassFilter = this.audioContext.createBiquadFilter();
            this.lowpassFilter.type = 'lowpass';
            this.lowpassFilter.frequency.setValueAtTime(3400, this.audioContext.currentTime);

            this.sourceNode.connect(this.highpassFilter);
            this.highpassFilter.connect(this.lowpassFilter);
            this.lowpassFilter.connect(this.speakerGainNode);
          } else {
            this.sourceNode.connect(this.speakerGainNode);
          }

          this.speakerGainNode.connect(this.audioContext.destination);

          if (this.recorderDestinationNode) {
            try {
              this.speakerGainNode.connect(this.recorderDestinationNode);
            } catch (err) {
              console.warn('Could not connect speaker gain node to recorder destination:', err);
            }
          }
        } catch (e) {
          console.warn('WebAudio routing fallback', e);
        }

        this.voiceAudio.addEventListener('timeupdate', () => {
          if (this.voiceAudio && this.onProgressCallback) {
            this.onProgressCallback(this.voiceAudio.currentTime, this.voiceAudio.duration || (voice.durationMs / 1000));
          }
        });

        this.voiceAudio.addEventListener('ended', () => {
          this.handleVoiceEnded();
        });

        this.voiceAudio.addEventListener('error', () => {
          console.warn('Voice audio file failed to load; using graceful synthesized speech fallback');
          this.playFallbackVoice();
        });

        this.voiceAudio.play().catch((err) => {
          console.warn('Voice audio playback prevented:', err);
          this.playFallbackVoice();
        });
        return;
      } catch (err) {
        console.warn('Voice Audio instantiation error, falling back', err);
      }
    }

    // Default or Fallback: SpeechSynthesis / Tone Synthesizer
    this.playFallbackVoice();
  }

  private playFallbackVoice(): void {
    const text: string = String(DEFAULT_SPEECH_TEXT ?? '');
    if (!text.trim()) {
      return;
    }
    const estDuration = 12.0;

    this.syntheticVoiceController = audioSynthesizer.playSynthesizedVoice(
      text,
      () => {
        this.handleVoiceEnded();
      },
      (progress) => {
        if (this.onProgressCallback) {
          this.onProgressCallback(progress * estDuration, estDuration);
        }
      }
    );

    if (this.syntheticVoiceController) {
      this.syntheticVoiceController.setMuted(this.isMuted);
      this.syntheticVoiceController.setSpeaker(this.isSpeaker);
    }
  }

  private handleVoiceEnded(): void {
    if (this.onVoiceEndCallback) {
      const cb = this.onVoiceEndCallback;
      this.onVoiceEndCallback = null;
      cb();
    }
  }

  /**
   * Mute / Unmute the ongoing call:
   * When muted: Audio stops immediately and completely (silence / tskot).
   * When unmuted: Audio continues from where it stopped (tkml).
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;

    // 1. Direct HTMLAudioElement mute & pause/play
    if (this.voiceAudio) {
      this.voiceAudio.muted = muted;
      if (muted) {
        this.voiceAudio.pause();
      } else {
        this.voiceAudio.play().catch(() => { });
      }
    }

    // 2. WebAudio DSP Gain Node mute
    if (this.audioContext) {
      if (!muted && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => { });
      }

      if (this.speakerGainNode) {
        const now = this.audioContext.currentTime;
        const targetGain = muted ? 0.0 : (this.isSpeaker ? 1.0 : 0.40);
        this.speakerGainNode.gain.cancelScheduledValues(now);
        this.speakerGainNode.gain.setValueAtTime(targetGain, now);
      }
    }

    // 3. Synthetic voice controller pause / resume
    if (this.syntheticVoiceController) {
      this.syntheticVoiceController.setMuted(muted);
    }
  }

  /**
   * Toggles between Speakerphone (loud, clear, wide) and Earpiece (intimate, telephone filtered, receiver volume).
   */
  public setSpeaker(speaker: boolean): void {
    this.isSpeaker = speaker;

    // 1. Native Android Bridge (setCommunicationDevice / isSpeakerphoneOn)
    const androidBridge = (typeof window !== 'undefined'
      ? (window as unknown as { FakeCallAndroidBridge?: { setSpeakerphone?: (enabled: boolean) => void } }).FakeCallAndroidBridge
      : undefined);
    androidBridge?.setSpeakerphone?.(speaker);

    // 2. Native iOS Bridge (AVAudioSession.overrideOutputAudioPort)
    if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.fakeCallStorage) {
      try {
        (window as any).webkit.messageHandlers.fakeCallStorage.postMessage({
          action: 'SET_SPEAKER',
          speaker: speaker
        });
      } catch (e) {
        console.warn('iOS audio routing message failed:', e);
      }
    }

    // 3. Modern browser setSinkId routing
    this.applyAudioOutputSink(speaker).catch(() => { });

    // 4. Adjust direct HTMLAudioElement volume
    if (this.voiceAudio) {
      this.voiceAudio.volume = this.isMuted ? 0.0 : (speaker ? 1.0 : 0.40);
    }

    // 5. Adjust WebAudio DSP nodes (frequency EQ and acoustic gain)
    if (this.audioContext) {
      const now = this.audioContext.currentTime;
      const targetGain = this.isMuted ? 0.0 : (speaker ? 1.0 : 0.40);

      if (this.speakerGainNode) {
        this.speakerGainNode.gain.cancelScheduledValues(now);
        this.speakerGainNode.gain.linearRampToValueAtTime(targetGain, now + 0.06);
      }

      if (this.highpassFilter) {
        this.highpassFilter.frequency.cancelScheduledValues(now);
        this.highpassFilter.frequency.linearRampToValueAtTime(speaker ? 80 : 380, now + 0.06);
      }

      if (this.lowpassFilter) {
        this.lowpassFilter.frequency.cancelScheduledValues(now);
        this.lowpassFilter.frequency.linearRampToValueAtTime(speaker ? 18000 : 3400, now + 0.06);
      }
    }

    // 6. Adjust synthetic speech if active
    if (this.syntheticVoiceController) {
      this.syntheticVoiceController.setSpeaker(speaker);
    }
  }

  /**
   * Dynamically routes HTMLMediaElement output to earpiece receiver vs loudspeaker if supported.
   */
  private async applyAudioOutputSink(isSpeaker: boolean): Promise<void> {
    if (!this.voiceAudio || typeof (this.voiceAudio as any).setSinkId !== 'function') return;
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter((d) => d.kind === 'audiooutput');
        if (outputs.length > 0) {
          if (isSpeaker) {
            const speakerDev = outputs.find((d) => /speaker|loudspeaker/i.test(d.label)) || outputs[0];
            await (this.voiceAudio as any).setSinkId(speakerDev.deviceId);
          } else {
            const earpieceDev = outputs.find((d) => /earpiece|receiver|phone|handset/i.test(d.label));
            if (earpieceDev) {
              await (this.voiceAudio as any).setSinkId(earpieceDev.deviceId);
            }
          }
        }
      }
    } catch {
      // Ignored if browser permissions or sandboxing restrict sink ID access
    }
  }

  public stopVoice(): void {
    if (this.syntheticVoiceController) {
      this.syntheticVoiceController.stop();
      this.syntheticVoiceController = null;
    }
    if (this.voiceAudio) {
      try {
        this.voiceAudio.pause();
        this.voiceAudio.currentTime = 0;
      } catch { }
      this.voiceAudio = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch { }
      this.sourceNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close().catch(() => { });
      } catch { }
      this.audioContext = null;
    }
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.speakerGainNode = null;
    this.onVoiceEndCallback = null;
    this.onProgressCallback = null;

    // Reset native mobile audio routing
    const androidBridge = (typeof window !== 'undefined'
      ? (window as unknown as { FakeCallAndroidBridge?: { resetAudioMode?: () => void } }).FakeCallAndroidBridge
      : undefined);
    androidBridge?.resetAudioMode?.();

    if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.fakeCallStorage) {
      try {
        (window as any).webkit.messageHandlers.fakeCallStorage.postMessage({
          action: 'RESET_AUDIO'
        });
      } catch { }
    }
  }

  public setRecorderDestination(node: MediaStreamAudioDestinationNode | null): void {
    this.recorderDestinationNode = node;
    if (this.speakerGainNode && node) {
      try {
        this.speakerGainNode.connect(node);
      } catch (e) {
        console.warn('Failed to connect speaker gain node to recorder destination:', e);
      }
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public getSpeakerGainNode(): GainNode | null {
    return this.speakerGainNode;
  }

  public stopAll(): void {
    this.stopRingtone();
    this.stopVoice();
  }
}

export const audioPlayerService = new AudioPlayerService();

