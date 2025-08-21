import { ScheduledReportsService } from './scheduled-reports-service'

// Global service instance
let scheduledReportsService: ScheduledReportsService | null = null

/**
 * Initialize and start the scheduled reports background service
 */
export function initializeScheduledReportsService() {
  if (!scheduledReportsService) {
    scheduledReportsService = new ScheduledReportsService()
    scheduledReportsService.start()
    console.log('Scheduled reports service initialized and started')
  }
  return scheduledReportsService
}

/**
 * Get the current scheduled reports service instance
 */
export function getScheduledReportsService(): ScheduledReportsService | null {
  return scheduledReportsService
}

/**
 * Stop the scheduled reports service
 */
export function stopScheduledReportsService() {
  if (scheduledReportsService) {
    scheduledReportsService.stop()
    scheduledReportsService = null
    console.log('Scheduled reports service stopped')
  }
}

/**
 * Restart the scheduled reports service
 */
export function restartScheduledReportsService() {
  stopScheduledReportsService()
  return initializeScheduledReportsService()
}

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
  // Initialize after a short delay to ensure database is ready
  setTimeout(() => {
    initializeScheduledReportsService()
  }, 5000)
}