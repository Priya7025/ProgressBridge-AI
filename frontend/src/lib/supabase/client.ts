import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates and returns a Supabase client configured for Browser (Client) Components.
 *
 * What it does:
 * - Initializes a Supabase client that runs directly in the user's browser.
 * - Reads public credentials from NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * When to use:
 * - Inside Client Components (any file that starts with "use client").
 * - For handling interactive browser events (e.g. button clicks, form submissions on the client, realtime subscriptions).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    if (typeof window !== 'undefined') {
      console.warn(
        '[Supabase Client] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in browser runtime. Using build-time fallback.'
      )
    }
    return createBrowserClient(
      url || 'https://placeholder.supabase.co',
      anonKey || 'placeholder-anon-key'
    )
  }

  return createBrowserClient(url, anonKey)
}
