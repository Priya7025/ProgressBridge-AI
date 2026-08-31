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
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
