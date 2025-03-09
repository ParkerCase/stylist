// Modal component for virtual try-on
import React, { useEffect } from 'react';
import './TryOnModal.scss';
import VirtualTryOn from '@/components/VirtualTryOn';
import { useTryOnStore } from '@/store/tryOnStore';

interface TryOnModalProps {
  onClose?: () => void;
  onSave?: (resultUrl: string) => void;
}

const TryOnModal: React.FC<TryOnModalProps> = ({ onClose, onSave }) => {
  const isTryOnModalOpen = useTryOnStore((state) => state.isTryOnModalOpen);
  const closeTryOnModal = useTryOnStore((state) => state.closeTryOnModal);
  
  // Handle closing
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeTryOnModal();
    }
  };
  
  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTryOnModalOpen) {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isTryOnModalOpen, handleClose]);
  
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isTryOnModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isTryOnModalOpen]);
  
  if (!isTryOnModalOpen) {
    return null;
  }
  
  return (
    <div className="stylist-try-on-modal">
      <div className="stylist-try-on-modal__overlay" onClick={handleClose} />
      <div className="stylist-try-on-modal__container">
        <VirtualTryOn onClose={handleClose} onSave={onSave} />
      </div>
    </div>
  );
};

export default TryOnModal;