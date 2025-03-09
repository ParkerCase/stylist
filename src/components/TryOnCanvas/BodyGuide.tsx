// src/components/TryOnCanvas/BodyGuide.tsx

import React from 'react';
import './BodyGuide.scss';
import { BodyPosition } from '@/types/tryOn';

interface BodyGuideProps {
  width: number;
  height: number;
  activePosition?: BodyPosition;
}

const BodyGuide: React.FC<BodyGuideProps> = ({ 
  width, 
  height, 
  activePosition 
}) => {
  return (
    <div className="stylist-body-guide" style={{ width, height }}>
      <div className={`stylist-body-guide__region stylist-body-guide__region--head ${
        activePosition === BodyPosition.HEAD ? 'stylist-body-guide__region--active' : ''
      }`}>
        <span className="stylist-body-guide__label">Head</span>
      </div>
      
      <div className={`stylist-body-guide__region stylist-body-guide__region--neck ${
        activePosition === BodyPosition.NECK ? 'stylist-body-guide__region--active' : ''
      }`}>
        <span className="stylist-body-guide__label">Neck</span>
      </div>
      
      <div className={`stylist-body-guide__region stylist-body-guide__region--upper-body ${
        activePosition === BodyPosition.UPPER_BODY ? 'stylist-body-guide__region--active' : ''
      }`}>
        <span className="stylist-body-guide__label">Upper Body</span>
      </div>
      
      <div className={`stylist-body-guide__region stylist-body-guide__region--waist ${
        activePosition === BodyPosition.WAIST ? 'stylist-body-guide__region--active' : ''
      }`}>
        <span className="stylist-body-guide__label">Waist</span>
      </div>
      
      <div className={`stylist-body-guide__region stylist-body-guide__region--lower-body ${
        activePosition === BodyPosition.LOWER_BODY ? 'stylist-body-guide__region--active' : ''
      }`}>
        <span className="stylist-body-guide__label">Lower Body</span>
      </div>
      
      <div className={`stylist-body-guide__region stylist-body-guide__region--feet ${
        activePosition === BodyPosition.FEET ? 'stylist-body-guide__region--active' : ''
      }`}>
        <span className="stylist-body-guide__label">Feet</span>
      </div>
      
      <div className={`stylist-body-guide__region stylist-body-guide__region--full-body ${
        activePosition === BodyPosition.FULL_BODY ? 'stylist-body-guide__region--active' : ''
      }`}>
        <span className="stylist-body-guide__label">Full Body</span>
      </div>
    </div>
  );
};

export default BodyGuide;