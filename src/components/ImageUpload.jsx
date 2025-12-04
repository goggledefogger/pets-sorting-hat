import React, { useState, useEffect, useRef } from 'react';

const ImageUpload = ({ onCapture }) => {
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const url = URL.createObjectURL(blob);
          setPreview(url);
          onCapture(url);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onCapture]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setPreview(url);
      onCapture(url);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      setPreview(url);
      onCapture(url);
    }
  };

  return (
    <div
      className={`upload-container ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      style={{
        border: '4px dashed #D3A625',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
        background: dragActive ? 'rgba(211, 166, 37, 0.2)' : 'rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {preview ? (
        <div style={{ position: 'relative' }}>
          <img
            src={preview}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', boxShadow: '0 0 15px rgba(0,0,0,0.5)' }}
          />
          <p style={{ marginTop: '1rem', color: '#D3A625' }}>Click or Paste to change</p>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📁</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Upload or Paste Photo</h3>
          <p style={{ color: '#aaa', margin: 0 }}>Drag & drop, click to browse, or Ctrl+V to paste</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
