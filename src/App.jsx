import React, { useState, useEffect } from 'react';
import SortingHat from './components/SortingHat';
import CameraCapture from './components/CameraCapture';
import ImageUpload from './components/ImageUpload';
import VoiceInput from './components/VoiceInput';
import HouseReveal from './components/HouseReveal';
import { sortPet } from './utils/sortingLogic';

function App() {
  const [step, setStep] = useState('INTRO'); // INTRO, CAMERA, VOICE, THINKING, REVEAL
  const [petPhoto, setPetPhoto] = useState(null);
  const [petTraits, setPetTraits] = useState('');
  const [house, setHouse] = useState(null);
  const [hatMessage, setHatMessage] = useState("Welcome to the Hogwarts Pet Sorting Ceremony!");

  const handleStart = () => {
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
  const [thinkingSequence, setThinkingSequence] = useState([]);
  const [sequenceIndex, setSequenceIndex] = useState(-1);

  // Handle the thinking sequence
  useEffect(() => {
    if (step === 'THINKING' && sequenceIndex >= 0 && sequenceIndex < thinkingSequence.length) {
      setHatMessage(thinkingSequence[sequenceIndex]);
    } else if (step === 'THINKING' && sequenceIndex >= thinkingSequence.length && thinkingSequence.length > 0) {
       // Sequence finished, move to reveal
       const result = sortPet(petTraits);
       setHouse(result);
       setStep('REVEAL');
       setHatMessage("");
       setThinkingSequence([]);
       setSequenceIndex(-1);
    }
  }, [step, sequenceIndex, thinkingSequence, petTraits]);

  const [audioSrc, setAudioSrc] = useState(null);
  const audioRef = useRef(new Audio());

  // TTS / Audio Effect
  useEffect(() => {
    if (hatMessage) {
      window.speechSynthesis.cancel();
      audioRef.current.pause();

      // Check if this message corresponds to the final speech AND we have audio
      // The final speech is the last item in thinkingSequence
      const isFinalSpeech = thinkingSequence.length > 0 && hatMessage === thinkingSequence[thinkingSequence.length - 1];

      if (isFinalSpeech && audioSrc) {
        // Play Custom Audio
        audioRef.current.src = audioSrc;
        audioRef.current.onplay = () => setIsSpeaking(true);
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          if (step === 'THINKING') setSequenceIndex(prev => prev + 1);
        };
        audioRef.current.onerror = () => {
           console.error("Audio playback error, falling back to TTS");
           // Fallback to TTS logic below if needed, or just skip
           setIsSpeaking(false);
           if (step === 'THINKING') setSequenceIndex(prev => prev + 1);
        };
        audioRef.current.play().catch(e => console.error("Play error:", e));
      } else {
        // Use Browser TTS for thinking phrases
        const utterance = new SpeechSynthesisUtterance(hatMessage);
        utterance.rate = 0.9;
        utterance.pitch = 0.8;

        setIsSpeaking(true);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          if (step === 'THINKING') setSequenceIndex(prev => prev + 1);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          if (step === 'THINKING') setSequenceIndex(prev => prev + 1);
        };
        window.speechSynthesis.speak(utterance);
      }
    } else {
      setIsSpeaking(false);
      window.speechSynthesis.cancel();
      audioRef.current.pause();
    }
  }, [hatMessage, step, audioSrc, thinkingSequence]);

  const startSorting = async (traits) => {
    setStep('THINKING');
    setHatMessage("Hmm... let me see...");
    setThinkingSequence([
      "Analyzing the aura...",
      "Interesting features...",
      "Digging into the soul..."
    ]);
    setSequenceIndex(0);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('traits', traits);

      // If it's a mock photo, we might need to handle it differently or send the URL
      // For now, if it's a blob/file, append it. If it's a URL (mock), we might need to fetch it first or handle in backend.
      // MVP: If petPhoto is a data URL (from camera), convert to blob.

      if (petPhoto && petPhoto.startsWith('data:')) {
        const response = await fetch(petPhoto);
        const blob = await response.blob();
        formData.append('image', blob, 'pet.jpg');
      } else if (petPhoto && !petPhoto.startsWith('http')) {
         // It's likely a blob url from URL.createObjectURL or similar if we implemented that way,
         // but our ImageUpload returns a dataUrl or blob url.
         // Let's assume for now we handle the dataURL case which is most common for this app.
         // If it's the mock path '/sorting_hat.png', we skip sending image for now or handle gracefully.
      }

      const response = await fetch('/api/sort-pet', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Sorting failed');

      const data = await response.json();

      // Update the sequence to end with the actual speech
      setThinkingSequence(prev => [
        ...prev,
        data.speech // The AI generated speech
      ]);

      // If we have audio, we need to play it when the speech text is shown
      // For now, let's store it in a ref or state to be accessed by the effect
      if (data.audio) {
        setAudioSrc(data.audio);
      }

      // Store the house for the reveal (will be triggered when sequence finishes)
      // We need a way to pass this to the effect or store it in a ref/state that doesn't trigger immediate reveal
      // The current effect logic reveals when sequence ends.
      // We can store it in a temp state or just setHouse (which doesn't trigger reveal until step changes, but step is THINKING)
      setHouse(data.house);

    } catch (error) {
      console.error("Error sorting:", error);
      setHatMessage("Hmm, my vision is cloudy. I'll just say... GRYFFINDOR!");
      setHouse('Gryffindor');
      setStep('REVEAL');
    }
  };

  const handleReset = () => {
    setStep('INTRO');
    setPetPhoto(null);
    setPetTraits('');
    setHouse(null);
    setHatMessage("Welcome to the Hogwarts Pet Sorting Ceremony!");
    setThinkingSequence([]);
    setSequenceIndex(-1);
    setAudioSrc(null);
  };

  // Determine hat state for animation
  let hatState = 'idle';
  if (step === 'THINKING') hatState = 'thinking';
  if (isSpeaking) hatState = 'speaking';

  return (
    <div className="app-container">
      {step !== 'REVEAL' && (
        <div style={{ marginBottom: '2rem' }}>
          <SortingHat state={hatState} message={hatMessage} audioSrc={audioSrc} isSpeaking={isSpeaking} />
        </div>
      )}

      <div className="content-area">
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
