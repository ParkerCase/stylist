// Main virtual try-on component

import React, { useEffect, useState, useCallback, useRef } from 'react';
import './VirtualTryOn.scss';
import TryOnCanvas from '@/components/TryOnCanvas';
import TryOnControls from '@/components/TryOnControls';
import TryOnFeedback from '@/components/TryOnFeedback';
import ImageUploader from '@/components/ImageUploader';
import { useTryOn } from '@/hooks/useTryOn';
import { GarmentType, ProcessingStatus } from '@/types/tryOn';
import { Recommendation } from '@/types';
import { preloadBodyPixModel } from '@/services/background-removal/utils';
import { useRecommendationStore } from '@/store/recommendationStore';
import AdaptiveImage from '@/components/common/AdaptiveImage';
import { getDeviceCapabilities } from '@/utils/deviceCapabilities';

// Define CameraFacing enum since it might not be exported from ImageUploader
enum CameraFacing {
  FRONT = 'user',
  BACK = 'environment'
}

// Try-on flow steps
enum TryOnStep {
  SELECT_IMAGE = 'select_image',
  SELECT_ITEM = 'select_item',
  PREVIEW = 'preview',
  CAPTURE = 'capture',
  REVIEW = 'review',
  ACTION = 'action'
}

interface VirtualTryOnProps {
  onClose?: () => void;
  onSave?: (resultUrl: string) => void;
  onAddToLookbook?: (result: Recommendation.SavedOutfit) => void;
  primaryColor?: string;
}

const VirtualTryOn: React.FC<VirtualTryOnProps> = ({
  onClose,
  onSave,
  onAddToLookbook,
  primaryColor = '#3f51b5'
}) => {
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

  // Get recommendation store functions
  const { addToWishlist, addToCart } = useRecommendationStore();

  const [activeGarmentId, setActiveGarmentId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(!userImage);
  const [savingToLookbook, setSavingToLookbook] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Track visibility to optimize model loading
  const [isVisible, setIsVisible] = useState(false);

  // Use a ref to ensure we only load the model once
  const modelLoaded = React.useRef(false);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  // Try-on flow state
  const [currentStep, setCurrentStep] = useState<TryOnStep>(TryOnStep.SELECT_IMAGE);
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const [captureInProgress, setCaptureInProgress] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Check WebGL support on mount
  useEffect(() => {
    // Function to check WebGL support
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
          console.warn('WebGL not supported');
          setWebglSupported(false);
          return false;
        }

        // Use a more comprehensive check for compatibility
        const isWebGLFullySupported = () => {
          try {
            // Test for required extensions
            const extensions = [
              'OES_texture_float',
              'WEBGL_color_buffer_float',
              'OES_element_index_uint'
            ];

            // Need to cast gl to WebGLRenderingContext to access getExtension method
            const webGLContext = gl as unknown as WebGLRenderingContext;
            const supportedExtensions = extensions.filter(ext => webGLContext.getExtension(ext));

            // If most extensions are supported, consider it supported
            return supportedExtensions.length >= 2;
          } catch (e) {
            console.warn('Error testing WebGL extensions:', e);
            return false;
          }
        };

        // Check if WebGL is fully supported for TensorFlow.js
        const fullySupported = isWebGLFullySupported();

        setWebglSupported(true);
        return fullySupported;
      } catch (e) {
        console.warn('Error checking WebGL support:', e);
        setWebglSupported(false);
        return false;
      }
    };

    checkWebGLSupport();
  }, []);

  // Create an observer to detect when the component is visible
  useEffect(() => {
    if (!userImage) return;

    // Set component as visible
    setIsVisible(true);

    // Only preload the model if it hasn't been loaded yet, the component is visible, and WebGL is supported
    if (isVisible && !modelLoaded.current && webglSupported !== false) {
      modelLoaded.current = true;

      // Preload with error handling
      preloadBodyPixModel().catch(err => {
        console.warn('Error preloading BodyPix model:', err);
        // No need to set an error state here as the background removal process
        // will handle errors gracefully
      });
    }
  }, [userImage, isVisible, webglSupported]);

  // Update the current step based on state changes
  useEffect(() => {
    if (!userImage) {
      setCurrentStep(TryOnStep.SELECT_IMAGE);
      return;
    }

    if (userImage.processingStatus === ProcessingStatus.REMOVING_BACKGROUND) {
      setCurrentStep(TryOnStep.SELECT_IMAGE);
      return;
    }

    if (userImage.processingStatus === ProcessingStatus.COMPLETED) {
      if (!currentOutfit || !currentOutfit.garments || currentOutfit.garments.length === 0) {
        setCurrentStep(TryOnStep.SELECT_ITEM);
        return;
      }

      if (captureInProgress) {
        setCurrentStep(TryOnStep.CAPTURE);
        return;
      }

      if (reviewMode) {
        setCurrentStep(TryOnStep.REVIEW);
        return;
      }

      if (activeGarmentId) {
        setCurrentStep(TryOnStep.ACTION);
        return;
      }

      setCurrentStep(TryOnStep.PREVIEW);
    }
  }, [
    userImage,
    currentOutfit,
    activeGarmentId,
    captureInProgress,
    reviewMode
  ]);

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

  // Start capture countdown
  const startCaptureCountdown = useCallback(() => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
    }

    setCaptureInProgress(true);
    setCountdownTimer(5); // 5 second countdown

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdownTimer(prev => {
        if (prev === null || prev <= 1) {
          // Time to capture when countdown reaches 0
          if (countdownIntervalRef.current) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          // Take the photo
          captureCurrentImage();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cancel countdown
  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setCountdownTimer(null);
      setCaptureInProgress(false);
    }
  }, []);

  // Capture current canvas state
  const captureCurrentImage = useCallback(() => {
    if (!canvasRef) return;

    try {
      // Get image data URL from canvas
      const imageUrl = canvasRef.toDataURL('image/jpeg');
      setCapturedImage(imageUrl);
      setReviewMode(true);
      setCaptureInProgress(false);
    } catch (err) {
      console.error('Error capturing image:', err);
      setCaptureInProgress(false);
    }
  }, [canvasRef]);

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
            id: result.id, // Use the same ID as outfitId
            name: `Try-On Result ${new Date().toLocaleDateString()}`,
            items: currentOutfit?.garments?.map(g => g.id) || [],
            savedAt: new Date(),
            imageUrl: result.resultImageUrl || '',
            createdAt: new Date()
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
    setReviewMode(false);
    setCapturedImage(null);

    // Clear any countdown timer
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setCountdownTimer(null);
    }

    setCaptureInProgress(false);
  };

  // Convert garment to wishlist item
  const handleAddToWishlist = (garmentId: string) => {
    if (!currentOutfit || !currentOutfit.garments) return;

    const garment = currentOutfit.garments.find(g => g.id === garmentId);
    if (!garment) return;

    // Create a wishlist item from garment
    const wishlistItem = {
      itemId: garment.id,
      retailerId: 'default_retailer_id', // Add required retailerId
      name: garment.type || 'Garment',
      addedAt: new Date(),
      imageUrl: garment.url || '',
      price: 0 // Mock price, would come from product data
    };

    // Add to wishlist
    addToWishlist(wishlistItem);
    alert('Item added to wishlist!');
  };

  // Convert garment to cart item
  const handleAddToCart = (garmentId: string) => {
    if (!currentOutfit || !currentOutfit.garments) return;

    const garment = currentOutfit.garments.find(g => g.id === garmentId);
    if (!garment) return;

    // Create a cart item from garment
    const cartItem = {
      itemId: garment.id,
      retailerId: 'default_retailer_id', // Add required retailerId
      name: garment.type || 'Garment',
      price: 0, // Mock price, would come from product data
      quantity: 1,
      imageUrl: garment.url || '',
      addedAt: new Date() // Add required addedAt field
    };

    // Add to cart
    addToCart(cartItem);
    alert('Item added to cart!');
  };

  // Discard current review and return to preview
  const handleDiscardReview = () => {
    setReviewMode(false);
    setCapturedImage(null);
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { id: TryOnStep.SELECT_IMAGE, name: 'Choose Photo' },
      { id: TryOnStep.SELECT_ITEM, name: 'Select Item' },
      { id: TryOnStep.PREVIEW, name: 'Preview' },
      { id: TryOnStep.REVIEW, name: 'Review' },
      { id: TryOnStep.ACTION, name: 'Complete' }
    ];

    return (
      <div className="stylist-virtual-try-on__steps">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`stylist-virtual-try-on__step ${
              currentStep === step.id ? 'stylist-virtual-try-on__step--active' : ''
            } ${
              // Determine completed steps
              (currentStep === TryOnStep.SELECT_ITEM && index === 0) ||
              (currentStep === TryOnStep.PREVIEW && index < 2) ||
              (currentStep === TryOnStep.CAPTURE && index < 2) ||
              (currentStep === TryOnStep.REVIEW && index < 3) ||
              (currentStep === TryOnStep.ACTION && index < 4)
                ? 'stylist-virtual-try-on__step--completed'
                : ''
            }`}
          >
            <div className="stylist-virtual-try-on__step-number">
              {index + 1}
            </div>
            <div className="stylist-virtual-try-on__step-name">
              {step.name}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="stylist-virtual-try-on">
      <div className="stylist-virtual-try-on__header" style={{ backgroundColor: primaryColor }}>
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

      {/* Step indicator */}
      {renderStepIndicator()}

      <div className="stylist-virtual-try-on__content">
        {showUploader ? (
          <ImageUploader
            onUpload={handleImageUpload}
            title="Upload or Take a Photo"
            description="Upload a photo or use your webcam to try on clothes"
            countdownDuration={5}
          />
        ) : (
          <div className="stylist-virtual-try-on__canvas-container">
            {/* Review mode displays the captured image */}
            {reviewMode && capturedImage ? (
              <div className="stylist-virtual-try-on__review">
                <AdaptiveImage
                  src={capturedImage || ''}
                  alt="Try-on preview"
                  className="stylist-virtual-try-on__review-image"
                  loadingPriority="high"
                  quality="high"
                />
                <div className="stylist-virtual-try-on__review-actions">
                  <button
                    className="stylist-virtual-try-on__review-action stylist-virtual-try-on__review-action--discard"
                    onClick={handleDiscardReview}
                  >
                    Discard
                  </button>
                  <button
                    className="stylist-virtual-try-on__review-action stylist-virtual-try-on__review-action--save"
                    onClick={handleSaveToLookbook}
                    style={{ backgroundColor: primaryColor }}
                  >
                    Save to Lookbook
                  </button>
                </div>
                <div className="stylist-virtual-try-on__review-feedback">
                  <p>How does it look?</p>
                  <div className="stylist-virtual-try-on__review-feedback-buttons">
                    <button className="stylist-virtual-try-on__review-feedback-button">
                      👍 Love it!
                    </button>
                    <button className="stylist-virtual-try-on__review-feedback-button">
                      👎 Not for me
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Regular try-on canvas
              <TryOnCanvas
                outfit={currentOutfit}
                userImage={userImage}
                setCanvasRef={setCanvasRef}
                onGarmentSelect={setActiveGarmentId}
                showBodyGuide={!userImage}
              />
            )}

            {/* Countdown overlay */}
            {captureInProgress && countdownTimer !== null && (
              <div className="stylist-virtual-try-on__countdown">
                <div className="stylist-virtual-try-on__countdown-number">
                  {countdownTimer}
                </div>
                <button
                  className="stylist-virtual-try-on__countdown-cancel"
                  onClick={cancelCountdown}
                >
                  Cancel
                </button>
              </div>
            )}

            {userImage?.processingStatus === ProcessingStatus.REMOVING_BACKGROUND && (
              <div className="stylist-virtual-try-on__processing">
                <div className="stylist-virtual-try-on__spinner"></div>
                <p>Removing background...</p>
              </div>
            )}

            {webglSupported === false && userImage && (
              <div className="stylist-virtual-try-on__warning">
                <p>
                  <strong>Note:</strong> 3D graphics acceleration (WebGL) may not be fully supported in your browser.
                  Background removal might use the original image.
                </p>
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

            {/* Try-on action controls - only shown in ACTION step */}
            {!reviewMode && currentStep === TryOnStep.ACTION &&
             userImage?.processingStatus === ProcessingStatus.COMPLETED &&
             currentOutfit?.garments && currentOutfit.garments.length > 0 &&
             activeGarmentId && (
              <TryOnFeedback
                garmentId={activeGarmentId}
                onLike={(garmentId) => {
                  // Find the garment in the outfit
                  const garment = currentOutfit?.garments?.find(g => g.id === garmentId);
                  if (garment) {
                    // Log a positive feedback to AI model
                    console.log('Liked garment:', garmentId);
                    alert('Thanks for your feedback!');
                  }
                }}
                onDislike={(garmentId) => {
                  // Find the garment in the outfit
                  const garment = currentOutfit?.garments?.find(g => g.id === garmentId);
                  if (garment) {
                    // Remove from try-on queue
                    removeGarment(garmentId);
                    // Log a negative feedback to AI model
                    console.log('Disliked garment:', garmentId);
                    alert('Item removed. We\'ll note your preference.');
                  }
                }}
                onAddToWishlist={handleAddToWishlist}
                onAddToCart={handleAddToCart}
                onSaveNote={(garmentId, note) => {
                  // Add note to garment for AI learning
                  console.log('Save note for garment:', garmentId, note);
                  alert('Note saved! We\'ll use this feedback to improve recommendations.');
                }}
                primaryColor={primaryColor}
              />
            )}

            {/* Main try-on action button - only shown in PREVIEW step */}
            {!reviewMode && currentStep === TryOnStep.PREVIEW &&
             userImage?.processingStatus === ProcessingStatus.COMPLETED &&
             currentOutfit?.garments && currentOutfit.garments.length > 0 && (
              <div className="stylist-virtual-try-on__capture-prompt">
                <p>Like how it looks? Take a photo!</p>
                <button
                  className="stylist-virtual-try-on__capture-button"
                  onClick={startCaptureCountdown}
                  style={{ backgroundColor: primaryColor }}
                >
                  Capture Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* Controls for selecting and arranging garments */}
        {!showUploader && userImage && !reviewMode && (
          <TryOnControls
            outfit={currentOutfit}
            activeGarmentId={activeGarmentId}
            onGarmentSelect={setActiveGarmentId}
            onGarmentRemove={removeGarment}
            onGarmentUpdate={updateGarmentProperties}
            onGarmentAdd={handleGarmentUpload}
            onChangePhoto={handleReset}
            disabled={isLoading || captureInProgress}
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

        {/* Only show save button in PREVIEW step when no action is in progress */}
        {!reviewMode && !captureInProgress && currentStep === TryOnStep.PREVIEW && (
          <button
            className="stylist-virtual-try-on__primary-btn"
            onClick={handleSaveToLookbook}
            disabled={
              isLoading ||
              !userImage ||
              userImage.processingStatus !== ProcessingStatus.COMPLETED ||
              !currentOutfit?.garments?.length ||
              savingToLookbook ||
              saveSuccess
            }
            style={{ backgroundColor: primaryColor }}
          >
            {savingToLookbook ? 'Saving...' : (saveSuccess ? 'Saved!' : 'Save to Lookbook')}
          </button>
        )}

        {/* Show capture button in PREVIEW step */}
        {!reviewMode && !captureInProgress && currentStep === TryOnStep.PREVIEW && (
          <button
            className="stylist-virtual-try-on__primary-btn"
            onClick={startCaptureCountdown}
            disabled={
              isLoading ||
              !userImage ||
              userImage.processingStatus !== ProcessingStatus.COMPLETED ||
              !currentOutfit?.garments?.length
            }
            style={{ backgroundColor: primaryColor }}
          >
            Take Photo
          </button>
        )}
      </div>
    </div>
  );
};

export default VirtualTryOn;