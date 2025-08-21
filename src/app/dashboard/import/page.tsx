'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface ImportResult {
  success: boolean
  message: string
  imported: number
  errors: string[]
  warnings: string[]
}

export default function ImportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('users')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (session.user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setImportResult(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  })

  const handleImport = async () => {
    if (!selectedFile) return

    setImporting(true)
    setImportResult(null)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('type', activeTab)

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      setImportResult(result)
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Import failed due to network error',
        imported: 0,
        errors: ['Network error occurred'],
        warnings: []
      })
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = async (type: string) => {
    try {
      const response = await fetch(`/api/import/template?type=${type}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${type}-template.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading template:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  const tabs = [
    { id: 'users', name: 'Users', description: 'Import students, lecturers, and administrators' },
    { id: 'programmes', name: 'Programmes', description: 'Import academic programmes and degrees' },
    { id: 'courses', name: 'Courses', description: 'Import courses and curriculum data' },
    { id: 'schedules', name: 'Schedules', description: 'Import class schedules and timetables' },
    { id: 'classgroups', name: 'Class Groups', description: 'Import class groups and student assignments' }
  ]

  const getTabContent = () => {
    const tabInfo = {
      users: {
        fields: ['firstName', 'lastName', 'email', 'role', 'studentId/employeeId', 'programme', 'classGroup'],
        example: 'John,Doe,john.doe@upsa.edu.gh,STUDENT,ST2024001,Computer Science,CS-2024-A'
      },
      programmes: {
        fields: ['name', 'level', 'durationSemesters', 'description', 'deliveryModes'],
        example: 'Computer Science,UNDERGRADUATE,8,Bachelor of Science in Computer Science,"FULL_TIME,PART_TIME"'
      },
      courses: {
        fields: ['code', 'name', 'credits', 'semester', 'isElective', 'description', 'programmeId'],
        example: 'CS101,Introduction to Programming,3,1,false,Basic programming concepts,PROG001'
      },
      schedules: {
        fields: ['courseCode', 'classGroup', 'lecturerEmail', 'dayOfWeek', 'startTime', 'endTime', 'venue'],
        example: 'CS101,CS-2024-A,lecturer@upsa.edu.gh,MONDAY,08:00,10:00,Room 101'
      },
      classgroups: {
        fields: ['name', 'programmeId', 'academicYear', 'semester', 'maxStudents'],
        example: 'CS-2024-A,PROG001,2024/2025,1,50'
      }
    }

    return tabInfo[activeTab as keyof typeof tabInfo]
  }

  const tabContent = getTabContent()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bulk Data Import</h1>
        <p className="mt-2 text-gray-600">
          Import data from CSV or Excel files to quickly populate the system
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setSelectedFile(null)
                setImportResult(null)
              }}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Import Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Import {tabs.find(t => t.id === activeTab)?.name}
            </h3>
            <p className="text-sm text-gray-600">
              {tabs.find(t => t.id === activeTab)?.description}
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-2">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-sm text-gray-600">
                  {selectedFile ? (
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  ) : (
                    <>
                      <p>Drop your file here, or <span className="text-indigo-600 font-medium">browse</span></p>
                      <p className="text-xs">CSV, XLS, XLSX up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Importing...
                </>
              ) : (
                'Import Data'
              )}
            </button>
            <button
              onClick={() => downloadTemplate(activeTab)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Download Template
            </button>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`mt-6 p-4 rounded-md ${
              importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {importResult.success ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {importResult.message}
                  </h3>
                  {importResult.success && (
                    <p className="mt-1 text-sm text-green-700">
                      Successfully imported {importResult.imported} records.
                    </p>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-red-800">Errors:</h4>
                      <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {importResult.warnings.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-yellow-800">Warnings:</h4>
                      <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                        {importResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Import Instructions</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Required Fields</h4>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <code className="text-gray-800">
                  {tabContent.fields.join(', ')}
                </code>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Example Row</h4>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <code className="text-gray-800">
                  {tabContent.example}
                </code>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Important Notes</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>First row should contain column headers</li>
                <li>Email addresses must be unique</li>
                <li>All required fields must be provided</li>
                <li>Date formats should be YYYY-MM-DD</li>
                <li>Time formats should be HH:MM (24-hour)</li>
                <li>Boolean values should be true/false</li>
                <li>Multiple values should be comma-separated in quotes</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">File Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Supported formats: CSV, XLS, XLSX</li>
                <li>Maximum file size: 10MB</li>
                <li>Maximum rows: 1000 per import</li>
                <li>UTF-8 encoding recommended</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}