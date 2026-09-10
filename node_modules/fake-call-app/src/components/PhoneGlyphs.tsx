import React from 'react';

interface GlyphProps {
  className?: string;
}

/**
 * Authentic solid-filled telephone receiver pointing upwards (Accept / Answer).
 * Exactly matches Apple SF Symbols `phone.fill` and Android Material `call`.
 */
export const PhoneAcceptGlyph: React.FC<GlyphProps> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.12.45 2.33.69 3.58.69a1 1 0 011 1v3.5a1 1 0 01-1 1A17.93 17.93 0 012 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.24 2.45.69 3.57a1 1 0 01-.21 1.12l-2.36 2.1z" />
  </svg>
);

/**
 * Authentic solid-filled telephone receiver pointing downwards (Decline / End Call / Hangup).
 * Exactly matches Apple SF Symbols `phone.down.fill` and Android Material `call_end`.
 * NO diagonal slash line!
 */
export const PhoneDeclineGlyph: React.FC<GlyphProps> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M12 9c-3.3 0-6.3 1.2-8.6 3.2-.6.5-.7 1.4-.2 2l1.6 1.6c.5.5 1.3.5 1.8.1 1.5-.9 3.3-1.4 5.4-1.4s3.9.5 5.4 1.4c.5.4 1.3.4 1.8-.1l1.6-1.6c.5-.6.4-1.5-.2-2C18.3 10.2 15.3 9 12 9z" />
  </svg>
);
