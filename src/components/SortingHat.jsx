import React from 'react';

const SortingHat = ({ state, message, audioSrc, isSpeaking }) => {
  // state: 'idle', 'thinking', 'speaking'
  const [mouthOpen, setMouthOpen] = React.useState(false);
  const audioContextRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const sourceRef = React.useRef(null);
  const animationFrameRef = React.useRef(null);

  React.useEffect(() => {
    // If we have a custom audio source and we are speaking, analyze it
    if (state === 'speaking' && audioSrc) {
      // Note: Analyzing cross-origin audio or audio from an Audio element in React
      // can be tricky due to CORS and user interaction policies.
      // For this MVP, we might need to rely on the "simulated" lip-sync if we can't easily hook into the Audio element created in App.jsx.
      // However, App.jsx created an Audio object but didn't expose the node.
      // A better approach for the MVP given the constraints:
      // Continue using the simulated random lip-sync for now, as hooking up a MediaElementSource
      // requires the Audio element to be in the DOM or passed as a ref, and handling CORS for the data URI.
      // Since audioSrc is a data URI, CORS isn't an issue.

      // Let's stick to the simulated randomness for reliability in this step,
      // but make it slightly more aggressive when "speaking" with custom audio.

      const toggleMouth = () => {
        setMouthOpen(prev => !prev);
        const nextTime = Math.random() * 150 + 50; // Faster, more energetic
        animationFrameRef.current = setTimeout(toggleMouth, nextTime);
      };
      toggleMouth();

      return () => clearTimeout(animationFrameRef.current);

    } else if (state === 'speaking') {
      // Fallback for TTS (simulated)
      const toggleMouth = () => {
        setMouthOpen(prev => !prev);
        const nextTime = Math.random() * 200 + 100;
        animationFrameRef.current = setTimeout(toggleMouth, nextTime);
      };
      toggleMouth();
      return () => clearTimeout(animationFrameRef.current);
    } else {
      setMouthOpen(false);
      if (animationFrameRef.current) clearTimeout(animationFrameRef.current);
    }
  }, [state, audioSrc]);

  return (
    <div className="sorting-hat-container" style={{ position: 'relative', height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={mouthOpen ? "/sorting_hat_open.png" : "/sorting_hat.png"}
        alt="The Sorting Hat"
        className={state === 'thinking' ? 'floating' : ''}
        style={{
          maxHeight: '300px',
          filter: state === 'thinking' ? 'brightness(1.2) drop-shadow(0 0 10px gold)' : 'none',
          transition: 'filter 0.5s ease' // Removed 'all' to prevent jitter on image swap
        }}
      />

      {message && (
        <div className="speech-bubble" style={{
          background: '#fff',
          color: '#000',
          padding: '1rem',
          borderRadius: '20px',
          marginTop: '1rem',
          position: 'relative',
          maxWidth: '300px',
          fontFamily: 'sans-serif',
          fontWeight: 'bold'
        }}>
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
