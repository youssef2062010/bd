/**
 * Haptic feedback and vibration service for Fake Call App.
 * Simulates authentic telephone vibration pulses on mobile devices.
 */
class HapticService {
  private intervalId: number | null = null;
  private isVibrating: boolean = false;

  public start(): void {
    this.startIncomingRhythm();
  }

  public startIncomingRhythm(): void {
    this.stop();
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      return;
    }

    this.isVibrating = true;
    const pulsePattern = [500, 800, 500, 1200];

    const trigger = () => {
      if (!this.isVibrating) return;
      try {
        navigator.vibrate(pulsePattern);
      } catch {}
    };

    trigger();
    this.intervalId = window.setInterval(trigger, 3000);
  }

  public pulse(pattern: number | number[] = 50): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }

  public stop(): void {
    this.isVibrating = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }
}

export const hapticService = new HapticService();
