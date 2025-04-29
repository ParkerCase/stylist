// Image uploader component with webcam support for try-on functionality

import React, { useState, useRef, useCallback, useEffect } from 'react';
import './ImageUploader.scss';
import { getFormattedFileSize, isImageFile } from '@/services/image-processing/fileUtils';

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  title?: string;
  description?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  title = 'Upload your photo',
  description = 'Take a photo or upload one to try on clothes'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUsingWebcam, setIsUsingWebcam] = useState(false);
  const [isCameraSupported, setIsCameraSupported] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Check if webcam is supported
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsCameraSupported(false);
    }
  }, []);
  
  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File | null) => {
      setError(null);
      
      if (!file) {
        setSelectedFile(null);
        setPreview(null);
        return;
      }
      
      // Validate file type
      if (!isImageFile(file) || !acceptedTypes.includes(file.type)) {
        setError(`Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`);
        return;
      }
      
      // Validate file size
      if (file.size > maxSize) {
        setError(
          `File size exceeds maximum allowed size of ${getFormattedFileSize(maxSize)}`
        );
        return;
      }
      
      // Set selected file
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [acceptedTypes, maxSize]
  );
  
  // Handle drop event
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      const file = e.dataTransfer.files?.[0] || null;
      handleFileSelect(file);
    },
    [handleFileSelect]
  );
  
  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      handleFileSelect(file);
    },
    [handleFileSelect]
  );
  
  // Open file dialog
  const handleButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);
  
  // Upload the selected file
  const handleUpload = useCallback(() => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  }, [selectedFile, onUpload]);
  
  // Start webcam
  const startWebcam = useCallback(async () => {
    setError(null);
    setIsUsingWebcam(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Could not access webcam. Please check permissions and try again.');
      setIsUsingWebcam(false);
    }
  }, []);
  
  // Stop webcam
  const stopWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsUsingWebcam(false);
  }, []);
  
  // Capture photo from webcam
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Create File object from blob
            const file = new File([blob], `webcam-photo-${Date.now()}.jpg`, {
              type: 'image/jpeg'
            });
            
            setSelectedFile(file);
            setPreview(canvas.toDataURL('image/jpeg'));
            stopWebcam();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  }, [stopWebcam]);
  
  // Clean up webcam on unmount
  useEffect(() => {
    return () => {
      if (isUsingWebcam) {
        stopWebcam();
      }
    };
  }, [isUsingWebcam, stopWebcam]);
  
  return (
    <div className="stylist-image-uploader">
      <div className="stylist-image-uploader__header">
        <h3 className="stylist-image-uploader__title">{title}</h3>
        <p className="stylist-image-uploader__description">{description}</p>
      </div>
      
      {isUsingWebcam ? (
        <div className="stylist-image-uploader__webcam">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="stylist-image-uploader__video"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          <div className="stylist-image-uploader__webcam-controls">
            <button
              type="button"
              className="stylist-image-uploader__capture-btn"
              onClick={capturePhoto}
            >
              Take Photo
            </button>
            <button
              type="button"
              className="stylist-image-uploader__cancel-btn"
              onClick={stopWebcam}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`stylist-image-uploader__dropzone ${
            isDragging ? 'stylist-image-uploader__dropzone--active' : ''
          } ${preview ? 'stylist-image-uploader__dropzone--has-preview' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={preview ? undefined : handleButtonClick}
        >
          {preview ? (
            <div className="stylist-image-uploader__preview">
              <img src={preview} alt="Upload preview" />
            </div>
          ) : (
            <div className="stylist-image-uploader__placeholder">
              <div className="stylist-image-uploader__icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
              </div>
              <p className="stylist-image-uploader__message">
                Drag & drop your photo here or{' '}
                <span className="stylist-image-uploader__browse">browse</span>
              </p>
              <p className="stylist-image-uploader__info">
                Accepted formats: {acceptedTypes.map(t => t.replace('image/', '.')).join(', ')}
                <br />
                Max size: {getFormattedFileSize(maxSize)}
              </p>
            </div>
          )}
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="stylist-image-uploader__input"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInputChange}
          />
        </div>
      )}
      
      {error && <div className="stylist-image-uploader__error">{error}</div>}
      
      <div className="stylist-image-uploader__actions">
        {!isUsingWebcam && (
          <>
            {preview ? (
              <button
                className="stylist-image-uploader__change-btn"
                onClick={handleButtonClick}
              >
                Change Photo
              </button>
            ) : isCameraSupported && (
              <button
                className="stylist-image-uploader__webcam-btn"
                onClick={startWebcam}
              >
                Use Webcam
              </button>
            )}
            
            <button
              className="stylist-image-uploader__upload-btn"
              onClick={handleUpload}
              disabled={!selectedFile}
            >
              {selectedFile ? 'Continue' : 'Upload a Photo'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;