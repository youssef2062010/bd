import React from 'react';
import { CallAnimationStyle } from '@fakecall/shared';

interface AnimatedPulseRippleProps {
  style?: CallAnimationStyle;
  children: React.ReactNode;
}

export const AnimatedPulseRipple: React.FC<AnimatedPulseRippleProps> = ({ style = 'pulse', children }) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Expanding Ripple Rings */}
      <div
        className={`absolute inset-0 rounded-full bg-emerald-500/20 animate-ping`}
        style={{
          animationDuration: style === 'radar' ? '1.8s' : '2.4s',
          animationIterationCount: 'infinite'
        }}
      />
      <div
        className={`absolute -inset-4 rounded-full bg-emerald-500/15 animate-pulse`}
        style={{ animationDuration: '2s' }}
      />
      <div
        className={`absolute -inset-8 rounded-full border border-emerald-500/20`}
        style={{ animation: 'rippleGlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
      />

      {/* Main Content Container */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
