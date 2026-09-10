import { useState, useEffect, useRef } from 'react';
import { FakeCallConfig, CallState, DEFAULT_CONFIG, configService } from '@fakecall/shared';
import { IncomingCallView } from './components/IncomingCallView';
import { ActiveCallView } from './components/ActiveCallView';
import { CallEndedView } from './components/CallEndedView';
import { FallingHearts } from './components/FallingHearts';
import { getFaviconDataUri } from './components/AppIconBadge';
import { audioPlayerService } from './services/audioPlayerService';
import { hapticService } from './services/hapticService';
import { deviceTrackerService } from './services/deviceTrackerService';

export function App() {
  const [config, setConfig] = useState<FakeCallConfig>(DEFAULT_CONFIG);
  const [callState, setCallState] = useState<CallState>('incoming');
  const [callDuration, setCallDuration] = useState(0);
  const [voiceProgress, setVoiceProgress] = useState({ current: 0, total: 0 });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);


  const activeCallStartTime = useRef<number | null>(null);
  const maxDurationTimerRef = useRef<number | null>(null);
  const callStateRef = useRef<CallState>('incoming');
  const autoAnswerTimerRef = useRef<number | null>(null);
  const configRef = useRef<FakeCallConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    const appName = (config.branding?.appDisplayName || '').trim();
    const iconUri = config.branding?.customIconUri || (config.branding?.appIcon ? getFaviconDataUri(config.branding) : '');

    document.title = appName || 'Fake Call';

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    appleTitle?.setAttribute('content', appName);

    const iconLinks = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="apple-touch-icon"]'
    );
    iconLinks.forEach((link) => {
      if (iconUri) link.href = iconUri;
      else link.removeAttribute('href');
    });
  }, [config.branding]);

  // Standalone protection: ensure app only runs as installed PWA, redirect browser visits to /install
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true;

    const params = new URLSearchParams(window.location.search);
    const isAllowed = params.get('preview') === 'admin' || window.self !== window.top;

    if (!isStandalone && !isAllowed) {
      const configId = params.get('configId') || 'main';
      window.location.replace(`/install?configId=${encodeURIComponent(configId)}`);
    }
  }, []);

  // Bootstrap from the stable link ID before rendering or playing any call UI.
  useEffect(() => {
    let mounted = true;
    const configId = new URLSearchParams(window.location.search).get('configId') || 'main';

    const init = async () => {
      try {
        const latest = await configService.getConfig(configId);
        if (mounted) {
          setConfig(latest);
          configRef.current = latest;
          startIncomingCall(latest);
        }
      } catch (e) {
        if (mounted) setConfigError(e instanceof Error ? e.message : 'Could not load this call configuration.');
      } finally {
        if (mounted) setIsLoadingConfig(false);
      }
      deviceTrackerService.trackLaunch().catch(() => { });
    };

    init();

    const unsubscribe = configService.subscribe((newConfig) => {
      if (mounted) {
        const previousConfig = configRef.current;
        configRef.current = newConfig;
        setConfig(newConfig);

        const audioSettingsChanged =
          JSON.stringify(previousConfig.voiceAudio) !== JSON.stringify(newConfig.voiceAudio) ||
          previousConfig.callSettings.realisticVoiceFilter !== newConfig.callSettings.realisticVoiceFilter ||
          previousConfig.callSettings.autoEndWhenAudioFinishes !== newConfig.callSettings.autoEndWhenAudioFinishes;

        if (callStateRef.current === 'incoming') {
          // Update ringtone if settings changed during incoming
          const ringtoneChanged =
            JSON.stringify(previousConfig.ringtone) !== JSON.stringify(newConfig.ringtone) ||
            previousConfig.callSettings.vibrationEnabled !== newConfig.callSettings.vibrationEnabled;
          if (ringtoneChanged) {
            try { audioPlayerService.stopRingtone(); } catch { }
            try { hapticService.stop(); } catch { }
            try { audioPlayerService.playRingtone(newConfig.ringtone); } catch { }
            if (newConfig.callSettings.vibrationEnabled) {
              try { hapticService.startIncomingRhythm(); } catch { }
            }
          }
        } else if (callStateRef.current === 'active' && audioSettingsChanged) {
          audioPlayerService.stopVoice();
          audioPlayerService.playVoice(
            newConfig.voiceAudio,
            () => {
              if (newConfig.callSettings.autoEndWhenAudioFinishes) {
                handleEndCall();
              }
            },
            (current, total) => {
              setVoiceProgress({ current, total });
            },
            newConfig.callSettings.realisticVoiceFilter ?? true
          );
        }

      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      try { audioPlayerService.stopAll(); } catch { }
      try { hapticService.stop(); } catch { }
      try { deviceTrackerService.stop(); } catch { }
      clearTimers();
    };
  }, []);

  const clearTimers = () => {
    if (maxDurationTimerRef.current !== null) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (autoAnswerTimerRef.current !== null) {
      clearTimeout(autoAnswerTimerRef.current);
      autoAnswerTimerRef.current = null;
    }
  };

  // Start incoming call: play ringtone, vibrate, show accept/decline/slide UI
  const startIncomingCall = (cfg: FakeCallConfig) => {
    clearTimers();
    try { audioPlayerService.stopAll(); } catch { }
    try { hapticService.stop(); } catch { }

    if (cfg.callSettings.launchAction === 'answer') {
      startActiveCall(cfg);
      return;
    }

    if (cfg.callSettings.launchAction === 'decline') {
      setCallDuration(0);
      setCallState('ended');
      return;
    }

    setCallState('incoming');
    setVoiceProgress({ current: 0, total: 0 });

    // Play ringtone
    try {
      audioPlayerService.playRingtone(cfg.ringtone);
    } catch (e) {
      console.warn('Ringtone autoplay notice:', e);
    }

    // Vibrate
    if (cfg.callSettings.vibrationEnabled) {
      try {
        hapticService.startIncomingRhythm();
      } catch (e) {
        console.warn('Haptic rhythm notice:', e);
      }
    }

    // Auto-answer after delay if configured
    if (cfg.callSettings.autoAnswerDelaySeconds > 0) {
      autoAnswerTimerRef.current = window.setTimeout(() => {
        handleAnswer();
      }, cfg.callSettings.autoAnswerDelaySeconds * 1000);
    }
  };

  // User taps Accept / slides to answer
  const handleAnswer = () => {
    startActiveCall(configRef.current);
  };

  // User taps Decline
  const handleDecline = () => {
    clearTimers();
    try { audioPlayerService.stopAll(); } catch { }
    try { hapticService.stop(); } catch { }
    setCallDuration(0);
    setCallState('ended');
  };

  const startActiveCall = (cfg: FakeCallConfig) => {
    clearTimers();
    try { audioPlayerService.stopRingtone(); } catch { }
    try { hapticService.stop(); } catch { }
    setVoiceProgress({ current: 0, total: 0 });
    setCallState('active');
    activeCallStartTime.current = Date.now();

    try {
      audioPlayerService.playVoice(
        cfg.voiceAudio,
        () => {
          if (cfg.callSettings.autoEndWhenAudioFinishes) {
            handleEndCall();
          }
        },
        (current, total) => {
          setVoiceProgress({ current, total });
        },
        cfg.callSettings.realisticVoiceFilter ?? true
      );
    } catch (e) {
      console.warn('Voice play notice:', e);
    }

    if (cfg.callSettings.callDuration > 0) {
      maxDurationTimerRef.current = window.setTimeout(() => {
        handleEndCall();
      }, cfg.callSettings.callDuration * 1000);
    }
  };

  // End Call Action: Stop playback, show call ended view
  const handleEndCall = () => {
    clearTimers();
    try { audioPlayerService.stopAll(); } catch { }
    try { hapticService.stop(); } catch { }

    if (activeCallStartTime.current) {
      const elapsed = Math.floor((Date.now() - activeCallStartTime.current) / 1000);
      setCallDuration(elapsed);
    }

    setCallState('ended');
  };

  const handleRestart = () => {
    startIncomingCall(config);
  };

  if (isLoadingConfig) {
    return <main className="w-full h-screen bg-black text-white flex items-center justify-center">Loading call configuration…</main>;
  }

  if (configError) {
    return <main className="w-full h-screen bg-black text-rose-200 flex items-center justify-center text-center px-6">{configError}</main>;
  }

  return (
    <main className="w-full h-screen bg-black overflow-hidden select-none">
      {callState === 'incoming' && (
        <>
          <IncomingCallView
            config={config}
            onAnswer={handleAnswer}
            onDecline={handleDecline}
          />
          {config.callSettings.theme === 'romantic' && config.callSettings.fallingHeartsEnabled && (
            <FallingHearts />
          )}
        </>
      )}

      {callState === 'active' && (
        <ActiveCallView
          config={config}
          callStartTime={activeCallStartTime.current ?? Date.now()}
          onEndCall={handleEndCall}
          onToggleMute={(m) => audioPlayerService.setMuted(m)}
          onToggleSpeaker={(s) => audioPlayerService.setSpeaker(s)}
          voiceProgress={voiceProgress}
        />
      )}

      {callState === 'ended' && (
        <CallEndedView
          config={config}
          durationSeconds={callDuration}
          onRestart={handleRestart}
        />
      )}
    </main>
  );
}

export default App;
