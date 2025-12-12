import React from 'react';
import HatVisualCustom from './hat-visuals/HatVisualCustom';
import HatVisualProcedural from './hat-visuals/HatVisualProcedural';
import HatVisualPng from './hat-visuals/HatVisualPng';

const HouseReveal = ({ house, petPhoto, onReset, visualMode = 'procedural', mouthOpenAmount = 0, isSpeaking = false }) => {
  const hatState = isSpeaking ? 'speaking' : 'idle';
  const scale = 1 + (mouthOpenAmount * 0.03);

  const renderHatVisual = () => {
    switch (visualMode) {
      case 'procedural':
        return <HatVisualProcedural state={hatState} mouthOpenAmount={mouthOpenAmount} scale={scale} size={150} />;
      case 'png':
        return <HatVisualPng state={hatState} mouthOpenAmount={mouthOpenAmount} size={150} />;
      case 'custom':
      default:
        return <HatVisualCustom state={hatState} scale={scale} size={150} />;
    }
  };

  return (
    <div className="house-reveal" style={{
      textAlign: 'center',
      animation: 'fadeIn 1s ease-in'
    }}>
      {/* Dancing Hat */}
      <div className="dancing-hat" style={{
        marginBottom: '1rem'
      }}>
        {renderHatVisual()}
      </div>

      <h1 style={{
        fontSize: '4rem',
        color: house.color,
        textShadow: '2px 2px 0px #fff, 0 0 20px ' + house.color,
        margin: '0.5rem 0'
      }}>
        {house.name.toUpperCase()}!
      </h1>

      <div style={{ position: 'relative', display: 'inline-block', margin: '2rem' }}>
        <img
          src={petPhoto}
          alt="Sorted Pet"
          style={{
            width: '250px',
            height: '250px',
            objectFit: 'cover',
            borderRadius: '50%',
            border: `8px solid ${house.color}`,
            boxShadow: `0 0 30px ${house.color}`
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: house.color,
          color: '#fff',
          padding: '0.5rem 1.5rem',
          borderRadius: '20px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          {house.traits[0].toUpperCase()}
        </div>
      </div>

      <p style={{ fontSize: '1.5rem', fontStyle: 'italic', maxWidth: '600px', margin: '0 auto' }}>
        "{house.description}"
      </p>

      <div style={{ marginTop: '3rem' }}>
        <button onClick={onReset}>Sort Another Pet</button>
      </div>
    </div>
  );
};

export default HouseReveal;
