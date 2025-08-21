import { UserRole } from '@prisma/client'
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    role: UserRole
    lecturerId?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      lecturerId?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    lecturerId?: string
  }
}