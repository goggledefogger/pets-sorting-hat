import React from 'react';
import HatVisualCustom from './hat-visuals/HatVisualCustom';
import HatVisualProcedural from './hat-visuals/HatVisualProcedural';
import HatVisualPng from './hat-visuals/HatVisualPng';

const SortingHat = ({ state, message, audioSrc, isSpeaking, mouthOpenAmount = 0, size = 400, visualMode = 'custom' }) => {
  // state: 'idle', 'thinking', 'speaking'
  // mouthOpenAmount: 0.0 to 1.0 based on volume

  // Dynamic scale for "bounce" effect based on volume
  const scale = 1 + (mouthOpenAmount * 0.03);

  const renderVisual = () => {
    switch (visualMode) {
      case 'procedural':
        return <HatVisualProcedural state={state} mouthOpenAmount={mouthOpenAmount} scale={scale} size={size} />;
      case 'png':
        return <HatVisualPng state={state} mouthOpenAmount={mouthOpenAmount} size={size} />;
      case 'custom':
      default:
        return <HatVisualCustom state={state} scale={scale} size={size} />;
    }
  };

  return (
    <div className="sorting-hat-container" style={{ position: 'relative', height: `${size}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      {renderVisual()}

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
          fontWeight: 'bold',
          zIndex: 10,
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
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
