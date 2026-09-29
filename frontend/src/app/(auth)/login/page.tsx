'use client'

/**
 * Login Page Component
 *
 * What `signInWithPassword` does and where the session gets stored:
 * `supabase.auth.signInWithPassword({ email, password })` sends the user's email and password
 * to Supabase Auth to authenticate their credentials.
 * Supabase handles session management automatically via cookies and localStorage — 
 * you do not need to manually save, manage, or refresh session tokens.
 */

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
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
import { Briefcase, HardHat, Sparkles, AlertCircle } from 'lucide-react'

type UserRole = 'planner' | 'supervisor'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('planner')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isResetMode, setIsResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [signupNotice, setSignupNotice] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      // Store selected role in cookie for SSR and route to the corresponding workspace
      document.cookie = `pb_user_role=${selectedRole}; path=/; max-age=86400`
      router.push(`/dashboard?role=${selectedRole}`)
      router.refresh()
    }
  }

  const handleResetRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setResetLoading(true)
    setError(null)

    const redirectTo = `${window.location.origin}/reset-password`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (resetError) {
      setError(resetError.message)
      setResetLoading(false)
    } else {
      setResetSent(true)
      setResetLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-8 bg-background text-foreground transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md bg-card text-card-foreground border border-border/70 rounded-xl shadow-lg">
        <CardHeader className="text-center pb-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="size-5 text-primary" />
            <span className="font-heading font-bold text-sm tracking-wide uppercase text-primary">ProgressBridge AI</span>
          </div>
          <CardTitle className="font-heading font-sans text-2xl font-bold tracking-tight text-foreground">
            {isResetMode ? 'Reset Password' : 'Sign In'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isResetMode
              ? 'Enter your email to receive a password reset link.'
              : 'Select your role and enter your credentials to access the workspace.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isResetMode ? (
            resetSent ? (
              <div className="space-y-4 text-center py-2">
                <p className="text-sm font-semibold text-emerald-500">
                  Password reset link sent! Check your inbox.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsResetMode(false)
                    setResetSent(false)
                  }}
                  className="w-full border-border/70 hover:bg-muted text-foreground h-10"
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-foreground font-semibold">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background border border-border/60 text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-bold rounded-lg shadow-[rgba(226,191,41,0.3)_0px_0px_12px] hover:opacity-90 cursor-pointer transition-all h-10"
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Sending link...' : 'Send Reset Link'}
                </Button>
                {error && (
                  <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg text-xs font-semibold text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(false)
                      setError(null)
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection UI */}
              <div className="space-y-2">
                <Label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                  Role
                </Label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('planner')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      selectedRole === 'planner'
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <Briefcase className="size-4 shrink-0" />
                    <span>Planner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('supervisor')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      selectedRole === 'supervisor'
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <HardHat className="size-4 shrink-0" />
                    <span>Supervisor</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background border border-border/60 text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground font-semibold">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true)
                      setError(null)
                    }}
                    className="text-xs text-primary hover:underline cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background border border-border/60 text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-bold rounded-lg shadow-[rgba(226,191,41,0.3)_0px_0px_12px] hover:opacity-90 cursor-pointer transition-all h-10"
                disabled={loading}
              >
                {loading ? 'Signing in...' : `Sign In as ${selectedRole === 'supervisor' ? 'Supervisor' : 'Planner'}`}
              </Button>

              {error && (
                <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg text-xs font-semibold text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="text-center pt-2 text-xs text-muted-foreground">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setSignupNotice((prev) => !prev)}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  Sign Up
                </button>
                {signupNotice && (
                  <p className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded border border-border/60 animate-in fade-in duration-200">
                    Signup is coming soon. Please sign in with your assigned account.
                  </p>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
