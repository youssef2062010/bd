import React, { useState } from 'react';
import {
  Smartphone,
  RotateCcw,
  Check,
  ExternalLink,
  Shield,
  Copy,
  Save,
  Loader2
} from 'lucide-react';

interface EditorHeaderProps {
  onSave: () => void | Promise<void>;
  onReset: () => void;
  isSaving: boolean;
  showSaveSuccess: boolean;
  onTestCall?: () => void;
  onGenerateCallLink?: () => Promise<string>;
  appName?: string;
  appIconUri?: string;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onSave,
  onReset,
  isSaving,
  showSaveSuccess,
  onTestCall,
  onGenerateCallLink,
  appName = '',
  appIconUri = ''
}) => {
  const [callLinkCopied, setCallLinkCopied] = useState(false);
  const [adminLinkCopied, setAdminLinkCopied] = useState(false);

  const handleCopyCallLink = async () => {
    try {
      const url = onGenerateCallLink
        ? await onGenerateCallLink()
        : new URL('/install?configId=main', window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setCallLinkCopied(true);
      setTimeout(() => setCallLinkCopied(false), 2000);
    } catch {
      // The caller reports a save error; never copy a link until it is backed by a confirmed save.
    }
  };

  const handleCopyAdminLink = async () => {
    const url = new URL('/install-admin', window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback
    }
    setAdminLinkCopied(true);
    setTimeout(() => setAdminLinkCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#060911]/95 backdrop-blur-2xl border-b border-white/[0.1] px-3.5 sm:px-6 lg:px-8 py-3 shadow-2xl transition-all">
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand Identity & Real-Time Sync Status */}
        <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto">
          {/* Logo / Launcher Icon Preview */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden p-[2px] bg-gradient-to-tr from-emerald-400 via-teal-300 to-cyan-400 shadow-lg shadow-emerald-500/25 shrink-0">
            {appIconUri ? (
              <img src={appIconUri} alt={appName || 'App icon'} className="w-full h-full object-cover rounded-[14px]" />
            ) : <Smartphone className="w-5 h-5 m-auto text-emerald-300" />}
          </div>

          {/* Title, Badge & Real-Time Sync Status */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight leading-none drop-shadow flex items-center gap-1.5">
                <span>{appName || 'Fake Call'}</span>
                <span className="text-slate-400 font-semibold text-sm">Studio</span>
              </h1>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-sm shrink-0">
                Admin Center
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-400 font-bold mt-1">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-sm shadow-emerald-400" />
              </span>
              <span className="leading-tight drop-shadow-sm">
                Real-Time Cloud Sync Active (Auto-Saves Instantly)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions Toolbar with Dual Install Links */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full lg:w-auto justify-between lg:justify-end flex-wrap pt-1 lg:pt-0">
          {/* Test Call Screen Button */}
          {onTestCall && (
            <button
              type="button"
              onClick={onTestCall}
              className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition-all active:scale-95 shrink-0"
              title="Open fake incoming call in a new window"
            >
              <Smartphone className="w-4 h-4 text-slate-950" />
              <span>Test Call</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          )}

          {/* Copy Call App Link (/install) */}
          <button
            type="button"
            onClick={handleCopyCallLink}
            className="h-10 px-3.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/35 text-indigo-300 hover:text-white border border-indigo-500/35 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
            title="Save pending changes, then copy the stable Call App link"
          >
            {callLinkCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span className="text-emerald-300">Call Link Copied!</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>Call App Link</span>
                <Copy className="w-3 h-3 opacity-60" />
              </>
            )}
          </button>

          {/* Copy Admin App Link (/install-admin) */}
          <button
            type="button"
            onClick={handleCopyAdminLink}
            className="h-10 px-3.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/35 text-purple-300 hover:text-white border border-purple-500/35 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
            title="Copy link to install the Admin Studio on phone or desktop (/install-admin)"
          >
            {adminLinkCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span className="text-emerald-300">Admin Link Copied!</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Admin App Link</span>
                <Copy className="w-3 h-3 opacity-60" />
              </>
            )}
          </button>

          {/* Reset Defaults Button */}
          <button
            type="button"
            onClick={onReset}
            className="h-10 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 border border-white/[0.1] transition-all active:scale-95 shrink-0"
            title="Reset all settings to default values"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>

          {/* Prominent Manual Save Button */}
          <button
            id="save-config-btn"
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all active:scale-95 shrink-0 shadow-lg ${showSaveSuccess
                ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/40 ring-2 ring-emerald-300'
                : isSaving
                  ? 'bg-emerald-600/50 text-white cursor-wait'
                  : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-emerald-500/35 hover:shadow-emerald-500/50 hover:scale-[1.02]'
              }`}
            title="Click to manually save and push all changes to the cloud"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                <span>Saving to Cloud...</span>
              </>
            ) : showSaveSuccess ? (
              <>
                <Check className="w-4 h-4 text-slate-950 stroke-[3.5]" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
