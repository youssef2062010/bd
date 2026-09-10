import React, { useMemo, useState, useEffect } from 'react';

interface HeartParticle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number; // negative delay starts animation mid-flight
  opacity: number;
  rotate: number;
  color: string;
  isRising: boolean;
}

interface TapHeart {
  id: number;
  x: number;
  y: number;
  offsetX: number;
  size: number;
  color: string;
}

export const FallingHearts: React.FC = () => {
  const [tapHearts, setTapHearts] = useState<TapHeart[]>([]);

  const hearts = useMemo<HeartParticle[]>(() => {
    const redAndPinkPalette = [
      '#ef4444', // vibrant red
      '#ec4899', // bright pink
      '#dc2626', // ruby red
      '#f43f5e', // rose red
      '#db2777', // hot pink
      '#f472b6', // blossom pink
      '#b91c1c', // deep crimson red
      '#ff2d55', // apple romantic red-pink
      '#fb7185'  // coral rose
    ];

    return Array.from({ length: 32 }, (_, i) => {
      const duration = Math.random() * 4 + 4; // 4s to 8s
      // Negative delay pre-distributes hearts across screen immediately on mount!
      const initialOffset = -(Math.random() * duration);
      const isRising = i % 3 === 0; // 1 out of 3 floats upward for dynamic magic

      return {
        id: i,
        left: Math.random() * 92 + 4,
        size: Math.floor(Math.random() * 20) + 16,
        duration,
        delay: initialOffset,
        opacity: Math.random() * 0.4 + 0.6,
        rotate: Math.floor(Math.random() * 48) - 24,
        color: redAndPinkPalette[i % redAndPinkPalette.length],
        isRising
      };
    });
  }, []);

  // Listen for screen taps to spawn interactive hearts
  useEffect(() => {
    let tapCounter = 0;
    const handleTap = (e: MouseEvent | TouchEvent) => {
      // Don't trigger if user clicked an interactive button
      const target = e.target as HTMLElement | null;
      if (target?.closest('button') || target?.closest('a') || target?.closest('input')) {
        return;
      }

      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      } else {
        return;
      }

      const colors = ['#ef4444', '#f43f5e', '#ec4899', '#db2777', '#ff2d55'];
      const batch: TapHeart[] = [
        {
          id: ++tapCounter,
          x: clientX,
          y: clientY,
          offsetX: (Math.random() - 0.5) * 40,
          size: Math.floor(Math.random() * 12) + 24,
          color: colors[Math.floor(Math.random() * colors.length)]
        },
        {
          id: ++tapCounter,
          x: clientX + (Math.random() - 0.5) * 20,
          y: clientY + (Math.random() - 0.5) * 20,
          offsetX: (Math.random() - 0.5) * 60,
          size: Math.floor(Math.random() * 10) + 18,
          color: colors[Math.floor(Math.random() * colors.length)]
        }
      ];

      setTapHearts((prev) => [...prev.slice(-15), ...batch]);
    };

    window.addEventListener('click', handleTap);
    window.addEventListener('touchstart', handleTap, { passive: true });

    return () => {
      window.removeEventListener('click', handleTap);
      window.removeEventListener('touchstart', handleTap);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {/* Background Floating & Falling Hearts Shower */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute will-change-transform"
          style={{
            left: `${h.left}%`,
            top: h.isRising ? 'auto' : '-35px',
            bottom: h.isRising ? '-35px' : 'auto',
            animation: h.isRising
              ? `floatingHeartRise ${h.duration}s linear infinite`
              : `fallingHeartDrift ${h.duration}s linear infinite`,
            animationDelay: `${h.delay}s`,
            opacity: h.opacity
          }}
        >
          <svg
            width={h.size}
            height={h.size}
            viewBox="0 0 24 24"
            fill={h.color}
            style={{
              transform: `rotate(${h.rotate}deg)`,
              filter: `drop-shadow(0 0 10px ${h.color}b3)`
            }}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      ))}

      {/* Interactive Tapped Hearts */}
      {tapHearts.map((th) => (
        <div
          key={th.id}
          className="fixed will-change-transform pointer-events-none"
          style={{
            left: `${th.x}px`,
            top: `${th.y}px`,
            ['--tap-offset-x' as any]: `${th.offsetX}px`,
            animation: 'tapHeartFloat 1.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
          }}
        >
          <svg
            width={th.size}
            height={th.size}
            viewBox="0 0 24 24"
            fill={th.color}
            style={{
              filter: `drop-shadow(0 0 14px ${th.color})`
            }}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      ))}
    </div>
  );
};
