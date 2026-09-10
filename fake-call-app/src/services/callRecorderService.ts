import { CallRecordingItem, sharedStorage } from '@fakecall/shared';
import { audioPlayerService } from './audioPlayerService';

class CallRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime: number | null = null;
  private timerInterval: number | null = null;
  private currentDuration: number = 0;
  private micStream: MediaStream | null = null;
  private activeItemMeta: { callerName: string; callerPhone: string; callerImage?: string } | null = null;
  private durationListeners: Set<(seconds: number) => void> = new Set();
  private statusListeners: Set<(isRecording: boolean) => void> = new Set();
  private lastCompletedRecording: CallRecordingItem | null = null;

  private mixerContext: AudioContext | null = null;
  private destNode: MediaStreamAudioDestinationNode | null = null;
  private carrierGain: GainNode | null = null;
  private carrierOsc: OscillatorNode | null = null;

  public isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  public getDuration(): number {
    return this.currentDuration;
  }

  public getLastRecording(): CallRecordingItem | null {
    return this.lastCompletedRecording;
  }

  public subscribeStatus(callback: (isRecording: boolean) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.isRecording());
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public subscribeDuration(callback: (seconds: number) => void): () => void {
    this.durationListeners.add(callback);
    callback(this.currentDuration);
    return () => {
      this.durationListeners.delete(callback);
    };
  }

  private notifyStatus(isRec: boolean): void {
    this.statusListeners.forEach((fn) => {
      try {
        fn(isRec);
      } catch (err) {
        console.error('Status listener error:', err);
      }
    });
  }

  private notifyDuration(secs: number): void {
    this.durationListeners.forEach((fn) => {
      try {
        fn(secs);
      } catch (err) {
        console.error('Duration listener error:', err);
      }
    });
  }

  /**
   * Starts recording the live call with real audio capture.
   * Mixes caller voice audio with the user's microphone (if permitted).
   */
  public async startRecording(
    callerName: string,
    callerPhone: string,
    callerImage?: string
  ): Promise<boolean> {
    if (this.isRecording()) {
      return true;
    }

    this.activeItemMeta = { callerName, callerPhone, callerImage };
    this.recordedChunks = [];
    this.currentDuration = 0;

    try {
      // 1. Setup AudioContext & MediaStreamDestination for mixing
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.mixerContext = new AudioCtx();
      if (this.mixerContext.state === 'suspended') {
        await this.mixerContext.resume().catch(() => { });
      }

      this.destNode = this.mixerContext.createMediaStreamDestination();

      // 2. Add an ultra-low sub-audible carrier tone so the audio stream track stays continuously active
      try {
        this.carrierOsc = this.mixerContext.createOscillator();
        this.carrierGain = this.mixerContext.createGain();
        this.carrierGain.gain.setValueAtTime(0.00001, this.mixerContext.currentTime);
        this.carrierOsc.connect(this.carrierGain);
        this.carrierGain.connect(this.destNode);
        this.carrierOsc.start();
      } catch (e) {
        console.warn('Carrier tone initialization:', e);
      }

      // 3. Connect caller voice from AudioPlayerService
      audioPlayerService.setRecorderDestination(this.destNode);

      // 4. Optionally capture user's microphone for 2-way call conversation
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          const micSource = this.mixerContext.createMediaStreamSource(this.micStream);
          micSource.connect(this.destNode);
        }
      } catch (micErr) {
        console.info('Microphone not available or denied; recording caller voice directly:', micErr);
      }

      // 5. Setup MediaRecorder with best supported mimeType
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/aac'
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const stream = this.destNode.stream;
      this.mediaRecorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(250); // Slice data every 250ms
      this.recordingStartTime = Date.now();

      // Start duration ticker
      if (this.timerInterval !== null) {
        clearInterval(this.timerInterval);
      }
      this.timerInterval = window.setInterval(() => {
        this.currentDuration += 1;
        this.notifyDuration(this.currentDuration);
      }, 1000);

      this.notifyStatus(true);
      return true;
    } catch (err) {
      console.error('Failed to start call recording:', err);
      this.cleanupMixer();
      this.notifyStatus(false);
      return false;
    }
  }

  /**
   * Stops recording, encodes the final audio blob, and saves to offline persistent archive.
   */
  public async stopRecording(): Promise<CallRecordingItem | null> {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Detach recorder destination from audio player
    audioPlayerService.setRecorderDestination(null);

    // Stop microphone stream tracks
    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => track.stop());
      } catch { }
      this.micStream = null;
    }

    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      this.notifyStatus(false);
      this.cleanupMixer();
      return this.lastCompletedRecording;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const mime = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        const finalDuration = Math.max(1, this.currentDuration);

        // Convert Blob to Base64 Data URL for persistent offline storage
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64DataUri = (reader.result as string) || '';
          const date = new Date();
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
          const cleanCaller = (this.activeItemMeta?.callerName || 'Caller').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
          const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
          const fileName = `Call_${cleanCaller}_${dateStr}.${ext}`;

          const sizeKb = Math.round(blob.size / 1024);
          const fileSizeText = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb || 1} KB`;

          const item: CallRecordingItem = {
            id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            callerName: this.activeItemMeta?.callerName || '',
            callerPhone: this.activeItemMeta?.callerPhone || '',
            callerImage: this.activeItemMeta?.callerImage,
            timestamp: Date.now(),
            durationSeconds: finalDuration,
            audioDataUri: base64DataUri,
            fileName,
            fileSizeText,
            mimeType: mime
          };

          this.lastCompletedRecording = item;

          // Auto-save to shared storage
          try {
            await sharedStorage.saveRecording(item);
          } catch (storageErr) {
            console.error('Error saving recording to persistent storage:', storageErr);
          }

          this.cleanupMixer();
          this.notifyStatus(false);
          resolve(item);
        };

        reader.onerror = () => {
          this.cleanupMixer();
          this.notifyStatus(false);
          resolve(null);
        };

        reader.readAsDataURL(blob);
      };

      try {
        this.mediaRecorder.stop();
      } catch (stopErr) {
        console.warn('MediaRecorder stop error:', stopErr);
        this.cleanupMixer();
        this.notifyStatus(false);
        resolve(null);
      }
    });
  }

  private cleanupMixer(): void {
    if (this.carrierOsc) {
      try {
        this.carrierOsc.stop();
        this.carrierOsc.disconnect();
      } catch { }
      this.carrierOsc = null;
    }
    if (this.carrierGain) {
      try {
        this.carrierGain.disconnect();
      } catch { }
      this.carrierGain = null;
    }
    if (this.mixerContext && this.mixerContext.state !== 'closed') {
      try {
        this.mixerContext.close().catch(() => { });
      } catch { }
      this.mixerContext = null;
    }
    this.destNode = null;
    this.mediaRecorder = null;
  }

  /**
   * Downloads or saves the recording directly to mobile device storage.
   * Utilizes native Web Share API on mobile (iOS "Save to Files" / Android Downloads)
   * with seamless fallback to direct browser anchor file download.
   */
  public async downloadRecording(item: CallRecordingItem): Promise<{
    success: boolean;
    method: 'share' | 'download';
    message: string;
  }> {
    try {
      const res = await fetch(item.audioDataUri);
      const blob = await res.blob();
      const file = new File([blob], item.fileName, { type: item.mimeType || 'audio/webm' });

      // 1. Mobile Web Share API: Triggers native iOS / Android Save to Files modal
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: item.fileName,
            text: `Call Recording with ${item.callerName} (${item.callerPhone})`
          });
          return {
            success: true,
            method: 'share',
            message: 'Saved via mobile share sheet'
          };
        } catch (shareErr: unknown) {
          if (shareErr instanceof Error && shareErr.name === 'AbortError') {
            return {
              success: false,
              method: 'share',
              message: 'Share dismissed'
            };
          }
        }
      }

      // 2. Direct File Download into Mobile / Desktop Downloads folder
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 500);

      return {
        success: true,
        method: 'download',
        message: 'Downloaded directly to device storage'
      };
    } catch (err) {
      console.error('Error downloading recording file:', err);
      return {
        success: false,
        method: 'download',
        message: 'Download failed'
      };
    }
  }
}

export const callRecorderService = new CallRecorderService();
