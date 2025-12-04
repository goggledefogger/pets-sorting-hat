import React, { useState, useEffect } from 'react';

const VoiceInput = ({ onVoiceInput, onSkip }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => setIsListening(true);
      recognitionInstance.onend = () => setIsListening(false);
      recognitionInstance.onerror = (event) => {
        setError('Error occurred in recognition: ' + event.error);
        setIsListening(false);
      };
      recognitionInstance.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        onVoiceInput(text);
      };

      setRecognition(recognitionInstance);
    } else {
      setError('Browser does not support Speech Recognition.');
    }
  }, [onVoiceInput]);

  const startListening = () => {
    if (recognition) {
      try {
        recognition.start();
        setError(null);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const [manualText, setManualText] = useState('');

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

      {error && (
        <div style={{ color: '#ff6b6b', marginBottom: '1rem', background: 'rgba(255,0,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>
          {error}
          <br/>
          <small>Please type your description below instead.</small>
        </div>
      )}

      <div style={{ margin: '2rem 0' }}>
        <button
          onClick={startListening}
          disabled={isListening}
          className={isListening ? 'glow' : ''}
        >
          {isListening ? '👂 Listening...' : '🎙️ Start Speaking'}
        </button>
      </div>

      <div style={{ margin: '2rem 0', borderTop: '1px solid #333', paddingTop: '1rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#888' }}>Or type description:</p>
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

      {transcript && (
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <p>"{transcript}"</p>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <button onClick={() => onSkip('brave loyal smart')} style={{ fontSize: '0.8em', opacity: 0.7 }}>
          (Skip / No Mic)
        </button>
      </div>
    </div>
  );
};

export default VoiceInput;
