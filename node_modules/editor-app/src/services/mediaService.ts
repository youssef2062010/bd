import { upload } from '@vercel/blob/client';
import { VoiceAudioConfig } from '@fakecall/shared';

export interface PresetAvatar {
  id: string;
  name: string;
  url: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'ahmed',
    name: 'Ahmed Mohamed',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%233b82f6"/><stop offset="100%" stop-color="%238b5cf6"/></linearGradient></defs><rect width="240" height="240" rx="120" fill="url(%23g1)"/><circle cx="120" cy="95" r="42" fill="%23fcd34d"/><path d="M120 54c-22 0-38 14-38 32 0 4 2 8 5 11 3-12 14-21 28-21s26 9 28 21c3-3 5-7 5-11 0-18-16-32-38-32z" fill="%231e293b"/><path d="M120 152c-38 0-70 20-80 50 16 26 46 38 80 38s64-12 80-38c-10-30-42-50-80-50z" fill="%230f172a"/><circle cx="106" cy="95" r="4" fill="%231e293b"/><circle cx="134" cy="95" r="4" fill="%231e293b"/></svg>`
  },
  {
    id: 'sarah',
    name: 'Sarah Jenkins',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23ec4899"/><stop offset="100%" stop-color="%23f43f5e"/></linearGradient></defs><rect width="240" height="240" rx="120" fill="url(%23g2)"/><circle cx="120" cy="95" r="40" fill="%23fde047"/><path d="M75 90c0-30 20-50 45-50s45 20 45 50v40H75z" fill="%2392400e"/><circle cx="120" cy="95" r="36" fill="%23fef08a"/><path d="M120 152c-38 0-70 20-80 50 16 26 46 38 80 38s64-12 80-38c-10-30-42-50-80-50z" fill="%23831843"/><circle cx="106" cy="95" r="4" fill="%231e293b"/><circle cx="134" cy="95" r="4" fill="%231e293b"/></svg>`
  },
  {
    id: 'boss',
    name: 'Executive Boss',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%23334155"/></linearGradient></defs><rect width="240" height="240" rx="120" fill="url(%23g3)"/><circle cx="120" cy="90" r="40" fill="%23fed7aa"/><path d="M85 75c0-25 15-40 35-40s35 15 35 40v15H85z" fill="%23cbd5e1"/><path d="M120 148c-38 0-70 20-80 50 16 26 46 42 80 42s64-16 80-42c-10-30-42-50-80-50z" fill="%231e293b"/><polygon points="120,150 112,185 120,230 128,185" fill="%23ef4444"/><circle cx="106" cy="90" r="4" fill="%230f172a"/><circle cx="134" cy="90" r="4" fill="%230f172a"/></svg>`
  },
  {
    id: 'doctor',
    name: 'Hospital / Clinic',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%2306b6d4"/><stop offset="100%" stop-color="%230284c7"/></linearGradient></defs><rect width="240" height="240" rx="120" fill="url(%23g4)"/><circle cx="120" cy="95" r="42" fill="%23fed7aa"/><path d="M120 152c-38 0-70 20-80 50 16 26 46 38 80 38s64-12 80-38c-10-30-42-50-80-50z" fill="%23f8fafc"/><rect x="112" y="70" width="16" height="40" fill="%23ef4444" rx="3"/><rect x="100" y="82" width="40" height="16" fill="%23ef4444" rx="3"/><circle cx="106" cy="95" r="4" fill="%230f172a"/><circle cx="134" cy="95" r="4" fill="%230f172a"/></svg>`
  }
];

class MediaService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private audioStream: MediaStream | null = null;

  /**
   * Reads an image file and compresses to a persistent local Base64 data URL.
   */
  private pending = 0;
  private listeners = new Set<(pending: number) => void>();
  public subscribeUploads(listener: (pending: number) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  public hasPendingUploads(): boolean { return this.pending > 0; }
  private async track<T>(work: () => Promise<T>): Promise<T> {
    this.pending++;
    this.listeners.forEach(listener => listener(this.pending));
    try { return await work(); }
    finally {
      this.pending--;
      this.listeners.forEach(listener => listener(this.pending));
    }
  }
  public async processImageFile(file: File): Promise<string> {
    return this.track(async () => this.uploadDataUrl(await autoFitImageToSquare(file), 'image'));
  }
  public async uploadDataUrl(dataUrl: string, kind: 'image' | 'voice'): Promise<string> {
    if (!dataUrl.startsWith('data:')) return dataUrl;
    return this.track(async () => {
      const blob = await (await fetch(dataUrl)).blob();
      return this.uploadBlob(blob, kind);
    });
  }
  private async uploadBlob(blob: Blob, kind: 'image' | 'voice'): Promise<string> {
    const limit = (kind === 'image' ? 10 : 25) * 1024 * 1024;
    if (!blob.size || blob.size > limit) throw new Error('Choose a file smaller than ' + limit / 1024 / 1024 + ' MB.');
    const mimeType = blob.type.split(';')[0] || (kind === 'voice' ? 'audio/mpeg' : 'image/jpeg');
    const normalized = new Blob([blob], { type: mimeType });
    const adminKey = (import.meta as any).env?.VITE_ADMIN_API_KEY as string | undefined;
    const configuredOrigin = (import.meta as any).env?.VITE_CONFIG_API_ORIGIN as string | undefined;
    const mediaUrl = (configuredOrigin ? configuredOrigin.replace(/\/$/, '') : '') + '/api/media';
    const ext = mimeType.split('/')[1]?.replace(/[^a-z0-9]/g, '') || 'bin';
    const fileName = `fakecall/${kind}/${Date.now()}.${ext}`;
    try {
      // Use @vercel/blob client upload — file goes directly to Vercel Blob storage
      // bypassing the 4.5MB serverless function body size limit.
      const result = await upload(fileName, normalized, {
        access: 'public',
        handleUploadUrl: mediaUrl,
        clientPayload: adminKey ? JSON.stringify({ adminKey }) : undefined,
      });
      return result.url;
    } catch (clientErr) {
      // Fallback: base64 JSON upload for local dev or small files
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Could not read media file'));
          reader.readAsDataURL(normalized);
        });
        const response = await fetch(mediaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminKey ? { Authorization: 'Bearer ' + adminKey } : {})
          },
          body: JSON.stringify({ dataUrl, kind })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload.url !== 'string') {
          throw new Error(payload.error || `Upload failed (${response.status})`);
        }
        return payload.url;
      } catch {
        throw new Error('Upload failed. Check your connection and try again. The previous file has been kept.');
      }
    }
  }

  public async processAudioFile(file: File): Promise<VoiceAudioConfig> {
    return this.track(async () => {
      const uri = await this.uploadBlob(file, 'voice');
      const durationMs = await new Promise<number>((resolve) => {
        const localUrl = URL.createObjectURL(file);
        const audio = new Audio();
        const done = () => {
          clearTimeout(timer);
          audio.onloadedmetadata = null;
          audio.onerror = null;
          URL.revokeObjectURL(localUrl);
          resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
        };
        const timer = setTimeout(done, 5000);
        audio.onloadedmetadata = done;
        audio.onerror = done;
        audio.src = localUrl;
      });
      return { uri, name: file.name.replace(/\.[^/.]+$/, ''), durationMs, mimeType: file.type.split(';')[0] || 'audio/mpeg' };
    });
  }

  /**
   * Starts live microphone recording.
   */
  public async startVoiceRecording(): Promise<void> {
    this.recordedChunks = [];
    this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    }

    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.audioStream, { mimeType })
      : new MediaRecorder(this.audioStream);

    this.recordingStartTime = Date.now();

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
  }

  /**
   * Stops voice recording and returns persistent VoiceAudioConfig.
   */
  public async stopVoiceRecording(): Promise<VoiceAudioConfig> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const mime = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        const elapsedMs = Date.now() - this.recordingStartTime;

        // Cleanup audio stream tracks
        if (this.audioStream) {
          this.audioStream.getTracks().forEach((t) => t.stop());
          this.audioStream = null;
        }

        // Convert blob to persistent Base64 Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Uri = reader.result as string;
          this.uploadDataUrl(base64Uri, 'voice').then((uri) => resolve({
            uri,
            name: `Voice Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
            durationMs: elapsedMs,
            mimeType: mime,
            peaks: [0.4, 0.7, 0.9, 0.6, 0.8, 0.5, 0.9, 0.7, 0.4]
          })).catch(reject);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(blob);
      };

      this.mediaRecorder.stop();
    });
  }
}

export const mediaService = new MediaService();

/**
 * Automatically fits and center-crops any image (data URI or File) into a crisp 512x512 square.
 * Guarantees zero blank gaps, natural aspect ratio, and 100% edge-to-edge coverage.
 */
export async function autoFitImageToSquare(source: string | File, targetSize = 512): Promise<string> {
  let dataUri = '';
  if (source instanceof File) {
    dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(source);
    });
  } else {
    dataUri = source;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      if (!nw || !nh) {
        resolve(dataUri);
        return;
      }

      // Compute center square crop coordinates (1:1 edge-to-edge)
      const minDim = Math.min(nw, nh);
      const sx = Math.floor((nw - minDim) / 2);
      const sy = Math.floor((nh - minDim) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUri);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw exact center-square edge-to-edge
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

      const result = canvas.toDataURL('image/jpeg', 0.92);
      resolve(result);
    };
    img.onerror = () => reject(new Error('Failed to load image for auto-fit'));
    img.src = dataUri;
  });
}
