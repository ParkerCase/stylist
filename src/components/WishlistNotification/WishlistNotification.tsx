// WishlistNotification component for showing alerts about wishlisted items
import React, { useState, useEffect } from 'react';
import { useRecommendationStore } from '@/store/index';
import './WishlistNotification.scss';

interface WishlistNotification {
  id: string;
  itemId: string;
  itemName: string;
  type: 'sale' | 'low_stock';
  date: Date;
  read: boolean;
}

interface WishlistNotificationProps {
  onClickNotification?: () => void;
}

const WishlistNotification: React.FC<WishlistNotificationProps> = ({
  onClickNotification
}) => {
  const { wishlistItems } = useRecommendationStore();
  const [notifications, setNotifications] = useState<WishlistNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  // Check for notifications on component mount and when wishlist changes
  useEffect(() => {
    // In a real application, you would fetch this data from an API
    // For this demo, we'll generate random notifications for wishlisted items
    
    // Clear existing timer if component is unmounted
    const timerId = setTimeout(() => {
      if (wishlistItems.length > 0) {
        // Simulate getting notifications for random wishlist items
        const randomItem = wishlistItems[Math.floor(Math.random() * wishlistItems.length)];
        
        if (randomItem) {
          // Create a notification for the item
          const newNotification: WishlistNotification = {
            id: `notification_${Date.now()}`,
            itemId: randomItem.itemId,
            itemName: randomItem.name || `Product ${randomItem.itemId.slice(0, 6)}`,
            type: Math.random() > 0.5 ? 'sale' : 'low_stock',
            date: new Date(),
            read: false
          };
          
          // Add the notification to the list
          setNotifications(prev => [...prev, newNotification]);
          setHasUnread(true);
        }
      }
    }, 5000); // Show notification after 5 seconds
    
    return () => clearTimeout(timerId);
  }, [wishlistItems]);
  
  // Toggle notification panel
  const toggleNotificationPanel = () => {
    setIsOpen(!isOpen);
    
    // Mark all as read when opening
    if (!isOpen) {
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setHasUnread(false);
    }
  };
  
  // Handle clicking a notification
  const handleNotificationClick = () => {
    if (onClickNotification) {
      onClickNotification();
    }
    setIsOpen(false);
  };
  
  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    setHasUnread(false);
    setIsOpen(false);
  };
  
  // If no notifications, don't render anything
  if (notifications.length === 0) {
    return null;
  }
  
  return (
    <div className="stylist-wishlist-notification">
      <button 
        className={`stylist-wishlist-notification__bell ${hasUnread ? 'has-unread' : ''}`}
        onClick={toggleNotificationPanel}
        aria-label="Notifications"
      >
        <span className="stylist-wishlist-notification__icon">
          🔔
        </span>
        {hasUnread && (
          <span className="stylist-wishlist-notification__badge" />
        )}
      </button>
      
      {isOpen && (
        <div className="stylist-wishlist-notification__panel">
          <div className="stylist-wishlist-notification__header">
            <h3 className="stylist-wishlist-notification__title">Notifications</h3>
            <button
              className="stylist-wishlist-notification__close"
              onClick={() => setIsOpen(false)}
              aria-label="Close notifications"
            >
              ×
            </button>
          </div>
          
          <div className="stylist-wishlist-notification__list">
            {notifications.length === 0 ? (
              <div className="stylist-wishlist-notification__empty">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`stylist-wishlist-notification__item ${notification.read ? 'read' : 'unread'}`}
                  onClick={handleNotificationClick}
                >
                  <div className="stylist-wishlist-notification__content">
                    <div className="stylist-wishlist-notification__item-icon">
                      {notification.type === 'sale' ? '💰' : '⚠️'}
                    </div>
                    <div className="stylist-wishlist-notification__item-text">
                      <p className="stylist-wishlist-notification__item-message">
                        {notification.type === 'sale' 
                          ? `${notification.itemName} is now on sale!` 
                          : `${notification.itemName} is running low in stock!`}
                      </p>
                      <span className="stylist-wishlist-notification__item-time">
                        {new Date(notification.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="stylist-wishlist-notification__footer">
              <button 
                className="stylist-wishlist-notification__clear"
                onClick={clearAllNotifications}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WishlistNotification;