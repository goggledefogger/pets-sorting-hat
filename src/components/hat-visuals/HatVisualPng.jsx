import React from 'react';

const HatVisualPng = ({ state, mouthOpenAmount, size }) => {
  // Simple threshold for open mouth
  const isOpen = mouthOpenAmount > 0.1;
  const src = isOpen ? '/sorting_hat_open.png' : '/sorting_hat.png';

  return (
    <img
      src={src}
      alt="Sorting Hat"
      className={state === 'thinking' ? 'floating' : ''}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        filter: state === 'thinking' ? 'drop-shadow(0 0 15px gold)' : 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
        transition: 'filter 0.5s ease',
        objectFit: 'contain'
      }}
    />
  );
};

export default HatVisualPng;
