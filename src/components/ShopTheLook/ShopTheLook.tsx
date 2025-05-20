import React, { useState, useEffect } from 'react';
import './ShopTheLook.scss';
import { Recommendation } from '@/types';

interface ShopTheLookProps {
  product: Recommendation.RecommendationItem;
  onAddToCart: (product: Recommendation.RecommendationItem, size?: string) => void;
  onAddToWishlist: (product: Recommendation.RecommendationItem) => void;
  onClose: () => void;
  isOpen: boolean;
  primaryColor?: string;
}

const ShopTheLook: React.FC<ShopTheLookProps> = ({
  product,
  onAddToCart,
  onAddToWishlist,
  onClose,
  isOpen,
  primaryColor = '#000000'
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  useEffect(() => {
    // Reset selected size when product changes
    setSelectedSize('');
    setSelectedImageIndex(0);
    setQuantity(1);
  }, [product]);

  if (!isOpen) return null;

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Format price with currency symbol
  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  // Calculate discount percentage
  const calculateDiscount = (price: number, salePrice?: number): string => {
    if (!salePrice || salePrice >= price) return '';
    
    const discount = ((price - salePrice) / price) * 100;
    return `-${Math.round(discount)}%`;
  };

  // Handle add to cart click
  const handleAddToCart = () => {
    // Check if size selection is required and selected
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setNotificationMessage('Please select a size');
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }

    onAddToCart(product, selectedSize);
    setNotificationMessage('Added to cart');
    setTimeout(() => {
      setNotificationMessage(null);
      onClose();
    }, 1500);
  };

  // Handle add to wishlist click
  const handleAddToWishlist = () => {
    onAddToWishlist(product);
    setNotificationMessage('Added to wishlist');
    setTimeout(() => setNotificationMessage(null), 3000);
  };

  // Get in-stock sizes
  const availableSizes = product.sizes || [];

  return (
    <div className="shop-the-look-backdrop" onClick={handleBackdropClick}>
      <div className="shop-the-look">
        <button 
          className="shop-the-look__close-btn" 
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="shop-the-look__content">
          {/* Product Images */}
          <div className="shop-the-look__image-gallery">
            {product.imageUrls && product.imageUrls.length > 0 ? (
              <>
                <div className="shop-the-look__main-image-container">
                  <img 
                    src={product.imageUrls[selectedImageIndex]} 
                    alt={product.name} 
                    className="shop-the-look__main-image"
                  />
                  {product.salePrice && product.salePrice < product.price && (
                    <span 
                      className="shop-the-look__discount-badge"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {calculateDiscount(product.price, product.salePrice)}
                    </span>
                  )}
                </div>
                
                {product.imageUrls.length > 1 && (
                  <div className="shop-the-look__thumbnails">
                    {product.imageUrls.map((url, index) => (
                      <button
                        key={index}
                        className={`shop-the-look__thumbnail-btn ${selectedImageIndex === index ? 'shop-the-look__thumbnail-btn--active' : ''}`}
                        onClick={() => setSelectedImageIndex(index)}
                        style={selectedImageIndex === index ? { borderColor: primaryColor } : {}}
                      >
                        <img src={url} alt={`${product.name} view ${index + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="shop-the-look__no-image">
                <span>No image available</span>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="shop-the-look__details">
            <div className="shop-the-look__header">
              <h2 className="shop-the-look__name">{product.name}</h2>
              <p className="shop-the-look__brand">{product.brand}</p>
            </div>

            <div className="shop-the-look__pricing">
              {product.salePrice && product.salePrice < product.price ? (
                <>
                  <span className="shop-the-look__original-price">{formatPrice(product.price)}</span>
                  <span className="shop-the-look__sale-price">{formatPrice(product.salePrice)}</span>
                </>
              ) : (
                <span className="shop-the-look__price">{formatPrice(product.price)}</span>
              )}
            </div>

            {product.description && (
              <div className="shop-the-look__description">
                <p>{product.description}</p>
              </div>
            )}

            {/* Size Selection */}
            {availableSizes.length > 0 && (
              <div className="shop-the-look__sizes">
                <h3 className="shop-the-look__sizes-title">Select Size</h3>
                <div className="shop-the-look__size-buttons">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      className={`shop-the-look__size-btn ${selectedSize === size ? 'shop-the-look__size-btn--selected' : ''}`}
                      onClick={() => setSelectedSize(size)}
                      style={selectedSize === size ? { borderColor: primaryColor, color: primaryColor } : {}}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selection */}
            <div className="shop-the-look__quantity">
              <h3 className="shop-the-look__quantity-title">Quantity</h3>
              <div className="shop-the-look__quantity-selector">
                <button 
                  className="shop-the-look__quantity-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input 
                  type="number" 
                  className="shop-the-look__quantity-input"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                />
                <button 
                  className="shop-the-look__quantity-btn"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Availability */}
            <div className="shop-the-look__availability">
              {product.inStock ? (
                <span className="shop-the-look__in-stock">In Stock</span>
              ) : (
                <span className="shop-the-look__out-of-stock">Out of Stock</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="shop-the-look__actions">
              <button 
                className="shop-the-look__add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={!product.inStock}
                style={{ backgroundColor: product.inStock ? primaryColor : '#cccccc' }}
              >
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button 
                className="shop-the-look__wishlist-btn"
                onClick={handleAddToWishlist}
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                Add to Wishlist
              </button>
            </div>

            {/* Product Details Table */}
            <div className="shop-the-look__product-details">
              <h3 className="shop-the-look__details-title">Product Details</h3>
              <table className="shop-the-look__details-table">
                <tbody>
                  {product.category && (
                    <tr>
                      <th>Category</th>
                      <td>{product.category}</td>
                    </tr>
                  )}
                  {product.colors && product.colors.length > 0 && (
                    <tr>
                      <th>Color</th>
                      <td>{product.colors.join(', ')}</td>
                    </tr>
                  )}
                  <tr>
                    <th>ID</th>
                    <td>{product.id}</td>
                  </tr>
                  {product.matchScore && (
                    <tr>
                      <th>Match Score</th>
                      <td>{product.matchScore}%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Visit Product Link */}
            {product.url && (
              <div className="shop-the-look__external-link">
                <a 
                  href={product.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="shop-the-look__product-link"
                  style={{ color: primaryColor }}
                >
                  View on Website
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Notification */}
        {notificationMessage && (
          <div 
            className="shop-the-look__notification"
            style={{ backgroundColor: primaryColor }}
          >
            {notificationMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopTheLook;