import React, { useState, useEffect } from 'react';
import { DeviceTrackingInfo, sharedStorage } from '@fakecall/shared';
import {
  Smartphone,
  Laptop,
  Monitor,
  Clock,
  Calendar,
  Trash2,
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Radio,
  History,
  ShieldCheck
} from 'lucide-react';

export const DevicesTrackerCard: React.FC = () => {
  const [devices, setDevices] = useState<DeviceTrackingInfo[]>([]);
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    sharedStorage.getTrackedDevices().then((list) => {
      setDevices(list);
    });

    const unsubscribe = sharedStorage.subscribeDevices((updated) => {
      setDevices(updated);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const list = await sharedStorage.getTrackedDevices();
    setDevices(list);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (confirm('Delete this device from tracking history?')) {
      await sharedStorage.deleteTrackedDevice(deviceId);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Clear all device tracking history and launch counts?')) {
      await sharedStorage.clearTrackedDevices();
    }
  };

  const toggleExpand = (deviceId: string) => {
    setExpandedDeviceId((prev) => (prev === deviceId ? null : deviceId));
  };

  const totalLaunches = devices.reduce((acc, d) => acc + (d.launchCount || 0), 0);
  const onlineDevicesCount = devices.filter((d) => d.isOnline).length;

  const getDeviceIcon = (os: string) => {
    const lower = (os || '').toLowerCase();
    if (lower.includes('ios') || lower.includes('iphone') || lower.includes('ipad')) {
      return <Smartphone className="w-6 h-6 text-emerald-400" />;
    }
    if (lower.includes('android')) {
      return <Smartphone className="w-6 h-6 text-teal-400" />;
    }
    if (lower.includes('win') || lower.includes('pc')) {
      return <Monitor className="w-6 h-6 text-blue-400" />;
    }
    if (lower.includes('mac')) {
      return <Laptop className="w-6 h-6 text-indigo-400" />;
    }
    return <Smartphone className="w-6 h-6 text-slate-400" />;
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffSec = Math.floor((now - timestamp) / 1000);
    if (diffSec < 15) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    return `${diffDays}d ago`;
  };

  const formatFullDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFullTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-2xl transition-all flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Registered Devices & Launch Telemetry
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                LIVE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Real-time telemetry of device models, exact launch dates and 12-hour AM/PM times, and visit frequency
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            className="h-10 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/[0.08] transition active:scale-95 flex items-center gap-2 text-xs font-semibold"
            title="Refresh device logs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {devices.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="h-10 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-2 transition active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Unique Devices */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Devices</div>
            <div className="text-2xl font-black text-white mt-1.5">
              {devices.length} {devices.length === 1 ? 'Device' : 'Devices'}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Total Launches */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total App Opens</div>
            <div className="text-2xl font-black text-emerald-400 mt-1.5 font-mono">
              {totalLaunches} {totalLaunches === 1 ? 'Time' : 'Times'}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400">
            <History className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Active Now */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Online Right Now</div>
            <div className="text-2xl font-black text-white mt-1.5 flex items-center gap-2.5">
              <span>{onlineDevicesCount} Active</span>
              {onlineDevicesCount > 0 && (
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <Radio className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Devices List */}
      {devices.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-950/60 border border-dashed border-white/[0.08] flex flex-col items-center justify-center text-center gap-3 text-slate-400">
          <div className="p-4 rounded-2xl bg-slate-900 border border-white/[0.08] text-slate-500">
            <Smartphone className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-white">No devices logged yet</div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md">
            When you or anyone opens the Fake Call App, their device name, OS, time, date, and launch count will appear here in real time!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {devices.map((device) => {
            const isExpanded = expandedDeviceId === device.deviceId;
            return (
              <div
                key={device.deviceId}
                className="bg-slate-950/90 rounded-3xl border border-white/[0.1] hover:border-white/[0.18] transition-all overflow-hidden shadow-2xl"
              >
                {/* Tier 1: Device Identity & Actions */}
                <div className="p-6 border-b border-white/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Device Core Details */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className="relative p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                      {getDeviceIcon(device.os)}
                      {/* Live Online Dot */}
                      <span
                        className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${device.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        title={device.isOnline ? 'Online Right Now' : 'Offline'}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                          {device.deviceName}
                        </h3>

                        {device.isOnline ? (
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm shadow-emerald-950/40">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>Active Right Now</span>
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-white/[0.08]">
                            Offline
                          </span>
                        )}
                      </div>

                      {/* Hardware / Environment Badges */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap text-xs font-mono">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-white/[0.08] text-slate-200">
                          <span className="text-slate-400 font-sans text-[11px] font-bold uppercase tracking-wider">
                            OS:
                          </span>
                          <span className="font-semibold">{device.os}</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-white/[0.08] text-slate-200">
                          <span className="text-slate-400 font-sans text-[11px] font-bold uppercase tracking-wider">
                            Browser:
                          </span>
                          <span className="font-semibold">{device.browser}</span>
                        </div>

                        {device.screenResolution && (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-white/[0.08] text-slate-200">
                            <span className="text-slate-400 font-sans text-[11px] font-bold uppercase tracking-wider">
                              Display:
                            </span>
                            <span className="font-semibold text-slate-300">{device.screenResolution}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Right Actions */}
                  <div className="flex items-center gap-3 self-start lg:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(device.deviceId)}
                      className={`h-10 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition active:scale-95 ${isExpanded
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-950/40'
                          : 'bg-slate-900 hover:bg-slate-800 border-white/[0.1] text-slate-200 hover:text-white'
                        }`}
                    >
                      <History className="w-4 h-4 text-indigo-400" />
                      <span>{isExpanded ? 'Hide Timeline' : `Timeline (${device.launchHistory?.length || device.launchCount})`}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 ml-0.5" /> : <ChevronDown className="w-4 h-4 ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteDevice(device.deviceId)}
                      className="h-10 px-3.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 hover:text-rose-400 border border-white/[0.1] text-slate-400 transition active:scale-95"
                      title="Delete Device Log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tier 2: Dedicated Spacious Metrics Row */}
                <div className="p-6 bg-slate-900/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Metric 1: Total Launches */}
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total App Launches
                      </div>
                      <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                        {device.launchCount} {device.launchCount === 1 ? 'Open' : 'Opens'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Recorded across all simulation sessions
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
                      <Activity className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Metric 2: Last Launched Time & Date */}
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Last Launched
                      </div>
                      <div className="text-xl font-extrabold text-white font-mono mt-1 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-400" />
                        <span>{formatFullTime(device.lastOpenedAt)}</span>
                      </div>
                      <div className="text-xs text-slate-300 font-mono mt-1 flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatFullDate(device.lastOpenedAt)}</span>
                        </div>
                        <span className="text-teal-400 font-bold">
                          ({formatRelativeTime(device.lastOpenedAt)})
                        </span>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-teal-500/10 text-teal-400 shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Tier 3: Expandable Full Launch Timeline */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-4 border-t border-white/[0.08] bg-slate-900/50 animate-fade-in flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
                        <History className="w-4 h-4" />
                        <span>Complete Launch History Log ({device.launchHistory?.length || 0} recorded sessions):</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        First session: {formatFullDate(device.firstOpenedAt)} at {formatFullTime(device.firstOpenedAt)}
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/[0.08] bg-slate-950 p-2.5 flex flex-col gap-2">
                      {device.launchHistory && device.launchHistory.length > 0 ? (
                        device.launchHistory.map((launch, idx) => (
                          <div
                            key={launch.id || idx}
                            className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-xs sm:text-sm font-mono border border-white/[0.04] transition"
                          >
                            <div className="flex items-center gap-3.5">
                              <span className="w-8 text-xs text-slate-500 font-bold">
                                #{device.launchHistory.length - idx}
                              </span>
                              <div className="flex items-center gap-2 text-white font-medium">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span>{launch.formattedDate || formatFullDate(launch.timestamp)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5 text-teal-300 font-bold">
                                <Clock className="w-4 h-4 text-teal-400" />
                                <span>{launch.formattedTime || formatFullTime(launch.timestamp)}</span>
                              </div>
                              <span className="text-xs text-slate-400 hidden sm:inline">
                                ({formatRelativeTime(launch.timestamp)})
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          Opened {device.launchCount} times.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-white/[0.08]">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Real-time cross-device analytics with instant synchronization
        </span>
        <span>All data stored securely</span>
      </div>
    </div>
  );
};
