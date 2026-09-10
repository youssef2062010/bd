import React from 'react';

interface StatusBarProps {
  isCallActive?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = () => {
  // Clean safe-area spacer: leaves room for device's native hardware notch / status bar
  // Removes fake duplicate battery, fake time, and fake 5G/cellular bars so phone's real OS status bar is clean!
  return <div className="w-full h-8 pt-safe pointer-events-none select-none shrink-0" />;
};

