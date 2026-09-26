import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { UserProvider, CurrentUser } from '@/lib/hooks/use-user'
import { Navbar } from '@/components/navbar'

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const cookieRole = cookieStore.get('pb_user_role')?.value

  // 1. Get current authenticated user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Query user_profiles table for profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, project_ids')
    .eq('id', user.id)
    .maybeSingle()

  const effectiveRole = cookieRole || profile?.role || 'planner'

  const currentUser: CurrentUser = {
    id: user.id,
    email: user.email,
    role: effectiveRole,
    project_ids: profile?.project_ids ?? [],
  }

  return (
    <UserProvider user={currentUser}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8">{children}</main>
      </div>
    </UserProvider>
  )
}
