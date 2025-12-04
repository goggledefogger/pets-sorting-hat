import React, { useRef, useEffect, useState } from 'react';

const CameraCapture = ({ onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Could not access camera. Please allow camera permissions.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      const { videoWidth, videoHeight } = videoRef.current;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
      const photoUrl = canvasRef.current.toDataURL('image/png');
      onCapture(photoUrl);
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="camera-container">
      <div className="video-wrapper" style={{
        border: '4px solid #D3A625',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        marginBottom: '1rem'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', maxWidth: '500px', display: 'block' }}
        />
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <button onClick={takePhoto} className="glow">
        📸 Capture Pet
      </button>
    </div>
  );
};

export default CameraCapture;
