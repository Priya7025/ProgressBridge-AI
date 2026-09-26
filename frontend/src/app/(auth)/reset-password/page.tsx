'use client'

/**
 * Reset Password Page Component
 *
 * Handles Supabase PASSWORD_RECOVERY flow:
 * 1. Supabase sends a recovery link which redirects to /reset-password#access_token=...&type=recovery
 * 2. The client SDK detects the recovery tokens or listens to onAuthStateChange with event === 'PASSWORD_RECOVERY'.
 * 3. The user inputs a new password.
 * 4. Calls supabase.auth.updateUser({ password }) to persist the new password.
 * 5. On success, redirects the user to /login.
 */

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash.includes('error=') || hash.includes('error_code=')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''))
        const errorDescription = params.get('error_description') || params.get('error')
        const errorCode = params.get('error_code')
        if (errorCode === 'otp_expired') {
          return 'The password reset link has expired or has already been used. Please request a new link.'
        } else if (errorDescription) {
          return decodeURIComponent(errorDescription.replace(/\+/g, ' '))
        }
      }
    }
    return null
  })
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Listen to Supabase auth state change for PASSWORD_RECOVERY
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' || session) {
          setSessionReady(true)
          setError(null)
        }
        setCheckingSession(false)
      }
    )

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      }
      setCheckingSession(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        router.push('/login')
      }, 2500)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-8 bg-background text-foreground transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md bg-card text-card-foreground border border-border/70 rounded-xl shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="font-heading font-sans text-2xl font-bold tracking-tight text-primary">
            Set New Password
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your new password below to update your account credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <CheckCircle2 className="size-12 text-emerald-500 animate-in zoom-in-50 duration-300" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Your password has been reset successfully!
              </p>
              <p className="text-xs text-muted-foreground">
                Redirecting you to the sign-in page...
              </p>
              <Button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full bg-primary text-primary-foreground font-bold rounded-lg h-10 mt-2"
              >
                Go to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive font-medium">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>{error}</p>
                    <Link
                      href="/login"
                      className="text-xs text-primary underline underline-offset-2 hover:opacity-80 block"
                    >
                      Return to Sign In to request a new link
                    </Link>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-semibold">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-background border border-border/60 text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-semibold">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-background border border-border/60 text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-bold rounded-lg shadow-[rgba(226,191,41,0.3)_0px_0px_12px] hover:opacity-90 cursor-pointer transition-all h-10"
                disabled={loading || (checkingSession && !sessionReady)}
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
