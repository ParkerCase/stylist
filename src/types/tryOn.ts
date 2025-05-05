// Types for the virtual try-on feature

export interface Point {
    x: number;
    y: number;
  }
  
  export interface Dimensions {
    width: number;
    height: number;
  }
  
  export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  
  export interface ImageInfo {
    id: string;
    url: string;
    file?: File;
    dimensions?: Dimensions;
    originalDimensions?: Dimensions;
    withoutBackground?: boolean;
    processed?: boolean;
  }
  
  export interface GarmentInfo extends ImageInfo {
    type: GarmentType;
    bodyPosition: BodyPosition;
    zIndex: number;
    layerIndex: number;
    offset?: Point;
    scale?: number;
    rotation?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
  }
  
  export interface UserImageInfo extends ImageInfo {
    processingStatus: ProcessingStatus;
    backgroundRemoved?: boolean;
    processingError?: string;
  }
  
  export interface OutfitTryOn {
    id: string;
    name?: string;
    garments: GarmentInfo[];
    userImage?: UserImageInfo;
    createdAt: Date;
  }
  
  export enum GarmentType {
    TOP = 'top',
    BOTTOM = 'bottom',
    DRESS = 'dress',
    OUTERWEAR = 'outerwear',
    SHOES = 'shoes',
    ACCESSORY = 'accessory'
  }
  
  export enum BodyPosition {
    UPPER_BODY = 'upper_body',
    LOWER_BODY = 'lower_body',
    FULL_BODY = 'full_body',
    HEAD = 'head',
    FEET = 'feet',
    HANDS = 'hands',
    NECK = 'neck',
    WAIST = 'waist'
  }
  
  export enum ProcessingStatus {
    IDLE = 'idle',
    UPLOADING = 'uploading',
    PROCESSING = 'processing',
    REMOVING_BACKGROUND = 'removing_background',
    COMPLETED = 'completed',
    FAILED = 'failed'
  }
  
  export enum BackgroundRemovalMethod {
    REMOVE_BG_API = 'remove_bg_api',
    TENSORFLOW = 'tensorflow',
    MANUAL = 'manual'
  }
  
  export interface BodyMeasurements {
    approximateSize: string;
    bodyShape: string;
    width?: number;
    height?: number;
    shouldersY?: number;
    waistWidth?: number;
    hipsWidth?: number;
  }

  export interface BackgroundRemovalResult {
    success: boolean;
    imageUrl?: string;
    error?: string;
    method: BackgroundRemovalMethod;
    bodyMeasurements?: BodyMeasurements;
  }
  
  export interface TryOnSettings {
    preferredBackgroundRemovalMethod: BackgroundRemovalMethod;
    removeBackgroundAutomatically: boolean;
    showGuidelines: boolean;
    highQualityRendering: boolean;
    defaultGarmentScale: Record<GarmentType, number>;
    defaultGarmentOffset: Record<GarmentType, Point>;
    apiKey?: string;
  }
  
  export interface SavedTryOnResult {
    id: string;
    outfitId: string;
    userId: string;
    userImageUrl: string;
    resultImageUrl: string;
    garmentIds: string[];
    createdAt: Date;
  }
  