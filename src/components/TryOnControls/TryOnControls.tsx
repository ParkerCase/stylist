// TryOnControls component for adjusting garments
import React, { useState, useRef, useMemo } from 'react';
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

// Icon components to enhance visual display
const GarmentIcon = ({ type }: { type: GarmentType }) => {
  switch (type) {
    case GarmentType.TOP:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M16 4l4 5v11H4V9l4-5h8zm-7 5v5h6V9h-6z" />
        </svg>
      );
    case GarmentType.BOTTOM:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M7 6l-5 16h20L17 6h-2l-3 8-3-8H7z" />
        </svg>
      );
    case GarmentType.DRESS:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 2l-5 5v15h10V7l-5-5zm-3 5.5L12 4l3 3.5V20h-6V7.5z" />
        </svg>
      );
    case GarmentType.OUTERWEAR:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H4V5h16v14z" />
          <path d="M7 10h10v7H7z" />
        </svg>
      );
    case GarmentType.SHOES:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 13v7H5v-7l2-8h2l3 5 3-5h2l2 8z" />
        </svg>
      );
    case GarmentType.ACCESSORY:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M17 12c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm-10-3h2V9H7v8zm-4 0h2V9H3v8zm14-8h-2v2h2V9zm0 4h-2v2h2v-2z" />
        </svg>
      );
    default:
      return null;
  }
};

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedGarmentType, setSelectedGarmentType] = useState<GarmentType | null>(null);
  const [draggedGarmentId, setDraggedGarmentId] = useState<string | null>(null);

  // Get active garment details
  const activeGarment = outfit?.garments.find(g => g.id === activeGarmentId);

  // Group garments by type for organized display
  const garmentsByType = useMemo(() => {
    if (!outfit?.garments) return {};

    return outfit.garments.reduce((acc, garment) => {
      const type = garment.type || 'unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(garment);
      return acc;
    }, {} as Record<string, GarmentInfo[]>);
  }, [outfit?.garments]);

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

  // Handle batch actions
  const handleRemoveAllGarments = () => {
    if (outfit?.garments && outfit.garments.length > 0) {
      if (window.confirm('Remove all garments?')) {
        outfit.garments.forEach(garment => {
          onGarmentRemove(garment.id);
        });

        // Deselect active garment
        onGarmentSelect(null);
      }
    }
  };

  // Handle drag and drop for reordering
  const handleDragStart = (e: React.DragEvent, garmentId: string) => {
    setDraggedGarmentId(garmentId);
    e.dataTransfer.setData('text/plain', garmentId);

    // Set a custom ghost image (optional)
    const garment = outfit?.garments.find(g => g.id === garmentId);
    if (garment) {
      const ghostImage = new Image();
      ghostImage.src = garment.url;
      e.dataTransfer.setDragImage(ghostImage, 25, 25);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetGarmentId: string) => {
    e.preventDefault();

    if (draggedGarmentId && draggedGarmentId !== targetGarmentId && outfit?.garments) {
      // Get current indices
      const sourceIndex = outfit.garments.findIndex(g => g.id === draggedGarmentId);
      const targetIndex = outfit.garments.findIndex(g => g.id === targetGarmentId);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Update layer index for dragged garment
        const layerIndex = outfit.garments[targetIndex].layerIndex;
        onGarmentUpdate(draggedGarmentId, { layerIndex });

        // Select the dropped garment
        onGarmentSelect(draggedGarmentId);
      }
    }

    setDraggedGarmentId(null);
  };

  // Toggle between grid and list view
  const toggleViewMode = () => {
    setViewMode(prevMode => prevMode === 'grid' ? 'list' : 'grid');
  };

  // Get number of garments tried on
  const garmentCount = outfit?.garments?.length || 0;

  return (
    <div className="stylist-try-on-controls">
      {/* Garments Section */}
      <div className="stylist-try-on-controls__section">
        <div
          className="stylist-try-on-controls__section-header"
          onClick={() => setShowGarments(!showGarments)}
        >
          <div className="stylist-try-on-controls__section-title-container">
            <h3 className="stylist-try-on-controls__section-title">Garments</h3>
            {garmentCount > 0 && (
              <span className="stylist-try-on-controls__item-count">{garmentCount}</span>
            )}
          </div>
          <div className="stylist-try-on-controls__header-actions">
            {garmentCount > 0 && (
              <button
                className="stylist-try-on-controls__view-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleViewMode();
                }}
                aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
              >
                {viewMode === 'grid' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M3 13h18v-2H3v2zm0 7h18v-2H3v2zm0-14h18V4H3v2z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
                  </svg>
                )}
              </button>
            )}
            <span className="stylist-try-on-controls__section-toggle">
              {showGarments ? '−' : '+'}
            </span>
          </div>
        </div>

        {showGarments && (
          <div className="stylist-try-on-controls__section-content">
            {(!outfit?.garments || outfit.garments.length === 0) ? (
              <div className="stylist-try-on-controls__empty">
                No garments added yet. Add a garment below.
              </div>
            ) : (
              <>
                {/* Batch actions toolbar */}
                <div className="stylist-try-on-controls__batch-actions">
                  <button
                    className="stylist-try-on-controls__batch-action stylist-try-on-controls__batch-action--remove"
                    onClick={handleRemoveAllGarments}
                    disabled={disabled || garmentCount === 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    Remove all
                  </button>
                </div>

                {viewMode === 'grid' ? (
                  <div className="stylist-try-on-controls__garment-grid">
                    {outfit.garments.map(garment => (
                      <div
                        key={garment.id}
                        className={`stylist-try-on-controls__garment-thumbnail ${
                          activeGarmentId === garment.id ? 'stylist-try-on-controls__garment-thumbnail--active' : ''
                        }`}
                        onClick={() => onGarmentSelect(garment.id)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, garment.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, garment.id)}
                      >
                        <div className="stylist-try-on-controls__garment-image">
                          <img src={garment.url} alt={garment.type} />
                        </div>
                        <div className="stylist-try-on-controls__garment-type">
                          <GarmentIcon type={garment.type as GarmentType} />
                          <span>{garment.type}</span>
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
                        {activeGarmentId === garment.id && (
                          <div className="stylist-try-on-controls__garment-active-marker"></div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="stylist-try-on-controls__garment-list">
                    {Object.keys(garmentsByType).map(type => (
                      <div key={type} className="stylist-try-on-controls__garment-group">
                        <h4 className="stylist-try-on-controls__group-title">
                          <GarmentIcon type={type as GarmentType} />
                          {type}
                          <span className="stylist-try-on-controls__group-count">
                            {garmentsByType[type].length}
                          </span>
                        </h4>
                        {garmentsByType[type].map(garment => (
                          <div
                            key={garment.id}
                            className={`stylist-try-on-controls__garment-list-item ${
                              activeGarmentId === garment.id ? 'stylist-try-on-controls__garment-list-item--active' : ''
                            }`}
                            onClick={() => onGarmentSelect(garment.id)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, garment.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, garment.id)}
                          >
                            <div className="stylist-try-on-controls__garment-list-image">
                              <img src={garment.url} alt={garment.type} />
                            </div>
                            <div className="stylist-try-on-controls__garment-list-info">
                              <div className="stylist-try-on-controls__garment-name">
                                {garment.type} {garmentsByType[type].indexOf(garment) + 1}
                              </div>
                              <div className="stylist-try-on-controls__garment-meta">
                                Scale: {Math.round((garment.scale || 1) * 100)}%
                              </div>
                            </div>
                            <button
                              className="stylist-try-on-controls__garment-list-remove"
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
                    ))}
                  </div>
                )}
              </>
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
                <div className="stylist-try-on-controls__garment-types">
                  <span className="stylist-try-on-controls__label">Select garment type:</span>
                  <div className="stylist-try-on-controls__garment-type-grid">
                    {Object.values(GarmentType).map(type => (
                      <button
                        key={type}
                        className="stylist-try-on-controls__garment-type-button"
                        onClick={() => handleAddGarment(type as GarmentType)}
                        disabled={disabled}
                      >
                        <div className="stylist-try-on-controls__garment-type-icon">
                          <GarmentIcon type={type as GarmentType} />
                        </div>
                        <span>{type}</span>
                      </button>
                    ))}
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
            <h3 className="stylist-try-on-controls__section-title">
              Adjustments - {activeGarment.type}
            </h3>
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
                  <div className="stylist-try-on-controls__range-with-buttons">
                    <button
                      className="stylist-try-on-controls__range-button"
                      onClick={() => {
                        const newScale = Math.max(0.1, (activeGarment.scale || 1) - 0.1);
                        onGarmentUpdate(activeGarmentId, { scale: newScale });
                      }}
                      disabled={disabled || (activeGarment.scale || 1) <= 0.1}
                    >−</button>
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
                    <button
                      className="stylist-try-on-controls__range-button"
                      onClick={() => {
                        const newScale = Math.min(2, (activeGarment.scale || 1) + 0.1);
                        onGarmentUpdate(activeGarmentId, { scale: newScale });
                      }}
                      disabled={disabled || (activeGarment.scale || 1) >= 2}
                    >+</button>
                  </div>
                </div>

                {/* Position X Control */}
                <div className="stylist-try-on-controls__control-group">
                  <label className="stylist-try-on-controls__label">
                    Position X
                    <span className="stylist-try-on-controls__value">
                      {activeGarment.offset?.x || 0}px
                    </span>
                  </label>
                  <div className="stylist-try-on-controls__range-with-buttons">
                    <button
                      className="stylist-try-on-controls__range-button"
                      onClick={() => handlePositionChange('x', (activeGarment.offset?.x || 0) - 10)}
                      disabled={disabled || (activeGarment.offset?.x || 0) <= -200}
                    >←</button>
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
                    <button
                      className="stylist-try-on-controls__range-button"
                      onClick={() => handlePositionChange('x', (activeGarment.offset?.x || 0) + 10)}
                      disabled={disabled || (activeGarment.offset?.x || 0) >= 200}
                    >→</button>
                  </div>
                </div>

                {/* Position Y Control */}
                <div className="stylist-try-on-controls__control-group">
                  <label className="stylist-try-on-controls__label">
                    Position Y
                    <span className="stylist-try-on-controls__value">
                      {activeGarment.offset?.y || 0}px
                    </span>
                  </label>
                  <div className="stylist-try-on-controls__range-with-buttons">
                    <button
                      className="stylist-try-on-controls__range-button"
                      onClick={() => handlePositionChange('y', (activeGarment.offset?.y || 0) - 10)}
                      disabled={disabled || (activeGarment.offset?.y || 0) <= -200}
                    >↑</button>
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
                    <button
                      className="stylist-try-on-controls__range-button"
                      onClick={() => handlePositionChange('y', (activeGarment.offset?.y || 0) + 10)}
                      disabled={disabled || (activeGarment.offset?.y || 0) >= 200}
                    >↓</button>
                  </div>
                </div>

                {/* Rotation Control */}
                <div className="stylist-try-on-controls__control-group">
                  <label className="stylist-try-on-controls__label">
                    Rotation
                    <span className="stylist-try-on-controls__value">
                      {activeGarment.rotation || 0}°
                    </span>
                  </label>
                  <div className="stylist-try-on-controls__range-with-buttons">
                    <button
                      className="stylist-try-on-controls__range-button"
                      onClick={() => {
                        const newRotation = (activeGarment.rotation || 0) - 15;
                        onGarmentUpdate(activeGarmentId, { rotation: newRotation });
                      }}
                      disabled={disabled}
                    >↺</button>
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
                    <button
                      className="stylist-try-on-controls__range-button"
                      onClick={() => {
                        const newRotation = (activeGarment.rotation || 0) + 15;
                        onGarmentUpdate(activeGarmentId, { rotation: newRotation });
                      }}
                      disabled={disabled}
                    >↻</button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="stylist-try-on-controls__control-group stylist-try-on-controls__action-buttons">
                  <button
                    className={`stylist-try-on-controls__action-button ${
                      activeGarment.flipHorizontal ? 'stylist-try-on-controls__action-button--active' : ''
                    }`}
                    onClick={handleFlipHorizontal}
                    disabled={disabled}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z"/>
                    </svg>
                    Flip
                  </button>
                  <button
                    className="stylist-try-on-controls__action-button"
                    onClick={() => {
                      onGarmentUpdate(activeGarmentId, {
                        scale: 1,
                        rotation: 0,
                        offset: { x: 0, y: 0 },
                        flipHorizontal: false
                      });
                    }}
                    disabled={disabled}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                    </svg>
                    Reset
                  </button>
                  <button
                    className="stylist-try-on-controls__action-button stylist-try-on-controls__action-button--danger"
                    onClick={() => {
                      onGarmentRemove(activeGarmentId);
                      onGarmentSelect(null);
                    }}
                    disabled={disabled}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    Remove
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M21 6h-3.17L16 4h-6v2h5.12l1.83 2H21v12H5v-9H3v9c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM8 14c0 2.76 2.24 5 5 5s5-2.24 5-5-2.24-5-5-5-5 2.24-5 5zm5-3c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3zM5 6h3V4H5V1H3v3H0v2h3v3h2z"/>
            </svg>
            Change Photo
          </button>
        </div>
      </div>
    </div>
  );
};

export default TryOnControls;