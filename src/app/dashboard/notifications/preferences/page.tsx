'use client'

import React, { useState, useEffect } from 'react'
import { Save, TestTube, Bell, Mail, MessageSquare, Smartphone, Clock, Volume2, VolumeX } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface NotificationChannel {
  type: 'email' | 'sms' | 'in_app' | 'push'
  enabled: boolean
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

interface NotificationPreferences {
  userId: string
  channels: {
    email: NotificationChannel
    sms: NotificationChannel
    in_app: NotificationChannel
    push: NotificationChannel
  }
  categories: {
    attendance: NotificationChannel[]
    verification: NotificationChannel[]
    system: NotificationChannel[]
    reminder: NotificationChannel[]
    escalation: NotificationChannel[]
  }
  quietHours?: {
    enabled: boolean
    start: string
    end: string
    timezone: string
  }
}

const NotificationPreferencesPage: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  // Fetch current preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/notifications/preferences')
        if (response.ok) {
          const data = await response.json()
          setPreferences(data.preferences)
        } else {
          toast.error('Failed to load notification preferences')
        }
      } catch (error) {
        console.error('Error fetching preferences:', error)
        toast.error('Failed to load notification preferences')
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [])

  // Save preferences
  const savePreferences = async () => {
    if (!preferences) return

    try {
      setSaving(true)
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })

      if (response.ok) {
        toast.success('Notification preferences saved successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  // Test notification
  const testNotification = async (channels: string[]) => {
    try {
      setTesting(channels.join(','))
      const response = await fetch('/api/notifications/preferences/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channels })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Test notification sent successfully')
      } else {
        toast.error(data.message || 'Failed to send test notification')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast.error('Failed to send test notification')
    } finally {
      setTesting(null)
    }
  }

  // Update channel preference
  const updateChannelPreference = (channelType: keyof NotificationPreferences['channels'], updates: Partial<NotificationChannel>) => {
    if (!preferences) return

    setPreferences({
      ...preferences,
      channels: {
        ...preferences.channels,
        [channelType]: {
          ...preferences.channels[channelType],
          ...updates
        }
      }
    })
  }

  // Update category preference
  const updateCategoryPreference = (category: keyof NotificationPreferences['categories'], channelIndex: number, updates: Partial<NotificationChannel>) => {
    if (!preferences) return

    const updatedChannels = [...preferences.categories[category]]
    updatedChannels[channelIndex] = {
      ...updatedChannels[channelIndex],
      ...updates
    }

    setPreferences({
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: updatedChannels
      }
    })
  }

  // Update quiet hours
  const updateQuietHours = (updates: Partial<NotificationPreferences['quietHours']>) => {
    if (!preferences) return

    setPreferences({
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        ...updates
      } as NotificationPreferences['quietHours']
    })
  }

  // Get channel icon
  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-5 h-5" />
      case 'sms':
        return <MessageSquare className="w-5 h-5" />
      case 'in_app':
        return <Bell className="w-5 h-5" />
      case 'push':
        return <Smartphone className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load notification preferences</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
          <p className="mt-2 text-gray-600">
            Customize how and when you receive notifications from the attendance management system.
          </p>
        </div>

        <div className="space-y-8">
          {/* Global Channel Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Communication Channels</h2>
            <p className="text-gray-600 mb-6">Configure your preferred communication channels and their priority levels.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(preferences.channels).map(([channelType, channel]) => (
                <div key={channelType} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getChannelIcon(channelType)}
                      <span className="font-medium text-gray-900 capitalize">
                        {channelType === 'in_app' ? 'In-App' : channelType}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channel.enabled}
                        onChange={(e) => updateChannelPreference(channelType as keyof NotificationPreferences['channels'], { enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {channel.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority Level
                      </label>
                      <select
                        value={channel.priority || 'normal'}
                        onChange={(e) => updateChannelPreference(channelType as keyof NotificationPreferences['channels'], { priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      
                      <button
                        onClick={() => testNotification([channelType])}
                        disabled={testing === channelType}
                        className="mt-3 w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {testing === channelType ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        ) : (
                          <TestTube className="w-4 h-4" />
                        )}
                        <span>Test {channelType === 'in_app' ? 'In-App' : channelType}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Category-Specific Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Categories</h2>
            <p className="text-gray-600 mb-6">Customize notification preferences for different types of events.</p>
            
            <div className="space-y-6">
              {Object.entries(preferences.categories).map(([category, channels]) => (
                <div key={category} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 capitalize">{category}</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {channels.map((channel, index) => (
                      <div key={`${category}-${channel.type}-${index}`} className="flex items-center space-x-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={channel.enabled}
                            onChange={(e) => updateCategoryPreference(category as keyof NotificationPreferences['categories'], index, { enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <span className="text-sm text-gray-700 capitalize">
                          {channel.type === 'in_app' ? 'In-App' : channel.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              {preferences.quietHours?.enabled ? (
                <VolumeX className="w-6 h-6 text-gray-600" />
              ) : (
                <Volume2 className="w-6 h-6 text-gray-600" />
              )}
              <h2 className="text-xl font-semibold text-gray-900">Quiet Hours</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Set quiet hours to limit non-urgent notifications during specific times.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.quietHours?.enabled || false}
                    onChange={(e) => updateQuietHours({ enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="font-medium text-gray-900">Enable Quiet Hours</span>
              </div>
              
              {preferences.quietHours?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHours.start || '22:00'}
                      onChange={(e) => updateQuietHours({ start: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHours.end || '07:00'}
                      onChange={(e) => updateQuietHours({ end: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={preferences.quietHours.timezone || 'UTC'}
                      onChange={(e) => updateQuietHours({ timezone: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Africa/Accra">Accra</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            
            <button
              onClick={savePreferences}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationPreferencesPage