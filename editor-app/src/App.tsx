import { useState, useEffect, useRef } from 'react';
import {
  FakeCallConfig,
  sharedStorage,
  DEFAULT_CONFIG,
  DeviceTrackingInfo,
  configService,
  ConfigConflictError
} from '@fakecall/shared';
import { EditorHeader } from './components/EditorHeader';
import { LiveSnapshotHero } from './components/LiveSnapshotHero';
import { BrandingCard } from './components/BrandingCard';
import { CallerInfoCard } from './components/CallerInfoCard';
import { VoiceCard } from './components/VoiceCard';
import { RingtoneCard } from './components/RingtoneCard';
import { CallSettingsCard } from './components/CallSettingsCard';
import { DevicesTrackerCard } from './components/DevicesTrackerCard';
import { RecordingsCard } from './components/RecordingsCard';
import {
  LayoutGrid,
  Smartphone,
  User,
  Volume2,
  Bell,
  Sliders,
  Radio,
  Disc3,
  ArrowLeft,
  Check,
  Save,
  Loader2
} from 'lucide-react';

type TabId =
  | 'all'
  | 'branding'
  | 'caller'
  | 'voice'
  | 'ringtone'
  | 'settings'
  | 'devices'
  | 'recordings';

interface NavTabItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  dot?: boolean;
}

export function App() {
  const [config, setConfig] = useState<FakeCallConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isLoadingInitialConfig, setIsLoadingInitialConfig] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('all');

  const [devicesCount, setDevicesCount] = useState(0);
  const [onlineDevicesCount, setOnlineDevicesCount] = useState(0);

  const isHydratedRef = useRef(false);
  const hasUnsavedEditsRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    // Do not save or accept local state until the canonical server record is loaded.
    const load = async () => {
      try {
        const loaded = await configService.getConfig();
        if (mounted) {
          setConfig(loaded);
          isHydratedRef.current = true;
        }
      } catch (error) {
        if (mounted) setSaveError(error instanceof Error ? error.message : 'Could not load the cloud configuration.');
      } finally {
        if (mounted) setIsLoadingInitialConfig(false);
      }
    };
    void load();

    const unsubConfig = configService.subscribe((incoming) => {
      if (!isHydratedRef.current || hasUnsavedEditsRef.current) return;
      setConfig((current) => {
        return incoming.version > current.version ? incoming : current;
      });
    });

    // 3. Tracked devices log
    sharedStorage.getTrackedDevices().then((list) => {
      setDevicesCount(list.length);
      setOnlineDevicesCount(list.filter((d) => d.isOnline).length);
    });

    const unsubDevices = sharedStorage.subscribeDevices((list: DeviceTrackingInfo[]) => {
      setDevicesCount(list.length);
      setOnlineDevicesCount(list.filter((d) => d.isOnline).length);
    });

    return () => {
      unsubConfig();
      unsubDevices();
      mounted = false;
    };
  }, []);

  const handleConfigChange = (partial: Partial<FakeCallConfig>) => {
    if (!isHydratedRef.current) return;
    hasUnsavedEditsRef.current = true;
    setSaveError(null);

    setConfig((prev) => {
      const next: FakeCallConfig = {
        ...prev,
        ...partial,
        branding: partial.branding ? { ...prev.branding, ...partial.branding } : prev.branding,
        callSettings: partial.callSettings
          ? { ...prev.callSettings, ...partial.callSettings }
          : prev.callSettings,
        ringtone: partial.ringtone ? { ...prev.ringtone, ...partial.ringtone } : prev.ringtone
      };

      return next;
    });
  };

  const handleManualForceSync = async () => {
    if (!isHydratedRef.current) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const canonical = await configService.saveConfig(config);
      setConfig(canonical);
      hasUnsavedEditsRef.current = false;
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 1500);
    } catch (err) {
      // Keep the editor state intact. A conflict must be resolved explicitly, never silently overwritten.
      const message = err instanceof ConfigConflictError
        ? 'This configuration was changed in another Admin. Your unsaved edits are still here; refresh before saving again.'
        : (err instanceof Error ? err.message : 'Cloud save failed. Your edits have not been saved.');
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all call settings, branding, and caller information to default values?')) {
      handleConfigChange({
        ...DEFAULT_CONFIG,
        id: config.id,
        version: config.version,
        updatedAt: config.updatedAt
      });
    }
  };

  const handleGenerateCallLink = async () => {
    if (hasUnsavedEditsRef.current) await handleManualForceSync();
    if (hasUnsavedEditsRef.current) throw new Error(saveError || 'Save the configuration before generating a link.');
    return new URL('/install?configId=main', window.location.origin).toString();
  };

  const handleOpenFakeCallApp = () => {
    window.open('/fake-call-app/index.html?mode=standalone&preview=admin', '_blank');
  };

  const navTabs: NavTabItem[] = [
    { id: 'all', label: 'Overview', icon: LayoutGrid },
    { id: 'branding', label: 'App Name & Logo', icon: Smartphone },
    { id: 'caller', label: 'Caller Profile', icon: User },
    { id: 'voice', label: 'Voice Audio', icon: Volume2 },
    { id: 'ringtone', label: 'Ringtone', icon: Bell },
    { id: 'settings', label: 'Call Settings', icon: Sliders },
    {
      id: 'devices',
      label: 'Device Radar',
      icon: Radio,
      badge: onlineDevicesCount > 0 ? `${onlineDevicesCount} Live` : undefined,
      dot: onlineDevicesCount > 0
    },
    { id: 'recordings', label: 'Recordings', icon: Disc3 }
  ];

  const currentAppName = config.branding?.appDisplayName || '';
  const currentAppIcon = config.branding?.customIconUri || '';

  if (isLoadingInitialConfig) {
    return <div className="min-h-screen bg-[#060911] text-slate-200 flex items-center justify-center font-semibold">Loading the latest cloud configuration…</div>;
  }

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans ambient-glow">
      {/* Top Header */}
      <EditorHeader
        appName={currentAppName}
        appIconUri={currentAppIcon}
        onSave={handleManualForceSync}
        onReset={handleReset}
        isSaving={isSaving}
        showSaveSuccess={showSaveSuccess}
        onTestCall={handleOpenFakeCallApp}
        onGenerateCallLink={handleGenerateCallLink}
      />

      {saveError && (
        <div className="mx-auto mt-4 max-w-[1440px] w-[calc(100%-2rem)] rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
          {saveError}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
        {/* Executive Live Status Hero Bar */}
        <LiveSnapshotHero
          config={config}
          onlineDevicesCount={onlineDevicesCount}
          devicesCount={devicesCount}
          onOpenTestCall={handleOpenFakeCallApp}
          onNavigateToTab={(tab) => setActiveTab(tab as TabId)}
        />

        {/* Modern Segmented Navigation Dock */}
        <nav className="bg-slate-900/70 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/[0.08] flex items-center gap-1.5 overflow-x-auto shadow-xl">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 active:scale-95 ${isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>

                {tab.badge !== undefined && (
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${isActive
                      ? 'bg-slate-950 text-emerald-300'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {tab.dot && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Content Zones */}
        {activeTab === 'all' ? (
          <div className="flex flex-col gap-8 sm:gap-10">
            {/* Zone 1: App Identity & Branding (Name & Logo) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>App Name & Launcher Logo</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Step 01
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Customize the app name and icon that appears on the mobile home screen
                  </p>
                </div>
              </div>
              <BrandingCard config={config} onChange={handleConfigChange} />
            </div>

            {/* Zone 2: Caller Profile */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Caller Profile & Photo</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                      Step 02
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Caller name, simulated phone number, and caller profile picture
                  </p>
                </div>
              </div>
              <CallerInfoCard config={config} onChange={handleConfigChange} />
            </div>

            {/* Zone 3: Audio & Sound Studios */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Sound & Voice Audio Studio</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                      Step 03
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Voice note played when answering the call and ringtone presets
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <VoiceCard config={config} onChange={handleConfigChange} />
                <RingtoneCard config={config} onChange={handleConfigChange} />
              </div>
            </div>

            {/* Zone 4: Simulation Behavior & Atmosphere */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Call Behavior & Atmosphere</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                      Step 04
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Operating system interface style (iOS / Samsung), themes, falling hearts, and answer method
                  </p>
                </div>
              </div>
              <CallSettingsCard config={config} onChange={handleConfigChange} />
            </div>

            {/* Zone 5: Device Telemetry Radar */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Device Radar & Telemetry</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                      Live Logs
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Real-time logs of device identifiers, operating systems, and launch timestamps
                  </p>
                </div>
              </div>
              <DevicesTrackerCard />
            </div>

            {/* Zone 6: Call Recordings */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Simulated Call Recordings</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                      Audio Vault
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Audio recorded during incoming calls if auto-record is enabled
                  </p>
                </div>
              </div>
              <RecordingsCard />
            </div>
          </div>
        ) : (
          /* Focused Single Tab Mode */
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="text-xs sm:text-sm font-bold text-slate-400 hover:text-white flex items-center gap-2 transition px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Overview</span>
              </button>
            </div>

            {activeTab === 'branding' && <BrandingCard config={config} onChange={handleConfigChange} />}
            {activeTab === 'caller' && <CallerInfoCard config={config} onChange={handleConfigChange} />}
            {activeTab === 'voice' && <VoiceCard config={config} onChange={handleConfigChange} />}
            {activeTab === 'ringtone' && <RingtoneCard config={config} onChange={handleConfigChange} />}
            {activeTab === 'settings' && <CallSettingsCard config={config} onChange={handleConfigChange} />}
            {activeTab === 'devices' && <DevicesTrackerCard />}
            {activeTab === 'recordings' && <RecordingsCard />}
          </div>
        )}

        {/* Executive Footer Info */}
        <footer className="mt-4 p-5 rounded-2xl bg-slate-900/40 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              App: <strong className="text-white">{currentAppName}</strong>
            </span>
            <span>•</span>
            <span>
              Caller: <strong className="text-white">{config.callerName}</strong>
            </span>
            <span>•</span>
            <span>
              UI: <strong className="text-emerald-400 uppercase">{config.callSettings.uiStyle}</strong>
            </span>
            <span>•</span>
            <span>
              Theme: <strong className="text-pink-400 capitalize">{config.callSettings.theme}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Upstash Redis Cloud Sync Active</span>
          </div>
        </footer>
      </main>

      {/* Floating Manual Save Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={handleManualForceSync}
          disabled={isSaving}
          className={`h-12 sm:h-14 px-5 sm:px-6 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2.5 transition-all shadow-2xl active:scale-95 ${showSaveSuccess
            ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/50 ring-4 ring-emerald-300/40 scale-105'
            : isSaving
              ? 'bg-emerald-700/80 text-white cursor-wait'
              : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 shadow-emerald-500/40 hover:shadow-emerald-500/70 hover:scale-105 ring-2 ring-white/15'
            }`}
          title="Save all changes to the cloud"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
              <span>Saving to Cloud...</span>
            </>
          ) : showSaveSuccess ? (
            <>
              <Check className="w-5 h-5 stroke-[3.5] text-slate-950" />
              <span>Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5 stroke-[2.5] text-slate-950" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default App;
