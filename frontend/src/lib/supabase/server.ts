import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates and returns a Supabase client configured for Server Components, Server Actions, and Route Handlers.
 *
 * What it does:
 * - Initializes a Supabase client that runs securely on the Next.js server.
 * - Uses cookie-based authentication to read and persist the user's logged-in session across server requests.
 *
 * When to use:
 * - Inside Server Components (the default in Next.js App Router).
 * - Inside Server Actions and Route Handlers (API endpoints).
 * - Whenever fetching data or performing database operations on the server before rendering pages.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
