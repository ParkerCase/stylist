// ChatImageUploader.tsx - Component for uploading images to find similar items

import React, { useState, useRef } from 'react';
import './ChatImageUploader.scss';

interface ChatImageUploaderProps {
  onImageUpload: (file: File) => void;
  primaryColor?: string;
  disabled?: boolean;
}

const ChatImageUploader: React.FC<ChatImageUploaderProps> = ({
  onImageUpload,
  primaryColor,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  // Handle selected files
  const handleFiles = (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      
      // Check if file is an image
      if (!file.type.match('image.*')) {
        alert('Please select an image file (png, jpg, jpeg)');
        return;
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Call the callback
      onImageUpload(file);
    }
  };

  // Handle button click to open file browser
  const handleButtonClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  };

  // Handle removing the preview/canceling
  const handleRemovePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploaderStyle = {
    borderColor: isDragging ? (primaryColor || '#4361ee') : undefined,
    backgroundColor: isDragging ? `${primaryColor || '#4361ee'}11` : undefined,
  };

  const buttonStyle = {
    backgroundColor: primaryColor || undefined
  };

  return (
    <div 
      className={`stylist-chat-image-uploader ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleButtonClick}
      style={uploaderStyle}
    >
      <input 
        type="file"
        ref={fileInputRef}
        className="stylist-chat-image-uploader__input"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
      />
      
      {preview ? (
        <div className="stylist-chat-image-uploader__preview">
          <img 
            src={preview} 
            alt="Preview" 
            className="stylist-chat-image-uploader__preview-image" 
          />
          <button 
            className="stylist-chat-image-uploader__remove-button"
            onClick={handleRemovePreview}
            aria-label="Remove image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      ) : (
        <div className="stylist-chat-image-uploader__content">
          <div className="stylist-chat-image-uploader__icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8h-5zM5 19l3-4 2 3 3-4 4 5H5z"/>
            </svg>
          </div>
          <div className="stylist-chat-image-uploader__text">
            <p>Drag & drop an image or click to browse</p>
            <small>Find clothing similar to the image</small>
          </div>
        </div>
      )}
      
      {!preview && (
        <button 
          className="stylist-chat-image-uploader__button" 
          style={buttonStyle}
          disabled={disabled}
        >
          Upload Image
        </button>
      )}
    </div>
  );
};

export default ChatImageUploader;