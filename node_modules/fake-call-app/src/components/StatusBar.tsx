import React, { useState, useEffect } from 'react';
import { Wifi } from 'lucide-react';

interface StatusBarProps {
  isCallActive?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isCallActive = false }) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      // 12-hour or 24-hour phone style
      hours = hours % 12 || 12;
      setTimeStr(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-11 pt-2 px-6 flex items-center justify-between text-white text-xs font-semibold select-none z-50 pointer-events-none">
      {/* Left: Real Local Time */}
      <div className="w-16 font-medium text-sm tracking-tight text-left">
        {timeStr || '9:41'}
      </div>

      {/* Center: Real In-Call Green Indicator (if active) */}
      <div className="flex-1 flex justify-center">
        {isCallActive ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 text-[10px] font-bold shadow-md shadow-emerald-950 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>0:00 • In Call</span>
          </div>
        ) : (
          <div className="w-20 h-4 rounded-full bg-transparent" />
        )}
      </div>

      {/* Right: Authentic 5G, Wi-Fi & Battery Status */}
      <div className="w-16 flex items-center justify-end gap-1.5 text-white/90">
        {/* Cellular 4-bar icon */}
        <div className="flex items-end gap-[1.5px] h-3">
          <span className="w-[3px] h-[3px] bg-white rounded-xs" />
          <span className="w-[3px] h-[5px] bg-white rounded-xs" />
          <span className="w-[3px] h-[8px] bg-white rounded-xs" />
          <span className="w-[3px] h-[11px] bg-white rounded-xs" />
        </div>

        <span className="text-[10px] font-bold tracking-tighter ml-0.5">5G</span>

        {/* Wi-Fi Icon */}
        <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />

        {/* Battery Icon with inner level */}
        <div className="relative flex items-center">
          <div className="w-5 h-2.5 rounded-[3px] border border-white/80 p-[1px] flex items-center">
            <div className="w-3/4 h-full bg-white rounded-[1.5px]" />
          </div>
          <div className="w-[1.5px] h-1 bg-white/80 rounded-r-[1px] ml-[0.5px]" />
        </div>
      </div>
    </div>
  );
};
