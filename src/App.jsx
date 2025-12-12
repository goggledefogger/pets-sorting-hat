import React, { useState, useEffect, useRef } from 'react';
import SortingHat from './components/SortingHat';
import CameraCapture from './components/CameraCapture';
import ImageUpload from './components/ImageUpload';
import VoiceInput from './components/VoiceInput';
import HouseReveal from './components/HouseReveal';
import { sortPet, HOUSES } from './utils/sortingLogic';
import { useAudioLipSync } from './hooks/useAudioLipSync';

function App() {
  const [step, setStep] = useState('INTRO'); // INTRO, CAMERA, VOICE, THINKING, REVEAL
  const [petPhoto, setPetPhoto] = useState(null);
  const [petTraits, setPetTraits] = useState('');
  const [house, setHouse] = useState(null);
  const [hatMessage, setHatMessage] = useState("Welcome to the Hogwarts Pet Sorting Ceremony!");
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const handleStart = () => {
    setHasUserInteracted(true);
    setStep('CAMERA');
    setHatMessage("First, let me get a good look at you...");
  };

  const handlePhotoCaptured = (photoUrl) => {
    setPetPhoto(photoUrl);
    setStep('VOICE');
    setHatMessage("Hmm, interesting appearance. Now, tell me about your personality.");
  };

  const handleVoiceInput = (text) => {
    setPetTraits(text);
    startSorting(text);
  };

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [thinkingPhrases] = useState([
    "Hmm... let me see...",
    "Analyzing the aura...",
    "Interesting features...",
    "Digging into the soul..."
  ]);
  const [phraseIndex, setPhraseIndex] = useState(-1);
  const [finalSpeechParts, setFinalSpeechParts] = useState([]); // Array of { text, audio }
  const [finalSpeechIndex, setFinalSpeechIndex] = useState(-1);
  const [showingFinalSpeech, setShowingFinalSpeech] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);
  const [hatPosition, setHatPosition] = useState({ x: 0, y: 0 }); // {x, y} offset
  const [visualMode, setVisualMode] = useState('procedural'); // 'custom', 'procedural', 'png'
  const [showSubtitles, setShowSubtitles] = useState(false); // Subtitles hidden by default
  const [revealReady, setRevealReady] = useState(false); // Wait for audio before showing reveal
  const audioRef = useRef(new Audio());

  // Real-time lip sync
  const mouthOpenAmount = useAudioLipSync(audioRef, isSpeaking);

  // Progress through thinking phases, then final speech parts, then reveal
  const advanceSequence = () => {
    if (step !== 'THINKING') return;

    // Phase 1: Thinking Phrases
    if (!showingFinalSpeech) {
      const nextIndex = phraseIndex + 1;
      if (nextIndex < thinkingPhrases.length) {
        setPhraseIndex(nextIndex);
        setHatMessage(thinkingPhrases[nextIndex]);
      } else {
        // Done with phrases. Check if we have final speech ready.
        if (finalSpeechParts && finalSpeechParts.length > 0) {
          // Add a small delay before starting the final speech for dramatic effect
          // and to ensure we don't overlap or rush.
          setHatMessage(null); // Clear bubble briefly

          setTimeout(() => {
            setShowingFinalSpeech(true);
            setFinalSpeechIndex(0);
            const firstPart = finalSpeechParts[0];
            setHatMessage(firstPart.text || "Hmm...");
            if (firstPart.audio) setAudioSrc(firstPart.audio);
          }, 1000); // 1 second pause
        } else {
           // If no speech parts yet, we wait.
           // If API returned but empty, we reveal.
           if (house) {
             setStep('REVEAL');
             setHatMessage(house.name.toUpperCase() + "!");
           }
        }
      }
    }
    // Phase 2: Final Speech Parts
    else {
      const nextPartIndex = finalSpeechIndex + 1;
      if (nextPartIndex < finalSpeechParts.length) {
        setFinalSpeechIndex(nextPartIndex);
        const nextPart = finalSpeechParts[nextPartIndex];
        setHatMessage(nextPart.text || "...");
        if (nextPart.audio) setAudioSrc(nextPart.audio);
      } else {
        // Final speech done, go to reveal
        setStep('REVEAL');
        setRevealReady(false); // Wait for audio to load
        // Announce the house name!
        if (house) {
          setHatMessage(house.name.toUpperCase() + "!");
          setAudioSrc(null); // Clear previous audio so it fetches new TTS
        } else {
          setHatMessage("");
          setRevealReady(true); // No audio needed
        }
      }
    }
  };

  // Watch for finalSpeech arrival if we're stuck waiting
  useEffect(() => {
    // Only trigger if we are at the end of thinking phrases, not speaking, and have data
    if (step === 'THINKING' && !showingFinalSpeech && finalSpeechParts.length > 0 && phraseIndex === thinkingPhrases.length - 1 && !isSpeaking) {
      // Check if we are already showing the final speech (to avoid double trigger due to async state)
      // Actually, showingFinalSpeech check above handles it.
      // We just call advanceSequence, which handles the transition.
      advanceSequence();
    }
  }, [finalSpeechParts, step, showingFinalSpeech, phraseIndex, isSpeaking]);

  // TTS: Play audio for current hatMessage
  useEffect(() => {
    if (!hatMessage || !hasUserInteracted) {
      return;
    }

    // Cancel any ongoing audio
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    const playAudio = (src) => {
      audioRef.current.src = src;
      audioRef.current.oncanplaythrough = () => {
        // Audio is ready to play - now show reveal if we're in REVEAL step
        if (step === 'REVEAL') {
          setRevealReady(true);
        }
      };
      audioRef.current.onplay = () => setIsSpeaking(true);
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        // Only advance sequence if we are in THINKING mode
        if (step === 'THINKING') {
          advanceSequence();
        }
      };
      audioRef.current.onerror = () => {
        console.error("Audio error");
        setIsSpeaking(false);
        if (step === 'THINKING') {
          advanceSequence();
        }
      };
      audioRef.current.play().catch(e => {
        console.error("Play error:", e);
        setIsSpeaking(false);
        // Still advance on error after a delay
        if (step === 'THINKING') {
          setTimeout(advanceSequence, 500);
        }
      });
    };

    // Use pre-loaded audio for final speech, otherwise fetch
    if (showingFinalSpeech && audioSrc) {
      playAudio(audioSrc);
    } else {
      setIsSpeaking(true);
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hatMessage })
      })
        .then(res => res.json())
        .then(data => {
          if (data.audio) {
            playAudio(data.audio);
          } else {
            // If no audio, wait a bit then advance (if in thinking mode)
            if (step === 'THINKING') {
              setTimeout(advanceSequence, 2000); // Longer delay for reading
            } else {
              setIsSpeaking(false);
            }
          }
        })
        .catch(() => {
          if (step === 'THINKING') {
            setTimeout(advanceSequence, 2000);
          } else {
            setIsSpeaking(false);
          }
        });
    }
  }, [hatMessage, hasUserInteracted, step, showingFinalSpeech, audioSrc]);

  const startSorting = async (traits) => {
    // Reset state for new sorting
    setPhraseIndex(-1);
    setShowingFinalSpeech(false);
    setFinalSpeechParts([]);
    setFinalSpeechIndex(-1);
    setAudioSrc(null);

    setStep('THINKING');

    // Start the sequence immediately with the first phrase
    setPhraseIndex(0);
    setHatMessage(thinkingPhrases[0]);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('traits', traits);

      if (petPhoto && petPhoto.startsWith('data:')) {
        const response = await fetch(petPhoto);
        const blob = await response.blob();
        formData.append('image', blob, 'pet.jpg');
      }

      const response = await fetch('/api/sort-pet', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Sorting failed');

      const data = await response.json();
      console.log('[API] Received:', { house: data.house, parts: data.speechParts?.length });

      // Store final speech parts
      if (data.speechParts) {
        setFinalSpeechParts(data.speechParts);
      } else if (data.speech) {
        // Fallback for old API response format
        setFinalSpeechParts([{ text: data.speech, audio: data.audio }]);
      }

      // Convert house string from API to house object
      const houseKey = data.house.toUpperCase();
      const houseObj = HOUSES[houseKey] || HOUSES.GRYFFINDOR;
      setHouse(houseObj);

    } catch (error) {
      console.error("Error sorting:", error);
      setHatMessage("Hmm, my vision is cloudy. I'll just say... GRYFFINDOR!");
      setHouse(HOUSES.GRYFFINDOR);
      setStep('REVEAL');
    }
  };

  const handleReset = () => {
    setStep('INTRO');
    setPetPhoto(null);
    setPetTraits('');
    setHouse(null);
    setHatMessage("Welcome to the Hogwarts Pet Sorting Ceremony!");
    setPhraseIndex(-1);
    setShowingFinalSpeech(false);
    setFinalSpeechParts([]);
    setFinalSpeechIndex(-1);
    setAudioSrc(null);
    setAudioSrc(null);
    setHatPosition({ x: 0, y: 0 });
    setRevealReady(false);
    audioRef.current.pause();
  };

  const handleHatDragStart = (e) => {
    if (step !== 'VOICE') return; // Only draggable in VOICE step
    e.preventDefault();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    const startX = hatPosition.x;
    const startY = hatPosition.y;

    const onMove = (moveEvent) => {
      const curX = moveEvent.clientX || moveEvent.touches[0].clientX;
      const curY = moveEvent.clientY || moveEvent.touches[0].clientY;
      setHatPosition({
        x: startX + (curX - clientX),
        y: startY + (curY - clientY)
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  };

  // Determine hat state for animation
  let hatState = 'idle';
  if (step === 'THINKING') hatState = 'thinking';
  if (isSpeaking) hatState = 'speaking';

  return (
    <div className="app-container">
      {/* Controls in corners */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000 }}>
        <button
          onClick={() => setShowSubtitles(!showSubtitles)}
          style={{
            padding: '8px 12px',
            borderRadius: '5px',
            background: showSubtitles ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            color: showSubtitles ? '#000' : '#fff'
          }}
          title={showSubtitles ? 'Hide subtitles' : 'Show subtitles'}
        >
          {showSubtitles ? '📝 Subtitles ON' : '📝 Subtitles OFF'}
        </button>
      </div>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}>
        <select
          value={visualMode}
          onChange={(e) => setVisualMode(e.target.value)}
          style={{ padding: '5px', borderRadius: '5px', background: 'rgba(255,255,255,0.8)', border: 'none', cursor: 'pointer' }}
        >
          <option value="custom">Custom SVG</option>
          <option value="procedural">Procedural SVG</option>
          <option value="png">Original PNG</option>
        </select>
      </div>

      {/* Default Top Hat - Only for INTRO and CAMERA */}
      {(step === 'INTRO' || step === 'CAMERA') && (
        <div style={{ marginBottom: '2rem' }}>
          <SortingHat
            state={hatState}
            message={showSubtitles ? hatMessage : null}
            audioSrc={audioSrc}
            isSpeaking={isSpeaking}
            mouthOpenAmount={mouthOpenAmount}
            visualMode={visualMode}
          />
        </div>
      )}

      <div className="content-area fade-in" key={step}>
        {step === 'INTRO' && (
          <div className="intro">
            <h1 className="magical-text">Pet Sorting Hat</h1>
            <p>Discover your pet's true Hogwarts House.</p>
            <button onClick={handleStart} className="glow" style={{ fontSize: '1.5rem', marginTop: '2rem' }}>
              Begin Ceremony
            </button>
          </div>
        )}

        {step === 'CAMERA' && (
          <div className="camera-section">
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h3 style={{ marginBottom: '1rem' }}>Option 1: Camera</h3>
                <CameraCapture onCapture={handlePhotoCaptured} />
              </div>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h3 style={{ marginBottom: '1rem' }}>Option 2: Upload</h3>
                <ImageUpload onCapture={handlePhotoCaptured} />
              </div>
            </div>
            <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
              <button
                onClick={() => handlePhotoCaptured('/sorting_hat.png')}
                style={{ background: '#444', fontSize: '0.9rem' }}
              >
                🧪 Use Mock Photo (Dev Mode)
              </button>
            </div>
          </div>
        )}

        {(step === 'VOICE' || step === 'THINKING') && (
          <div className="interaction-area">
            {/* Pet Photo with Hat Overlay */}
            {/* Pet Photo with Hat Overlay */}
            <div
              className="pet-overlay-container"
              style={{
                position: 'relative',
                maxWidth: '500px',
                margin: '120px auto 2rem',
                // Removed overflow: hidden from here so hat can extend out
              }}
            >
              {/* Image Container (Clipped) */}
              <div style={{
                borderRadius: '15px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                position: 'relative', // Ensure it takes up space
                zIndex: 1
              }}>
                {petPhoto && <img src={petPhoto} alt="Pet" style={{ width: '100%', display: 'block' }} />}
              </div>

              {/* Draggable Hat Overlay (Can extend outside) */}
              <div
                onMouseDown={handleHatDragStart}
                onTouchStart={handleHatDragStart}
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: '50%',
                  transform: `translate(-50%, 0) translate(${hatPosition.x}px, ${hatPosition.y}px)`,
                  cursor: step === 'VOICE' ? 'grab' : 'default',
                  zIndex: 20, // Above image
                  width: '180px',
                  touchAction: 'none'
                }}
              >
                <SortingHat
                  state={hatState}
                  message={null}
                  audioSrc={audioSrc}
                  isSpeaking={isSpeaking}
                  mouthOpenAmount={mouthOpenAmount}
                  size={180}
                  visualMode={visualMode}
                />
                {step === 'VOICE' && (
                  <div style={{
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    padding: '5px 10px',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    marginTop: '-20px',
                    pointerEvents: 'none'
                  }}>
                    Drag me! 👆
                  </div>
                )}
              </div>
            </div>

            {/* Controls / Text */}
            {step === 'VOICE' && (
              <VoiceInput onVoiceInput={handleVoiceInput} onSkip={handleVoiceInput} />
            )}

            {step === 'THINKING' && (
              <div className="thinking" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {showSubtitles && (
                  <div className="thinking-text" style={{
                    fontSize: '1.5rem',
                    marginBottom: '1rem',
                    maxWidth: '600px',
                    width: '90%',
                    background: 'rgba(0, 0, 0, 0.6)',
                    padding: '1.5rem',
                    borderRadius: '15px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(5px)',
                    color: '#fff',
                    fontFamily: '"Times New Roman", serif',
                    fontStyle: 'italic',
                    lineHeight: '1.4',
                    minHeight: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                      "{hatMessage}"
                  </div>
                )}
                <p style={{ opacity: 0.7, fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>The Hat is delving into your pet's mind...</p>
              </div>
            )}
          </div>
        )}

        {step === 'REVEAL' && house && (
          revealReady ? (
            <HouseReveal
              house={house}
              petPhoto={petPhoto}
              onReset={handleReset}
              visualMode={visualMode}
              mouthOpenAmount={mouthOpenAmount}
              isSpeaking={isSpeaking}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="floating" style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎩</div>
              <p style={{ fontSize: '1.5rem', color: '#D3A625' }}>The Hat is ready to announce...</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;
