// Main virtual try-on component

import React, { useEffect, useState } from 'react';
import './VirtualTryOn.scss';
import TryOnCanvas from '@/components/TryOnCanvas';
import TryOnControls from '@/components/TryOnControls';
import ImageUploader from '@/components/ImageUploader';
import { useTryOn } from '@/hooks/useTryOn';
import { GarmentType, ProcessingStatus } from '@/types/tryOn';

interface VirtualTryOnProps {
  onClose?: () => void;
  onSave?: (resultUrl: string) => void;
}

const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ onClose, onSave }) => {
  const {
    currentOutfit,
    userImage,
    isLoading,
    error,
    canvasRef,
    setCanvasRef,
    uploadUserImage,
    addGarment,
    removeGarment,
    updateGarmentProperties,
    /* clearUserImage, */
    saveTryOnResult,
    closeTryOnModal
  } = useTryOn();
  
  const [activeGarmentId, setActiveGarmentId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(!userImage);
  
  // Focus on the active garment when it changes
  useEffect(() => {
    if (activeGarmentId && currentOutfit) {
      const garment = currentOutfit.garments.find(g => g.id === activeGarmentId);
      if (garment) {
        // Could implement scrolling or highlighting here
      }
    }
  }, [activeGarmentId, currentOutfit]);
  
  // Show uploader if no user image is available
  useEffect(() => {
    if (!userImage) {
      setShowUploader(true);
    }
  }, [userImage]);
  
  // Handle image upload
  const handleImageUpload = async (file: File) => {
    await uploadUserImage(file);
    setShowUploader(false);
  };
  
  // Handle garment upload
  const handleGarmentUpload = async (file: File, type: GarmentType) => {
    await addGarment(file, type);
  };
  
  // Handle save
  const handleSave = async () => {
    if (canvasRef) {
      const result = await saveTryOnResult();
      if (result && onSave) {
        onSave(result.resultImageUrl);
      }
    }
  };
  
  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeTryOnModal();
    }
  };
  
  return (
    <div className="stylist-virtual-try-on">
      <div className="stylist-virtual-try-on__header">
        <h2 className="stylist-virtual-try-on__title">Virtual Try-On</h2>
        <button
          className="stylist-virtual-try-on__close-btn"
          onClick={handleClose}
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
      
      <div className="stylist-virtual-try-on__content">
        {showUploader ? (
          <ImageUploader onUpload={handleImageUpload} />
        ) : (
          <div className="stylist-virtual-try-on__canvas-container">
            <TryOnCanvas
              outfit={currentOutfit}
              userImage={userImage}
              setCanvasRef={setCanvasRef}
              onGarmentSelect={setActiveGarmentId}
            />
            
            {userImage?.processingStatus === ProcessingStatus.REMOVING_BACKGROUND && (
              <div className="stylist-virtual-try-on__processing">
                <div className="stylist-virtual-try-on__spinner"></div>
                <p>Removing background...</p>
              </div>
            )}
            
            {error && (
              <div className="stylist-virtual-try-on__error">
                <p>{error}</p>
                <button
                  className="stylist-virtual-try-on__retry-btn"
                  onClick={() => setShowUploader(true)}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
        
        {!showUploader && userImage && (
          <TryOnControls
            outfit={currentOutfit}
            activeGarmentId={activeGarmentId}
            onGarmentSelect={setActiveGarmentId}
            onGarmentRemove={removeGarment}
            onGarmentUpdate={updateGarmentProperties}
            onGarmentAdd={handleGarmentUpload}
            onChangePhoto={() => setShowUploader(true)}
            disabled={isLoading}
          />
        )}
      </div>
      
      <div className="stylist-virtual-try-on__footer">
        <button
          className="stylist-virtual-try-on__secondary-btn"
          onClick={handleClose}
        >
          Cancel
        </button>
        
        <button
          className="stylist-virtual-try-on__primary-btn"
          onClick={handleSave}
          disabled={isLoading || !userImage || userImage.processingStatus !== ProcessingStatus.COMPLETED}
        >
          Save Look
        </button>
      </div>
    </div>
  );
};

export default VirtualTryOn;
