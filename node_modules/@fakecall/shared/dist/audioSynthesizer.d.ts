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
declare class AudioSynthesizer {
    private ctx;
    private ringtoneInterval;
    private isRinging;
    private getContext;
    /**
     * Plays a single DTMF keypad dual-tone (0-9, *, #)
     */
    playDtmf(key: string, durationMs?: number): void;
    /**
     * Starts playing a synthesized ringtone continuously until stopRingtone() is called.
     */
    startRingtone(ringtoneId: string, volume?: number): void;
    stopRingtone(): void;
    /**
     * Synthesize spoken speech voice using SpeechSynthesis (if available) or AudioContext voice tones.
     * Returns a complete VoiceController for pause, resume, mute, and speaker routing.
     */
    playSynthesizedVoice(text: string, onEnded?: () => void, onProgress?: (progress: number) => void): VoiceController;
}
export declare const audioSynthesizer: AudioSynthesizer;
export {};
//# sourceMappingURL=audioSynthesizer.d.ts.map