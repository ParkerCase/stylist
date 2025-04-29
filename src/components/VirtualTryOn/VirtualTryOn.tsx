// Main virtual try-on component

import React, { useEffect, useState } from 'react';
import './VirtualTryOn.scss';
import TryOnCanvas from '@/components/TryOnCanvas';
import TryOnControls from '@/components/TryOnControls';
import ImageUploader from '@/components/ImageUploader';
import { useTryOn } from '@/hooks/useTryOn';
import { GarmentType, ProcessingStatus } from '@/types/tryOn';
import { Recommendation } from '@/types';
import { preloadBodyPixModel } from '@/services/background-removal/utils';

interface VirtualTryOnProps {
  onClose?: () => void;
  onSave?: (resultUrl: string) => void;
  onAddToLookbook?: (result: Recommendation.SavedOutfit) => void;
}

const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ onClose, onSave, onAddToLookbook }) => {
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
    clearUserImage,
    saveTryOnResult,
    closeTryOnModal
  } = useTryOn();
  
  const [activeGarmentId, setActiveGarmentId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(!userImage);
  const [savingToLookbook, setSavingToLookbook] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Preload the BodyPix model on component mount
  useEffect(() => {
    preloadBodyPixModel();
  }, []);
  
  // Focus on the active garment when it changes
  useEffect(() => {
    if (activeGarmentId && currentOutfit) {
      const garment = currentOutfit.garments.find(g => g.id === activeGarmentId);
      if (garment) {
        // Highlight the active garment in the controls
        const garmentElement = document.getElementById(`garment-${activeGarmentId}`);
        if (garmentElement) {
          garmentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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
  
  // Handle save to lookbook
  const handleSaveToLookbook = async () => {
    if (!canvasRef || !currentOutfit) return;
    
    try {
      setSavingToLookbook(true);
      const result = await saveTryOnResult();
      
      if (result) {
        // Call onSave if provided
        if (onSave) {
          onSave(result.resultImageUrl);
        }
        
        if (onAddToLookbook) {
          // Convert try-on result to saved outfit format
          const savedOutfit: Recommendation.SavedOutfit = {
            userId: 'current_user', // Should be updated with actual user ID
            outfitId: result.id,
            name: `Try-On Result ${new Date().toLocaleDateString()}`,
            items: currentOutfit.garments.map(g => g.id),
            savedAt: new Date(),
          };
          
          onAddToLookbook(savedOutfit);
        }
        
        setSaveSuccess(true);
        
        // Close modal after successful save with a delay
        setTimeout(() => {
          if (onClose) {
            onClose();
          } else {
            closeTryOnModal();
          }
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving to lookbook:', err);
    } finally {
      setSavingToLookbook(false);
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
  
  // Reset function to start over
  const handleReset = () => {
    clearUserImage();
    setShowUploader(true);
    setActiveGarmentId(null);
    setSaveSuccess(false);
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
          <ImageUploader 
            onUpload={handleImageUpload} 
            title="Upload or Take a Photo"
            description="Upload a photo or use your webcam to try on clothes"
          />
        ) : (
          <div className="stylist-virtual-try-on__canvas-container">
            <TryOnCanvas
              outfit={currentOutfit}
              userImage={userImage}
              setCanvasRef={setCanvasRef}
              onGarmentSelect={setActiveGarmentId}
              showBodyGuide={!userImage}
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
                  onClick={handleReset}
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
            onChangePhoto={handleReset}
            disabled={isLoading}
          />
        )}
      </div>
      
      {saveSuccess && (
        <div className="stylist-virtual-try-on__success">
          <div className="stylist-virtual-try-on__success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <p className="stylist-virtual-try-on__success-message">
            Saved to your Lookbook!
          </p>
        </div>
      )}
      
      <div className="stylist-virtual-try-on__footer">
        <button
          className="stylist-virtual-try-on__secondary-btn"
          onClick={handleClose}
        >
          Close
        </button>
        
        <button
          className="stylist-virtual-try-on__primary-btn"
          onClick={handleSaveToLookbook}
          disabled={
            isLoading || 
            !userImage || 
            userImage.processingStatus !== ProcessingStatus.COMPLETED ||
            !currentOutfit?.garments.length ||
            savingToLookbook ||
            saveSuccess
          }
        >
          {savingToLookbook ? 'Saving...' : (saveSuccess ? 'Saved!' : 'Save to Lookbook')}
        </button>
      </div>
    </div>
  );
};

export default VirtualTryOn;