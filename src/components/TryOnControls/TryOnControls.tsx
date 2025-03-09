// TryOnControls component for adjusting garments
import React, { useState, useRef } from 'react';
import './TryOnControls.scss';
import { OutfitTryOn, GarmentInfo, GarmentType } from '@/types/tryOn';

interface TryOnControlsProps {
  outfit: OutfitTryOn | null;
  activeGarmentId: string | null;
  onGarmentSelect: (garmentId: string | null) => void;
  onGarmentRemove: (garmentId: string) => void;
  onGarmentUpdate: (garmentId: string, updates: Partial<GarmentInfo>) => void;
  onGarmentAdd: (file: File, type: GarmentType) => void;
  onChangePhoto: () => void;
  disabled?: boolean;
}

const TryOnControls: React.FC<TryOnControlsProps> = ({
  outfit,
  activeGarmentId,
  onGarmentSelect,
  onGarmentRemove,
  onGarmentUpdate,
  onGarmentAdd,
  onChangePhoto,
  disabled = false
}) => {
  const [showGarments, setShowGarments] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showAddGarment, setShowAddGarment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedGarmentType, setSelectedGarmentType] = useState<GarmentType | null>(null);

  // Get active garment details
  const activeGarment = outfit?.garments.find(g => g.id === activeGarmentId);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedGarmentType) {
      onGarmentAdd(file, selectedGarmentType);
      // Reset
      setSelectedGarmentType(null);
      setShowAddGarment(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Open file dialog for the selected garment type
  const handleAddGarment = (type: GarmentType) => {
    setSelectedGarmentType(type);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Update scale value
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeGarmentId) {
      const scale = parseFloat(e.target.value);
      onGarmentUpdate(activeGarmentId, { scale });
    }
  };

  // Update position (offset)
  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    if (activeGarmentId && activeGarment?.offset) {
      const newOffset = { ...activeGarment.offset };
      newOffset[axis] = value;
      onGarmentUpdate(activeGarmentId, { offset: newOffset });
    }
  };

  // Update rotation
  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeGarmentId) {
      const rotation = parseFloat(e.target.value);
      onGarmentUpdate(activeGarmentId, { rotation });
    }
  };

  // Toggle flip horizontal
  const handleFlipHorizontal = () => {
    if (activeGarmentId) {
      onGarmentUpdate(activeGarmentId, { 
        flipHorizontal: !(activeGarment?.flipHorizontal || false) 
      });
    }
  };

  return (
    <div className="stylist-try-on-controls">
      {/* Garments Section */}
      <div className="stylist-try-on-controls__section">
        <div 
          className="stylist-try-on-controls__section-header"
          onClick={() => setShowGarments(!showGarments)}
        >
          <h3 className="stylist-try-on-controls__section-title">Garments</h3>
          <span className="stylist-try-on-controls__section-toggle">
            {showGarments ? '−' : '+'}
          </span>
        </div>
        
        {showGarments && (
          <div className="stylist-try-on-controls__section-content">
            {(!outfit?.garments || outfit.garments.length === 0) ? (
              <div className="stylist-try-on-controls__empty">
                No garments added yet. Add a garment below.
              </div>
            ) : (
              <div className="stylist-try-on-controls__garment-list">
                {outfit.garments.map(garment => (
                  <div 
                    key={garment.id}
                    className={`stylist-try-on-controls__garment-thumbnail ${
                      activeGarmentId === garment.id ? 'stylist-try-on-controls__garment-thumbnail--active' : ''
                    }`}
                    onClick={() => onGarmentSelect(garment.id)}
                  >
                    <div className="stylist-try-on-controls__garment-image">
                      <img src={garment.url} alt={garment.type} />
                    </div>
                    <div className="stylist-try-on-controls__garment-type">
                      {garment.type}
                    </div>
                    <button 
                      className="stylist-try-on-controls__garment-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGarmentRemove(garment.id);
                      }}
                      aria-label="Remove garment"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Garment */}
            <div className="stylist-try-on-controls__add-garment">
              <button
                className="stylist-try-on-controls__button stylist-try-on-controls__button--full-width"
                onClick={() => setShowAddGarment(!showAddGarment)}
                disabled={disabled}
              >
                {showAddGarment ? 'Cancel' : '+ Add Garment'}
              </button>
              
              {showAddGarment && (
                <div className="stylist-try-on-controls__garment-types" style={{ marginTop: '8px' }}>
                  <span className="stylist-try-on-controls__label">Select garment type:</span>
                  <div className="stylist-try-on-controls__button-group">
                    <button 
                      className="stylist-try-on-controls__button"
                      onClick={() => handleAddGarment(GarmentType.TOP)}
                      disabled={disabled}
                    >
                      Top
                    </button>
                    <button 
                      className="stylist-try-on-controls__button"
                      onClick={() => handleAddGarment(GarmentType.BOTTOM)}
                      disabled={disabled}
                    >
                      Bottom
                    </button>
                    <button 
                      className="stylist-try-on-controls__button"
                      onClick={() => handleAddGarment(GarmentType.DRESS)}
                      disabled={disabled}
                    >
                      Dress
                    </button>
                    <button 
                      className="stylist-try-on-controls__button"
                      onClick={() => handleAddGarment(GarmentType.OUTERWEAR)}
                      disabled={disabled}
                    >
                      Outerwear
                    </button>
                    <button 
                      className="stylist-try-on-controls__button"
                      onClick={() => handleAddGarment(GarmentType.SHOES)}
                      disabled={disabled}
                    >
                      Shoes
                    </button>
                    <button 
                      className="stylist-try-on-controls__button"
                      onClick={() => handleAddGarment(GarmentType.ACCESSORY)}
                      disabled={disabled}
                    >
                      Accessory
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="stylist-try-on-controls__input"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Adjustment Controls Section */}
      {activeGarment && (
        <div className="stylist-try-on-controls__section">
          <div 
            className="stylist-try-on-controls__section-header"
            onClick={() => setShowControls(!showControls)}
          >
            <h3 className="stylist-try-on-controls__section-title">Adjustments</h3>
            <span className="stylist-try-on-controls__section-toggle">
              {showControls ? '−' : '+'}
            </span>
          </div>
          
          {showControls && (
            <div className="stylist-try-on-controls__section-content">
              <div className="stylist-try-on-controls__garment-controls">
                {/* Scale Control */}
                <div className="stylist-try-on-controls__control-group">
                  <label className="stylist-try-on-controls__label">
                    Size
                    <span className="stylist-try-on-controls__value">
                      {Math.round((activeGarment.scale || 1) * 100)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.05"
                    value={activeGarment.scale || 1}
                    onChange={handleScaleChange}
                    className="stylist-try-on-controls__slider"
                    disabled={disabled}
                  />
                </div>
                
                {/* Position X Control */}
                <div className="stylist-try-on-controls__control-group">
                  <label className="stylist-try-on-controls__label">
                    Position X
                    <span className="stylist-try-on-controls__value">
                      {activeGarment.offset?.x || 0}px
                    </span>
                  </label>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="1"
                    value={activeGarment.offset?.x || 0}
                    onChange={(e) => handlePositionChange('x', parseInt(e.target.value))}
                    className="stylist-try-on-controls__slider"
                    disabled={disabled}
                  />
                </div>
                
                {/* Position Y Control */}
                <div className="stylist-try-on-controls__control-group">
                  <label className="stylist-try-on-controls__label">
                    Position Y
                    <span className="stylist-try-on-controls__value">
                      {activeGarment.offset?.y || 0}px
                    </span>
                  </label>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="1"
                    value={activeGarment.offset?.y || 0}
                    onChange={(e) => handlePositionChange('y', parseInt(e.target.value))}
                    className="stylist-try-on-controls__slider"
                    disabled={disabled}
                  />
                </div>
                
                {/* Rotation Control */}
                <div className="stylist-try-on-controls__control-group">
                  <label className="stylist-try-on-controls__label">
                    Rotation
                    <span className="stylist-try-on-controls__value">
                      {activeGarment.rotation || 0}°
                    </span>
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={activeGarment.rotation || 0}
                    onChange={handleRotationChange}
                    className="stylist-try-on-controls__slider"
                    disabled={disabled}
                  />
                </div>
                
                {/* Flip Horizontal */}
                <div className="stylist-try-on-controls__control-group">
                  <button
                    className={`stylist-try-on-controls__button ${
                      activeGarment.flipHorizontal ? 'stylist-try-on-controls__button--active' : ''
                    }`}
                    onClick={handleFlipHorizontal}
                    disabled={disabled}
                  >
                    Flip Horizontal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Photo Section */}
      <div className="stylist-try-on-controls__section">
        <div className="stylist-try-on-controls__section-header">
          <h3 className="stylist-try-on-controls__section-title">Photo</h3>
        </div>
        <div className="stylist-try-on-controls__section-content">
          <button
            className="stylist-try-on-controls__button stylist-try-on-controls__button--full-width"
            onClick={onChangePhoto}
            disabled={disabled}
          >
            Change Photo
          </button>
        </div>
      </div>
    </div>
  );
};

export default TryOnControls;