// performanceMonitoring.ts
// Utility for monitoring and reporting performance metrics

import React from 'react';
import { getDeviceCapabilities } from './deviceCapabilities';

// Performance metric types
export interface PerformanceMetrics {
  fps: number;
  memory: number | null;
  loadTime: number;
  renderTime: number;
  networkRequests: NetworkRequestMetric[];
  interactions: InteractionMetric[];
  componentRenderTimes: Record<string, number>;
  jsHeapSize?: number;
  longTasks: LongTask[];
}

interface NetworkRequestMetric {
  url: string;
  duration: number;
  size: number;
  type: string;
  status: number;
  timestamp: number;
}

interface InteractionMetric {
  type: string;
  target: string;
  duration: number;
  timestamp: number;
}

interface LongTask {
  duration: number;
  startTime: number;
  taskName: string;
}

// Singleton for performance monitoring
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private isActive: boolean = false;
  private isDebugMode: boolean = false;
  private metrics: PerformanceMetrics;
  private fpsBuffer: number[] = [];
  private lastFrameTime: number = 0;
  private frameCounter: number = 0;
  private animationFrameId: number | null = null;
  private metricsEventListeners: Array<(metrics: PerformanceMetrics) => void> = [];
  private thresholds: Record<string, number> = {
    fps: 30,
    memory: 90, // percentage of available memory
    loadTime: 3000, // ms
    renderTime: 100, // ms
    networkRequest: 2000, // ms
    longTask: 50 // ms
  };
  private issueLogs: Array<{ type: string, message: string, timestamp: number, data?: any }> = [];
  private memoryWarningShown: boolean = false;
  
  private constructor() {
    // Initialize metrics
    this.metrics = {
      fps: 0,
      memory: null,
      loadTime: 0,
      renderTime: 0,
      networkRequests: [],
      interactions: [],
      componentRenderTimes: {},
      longTasks: []
    };
    
    // Set initial load time
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
    }
    
    // Initialize observers and listeners
    this.setupObservers();
  }
  
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Setup various performance observers and listeners
   */
  private setupObservers(): void {
    // Setup network request observer
    if (window.PerformanceObserver) {
      try {
        // Network requests
        const networkObserver = new PerformanceObserver((entries) => {
          entries.getEntries().forEach((entry: any) => {
            if (entry.entryType === 'resource') {
              this.recordNetworkRequest(entry);
            }
          });
        });
        networkObserver.observe({ entryTypes: ['resource'] });
        
        // Long tasks
        if ('PerformanceLongTaskTiming' in window) {
          const longTaskObserver = new PerformanceObserver((entries) => {
            entries.getEntries().forEach((entry: any) => {
              this.recordLongTask(entry);
            });
          });
          longTaskObserver.observe({ entryTypes: ['longtask'] });
        }
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }
    
    // Setup interaction listeners
    document.addEventListener('click', this.trackInteraction.bind(this));
    document.addEventListener('keydown', this.trackInteraction.bind(this));
    document.addEventListener('input', this.throttle(this.trackInteraction.bind(this), 100));
    document.addEventListener('scroll', this.throttle(this.trackInteraction.bind(this), 100));
  }
  
  /**
   * Start monitoring performance
   */
  public start(debug: boolean = false): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.isDebugMode = debug;
    
    // Start FPS monitoring
    this.startFPSMonitoring();
    
    // Start memory monitoring
    this.startMemoryMonitoring();
    
    if (this.isDebugMode) {
      console.log('[PerformanceMonitor] Monitoring started');
    }
  }
  
  /**
   * Stop monitoring performance
   */
  public stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Stop FPS monitoring
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.isDebugMode) {
      console.log('[PerformanceMonitor] Monitoring stopped');
    }
  }
  
  /**
   * Record performance data for a component render
   */
  public recordComponentRender(componentName: string, duration: number): void {
    if (!this.isActive) return;
    
    this.metrics.componentRenderTimes[componentName] = duration;
    
    // Check if render time exceeds threshold
    if (duration > this.thresholds.renderTime) {
      this.logIssue('slow-render', `Slow render: ${componentName} took ${duration}ms`, { 
        componentName, 
        duration 
      });
    }
  }
  
  /**
   * Start FPS monitoring
   */
  private startFPSMonitoring(): void {
    const measureFPS = (timestamp: number) => {
      if (!this.isActive) return;
      
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = timestamp;
      }
      
      const elapsed = timestamp - this.lastFrameTime;
      this.frameCounter++;
      
      // Calculate average FPS every second
      if (elapsed >= 1000) {
        const currentFPS = Math.round((this.frameCounter * 1000) / elapsed);
        
        // Add to rolling buffer for smoother readings
        this.fpsBuffer.push(currentFPS);
        if (this.fpsBuffer.length > 5) this.fpsBuffer.shift();
        
        // Calculate average from buffer
        this.metrics.fps = Math.round(
          this.fpsBuffer.reduce((sum, fps) => sum + fps, 0) / this.fpsBuffer.length
        );
        
        // Log low FPS
        if (this.metrics.fps < this.thresholds.fps) {
          this.logIssue('low-fps', `Low FPS detected: ${this.metrics.fps}`, { fps: this.metrics.fps });
        }
        
        // Reset counters
        this.frameCounter = 0;
        this.lastFrameTime = timestamp;
        
        // Notify listeners
        this.notifyMetricsUpdate();
      }
      
      this.animationFrameId = requestAnimationFrame(measureFPS);
    };
    
    this.animationFrameId = requestAnimationFrame(measureFPS);
  }
  
  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    // Check if memory API is available
    if (!(performance as any).memory) {
      if (this.isDebugMode) {
        console.log('[PerformanceMonitor] Memory API not available');
      }
      return;
    }
    
    // Check memory every 5 seconds
    const memoryInterval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(memoryInterval);
        return;
      }
      
      try {
        const memoryInfo = (performance as any).memory;
        const usedHeap = memoryInfo.usedJSHeapSize;
        const totalHeap = memoryInfo.jsHeapSizeLimit;
        
        // Calculate usage percentage
        const memoryUsage = Math.round((usedHeap / totalHeap) * 100);
        this.metrics.memory = memoryUsage;
        this.metrics.jsHeapSize = usedHeap;
        
        // Check memory threshold
        if (memoryUsage > this.thresholds.memory && !this.memoryWarningShown) {
          this.memoryWarningShown = true; // Show warning only once
          this.logIssue('high-memory', `High memory usage: ${memoryUsage}%`, { 
            usedHeap, 
            totalHeap, 
            memoryUsage 
          });
        } else if (memoryUsage <= this.thresholds.memory) {
          this.memoryWarningShown = false; // Reset when memory usage drops
        }
        
      } catch (error) {
        console.warn('Error monitoring memory:', error);
      }
    }, 5000);
  }
  
  /**
   * Record network request performance
   */
  private recordNetworkRequest(entry: PerformanceResourceTiming): void {
    const url = entry.name;
    const duration = entry.duration;
    const size = entry.transferSize || 0;
    const status = 200; // Not directly available in PerformanceResourceTiming
    const type = entry.initiatorType;
    
    const metric: NetworkRequestMetric = {
      url,
      duration,
      size,
      status,
      type,
      timestamp: Date.now()
    };
    
    this.metrics.networkRequests.push(metric);
    
    // Limit array size to prevent memory leaks
    if (this.metrics.networkRequests.length > 100) {
      this.metrics.networkRequests.shift();
    }
    
    // Check for slow network requests
    if (duration > this.thresholds.networkRequest) {
      this.logIssue('slow-network', `Slow network request: ${url} took ${Math.round(duration)}ms`, metric);
    }
  }
  
  /**
   * Record long task
   */
  private recordLongTask(entry: any): void {
    const { startTime, duration } = entry;
    const taskName = entry.name || 'unknown';
    
    const longTask: LongTask = {
      duration,
      startTime,
      taskName
    };
    
    this.metrics.longTasks.push(longTask);
    
    // Limit array size to prevent memory leaks
    if (this.metrics.longTasks.length > 50) {
      this.metrics.longTasks.shift();
    }
    
    this.logIssue('long-task', `Long task detected: ${taskName} took ${Math.round(duration)}ms`, longTask);
  }
  
  /**
   * Track user interactions
   */
  private trackInteraction(event: Event): void {
    if (!this.isActive) return;
    
    const startTime = performance.now();
    const type = event.type;
    const target = event.target ? 
      (event.target as HTMLElement).tagName || 'unknown' : 
      'unknown';
    
    // Measure time until next frame
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const metric: InteractionMetric = {
        type,
        target,
        duration,
        timestamp: Date.now()
      };
      
      this.metrics.interactions.push(metric);
      
      // Limit array size to prevent memory leaks
      if (this.metrics.interactions.length > 50) {
        this.metrics.interactions.shift();
      }
      
      // Check for slow interactions
      if (duration > this.thresholds.longTask) {
        this.logIssue('slow-interaction', `Slow interaction: ${type} on ${target} took ${Math.round(duration)}ms`, metric);
      }
    });
  }
  
  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Add a metrics update listener
   */
  public addMetricsListener(callback: (metrics: PerformanceMetrics) => void): void {
    this.metricsEventListeners.push(callback);
  }
  
  /**
   * Remove a metrics update listener
   */
  public removeMetricsListener(callback: (metrics: PerformanceMetrics) => void): void {
    this.metricsEventListeners = this.metricsEventListeners.filter(listener => listener !== callback);
  }
  
  /**
   * Notify all metrics listeners
   */
  private notifyMetricsUpdate(): void {
    const metrics = this.getMetrics();
    this.metricsEventListeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Error in metrics listener:', error);
      }
    });
  }
  
  /**
   * Log a performance issue
   */
  private logIssue(type: string, message: string, data?: any): void {
    const issue = {
      type,
      message,
      timestamp: Date.now(),
      data
    };
    
    this.issueLogs.push(issue);
    
    // Limit array size to prevent memory leaks
    if (this.issueLogs.length > 100) {
      this.issueLogs.shift();
    }
    
    if (this.isDebugMode) {
      console.warn(`[PerformanceMonitor] ${message}`, data || '');
    }
  }
  
  /**
   * Get performance issues
   */
  public getIssues(): Array<{ type: string, message: string, timestamp: number, data?: any }> {
    return [...this.issueLogs];
  }
  
  /**
   * Clear performance issues
   */
  public clearIssues(): void {
    this.issueLogs = [];
  }
  
  /**
   * Set performance thresholds
   */
  public setThresholds(thresholds: Partial<Record<string, number>>): void {
    this.thresholds = {
      ...this.thresholds,
      ...Object.fromEntries(
        Object.entries(thresholds).map(([key, value]) => [key, value ?? this.thresholds[key] ?? 0])
      )
    };
  }
  
  /**
   * Throttle a function
   */
  private throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return function(this: any, ...args: Parameters<T>): void {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }
  
  /**
   * Create a performance report
   */
  public createReport(): string {
    const metrics = this.getMetrics();
    const issues = this.getIssues();
    
    const deviceCapabilities = getDeviceCapabilities();
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics,
      issues,
      device: deviceCapabilities
    }, null, 2);
  }
}

// Export singleton instance methods
export const performanceMonitor = {
  start: (debug: boolean = false) => PerformanceMonitor.getInstance().start(debug),
  stop: () => PerformanceMonitor.getInstance().stop(),
  getMetrics: () => PerformanceMonitor.getInstance().getMetrics(),
  recordComponentRender: (componentName: string, duration: number) => 
    PerformanceMonitor.getInstance().recordComponentRender(componentName, duration),
  addMetricsListener: (callback: (metrics: PerformanceMetrics) => void) => 
    PerformanceMonitor.getInstance().addMetricsListener(callback),
  removeMetricsListener: (callback: (metrics: PerformanceMetrics) => void) => 
    PerformanceMonitor.getInstance().removeMetricsListener(callback),
  getIssues: () => PerformanceMonitor.getInstance().getIssues(),
  clearIssues: () => PerformanceMonitor.getInstance().clearIssues(),
  setThresholds: (thresholds: Partial<Record<string, number>>) => 
    PerformanceMonitor.getInstance().setThresholds(thresholds),
  createReport: () => PerformanceMonitor.getInstance().createReport()
};

// Performance measuring HOC for React components

export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props: P) => {
    // This would be implemented as a proper React HOC in a real component
    // This is just a placeholder for the utility file
    return React.createElement(Component, props as any);
  };
  // Add display name for better debugging
  WrappedComponent.displayName = `WithPerformanceTracking(${componentName})`;
  return WrappedComponent;
}

// Custom hook for measuring component render time
export function usePerformanceTracking(componentName: string) {
  // This would be implemented as a proper React hook in a real component
  // This is just a placeholder for the utility file
  return {
    trackRender: (callback: () => void) => callback()
  };
}

export default performanceMonitor;