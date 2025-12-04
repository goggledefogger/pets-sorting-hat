import { useState, useEffect, useRef } from 'react';

export const useAudioLipSync = (audioRef, isSpeaking) => {
  const [mouthOpenAmount, setMouthOpenAmount] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isSpeaking || !audioRef.current) {
      setMouthOpenAmount(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const initAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        if (!analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.5;
        }

        if (!sourceRef.current) {
          // Create source only once
          try {
            sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
          } catch (e) {
            // Source might already be connected if re-using audio object
            console.warn("Source connection error (likely already connected):", e);
          }
        }

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const analyze = () => {
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;

          // Normalize average (0-255) to 0-1 range with some scaling
          // Typical speech might be around 20-100
          let amount = (average - 10) / 50;
          amount = Math.max(0, Math.min(1, amount)); // Clamp between 0 and 1

          setMouthOpenAmount(amount);

          rafRef.current = requestAnimationFrame(analyze);
        };

        analyze();

      } catch (error) {
        console.error("Audio Context Error:", error);
      }
    };

    initAudio();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isSpeaking, audioRef]);

  return mouthOpenAmount;
};
