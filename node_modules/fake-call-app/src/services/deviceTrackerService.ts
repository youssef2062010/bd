import { sharedStorage, DeviceTrackingInfo } from '@fakecall/shared';

const LOCAL_DEVICE_ID_KEY = 'fake_call_client_device_id_v1';

class DeviceTrackerService {
  private deviceId: string = '';
  private heartbeatInterval: number | null = null;
  private currentDeviceInfo: DeviceTrackingInfo | null = null;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  private getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return 'server_instance';
    try {
      let id = localStorage.getItem(LOCAL_DEVICE_ID_KEY);
      if (!id) {
        id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem(LOCAL_DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return `dev_temp_${Date.now()}`;
    }
  }

  /**
   * Parses user agent and browser capabilities to detect friendly device name, OS, and browser.
   */
  public detectDeviceDetails(): {
    deviceName: string;
    os: string;
    browser: string;
    screenResolution: string;
  } {
    if (typeof window === 'undefined') {
      return {
        deviceName: 'Unknown Device',
        os: 'Unknown OS',
        browser: 'Unknown Browser',
        screenResolution: 'N/A'
      };
    }

    const ua = navigator.userAgent || '';
    const platform = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || '';
    let deviceName = 'Mobile Device';
    let os = 'Unknown OS';
    let browser = 'Web Browser';

    // 1. Detect OS & Specific Device
    if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      if (/iPad/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        deviceName = 'Apple iPad';
        os = 'iPadOS';
      } else {
        // High density screen hints for modern iPhones
        const ratio = window.devicePixelRatio || 1;
        const w = window.screen.width;
        const h = window.screen.height;

        if ((w === 393 && h === 852) || (w === 430 && h === 932) || (ratio >= 3 && h > 840)) {
          deviceName = 'Apple iPhone 15/16 Pro';
        } else if ((w === 390 && h === 844) || (w === 428 && h === 926)) {
          deviceName = 'Apple iPhone 13/14';
        } else {
          deviceName = 'Apple iPhone';
        }

        const match = ua.match(/OS (\d+[_.]\d+)/);
        os = match ? `iOS ${match[1].replace('_', '.')}` : 'iOS';
      }
    } else if (/Android/.test(ua)) {
      if (/Samsung|SM-|GT-/.test(ua)) {
        deviceName = 'Samsung Galaxy';
      } else if (/Pixel/.test(ua)) {
        deviceName = 'Google Pixel';
      } else if (/Xiaomi|Redmi|POCO/.test(ua)) {
        deviceName = 'Xiaomi / Redmi';
      } else if (/OnePlus/.test(ua)) {
        deviceName = 'OnePlus';
      } else if (/Huawei|Honor/.test(ua)) {
        deviceName = 'Huawei / Honor';
      } else {
        deviceName = 'Android Device';
      }

      const match = ua.match(/Android\s+([0-9.]+)/);
      os = match ? `Android ${match[1]}` : 'Android';
    } else if (/Win/.test(platform) || /Windows/.test(ua)) {
      deviceName = 'Windows PC';
      os = /Windows NT 10.0/.test(ua) ? 'Windows 10/11' : 'Windows';
    } else if (/Mac/.test(platform) || /Macintosh/.test(ua)) {
      deviceName = 'Apple Mac';
      os = 'macOS';
    } else if (/Linux/.test(platform)) {
      deviceName = 'Linux Workstation';
      os = 'Linux';
    }

    // 2. Detect Browser
    if (/CriOS/.test(ua)) {
      browser = 'Chrome iOS';
    } else if (/FxiOS/.test(ua)) {
      browser = 'Firefox iOS';
    } else if (/EdgiOS|EdgA|Edge/.test(ua)) {
      browser = 'Microsoft Edge';
    } else if (/Chrome|Chromium/.test(ua) && !/Edg/.test(ua)) {
      browser = /Mobile/.test(ua) ? 'Chrome Mobile' : 'Chrome';
    } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
      browser = /Mobile/.test(ua) ? 'Safari Mobile' : 'Safari';
    } else if (/Firefox/.test(ua)) {
      browser = /Mobile/.test(ua) ? 'Firefox Mobile' : 'Firefox';
    } else if (/SamsungBrowser/.test(ua)) {
      browser = 'Samsung Internet';
    }

    const screenResolution = `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio || 1}x)`;

    return { deviceName, os, browser, screenResolution };
  }

  /**
   * Initializes device launch tracking on app startup.
   * Records open timestamp, date, time, and starts real-time online heartbeat.
   */
  public async trackLaunch(): Promise<DeviceTrackingInfo> {
    const details = this.detectDeviceDetails();

    const info = await sharedStorage.recordDeviceLaunch({
      deviceId: this.deviceId,
      deviceName: details.deviceName,
      os: details.os,
      browser: details.browser,
      screenResolution: details.screenResolution
    });

    this.currentDeviceInfo = info;

    // Start heartbeat every 12 seconds to confirm device is active
    this.startHeartbeat();

    // Setup lifecycle listeners for accurate online/offline detection
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        sharedStorage.updateDeviceHeartbeat(this.deviceId, false);
      });

      document.addEventListener('visibilitychange', () => {
        const isVisible = document.visibilityState === 'visible';
        sharedStorage.updateDeviceHeartbeat(this.deviceId, isVisible);
      });
    }

    return info;
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = window.setInterval(() => {
      sharedStorage.updateDeviceHeartbeat(this.deviceId, true);
    }, 12000);
  }

  public stop(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    sharedStorage.updateDeviceHeartbeat(this.deviceId, false);
  }
}

export const deviceTrackerService = new DeviceTrackerService();
