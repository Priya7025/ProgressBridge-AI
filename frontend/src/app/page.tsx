'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, Bot, BarChart3, ShieldCheck, Eye, Layers, Cpu, CheckCircle2, ShieldAlert } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  const [signupMessage, setSignupMessage] = useState<string | null>(null)

  const handleSignupClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setSignupMessage('Signup is coming soon. Please log in using demo credentials.')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground transition-colors duration-200">
      {/* Top Header */}
      <header className="w-full border-b border-border/40 bg-card/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-muted border border-primary/40 rounded-lg text-primary">
              <Sparkles className="size-5" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight font-heading text-primary">
              ProgressBridge AI
            </span>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-4">
            <ThemeToggle />

            <Link
              href="/login"
              className="text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground px-2.5 sm:px-3 py-1.5 rounded transition-colors"
            >
              Sign In
            </Link>

            <button
              type="button"
              onClick={handleSignupClick}
              className="text-xs sm:text-sm font-bold border border-primary/50 text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Sign Up
            </button>

            <Link
              href="/login"
              className="text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 px-3 sm:px-4 py-2 rounded-lg shadow-[rgba(226,191,41,0.25)_0px_0px_12px] transition-all flex items-center gap-1.5"
            >
              <span>Launch App</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center justify-center text-center space-y-8 sm:space-y-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted border border-primary/40 text-primary text-xs sm:text-sm font-semibold shadow-sm">
          <Cpu className="size-4" />
          <span>Planning-to-Execution Real-Time Bridge Layer</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-heading max-w-4xl leading-tight sm:leading-tight">
          Bridge Site Reality with Project Schedules{' '}
          <span className="text-primary drop-shadow-[0_0_24px_rgba(226,191,41,0.3)]">
            Powered by AI
          </span>
        </h1>

        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl font-sans leading-relaxed">
          Planner plans. Supervisor captures. AI understands. Visual AI verifies. Planner approves. ProgressBridge updates the project truth in real time.
        </p>

        {signupMessage && (
          <div className="bg-muted border border-primary/40 text-primary px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 max-w-md animate-in fade-in duration-200">
            <ShieldAlert className="size-4 shrink-0" />
            <span>{signupMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm sm:text-base hover:opacity-90 shadow-[rgba(226,191,41,0.35)_0px_0px_20px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Get Started — Sign In</span>
            <ArrowRight className="size-4" />
          </Link>
          <button
            type="button"
            onClick={handleSignupClick}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-card border border-primary/40 text-foreground font-bold text-sm sm:text-base hover:bg-muted hover:border-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Create Account (Sign Up)</span>
          </button>
        </div>

        {/* 5-STEP CORE STORY WORKFLOW */}
        <div className="w-full pt-6 pb-4 border-y border-border/40">
          <h2 className="text-xs font-bold font-heading uppercase text-primary tracking-widest mb-6">
            The Golden Product Story
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-left">
            <div className="bg-card border border-border/60 p-3.5 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-primary">01. PLAN</span>
              <p className="text-xs font-bold text-foreground">Engineering Schedule</p>
              <p className="text-[11px] text-muted-foreground">P6 / MS Project baseline</p>
            </div>
            <div className="bg-card border border-border/60 p-3.5 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-primary">02. CAPTURE</span>
              <p className="text-xs font-bold text-foreground">Field Progress</p>
              <p className="text-[11px] text-muted-foreground">Voice, text & photos</p>
            </div>
            <div className="bg-card border border-border/60 p-3.5 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-primary">03. UNDERSTAND</span>
              <p className="text-xs font-bold text-foreground">AI Extraction</p>
              <p className="text-[11px] text-muted-foreground">Gemini structured parsing</p>
            </div>
            <div className="bg-card border border-border/60 p-3.5 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-primary">04. VERIFY</span>
              <p className="text-xs font-bold text-foreground">Human Approval</p>
              <p className="text-[11px] text-muted-foreground">Planner review & visual proof</p>
            </div>
            <div className="bg-card border border-border/60 p-3.5 rounded-xl space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono font-bold text-primary">05. ACT</span>
              <p className="text-xs font-bold text-foreground">Project Truth</p>
              <p className="text-[11px] text-muted-foreground">Delay calculation & audit</p>
            </div>
          </div>
        </div>

        {/* 3 KEY CAPABILITIES GRID */}
        <div className="space-y-4 pt-4 w-full text-left">
          <h2 className="text-base sm:text-lg font-bold font-heading text-foreground text-center">
            3 Core Platform Capabilities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 sm:p-6 bg-card border border-border/60 rounded-xl space-y-3 hover:border-primary transition-colors shadow-sm">
              <div className="size-10 rounded-lg bg-muted border border-primary/40 flex items-center justify-center text-primary">
                <Bot className="size-5" />
              </div>
              <h3 className="text-base font-bold font-heading text-foreground">1. AI Progress Capture</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Supervisors log natural site updates in plain speech or text. Intelligent Time Agent extracts structured milestones in seconds.
              </p>
            </div>

            <div className="p-5 sm:p-6 bg-card border border-border/60 rounded-xl space-y-3 hover:border-primary transition-colors shadow-sm">
              <div className="size-10 rounded-lg bg-muted border border-primary/40 flex items-center justify-center text-primary">
                <Layers className="size-5" />
              </div>
              <h3 className="text-base font-bold font-heading text-foreground">2. Schedule Linking</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Hybrid 4-factor matching algorithm pairs site events with L5/L6 activities using semantic, identifier, discipline, and location scoring.
              </p>
            </div>

            <div className="p-5 sm:p-6 bg-card border border-border/60 rounded-xl space-y-3 hover:border-primary transition-colors shadow-sm">
              <div className="size-10 rounded-lg bg-muted border border-primary/40 flex items-center justify-center text-primary">
                <Eye className="size-5" />
              </div>
              <h3 className="text-base font-bold font-heading text-foreground">3. Visual Verification</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Cross-references planner design drawings with supervisor site photos using AI visual comparison for verified confidence signals.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 bg-card py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-heading font-bold text-primary">ProgressBridge AI</span>
          <span>Intelligent Data Capture & Schedule-Linking Layer — SIH 2026</span>
        </div>
      </footer>
    </div>
  )
}
