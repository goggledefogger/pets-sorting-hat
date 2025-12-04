import React from 'react';

const HouseReveal = ({ house, petPhoto, onReset }) => {
  return (
    <div className="house-reveal" style={{
      textAlign: 'center',
      animation: 'fadeIn 1s ease-in'
    }}>
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
