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
    <div className="flex min-h-screen items-center justify-center p-8 bg-[#000000]">
      <Card className="w-full max-w-md bg-[#111111] text-[#ffffff] border border-[#e2bf29] rounded-lg shadow-[rgba(0,0,0,0.5)_0px_4px_16px]">
        <CardHeader className="text-center pb-2">
          <CardTitle className="font-heading font-sans font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-2xl font-bold tracking-tight text-[#e2bf29]">
            Sign In
          </CardTitle>
          <CardDescription className="text-[#f1f2f3]/80">
            Enter your credentials to access ProgressBridge AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#ffffff] font-bold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#070707] border border-[#e2bf29]/50 text-[#ffffff] placeholder:text-zinc-500 rounded focus:border-[#e2bf29] focus:ring-1 focus:ring-[#e2bf29]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#ffffff] font-bold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#070707] border border-[#e2bf29]/50 text-[#ffffff] placeholder:text-zinc-500 rounded focus:border-[#e2bf29] focus:ring-1 focus:ring-[#e2bf29]"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#e2bf29] text-[#111111] font-bold rounded shadow-[rgba(226,191,41,0.3)_0px_0px_12px] hover:bg-[#cbb024] cursor-pointer transition-all"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            {error && (
              <p className="text-sm text-[#b71511] font-bold text-center">
                {error}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
