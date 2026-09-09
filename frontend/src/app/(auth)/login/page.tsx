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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      router.push('/dashboard')
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
            Sign In
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your credentials to access ProgressBridge AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="password" className="text-foreground font-semibold">Password</Label>
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
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            {error && (
              <p className="text-sm text-destructive font-bold text-center">
                {error}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
