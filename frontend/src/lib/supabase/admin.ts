import { createClient } from '@supabase/supabase-js'

/**
 * Creates and returns a Supabase client configured with the server-side Service Role key.
 *
 * What it does:
 * - Initializes a Supabase client that runs securely ONLY on the Next.js server.
 * - Bypasses Row Level Security (RLS) for privileged server-side operations (e.g. Storage uploads, admin tasks).
 * - Never expose this client or SUPABASE_SERVICE_ROLE_KEY to the browser!
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      '[Supabase Admin] Server configuration error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.'
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
