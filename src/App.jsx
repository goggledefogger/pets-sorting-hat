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
      } else if (finalSpeechParts.length > 0) {
        // Done with phrases, start final speech parts
        setShowingFinalSpeech(true);
        setFinalSpeechIndex(0);
        const firstPart = finalSpeechParts[0];
        setHatMessage(firstPart.text);
        if (firstPart.audio) setAudioSrc(firstPart.audio);
      }
      // else: waiting for API
    }
    // Phase 2: Final Speech Parts
    else {
      const nextPartIndex = finalSpeechIndex + 1;
      if (nextPartIndex < finalSpeechParts.length) {
        setFinalSpeechIndex(nextPartIndex);
        const nextPart = finalSpeechParts[nextPartIndex];
        setHatMessage(nextPart.text);
        if (nextPart.audio) setAudioSrc(nextPart.audio);
      } else {
        // Final speech done, go to reveal
        setStep('REVEAL');
        // Announce the house name!
        if (house) {
          setHatMessage(house.name.toUpperCase() + "!");
          setAudioSrc(null); // Clear previous audio so it fetches new TTS
        } else {
          setHatMessage("");
        }
      }
    }
  };

  // Watch for finalSpeech arrival if we're stuck waiting
  useEffect(() => {
    if (step === 'THINKING' && !showingFinalSpeech && finalSpeechParts.length > 0 && phraseIndex === thinkingPhrases.length - 1 && !isSpeaking) {
      // We were waiting for API, and now it's here, and the last phrase finished speaking
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
    audioRef.current.pause();
  };

  // Determine hat state for animation
  let hatState = 'idle';
  if (step === 'THINKING') hatState = 'thinking';
  if (isSpeaking) hatState = 'speaking';

  return (
    <div className="app-container">
      {step !== 'REVEAL' && (
        <div style={{ marginBottom: '2rem' }}>
          <SortingHat
            state={hatState}
            message={hatMessage}
            audioSrc={audioSrc}
            isSpeaking={isSpeaking}
            mouthOpenAmount={mouthOpenAmount}
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

        {step === 'VOICE' && (
          <VoiceInput onVoiceInput={handleVoiceInput} onSkip={handleVoiceInput} />
        )}

        {step === 'THINKING' && (
          <div className="thinking">
            <p>The Hat is delving into your pet's mind...</p>
          </div>
        )}

        {step === 'REVEAL' && house && (
          <HouseReveal house={house} petPhoto={petPhoto} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}

export default App;
