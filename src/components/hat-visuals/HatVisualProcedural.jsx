import React from 'react';

const HatVisualProcedural = ({ state, mouthOpenAmount, scale, size }) => {
  // Mouth Path Interpolation
  const mouthBaseY = 75;
  const mouthOpenY = mouthBaseY + (mouthOpenAmount * 15);

  // A jagged, crooked mouth for an old hat
  const mouthPath = `
    M 35 ${mouthBaseY}
    Q 50 ${mouthBaseY - 5} 65 ${mouthBaseY}
    Q 50 ${mouthOpenY} 35 ${mouthBaseY}
  `;

  // Eye Squint/Expression
  const eyeScaleY = 1 - (mouthOpenAmount * 0.2);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={state === 'thinking' ? 'floating' : ''} style={{
        filter: state === 'thinking' ? 'drop-shadow(0 0 15px gold)' : 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
        transition: 'filter 0.5s ease, transform 0.05s ease',
        transform: state === 'thinking' ? undefined : `scale(${scale})`,
        overflow: 'visible'
    }}>
      <defs>
          <linearGradient id="leatherGrad" x1="40%" y1="0%" x2="60%" y2="100%">
              <stop offset="0%" stopColor="#4E342E" />
              <stop offset="50%" stopColor="#3E2723" />
              <stop offset="100%" stopColor="#2D1B15" />
          </linearGradient>

          <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" />
              <feComposite operator="in" in2="SourceGraphic" result="monoNoise"/>
              <feBlend in="SourceGraphic" in2="monoNoise" mode="multiply" />
          </filter>
      </defs>

      {/* Main Hat Body Group */}
      <g transform="translate(0, 5)" filter="url(#noiseFilter)">

          {/* The Brim - Wide, thin, and warped */}
          <path d="
              M 2 88
              C 2 88, 15 95, 50 95
              C 85 95, 98 88, 98 88
              C 98 88, 85 82, 50 82
              C 15 82, 2 88, 2 88 Z
          " fill="url(#leatherGrad)" stroke="#1a100e" strokeWidth="1" />

          {/* Brim Shadow */}
          <path d="M 10 88 Q 50 93 90 88" fill="none" stroke="#1a100e" strokeWidth="2" opacity="0.3" filter="blur(2px)" />

          {/* The Cone - Base Part */}
          {/* Much narrower, tapering quickly */}
          <path d="
              M 20 88
              C 22 70, 30 50, 38 40
              Q 50 38, 62 40
              C 70 50, 78 70, 80 88
              Z
          " fill="url(#leatherGrad)" stroke="#1a100e" strokeWidth="1" />

          {/* Tip (Swaying part) - Long, thin, and crooked */}
          {/* Overlaps at y=40. Pivot at 50, 40 */}
          <g className="hat-tip-sway" style={{ transformOrigin: '50% 40px' }}>
              {/* Tip Shape - Sharp and bent */}
              <path d="
                  M 38 42
                  C 35 30, 30 15, 55 5
                  C 65 2, 70 20, 62 42
                  Q 50 45, 38 42 Z
              " fill="url(#leatherGrad)" stroke="#1a100e" strokeWidth="1" />

              {/* Fold/Crease at the bend */}
              <path d="M 40 30 Q 50 35 60 30" fill="none" stroke="#1a100e" strokeWidth="1" opacity="0.6" />
              <path d="M 45 15 Q 50 10 55 15" fill="none" stroke="#1a100e" strokeWidth="1" opacity="0.4" />
          </g>

          {/* Facial Features - Sharp, deep creases */}

          {/* Brows - Sharp angles */}
          <path d="M 28 55 L 35 50 L 45 56" fill="none" stroke="#1a100e" strokeWidth="2" strokeLinecap="round" />
          <path d="M 72 55 L 65 50 L 55 56" fill="none" stroke="#1a100e" strokeWidth="2" strokeLinecap="round" />

          {/* Eyes - Narrow slits */}
          <g transform={`translate(0, 0)`}>
              <path d="M 32 60 Q 38 63 44 60" fill="none" stroke="#1a100e" strokeWidth="2.5" strokeLinecap="round" transform={`scale(1, ${eyeScaleY}) translate(0, ${62 * (1-eyeScaleY)})`} />
              <path d="M 56 60 Q 62 63 68 60" fill="none" stroke="#1a100e" strokeWidth="2.5" strokeLinecap="round" transform={`scale(1, ${eyeScaleY}) translate(0, ${62 * (1-eyeScaleY)})`} />
          </g>

          {/* Mouth - The talking fold */}
          <path d={mouthPath} fill="#1a100e" stroke="#1a100e" strokeWidth="1" strokeLinejoin="round" />

          {/* Cheek/Jaw Definition - Sharp lines */}
          <path d="M 25 70 L 30 72" fill="none" stroke="#1a100e" strokeWidth="1" opacity="0.5" />
          <path d="M 75 70 L 70 72" fill="none" stroke="#1a100e" strokeWidth="1" opacity="0.5" />

          {/* Stitching - Rough and irregular */}
          <path d="M 22 85 C 22 70, 30 50, 38 40" fill="none" stroke="#3E2723" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.7" />
          <path d="M 78 85 C 78 70, 70 50, 62 40" fill="none" stroke="#3E2723" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.7" />

      </g>

    </svg>
  );
};

export default HatVisualProcedural;
