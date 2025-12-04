import React from 'react';

const SortingHat = ({ state, message, audioSrc, isSpeaking, mouthOpenAmount = 0 }) => {
  // state: 'idle', 'thinking', 'speaking'
  // mouthOpenAmount: 0.0 to 1.0 based on volume

  // Mouth Path Interpolation
  // Base width: 40 to 60 (center 50)
  // Y position: 80
  // Control point Y: 80 (closed) to 105 (open)
  // We use a quadratic bezier curve for the mouth
  const mouthControlY = 80 + (mouthOpenAmount * 25);
  const mouthPath = `M 35 85 Q 50 ${mouthControlY} 65 85`;

  // Eye Squint/Blink
  // When speaking loudly, eyes might squint a bit (scale Y down)
  // Or just random blinking? For now, let's squint on loud volume for expression
  const eyeScaleY = 1 - (mouthOpenAmount * 0.4);

  // Dynamic scale for "bounce" effect based on volume
  const scale = 1 + (mouthOpenAmount * 0.05);

  return (
    <div className="sorting-hat-container" style={{ position: 'relative', height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      {/* SVG Hat */}
      <svg width="300" height="300" viewBox="0 0 100 100" className={state === 'thinking' ? 'floating' : ''} style={{
          filter: state === 'thinking' ? 'drop-shadow(0 0 10px gold)' : 'drop-shadow(0 5px 5px rgba(0,0,0,0.5))',
          transition: 'filter 0.5s ease, transform 0.05s ease',
          transform: state === 'thinking' ? undefined : `scale(${scale})`,
          overflow: 'visible'
      }}>
        {/* Tip Group (Swaying) */}
        <g className="hat-tip-sway" style={{ transformOrigin: '50% 45px' }}>
            {/* Main Cone Tip */}
            <path d="M 50 5 C 40 20, 30 35, 20 45 L 80 45 C 70 35, 60 20, 50 5 Z" fill="#3e2723" stroke="#2d1b15" strokeWidth="1" />
            {/* Fold/Wrinkle */}
            <path d="M 35 30 Q 50 35 65 30" fill="none" stroke="#2d1b15" strokeWidth="0.5" />
        </g>

        {/* Base/Brim */}
        <ellipse cx="50" cy="50" rx="40" ry="10" fill="#3e2723" stroke="#2d1b15" strokeWidth="1" />

        {/* Face Area (Lower Cone) */}
        <path d="M 20 45 L 25 85 Q 50 95 75 85 L 80 45 Z" fill="#3e2723" stroke="#2d1b15" strokeWidth="1" />

        {/* Eyes Group */}
        <g transform={`translate(50, 65) scale(1, ${eyeScaleY}) translate(-50, -65)`}>
            {/* Left Eye */}
            <ellipse cx="40" cy="65" rx="3" ry="4" fill="#1a100e" />
            {/* Right Eye */}
            <ellipse cx="60" cy="65" rx="3" ry="4" fill="#1a100e" />
            {/* Eyebrows */}
            <path d="M 35 60 L 45 62" stroke="#1a100e" strokeWidth="1" />
            <path d="M 65 60 L 55 62" stroke="#1a100e" strokeWidth="1" />
        </g>

        {/* Mouth */}
        <path d={mouthPath} fill="#1a100e" stroke="#1a100e" strokeWidth="2" strokeLinecap="round" />

      </svg>

      {message && (
        <div style={{
          background: '#fff',
          color: '#000',
          padding: '1rem',
          borderRadius: '20px',
          marginTop: '1rem',
          position: 'relative',
          maxWidth: '300px',
          fontFamily: 'sans-serif',
          fontWeight: 'bold'
        }} className={`speech-bubble ${state === 'thinking' ? 'thinking-text' : ''}`}>
          {message}
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: '10px solid #fff'
          }}></div>
        </div>
      )}
    </div>
  );
};

export default SortingHat;
