export interface AdminSettings {
  id: number
  user_id: number
  timezone: 'Africa/Harare' | 'Africa/Johannesburg' | 'UTC'
  locale: 'en-ZW' | 'en-GB'
  email_notifications: boolean
  browser_notifications: boolean
  weekly_summary: boolean
}
