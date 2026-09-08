/**
 * NEXT.JS ROUTE GROUPS EXPLANATION:
 * --------------------------------
 * Folder names wrapped in parentheses like `(protected)` are Next.js "Route Groups".
 * 
 * Why doesn't `(protected)` appear in the browser URL?
 * Next.js treats parenthesized folder names purely as organizational boundaries for developers.
 * They allow you to group related routes together and apply shared layouts or authentication checks
 * without modifying the public URL path structure.
 * 
 * Example:
 * - File system path: app/(protected)/dashboard/page.tsx
 * - Actual browser URL: http://localhost:3000/dashboard  (Notice `(protected)` is omitted from the URL!)
 * 
 * This keeps your URL structure clean and flat while allowing you to enforce route protection
 * and layout wrappers over an entire section of your application.
 */

import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserProvider, CurrentUser } from '@/lib/hooks/use-user'
import { Navbar } from '@/components/navbar'

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()

  // 1. Get current authenticated user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 2. Redirect to /login if user is not authenticated
  if (!user) {
    redirect('/login')
  }

  // 3. Query user_profiles table for role & project_ids
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, project_ids')
    .eq('id', user.id)
    .single()

  const currentUser: CurrentUser = {
    id: user.id,
    email: user.email,
    role: profile?.role ?? null,
    project_ids: profile?.project_ids ?? [],
  }

  return (
    <UserProvider user={currentUser}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </UserProvider>
  )
}
