import React, { useMemo } from 'react';

interface HeartParticle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  rotate: number;
  color: string;
}

export const FallingHearts: React.FC = () => {
  const hearts = useMemo<HeartParticle[]>(() => {
    // Strictly rich Red and Pink romantic colors
    const redAndPinkPalette = [
      '#ef4444', // vibrant red
      '#ec4899', // bright pink
      '#dc2626', // ruby red
      '#f43f5e', // rose red
      '#db2777', // hot pink
      '#f472b6', // blossom pink
      '#b91c1c', // deep crimson red
      '#ff2d55'  // apple romantic red-pink
    ];

    return Array.from({ length: 26 }, (_, i) => ({
      id: i,
      left: Math.random() * 94 + 3, // 3% to 97%
      size: Math.floor(Math.random() * 18) + 16, // 16px to 34px
      duration: Math.random() * 4 + 4, // 4s to 8s
      delay: Math.random() * 4, // 0s to 4s
      opacity: Math.random() * 0.4 + 0.55, // 0.55 to 0.95
      rotate: Math.floor(Math.random() * 44) - 22, // -22deg to 22deg
      color: redAndPinkPalette[i % redAndPinkPalette.length]
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute will-change-transform"
          style={{
            left: `${h.left}%`,
            top: '-35px',
            animation: `fallingHeartDrift ${h.duration}s linear infinite`,
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
              filter: `drop-shadow(0 0 10px ${h.color}99)`
            }}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      ))}
    </div>
  );
};
