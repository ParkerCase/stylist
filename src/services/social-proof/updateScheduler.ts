// updateScheduler.ts
// Manages scheduled updates for social proof celebrity content

import { SocialProofItem } from './types';

export interface UpdateSchedule {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  time: string; // 24-hour format like "12:00"
  notificationMessage: string;
  enabled: boolean;
  keepArchive: boolean;
  maxArchiveWeeks: number;
}

export interface ScheduledUpdate {
  id: string;
  scheduledFor: Date;
  publishedAt: Date | null;
  items: SocialProofItem[];
  isPublished: boolean;
  version: number;
}

export interface ArchivedUpdate {
  id: string;
  week: string; // e.g., "2024-W20" for the 20th week of 2024
  publishedAt: Date;
  items: SocialProofItem[];
  version: number;
}

const DEFAULT_SCHEDULE: UpdateSchedule = {
  day: 'Monday',
  time: '12:00',
  notificationMessage: 'New celebrity looks available!',
  enabled: true,
  keepArchive: true,
  maxArchiveWeeks: 12
};

export class SocialProofUpdateScheduler {
  private schedule: UpdateSchedule;
  private upcomingUpdates: ScheduledUpdate[] = [];
  private archivedUpdates: ArchivedUpdate[] = [];
  private storageKey = 'socialProofScheduleConfig';
  private upcomingUpdatesKey = 'socialProofUpcomingUpdates';
  private archivedUpdatesKey = 'socialProofArchivedUpdates';

  constructor(customSchedule?: Partial<UpdateSchedule>) {
    // Load or initialize schedule
    const savedSchedule = this.loadScheduleFromStorage();
    this.schedule = {
      ...DEFAULT_SCHEDULE,
      ...savedSchedule,
      ...customSchedule
    };

    // Load existing updates
    this.loadUpdatesFromStorage();
  }

  /**
   * Loads schedule from storage or uses default
   */
  private loadScheduleFromStorage(): Partial<UpdateSchedule> {
    try {
      const savedData = localStorage.getItem(this.storageKey);
      return savedData ? JSON.parse(savedData) : {};
    } catch (error) {
      console.error('Error loading social proof schedule:', error);
      return {};
    }
  }

  /**
   * Loads upcoming and archived updates from storage
   */
  private loadUpdatesFromStorage(): void {
    try {
      const upcomingData = localStorage.getItem(this.upcomingUpdatesKey);
      if (upcomingData) {
        this.upcomingUpdates = JSON.parse(upcomingData);
      }

      const archivedData = localStorage.getItem(this.archivedUpdatesKey);
      if (archivedData) {
        this.archivedUpdates = JSON.parse(archivedData);
      }
    } catch (error) {
      console.error('Error loading social proof updates:', error);
    }
  }

  /**
   * Saves schedule to storage
   */
  private saveScheduleToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.schedule));
    } catch (error) {
      console.error('Error saving social proof schedule:', error);
    }
  }

  /**
   * Saves upcoming and archived updates to storage
   */
  private saveUpdatesToStorage(): void {
    try {
      localStorage.setItem(this.upcomingUpdatesKey, JSON.stringify(this.upcomingUpdates));
      localStorage.setItem(this.archivedUpdatesKey, JSON.stringify(this.archivedUpdates));
    } catch (error) {
      console.error('Error saving social proof updates:', error);
    }
  }

  /**
   * Gets the current schedule configuration
   */
  getSchedule(): UpdateSchedule {
    return { ...this.schedule };
  }

  /**
   * Updates the schedule configuration
   */
  updateSchedule(newSchedule: Partial<UpdateSchedule>): UpdateSchedule {
    this.schedule = {
      ...this.schedule,
      ...newSchedule
    };
    this.saveScheduleToStorage();
    return this.schedule;
  }

  /**
   * Schedules the next update based on configuration
   */
  scheduleNextUpdate(items: SocialProofItem[]): ScheduledUpdate {
    const nextUpdateTime = this.calculateNextUpdateTime();
    
    const scheduledUpdate: ScheduledUpdate = {
      id: `update-${Date.now()}`,
      scheduledFor: nextUpdateTime,
      publishedAt: null,
      items,
      isPublished: false,
      version: 1
    };
    
    this.upcomingUpdates.push(scheduledUpdate);
    this.saveUpdatesToStorage();
    
    return scheduledUpdate;
  }

  /**
   * Calculates the next update time based on schedule
   */
  private calculateNextUpdateTime(): Date {
    const now = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = daysOfWeek.indexOf(this.schedule.day);
    const currentDay = now.getDay();
    
    // Calculate days until next scheduled day
    let daysUntilTarget = targetDayIndex - currentDay;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7; // Move to next week if today or already passed this week
    }
    
    // Get hours and minutes from scheduled time
    const [hours, minutes] = this.schedule.time.split(':').map(Number);
    
    // Create the target date
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntilTarget);
    targetDate.setHours(hours, minutes, 0, 0);
    
    return targetDate;
  }

  /**
   * Checks for updates that should be published
   * Returns updates that should now be published
   */
  checkForPendingUpdates(): ScheduledUpdate[] {
    const now = new Date();
    const pendingUpdates = this.upcomingUpdates.filter(
      update => !update.isPublished && update.scheduledFor <= now
    );
    
    return pendingUpdates;
  }

  /**
   * Publishes a scheduled update
   */
  publishUpdate(updateId: string): boolean {
    const updateIndex = this.upcomingUpdates.findIndex(update => update.id === updateId);
    
    if (updateIndex === -1) return false;
    
    // Mark as published
    this.upcomingUpdates[updateIndex].isPublished = true;
    this.upcomingUpdates[updateIndex].publishedAt = new Date();
    
    // Archive the update if archiving is enabled
    if (this.schedule.keepArchive) {
      this.archiveUpdate(this.upcomingUpdates[updateIndex]);
    }
    
    this.saveUpdatesToStorage();
    return true;
  }

  /**
   * Archives a published update
   */
  private archiveUpdate(update: ScheduledUpdate): void {
    const publishDate = update.publishedAt || new Date();
    const year = publishDate.getFullYear();
    
    // Get ISO week number
    const januaryFirst = new Date(year, 0, 1);
    const daysOffset = Math.floor((publishDate.getTime() - januaryFirst.getTime()) / 86400000);
    const weekNumber = Math.ceil((daysOffset + januaryFirst.getDay() + 1) / 7);
    
    const weekString = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    
    const archivedUpdate: ArchivedUpdate = {
      id: update.id,
      week: weekString,
      publishedAt: publishDate,
      items: update.items,
      version: update.version
    };
    
    this.archivedUpdates.push(archivedUpdate);
    
    // Limit archive size
    if (this.schedule.maxArchiveWeeks > 0) {
      this.pruneArchive();
    }
  }

  /**
   * Removes old archives to maintain the configured maximum
   */
  private pruneArchive(): void {
    if (this.archivedUpdates.length <= this.schedule.maxArchiveWeeks) return;
    
    // Sort by publishedAt date, newest first
    this.archivedUpdates.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    // Keep only the latest maxArchiveWeeks number of archives
    this.archivedUpdates = this.archivedUpdates.slice(0, this.schedule.maxArchiveWeeks);
  }

  /**
   * Gets all upcoming updates
   */
  getUpcomingUpdates(): ScheduledUpdate[] {
    return [...this.upcomingUpdates];
  }

  /**
   * Gets all archived updates
   */
  getArchivedUpdates(): ArchivedUpdate[] {
    return [...this.archivedUpdates];
  }

  /**
   * Gets the latest published update
   */
  getLatestUpdate(): ArchivedUpdate | null {
    if (this.archivedUpdates.length === 0) return null;
    
    // Sort by publishedAt date, newest first
    const sortedUpdates = [...this.archivedUpdates].sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    return sortedUpdates[0];
  }

  /**
   * Gets an archived update by week
   */
  getArchivedUpdateByWeek(weekString: string): ArchivedUpdate | null {
    return this.archivedUpdates.find(update => update.week === weekString) || null;
  }

  /**
   * Creates a notification for newly published updates
   */
  createUpdateNotification(): string {
    return this.schedule.notificationMessage;
  }
}

export default SocialProofUpdateScheduler;