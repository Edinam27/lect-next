import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = {
  'verification-evidence': {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.mp4', '.mov', '.avi'],
    mimeTypes: [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo'
    ]
  },
  'profile-image': {
    extensions: ['.jpg', '.jpeg', '.png', '.gif'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif']
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const uploadType = formData.get('type') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!uploadType || !ALLOWED_TYPES[uploadType as keyof typeof ALLOWED_TYPES]) {
      return NextResponse.json(
        { error: 'Invalid upload type' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ALLOWED_TYPES[uploadType as keyof typeof ALLOWED_TYPES]
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.extensions.includes(fileExtension) || 
        !allowedTypes.mimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}_${randomString}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    // Create upload directory structure
    const uploadDir = join(process.cwd(), 'public', 'uploads', uploadType)
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const filePath = join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    await writeFile(filePath, buffer)

    // Return public URL
    const publicUrl = `/uploads/${uploadType}/${fileName}`

    // Log upload activity
    console.log(`File uploaded: ${fileName} by user ${session.user.id} (${session.user.email})`, {
      uploadType,
      fileSize: file.size,
      fileName: file.name,
      userId: session.user.id
    })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      fileSize: file.size,
      uploadType
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error during file upload' },
      { status: 500 }
    )
  }
}

// Get uploaded file info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('file')
    const uploadType = searchParams.get('type')

    if (!fileName || !uploadType) {
      return NextResponse.json(
        { error: 'Missing file name or upload type' },
        { status: 400 }
      )
    }

    const filePath = join(process.cwd(), 'public', 'uploads', uploadType, fileName)
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      url: `/uploads/${uploadType}/${fileName}`,
      exists: true
    })

  } catch (error) {
    console.error('File check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete uploaded file
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('file')
    const uploadType = searchParams.get('type')

    if (!fileName || !uploadType) {
      return NextResponse.json(
        { error: 'Missing file name or upload type' },
        { status: 400 }
      )
    }

    // Only allow users to delete their own files or admins to delete any files
    if (!['ADMIN', 'ACADEMIC_COORDINATOR'].includes(session.user.role)) {
      // Additional validation could be added here to check file ownership
      // For now, we'll allow class reps and lecturers to delete files
      if (!['CLASS_REP', 'LECTURER'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    const filePath = join(process.cwd(), 'public', 'uploads', uploadType, fileName)
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Delete file
    const { unlink } = await import('fs/promises')
    await unlink(filePath)

    // Log deletion activity
    console.log(`File deleted: ${fileName} by user ${session.user.id} (${session.user.email})`, {
      uploadType,
      fileName,
      userId: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('File deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error during file deletion' },
      { status: 500 }
    )
  }
}