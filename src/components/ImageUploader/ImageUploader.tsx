// Image uploader component with enhanced webcam support for try-on functionality

import React, { useState, useRef, useCallback, useEffect } from 'react';
import './ImageUploader.scss';
import { getFormattedFileSize, isImageFile } from '@/services/image-processing/fileUtils';

export enum CameraFacing {
  USER = 'user',
  ENVIRONMENT = 'environment'
}

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  title?: string;
  description?: string;
  countdownDuration?: number; // in seconds
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  title = 'Upload your photo',
  description = 'Take a photo or upload one to try on clothes',
  countdownDuration = 5
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUsingWebcam, setIsUsingWebcam] = useState(false);
  const [isCameraSupported, setIsCameraSupported] = useState(true);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>(CameraFacing.USER);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  // Check if webcam is supported
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setIsCameraSupported(false);
          return;
        }

        if (navigator.mediaDevices.enumerateDevices) {
          try {
            // Request camera permission first
            await navigator.mediaDevices.getUserMedia({ video: true });

            // Get available devices after permission is granted
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            setCameraDevices(videoDevices);

            if (videoDevices.length === 0) {
              setIsCameraSupported(false);
            }
          } catch (err) {
            console.warn('Camera permission denied:', err);
            setPermissionDenied(true);
            setIsCameraSupported(true); // Still mark as supported, just permission denied
          }
        }
      } catch (err) {
        console.warn('Error checking camera support:', err);
        setIsCameraSupported(false);
      }
    };

    checkCameraSupport();
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

  // Start webcam with specific device or facing mode
  const startWebcam = useCallback(async (deviceIdOrFacing?: string | CameraFacing) => {
    setError(null);
    setIsUsingWebcam(true);

    try {
      // Clear any existing stream first
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      // Configure video constraints
      let videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      };

      // If device ID specified, use it
      if (typeof deviceIdOrFacing === 'string' && deviceIdOrFacing.length > 0) {
        videoConstraints.deviceId = { exact: deviceIdOrFacing };
        setActiveCameraId(deviceIdOrFacing);
      }
      // Otherwise use facing mode
      else if (deviceIdOrFacing === CameraFacing.USER || deviceIdOrFacing === CameraFacing.ENVIRONMENT) {
        videoConstraints.facingMode = deviceIdOrFacing;
        setCameraFacing(deviceIdOrFacing);
      }
      // Default to user facing
      else {
        videoConstraints.facingMode = CameraFacing.USER;
        setCameraFacing(CameraFacing.USER);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setPermissionDenied(false);
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);

      if ((err as DOMException).name === 'NotAllowedError' ||
          (err as DOMException).name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Camera access denied. Please enable camera permissions in your browser settings.');
      } else if ((err as DOMException).name === 'NotFoundError' ||
                 (err as DOMException).name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera or try a different device.');
      } else {
        setError('Could not access camera. Please try again or use a different method.');
      }

      setIsUsingWebcam(false);
    }
  }, []);

  // Stop webcam
  const stopWebcam = useCallback(() => {
    // Clear any ongoing countdown
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setCountdownTimer(null);
    }

    setIsCapturing(false);

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();

      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsUsingWebcam(false);
  }, []);

  // Switch camera
  const switchCamera = useCallback(() => {
    const newFacing = cameraFacing === CameraFacing.USER
      ? CameraFacing.ENVIRONMENT
      : CameraFacing.USER;

    startWebcam(newFacing);
  }, [cameraFacing, startWebcam]);

  // Start capture countdown
  const startCaptureCountdown = useCallback(() => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
    }

    setIsCapturing(true);
    setCountdownTimer(countdownDuration);

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdownTimer(prev => {
        if (prev === null || prev <= 1) {
          // Time to capture when countdown reaches 0
          if (countdownIntervalRef.current) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          // Take the photo
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdownDuration]);

  // Capture photo from webcam
  const capturePhoto = useCallback(() => {
    setIsCapturing(false);

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        // If front camera, flip the image horizontally
        if (cameraFacing === CameraFacing.USER) {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Reset transform if we flipped
        if (cameraFacing === CameraFacing.USER) {
          context.setTransform(1, 0, 0, 1, 0, 0);
        }

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
  }, [stopWebcam, cameraFacing]);

  // Cancel countdown
  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setCountdownTimer(null);
      setIsCapturing(false);
    }
  }, []);

  // Clean up webcam on unmount
  useEffect(() => {
    return () => {
      if (isUsingWebcam) {
        stopWebcam();
      }
    };
  }, [isUsingWebcam, stopWebcam]);

  // Select specific camera device
  const selectCamera = useCallback((deviceId: string) => {
    startWebcam(deviceId);
  }, [startWebcam]);

  // Reset choices
  const resetChoices = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);

    if (isUsingWebcam) {
      stopWebcam();
    }
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
            className={`stylist-image-uploader__video ${
              cameraFacing === CameraFacing.USER ? 'stylist-image-uploader__video--mirror' : ''
            }`}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Countdown overlay */}
          {countdownTimer !== null && (
            <div className="stylist-image-uploader__countdown">
              <div className="stylist-image-uploader__countdown-number">
                {countdownTimer}
              </div>
            </div>
          )}

          <div className="stylist-image-uploader__webcam-controls">
            {/* Show main action buttons when not capturing */}
            {!isCapturing && (
              <>
                <button
                  type="button"
                  className="stylist-image-uploader__capture-btn"
                  onClick={startCaptureCountdown}
                >
                  Take Photo
                </button>

                {/* Show camera switch button if multiple cameras are available or facing modes are supported */}
                {(cameraDevices.length > 1 ||
                  ('mediaDevices' in navigator && 'getSupportedConstraints' in navigator.mediaDevices &&
                   navigator.mediaDevices.getSupportedConstraints().facingMode)) && (
                  <button
                    type="button"
                    className="stylist-image-uploader__switch-camera-btn"
                    onClick={switchCamera}
                  >
                    Switch Camera
                  </button>
                )}

                <button
                  type="button"
                  className="stylist-image-uploader__cancel-btn"
                  onClick={stopWebcam}
                >
                  Cancel
                </button>
              </>
            )}

            {/* Show cancel button during capture countdown */}
            {isCapturing && (
              <button
                type="button"
                className="stylist-image-uploader__cancel-countdown-btn"
                onClick={cancelCountdown}
              >
                Cancel Timer
              </button>
            )}
          </div>

          {/* Camera device selector if multiple devices */}
          {cameraDevices.length > 1 && !isCapturing && (
            <div className="stylist-image-uploader__camera-selector">
              <select
                value={activeCameraId || ''}
                onChange={(e) => selectCamera(e.target.value)}
                className="stylist-image-uploader__camera-select"
              >
                {cameraDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${cameraDevices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
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

      {/* Permission denied message with instructions */}
      {permissionDenied && !isUsingWebcam && (
        <div className="stylist-image-uploader__permission-message">
          <p>Camera access was denied. To enable your camera:</p>
          <ul>
            <li>Check your browser's address bar for camera permission icon</li>
            <li>Make sure your device has a working camera</li>
            <li>Try using the file upload option instead</li>
          </ul>
        </div>
      )}

      <div className="stylist-image-uploader__actions">
        {!isUsingWebcam && (
          <>
            {preview ? (
              <>
                <button
                  className="stylist-image-uploader__change-btn"
                  onClick={handleButtonClick}
                >
                  Change Photo
                </button>
                <button
                  className="stylist-image-uploader__reset-btn"
                  onClick={resetChoices}
                >
                  Start Over
                </button>
              </>
            ) : (
              <>
                {/* Only show webcam button if camera is supported */}
                {isCameraSupported && (
                  <button
                    className="stylist-image-uploader__webcam-btn"
                    onClick={() => startWebcam()}
                  >
                    Use Camera
                  </button>
                )}
              </>
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