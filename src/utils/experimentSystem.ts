/**
 * Experiment System for A/B Testing
 * 
 * This module provides a robust experiment framework for conducting
 * A/B tests and feature experiments with consistent user assignment,
 * traffic allocation, and integration with analytics.
 */

import { IS_PRODUCTION } from './environment';
import { analytics } from './analyticsSystem';
import { secureStore, secureRetrieve } from './security';

// Types for experiments
export interface Experiment {
  id: string;
  name: string;
  description?: string;
  variants: ExperimentVariant[];
  trafficAllocation: number; // 0.0 to 1.0
  status: ExperimentStatus;
  startDate: Date;
  endDate?: Date;
  targetSegments?: ExperimentSegment[];
  sticky: boolean; // Whether user stays in the same variant across sessions
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description?: string;
  weight: number; // Relative weight for traffic distribution within the experiment
  isControl?: boolean; // Whether this is the control variant
}

export interface ExperimentSegment {
  id: string;
  name: string;
  condition: ExperimentCondition;
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  timestamp: Date;
  userId: string;
}

export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

// Condition types for targeting
export type ExperimentCondition = 
  | UserCondition
  | DeviceCondition
  | LocationCondition
  | CustomCondition
  | AndCondition
  | OrCondition;

export interface UserCondition {
  type: 'user';
  attribute: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: string | string[];
}

export interface DeviceCondition {
  type: 'device';
  attribute: 'type' | 'browser' | 'os' | 'screenSize';
  operator: 'equals' | 'in';
  value: string | string[];
}

export interface LocationCondition {
  type: 'location';
  attribute: 'country' | 'region' | 'city' | 'timezone';
  operator: 'equals' | 'in';
  value: string | string[];
}

export interface CustomCondition {
  type: 'custom';
  attribute: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
  value: any;
}

export interface AndCondition {
  type: 'and';
  conditions: ExperimentCondition[];
}

export interface OrCondition {
  type: 'or';
  conditions: ExperimentCondition[];
}

// Main experiment system class
export class ExperimentSystem {
  private static instance: ExperimentSystem;
  private initialized: boolean = false;
  private userId: string = '';
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, string> = new Map(); // experimentId -> variantId
  private userAttributes: Map<string, any> = new Map();
  
  // Constructor is private to enforce singleton
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ExperimentSystem {
    if (!ExperimentSystem.instance) {
      ExperimentSystem.instance = new ExperimentSystem();
    }
    return ExperimentSystem.instance;
  }
  
  /**
   * Initialize the experiment system
   * @param userId User identifier
   * @param attributes User attributes for targeting
   */
  public init(userId: string, attributes: Record<string, any> = {}): void {
    if (this.initialized && this.userId === userId) {
      return;
    }
    
    this.userId = userId;
    
    // Set user attributes
    Object.entries(attributes).forEach(([key, value]) => {
      this.userAttributes.set(key, value);
    });
    
    // Load experiment definitions
    this.loadExperiments();
    
    // Load existing assignments
    this.loadAssignments();
    
    this.initialized = true;
    
    if (!IS_PRODUCTION) {
      console.log('[Experiments] Initialized with user ID:', userId);
      console.log('[Experiments] Active experiments:', this.getActiveExperiments());
      console.log('[Experiments] User assignments:', Object.fromEntries(this.assignments));
    }
  }
  
  /**
   * Load experiment definitions
   * In a real app, this might come from an API
   */
  private loadExperiments(): void {
    // In a real app, fetch from API or configuration
    const experimentsList: Experiment[] = [
      {
        id: 'exp_new_chat_ui',
        name: 'New Chat UI',
        description: 'Test new chat UI design',
        variants: [
          { id: 'control', name: 'Control', weight: 0.5, isControl: true },
          { id: 'treatment', name: 'New Design', weight: 0.5 }
        ],
        trafficAllocation: 0.5, // 50% of users see the experiment
        status: ExperimentStatus.RUNNING,
        startDate: new Date('2023-09-01'),
        sticky: true
      },
      {
        id: 'exp_recommendations_algorithm',
        name: 'Recommendations Algorithm',
        description: 'Test new recommendations algorithm',
        variants: [
          { id: 'control', name: 'Control Algorithm', weight: 0.5, isControl: true },
          { id: 'v1', name: 'Algorithm V1', weight: 0.25 },
          { id: 'v2', name: 'Algorithm V2', weight: 0.25 }
        ],
        trafficAllocation: 1.0, // 100% of users
        status: ExperimentStatus.RUNNING,
        startDate: new Date('2023-08-15'),
        endDate: new Date('2023-12-31'),
        sticky: true
      },
      {
        id: 'exp_try_on_flow',
        name: 'Try-on Flow',
        description: 'Test optimized virtual try-on flow',
        variants: [
          { id: 'control', name: 'Current Flow', weight: 0.5, isControl: true },
          { id: 'simplified', name: 'Simplified Flow', weight: 0.5 }
        ],
        trafficAllocation: 0.25, // 25% of users
        status: ExperimentStatus.RUNNING,
        startDate: new Date('2023-10-01'),
        sticky: false, // User can get different variants on different sessions
        targetSegments: [
          {
            id: 'mobile_users',
            name: 'Mobile Users',
            condition: {
              type: 'device',
              attribute: 'type',
              operator: 'in',
              value: ['mobile', 'tablet']
            }
          }
        ]
      }
    ];
    
    // Add experiments to map
    experimentsList.forEach(experiment => {
      this.experiments.set(experiment.id, experiment);
    });
  }
  
  /**
   * Load user's existing experiment assignments
   */
  private loadAssignments(): void {
    // Try to load assignments from storage
    const storedAssignments = secureRetrieve(`experiment_assignments_${this.userId}`);
    
    if (storedAssignments) {
      try {
        const assignments = JSON.parse(storedAssignments) as Record<string, string>;
        
        // Set assignments
        Object.entries(assignments).forEach(([expId, variantId]) => {
          this.assignments.set(expId, variantId);
        });
      } catch (error) {
        console.error('Error parsing stored experiment assignments', error);
      }
    }
    
    // Remove assignments for inactive experiments
    for (const [expId] of this.assignments) {
      const experiment = this.experiments.get(expId);
      
      // Remove if experiment doesn't exist or is not running
      if (!experiment || experiment.status !== ExperimentStatus.RUNNING) {
        this.assignments.delete(expId);
      }
    }
    
    // Save cleaned assignments
    this.saveAssignments();
  }
  
  /**
   * Save user's experiment assignments to storage
   */
  private saveAssignments(): void {
    const assignments = Object.fromEntries(this.assignments);
    secureStore(`experiment_assignments_${this.userId}`, JSON.stringify(assignments));
  }
  
  /**
   * Get all active experiments
   */
  public getActiveExperiments(): Experiment[] {
    return Array.from(this.experiments.values())
      .filter(exp => exp.status === ExperimentStatus.RUNNING);
  }
  
  /**
   * Get variant for a specific experiment
   * This will assign the user if they haven't been assigned yet
   */
  public getVariant(experimentId: string): string | null {
    if (!this.initialized) {
      console.warn('[Experiments] Attempted to get variant before initialization');
      return null;
    }
    
    // Check if already assigned
    if (this.assignments.has(experimentId)) {
      return this.assignments.get(experimentId) || null;
    }
    
    // Get experiment
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      console.warn(`[Experiments] Unknown experiment: ${experimentId}`);
      return null;
    }
    
    // Check if experiment is running
    if (experiment.status !== ExperimentStatus.RUNNING) {
      console.warn(`[Experiments] Experiment is not running: ${experimentId}`);
      return null;
    }
    
    // Check if user is in experiment traffic allocation
    if (!this.isUserInExperiment(experiment)) {
      if (!IS_PRODUCTION) {
        console.log(`[Experiments] User not in traffic allocation for: ${experimentId}`);
      }
      return experiment.variants.find(v => v.isControl)?.id || null;
    }
    
    // Check if user matches target segments
    if (!this.userMatchesTargetSegments(experiment)) {
      if (!IS_PRODUCTION) {
        console.log(`[Experiments] User doesn't match target segments for: ${experimentId}`);
      }
      return experiment.variants.find(v => v.isControl)?.id || null;
    }
    
    // Assign user to a variant
    const variantId = this.assignUserToVariant(experiment);
    
    // Save assignment
    this.assignments.set(experimentId, variantId);
    this.saveAssignments();
    
    // Track assignment in analytics
    analytics.setExperiment(experimentId, variantId);
    
    if (!IS_PRODUCTION) {
      console.log(`[Experiments] Assigned user to variant: ${experimentId} -> ${variantId}`);
    }
    
    return variantId;
  }
  
  /**
   * Check if user should be included in the experiment
   */
  private isUserInExperiment(experiment: Experiment): boolean {
    // Use experiment ID and user ID to determine if user is in the experiment
    const hash = this.hashString(`${experiment.id}_${this.userId}`);
    const hashPercentage = (hash % 100) / 100;
    
    return hashPercentage < experiment.trafficAllocation;
  }
  
  /**
   * Check if user matches experiment target segments
   */
  private userMatchesTargetSegments(experiment: Experiment): boolean {
    // If no target segments, everyone matches
    if (!experiment.targetSegments || experiment.targetSegments.length === 0) {
      return true;
    }
    
    // Check if user matches any target segment
    return experiment.targetSegments.some(segment => this.userMatchesSegment(segment));
  }
  
  /**
   * Check if user matches a segment
   */
  private userMatchesSegment(segment: ExperimentSegment): boolean {
    return this.evaluateCondition(segment.condition);
  }
  
  /**
   * Evaluate a targeting condition
   */
  private evaluateCondition(condition: ExperimentCondition): boolean {
    switch (condition.type) {
      case 'user':
        return this.evaluateUserCondition(condition);
        
      case 'device':
        return this.evaluateDeviceCondition(condition);
        
      case 'location':
        return this.evaluateLocationCondition(condition);
        
      case 'custom':
        return this.evaluateCustomCondition(condition);
        
      case 'and':
        return condition.conditions.every(cond => this.evaluateCondition(cond));
        
      case 'or':
        return condition.conditions.some(cond => this.evaluateCondition(cond));
        
      default:
        return false;
    }
  }
  
  /**
   * Evaluate a user attribute condition
   */
  private evaluateUserCondition(condition: UserCondition): boolean {
    const userValue = this.userAttributes.get(condition.attribute);
    if (userValue === undefined) return false;
    
    switch (condition.operator) {
      case 'equals':
        return userValue === condition.value;
        
      case 'contains':
        return typeof userValue === 'string' && 
               userValue.includes(condition.value as string);
               
      case 'startsWith':
        return typeof userValue === 'string' && 
               userValue.startsWith(condition.value as string);
               
      case 'endsWith':
        return typeof userValue === 'string' && 
               userValue.endsWith(condition.value as string);
               
      case 'regex':
        if (typeof userValue !== 'string') return false;
        try {
          const regex = new RegExp(condition.value as string);
          return regex.test(userValue);
        } catch (e) {
          return false;
        }
        
      default:
        return false;
    }
  }
  
  /**
   * Evaluate a device condition
   */
  private evaluateDeviceCondition(condition: DeviceCondition): boolean {
    // In a real implementation, use device detection library
    const currentDevice = {
      type: this.userAttributes.get('deviceType') || 'desktop',
      browser: this.userAttributes.get('browser') || 'unknown',
      os: this.userAttributes.get('os') || 'unknown',
      screenSize: this.userAttributes.get('screenSize') || 'unknown'
    };
    
    const deviceValue = currentDevice[condition.attribute];
    
    switch (condition.operator) {
      case 'equals':
        return deviceValue === condition.value;
        
      case 'in':
        return Array.isArray(condition.value) && 
               condition.value.includes(deviceValue);
               
      default:
        return false;
    }
  }
  
  /**
   * Evaluate a location condition
   */
  private evaluateLocationCondition(condition: LocationCondition): boolean {
    // In a real implementation, use geolocation or IP-based location
    const currentLocation = {
      country: this.userAttributes.get('country') || 'unknown',
      region: this.userAttributes.get('region') || 'unknown',
      city: this.userAttributes.get('city') || 'unknown',
      timezone: this.userAttributes.get('timezone') || 'unknown'
    };
    
    const locationValue = currentLocation[condition.attribute];
    
    switch (condition.operator) {
      case 'equals':
        return locationValue === condition.value;
        
      case 'in':
        return Array.isArray(condition.value) && 
               condition.value.includes(locationValue);
               
      default:
        return false;
    }
  }
  
  /**
   * Evaluate a custom condition
   */
  private evaluateCustomCondition(condition: CustomCondition): boolean {
    const value = this.userAttributes.get(condition.attribute);
    if (value === undefined) return false;
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
        
      case 'contains':
        if (typeof value !== 'string' && !Array.isArray(value)) return false;
        return Array.isArray(value) ? 
          value.includes(condition.value) : 
          value.includes(condition.value);
        
      case 'greaterThan':
        return typeof value === 'number' && 
               value > condition.value;
               
      case 'lessThan':
        return typeof value === 'number' && 
               value < condition.value;
               
      case 'in':
        return Array.isArray(condition.value) && 
               condition.value.includes(value);
               
      default:
        return false;
    }
  }
  
  /**
   * Assign user to a variant based on weights
   */
  private assignUserToVariant(experiment: Experiment): string {
    const variants = experiment.variants;
    
    // If there's only one variant, assign to that
    if (variants.length === 1) {
      return variants[0].id;
    }
    
    // Calculate total weight
    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
    
    // Generate a hash based on user ID and experiment ID
    const hash = this.hashString(`${this.userId}_${experiment.id}`);
    let hashPercentage = (hash % 100) / 100;
    
    // Normalize hashPercentage to account for potentially uneven total weights
    hashPercentage *= totalWeight;
    
    // Find the variant based on weighted distribution
    let currentTotal = 0;
    for (const variant of variants) {
      currentTotal += variant.weight;
      if (hashPercentage < currentTotal) {
        return variant.id;
      }
    }
    
    // Fallback to control or first variant
    const controlVariant = variants.find(v => v.isControl);
    return controlVariant ? controlVariant.id : variants[0].id;
  }
  
  /**
   * Set a user attribute for targeting
   */
  public setUserAttribute(key: string, value: any): void {
    this.userAttributes.set(key, value);
  }
  
  /**
   * Get all user attributes
   */
  public getUserAttributes(): Record<string, any> {
    return Object.fromEntries(this.userAttributes);
  }
  
  /**
   * Override a variant assignment for testing
   */
  public overrideVariant(experimentId: string, variantId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      console.warn(`[Experiments] Unknown experiment: ${experimentId}`);
      return;
    }
    
    const variant = experiment.variants.find(v => v.id === variantId);
    if (!variant) {
      console.warn(`[Experiments] Unknown variant: ${variantId} for experiment: ${experimentId}`);
      return;
    }
    
    // Set override
    this.assignments.set(experimentId, variantId);
    this.saveAssignments();
    
    // Track override in analytics
    analytics.setExperiment(experimentId, variantId);
    
    if (!IS_PRODUCTION) {
      console.log(`[Experiments] Manually set variant: ${experimentId} -> ${variantId}`);
    }
  }
  
  /**
   * Reset all experiment assignments
   */
  public resetAssignments(): void {
    this.assignments.clear();
    this.saveAssignments();
    
    if (!IS_PRODUCTION) {
      console.log('[Experiments] Reset all experiment assignments');
    }
  }
  
  /**
   * Simple hash function for consistent user assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
export const experiments = ExperimentSystem.getInstance();

// React hook for experiments
export function useExperiment(experimentId: string): string | null {
  return experiments.getVariant(experimentId);
}