import React, { useState, useEffect } from 'react';

interface BurstParticle {
  id: number;
  startX: number; // percentage
  startY: number; // percentage
  endX: number;   // px offset
  endY: number;   // px offset
  size: number;
  rotation: number;
  color: string;
  delay: number;
  duration: number;
}

export const AnswerHeartBurst: React.FC = () => {
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const romanticPalette = [
      '#ef4444', // vibrant red
      '#f43f5e', // rose red
      '#ec4899', // bright pink
      '#db2777', // hot pink
      '#e11d48', // ruby red
      '#f472b6', // blossom pink
      '#ff2d55', // apple romantic
      '#fda4af'  // soft blush
    ];

    const count = 42;
    const generated: BurstParticle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * (i / count)) + ((Math.random() - 0.5) * 0.5);
      // Bias trajectory strongly upward
      const distance = Math.random() * 260 + 120;
      const endX = Math.cos(angle) * (distance * 0.9);
      const endY = -Math.abs(Math.sin(angle) * (distance * 1.6)) - (Math.random() * 150 + 80);

      generated.push({
        id: i,
        startX: 50 + (Math.random() - 0.5) * 20, // around center bottom
        startY: 75 + (Math.random() - 0.5) * 10,
        endX,
        endY,
        size: Math.floor(Math.random() * 22) + 18, // 18px to 40px
        rotation: Math.floor(Math.random() * 60) - 30,
        color: romanticPalette[i % romanticPalette.length],
        delay: Math.random() * 0.35,
        duration: Math.random() * 1.2 + 2.0 // 2s to 3.2s
      });
    }

    setParticles(generated);

    const timer = setTimeout(() => {
      setActive(false);
    }, 3800);

    return () => clearTimeout(timer);
  }, []);

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute will-change-transform"
          style={{
            left: `${p.startX}%`,
            top: `${p.startY}%`,
            animation: `answerHeartBurst ${p.duration}s cubic-bezier(0.15, 0.85, 0.35, 1) forwards`,
            animationDelay: `${p.delay}s`,
            ['--burst-end-x' as any]: `${p.endX}px`,
            ['--burst-end-y' as any]: `${p.endY}px`
          }}
        >
          <svg
            width={p.size}
            height={p.size}
            viewBox="0 0 24 24"
            fill={p.color}
            style={{
              transform: `rotate(${p.rotation}deg)`,
              filter: `drop-shadow(0 0 12px ${p.color}cc)`
            }}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      ))}
    </div>
  );
};
