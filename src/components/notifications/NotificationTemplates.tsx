'use client'

import React, { useState, useEffect } from 'react'
import { Save, Eye, Edit, Plus, Trash2, Copy, Mail, MessageSquare, Bell, Smartphone } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface NotificationTemplate {
  id: string
  name: string
  type: 'email' | 'sms' | 'in_app' | 'push'
  category: 'attendance' | 'verification' | 'system' | 'reminder' | 'escalation'
  subject?: string
  content: string
  variables: string[]
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface TemplateFormData {
  name: string
  type: 'email' | 'sms' | 'in_app' | 'push'
  category: 'attendance' | 'verification' | 'system' | 'reminder' | 'escalation'
  subject?: string
  content: string
  isActive: boolean
}

const NotificationTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    type: 'email',
    category: 'attendance',
    subject: '',
    content: '',
    isActive: true
  })

  // Available template variables
  const templateVariables = {
    common: ['{{userName}}', '{{userEmail}}', '{{currentDate}}', '{{currentTime}}', '{{appName}}', '{{supportEmail}}'],
    attendance: ['{{sessionTitle}}', '{{courseCode}}', '{{courseName}}', '{{sessionDate}}', '{{sessionTime}}', '{{location}}', '{{attendanceStatus}}'],
    verification: ['{{verificationId}}', '{{submittedBy}}', '{{submissionDate}}', '{{status}}', '{{comments}}', '{{deadline}}'],
    system: ['{{systemName}}', '{{maintenanceDate}}', '{{maintenanceTime}}', '{{estimatedDuration}}', '{{affectedServices}}'],
    reminder: ['{{reminderType}}', '{{dueDate}}', '{{dueTime}}', '{{actionRequired}}', '{{reminderCount}}'],
    escalation: ['{{escalationLevel}}', '{{originalIssue}}', '{{escalatedBy}}', '{{escalationDate}}', '{{urgencyLevel}}']
  }

  // Default templates
  const defaultTemplates: Partial<NotificationTemplate>[] = [
    {
      name: 'Attendance Verification Request',
      type: 'email',
      category: 'verification',
      subject: 'Attendance Verification Required - {{courseCode}}',
      content: `Dear {{userName}},

You have a new attendance verification request for:

Course: {{courseName}} ({{courseCode}})
Session: {{sessionTitle}}
Date: {{sessionDate}} at {{sessionTime}}
Location: {{location}}

Please review and verify the attendance records in your dashboard.

Deadline: {{deadline}}

Best regards,
{{appName}} Team`,
      isActive: true
    },
    {
      name: 'Attendance Reminder',
      type: 'sms',
      category: 'reminder',
      content: 'Reminder: {{courseCode}} class starts in 30 minutes at {{location}}. Please ensure you are present for attendance marking. - {{appName}}',
      isActive: true
    },
    {
      name: 'Verification Status Update',
      type: 'in_app',
      category: 'verification',
      content: 'Your attendance verification for {{courseCode}} - {{sessionTitle}} has been {{status}}. {{comments}}',
      isActive: true
    },
    {
      name: 'System Maintenance Alert',
      type: 'email',
      category: 'system',
      subject: 'Scheduled System Maintenance - {{appName}}',
      content: `Dear {{userName}},

We will be performing scheduled maintenance on {{appName}}:

Date: {{maintenanceDate}}
Time: {{maintenanceTime}}
Estimated Duration: {{estimatedDuration}}

Affected Services:
{{affectedServices}}

During this time, the system may be temporarily unavailable. We apologize for any inconvenience.

For urgent matters, please contact: {{supportEmail}}

Thank you for your understanding.

{{appName}} Team`,
      isActive: true
    }
  ]

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true)
      // In a real implementation, this would fetch from an API
      // For now, we'll use default templates
      const mockTemplates: NotificationTemplate[] = defaultTemplates.map((template, index) => ({
        id: `template-${index + 1}`,
        ...template,
        variables: extractVariables(template.content || ''),
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as NotificationTemplate))
      
      setTemplates(mockTemplates)
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  // Extract variables from template content
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{[^}]+\}\}/g)
    return matches ? [...new Set(matches)] : []
  }

  // Save template
  const saveTemplate = async () => {
    try {
      setSaving(true)
      
      const variables = extractVariables(formData.content)
      
      if (isCreating) {
        const newTemplate: NotificationTemplate = {
          id: `template-${Date.now()}`,
          ...formData,
          variables,
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        setTemplates(prev => [...prev, newTemplate])
        toast.success('Template created successfully')
      } else if (selectedTemplate) {
        const updatedTemplate: NotificationTemplate = {
          ...selectedTemplate,
          ...formData,
          variables,
          updatedAt: new Date().toISOString()
        }
        
        setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updatedTemplate : t))
        toast.success('Template updated successfully')
      }
      
      resetForm()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Delete template
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      toast.success('Template deleted successfully')
      
      if (selectedTemplate?.id === templateId) {
        resetForm()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  // Duplicate template
  const duplicateTemplate = (template: NotificationTemplate) => {
    const duplicated: NotificationTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setTemplates(prev => [...prev, duplicated])
    toast.success('Template duplicated successfully')
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'email',
      category: 'attendance',
      subject: '',
      content: '',
      isActive: true
    })
    setSelectedTemplate(null)
    setIsEditing(false)
    setIsCreating(false)
    setPreviewMode(false)
  }

  // Start editing
  const startEditing = (template: NotificationTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      type: template.type,
      category: template.category,
      subject: template.subject || '',
      content: template.content,
      isActive: template.isActive
    })
    setIsEditing(true)
    setIsCreating(false)
    setPreviewMode(false)
  }

  // Start creating
  const startCreating = () => {
    resetForm()
    setIsCreating(true)
    setIsEditing(false)
    setPreviewMode(false)
  }

  // Preview template
  const previewTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template)
    setPreviewMode(true)
    setIsEditing(false)
    setIsCreating(false)
  }

  // Insert variable
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = formData.content.substring(0, start) + variable + formData.content.substring(end)
      
      setFormData(prev => ({ ...prev, content: newContent }))
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'sms':
        return <MessageSquare className="w-4 h-4" />
      case 'in_app':
        return <Bell className="w-4 h-4" />
      case 'push':
        return <Smartphone className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Templates</h1>
          <p className="text-gray-600">Manage email, SMS, and in-app notification templates</p>
        </div>
        
        <button
          onClick={startCreating}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Templates</h2>
            </div>
            
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                  onClick={() => previewTemplate(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {getTypeIcon(template.type)}
                        <span className="font-medium text-gray-900 text-sm">{template.name}</span>
                        {template.isDefault && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="capitalize">{template.type}</span>
                        <span>•</span>
                        <span className="capitalize">{template.category}</span>
                        <span>•</span>
                        <span className={template.isActive ? 'text-green-600' : 'text-red-600'}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditing(template)
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          duplicateTemplate(template)
                        }}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      
                      {!template.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteTemplate(template.id)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Template Editor/Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-900">
                  {isCreating ? 'Create Template' : isEditing ? 'Edit Template' : 'Template Preview'}
                </h2>
                
                {(isEditing || isCreating) && (
                  <div className="flex space-x-2">
                    <button
                      onClick={resetForm}
                      className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={saveTemplate}
                      disabled={saving || !formData.name || !formData.content}
                      className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      <span>Save</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {(isEditing || isCreating) ? (
                <div className="space-y-6">
                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter template name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="in_app">In-App</option>
                        <option value="push">Push</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="attendance">Attendance</option>
                        <option value="verification">Verification</option>
                        <option value="system">System</option>
                        <option value="reminder">Reminder</option>
                        <option value="escalation">Escalation</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Subject (for email) */}
                  {formData.type === 'email' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email subject"
                      />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <textarea
                      id="template-content"
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      rows={formData.type === 'sms' ? 4 : 12}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="Enter template content"
                    />
                  </div>
                  
                  {/* Variables */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Variables
                    </label>
                    <div className="space-y-3">
                      {Object.entries(templateVariables).map(([category, variables]) => (
                        <div key={category}>
                          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                            {category}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {variables.map((variable) => (
                              <button
                                key={variable}
                                onClick={() => insertVariable(variable)}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-mono"
                              >
                                {variable}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : previewMode && selectedTemplate ? (
                <div className="space-y-6">
                  {/* Template Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Name:</span>
                        <span className="ml-2 text-gray-900">{selectedTemplate.name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Type:</span>
                        <span className="ml-2 text-gray-900 capitalize">{selectedTemplate.type}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Category:</span>
                        <span className="ml-2 text-gray-900 capitalize">{selectedTemplate.category}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Status:</span>
                        <span className={`ml-2 ${selectedTemplate.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedTemplate.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subject (for email) */}
                  {selectedTemplate.type === 'email' && selectedTemplate.subject && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Subject</h3>
                      <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
                        {selectedTemplate.subject}
                      </div>
                    </div>
                  )}
                  
                  {/* Content */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Content</h3>
                    <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">
                      {selectedTemplate.content}
                    </div>
                  </div>
                  
                  {/* Variables */}
                  {selectedTemplate.variables.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Variables Used</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.variables.map((variable) => (
                          <span
                            key={variable}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-mono"
                          >
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => startEditing(selectedTemplate)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Template</span>
                    </button>
                    
                    <button
                      onClick={() => duplicateTemplate(selectedTemplate)}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicate</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a template to preview or create a new one</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationTemplates