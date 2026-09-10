import React from 'react';
import { BrandingConfig } from '@fakecall/shared';
import { Phone, Sparkles } from 'lucide-react';

interface AppIconBadgeProps {
  branding?: BrandingConfig;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const AppIconBadge: React.FC<AppIconBadgeProps> = ({
  branding,
  size = 'sm',
  className = ''
}) => {
  const customUri = branding?.customIconUri;
  const iconId = branding?.appIcon || 'phone-green';

  const sizeClasses = {
    xs: 'w-4 h-4 rounded-[4px]',
    sm: 'w-5 h-5 rounded-[6px]',
    md: 'w-7 h-7 rounded-[8px]',
    lg: 'w-10 h-10 rounded-[12px]'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (customUri) {
    return (
      <div className={`overflow-hidden shrink-0 shadow-sm border border-white/20 bg-slate-900 ${sizeClasses[size]} ${className}`}>
        <img src={customUri} alt="App Icon" className="w-full h-full object-cover" />
      </div>
    );
  }

  const presetStyles: Record<string, { bg: string; icon: 'phone' | 'sparkles' }> = {
    'phone-green': { bg: 'bg-gradient-to-tr from-emerald-500 to-teal-600', icon: 'phone' },
    'phone-classic': { bg: 'bg-gradient-to-tr from-blue-600 to-indigo-600', icon: 'phone' },
    'phone-dark': { bg: 'bg-gradient-to-tr from-slate-700 to-slate-950', icon: 'phone' },
    'phone-gold': { bg: 'bg-gradient-to-tr from-amber-400 to-yellow-600', icon: 'sparkles' }
  };

  const preset = presetStyles[iconId] || presetStyles['phone-green'];

  return (
    <div
      className={`flex items-center justify-center text-white shrink-0 shadow-sm border border-white/20 ${preset.bg} ${sizeClasses[size]} ${className}`}
    >
      {preset.icon === 'sparkles' ? (
        <Sparkles className={`${iconSizes[size]} drop-shadow`} />
      ) : (
        <Phone className={`${iconSizes[size]} fill-current drop-shadow`} />
      )}
    </div>
  );
};

/**
 * Generates an SVG Data URI for favicon and apple-touch-icon based on chosen branding.
 */
export function getFaviconDataUri(branding?: BrandingConfig): string {
  if (branding?.customIconUri) {
    return branding.customIconUri;
  }

  const iconId = branding?.appIcon || 'phone-green';
  const colors: Record<string, [string, string]> = {
    'phone-green': ['#10b981', '#0d9488'],
    'phone-classic': ['#2563eb', '#4f46e5'],
    'phone-dark': ['#334155', '#020617'],
    'phone-gold': ['#f59e0b', '#d97706']
  };
  const [start, end] = colors[iconId] || colors['phone-green'];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${start}"/>
        <stop offset="100%" stop-color="${end}"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="16" fill="url(#g)"/>
    <path d="M19 16c2.5 0 4 3 4.8 4.6.6 1.3.4 2.7-.6 3.7l-2 2c2 3.8 5 6.8 8.8 8.8l2-2c1-.9 2.4-1.2 3.7-.6 1.6.8 4.6 2.3 4.6 4.8 0 3.3-2.6 6-5.8 6-12.7 0-23-10.3-23-23 0-3.2 2.6-5.8 6-5.8z" fill="#ffffff"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
