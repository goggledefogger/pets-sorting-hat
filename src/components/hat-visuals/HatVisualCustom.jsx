import React from 'react';
import hatSvg from '../../assets/sorting_hat.svg';

const HatVisualCustom = ({ state, scale, size }) => {
  return (
    <img
      src={hatSvg}
      alt="Sorting Hat"
      className={state === 'thinking' ? 'floating' : ''}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        filter: state === 'thinking' ? 'drop-shadow(0 0 15px gold)' : 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
        transition: 'filter 0.5s ease, transform 0.05s ease',
        transform: state === 'thinking' ? undefined : `scale(${scale})`,
        objectFit: 'contain'
      }}
    />
  );
};

export default HatVisualCustom;
