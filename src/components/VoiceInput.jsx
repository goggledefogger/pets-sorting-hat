import React, { useState, useEffect, useRef } from 'react';

const VoiceInput = ({ onVoiceInput, onSkip }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Check for speech recognition support and set up once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const text = result[0].transcript;
        setTranscript(text);

        // If this is the final result, submit it
        if (result.isFinal) {
          onVoiceInput(text);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onVoiceInput]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleManualSubmit = () => {
    if (manualText.trim()) {
      onVoiceInput(manualText);
    }
  };

  return (
    <div className="voice-container">
      <h3>Tell me about your pet...</h3>
      <p style={{ fontStyle: 'italic', color: '#aaa' }}>
        "Are they brave? Cunning? Loyal? Or perhaps wise?"
      </p>

      {/* Voice input - only show if browser supports it */}
      {speechSupported && (
        <div style={{ margin: '2rem 0' }}>
          <button
            onClick={isListening ? stopListening : startListening}
            className={isListening ? 'glow' : ''}
            style={{
              background: isListening ? '#740001' : undefined,
              transform: isListening ? 'scale(1.05)' : undefined
            }}
          >
            {isListening ? '🔴 Stop Recording' : '🎙️ Start Speaking'}
          </button>
          {isListening && (
            <p style={{ marginTop: '0.5rem', color: '#D3A625', fontStyle: 'italic' }}>
              {transcript || 'Listening...'}
            </p>
          )}
        </div>
      )}

      {/* Manual text input */}
      <div style={{ margin: '2rem 0', borderTop: speechSupported ? '1px solid #333' : 'none', paddingTop: speechSupported ? '1rem' : 0 }}>
        {speechSupported && <p style={{ fontSize: '0.9rem', color: '#888' }}>Or type description:</p>}
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="e.g. My cat is very brave and adventurous..."
          style={{
            width: '100%',
            maxWidth: '400px',
            height: '80px',
            background: '#2a2a2a',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '0.5rem',
            marginBottom: '0.5rem'
          }}
        />
        <br />
        <button onClick={handleManualSubmit} disabled={!manualText.trim()}>
          Submit Text
        </button>
      </div>

      {/* Skip button */}
      <div style={{ marginTop: '1rem' }}>
        <button onClick={() => onSkip('brave loyal smart')} style={{ fontSize: '0.8em', opacity: 0.7 }}>
          (Skip - Use Default Traits)
        </button>
      </div>
    </div>
  );
};

export default VoiceInput;
