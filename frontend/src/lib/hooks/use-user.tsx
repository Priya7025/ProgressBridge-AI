'use client'

import { createContext, useContext, ReactNode } from 'react'

export interface CurrentUser {
  id: string
  email?: string
  role: string | null
  project_ids: string[] | null
}

interface UserContextType {
  user: CurrentUser | null
}

const UserContext = createContext<UserContextType>({ user: null })

export function UserProvider({
  user,
  children,
}: {
  user: CurrentUser | null
  children: ReactNode
}) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  )
}

/**
 * Client-side hook to access the currently authenticated user's profile and session data.
 * Must be used within pages/components wrapped by UserProvider.
 */
export function useCurrentUser(): CurrentUser | null {
  const context = useContext(UserContext)
  return context.user
}
