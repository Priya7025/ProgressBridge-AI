import Link from 'next/link'
import { Sparkles, ArrowRight, Bot, BarChart3, Upload, Cpu } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
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
            <Link
              href="/time-agent"
              className="text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 px-3 sm:px-4 py-2 rounded-lg shadow-[rgba(226,191,41,0.25)_0px_0px_12px] transition-all flex items-center gap-1.5"
            >
              <span>Launch App</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center justify-center text-center space-y-8 sm:space-y-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted border border-primary/40 text-primary text-xs sm:text-sm font-semibold shadow-sm">
          <Cpu className="size-4" />
          <span>Next-Gen Construction Progress Intelligence</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-heading max-w-4xl leading-tight sm:leading-tight">
          Bridge Site Reality with Project Schedules{' '}
          <span className="text-primary drop-shadow-[0_0_24px_rgba(226,191,41,0.3)]">
            Powered by AI
          </span>
        </h1>

        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl font-sans leading-relaxed">
          Log natural site updates with our intelligent Time Agent, automate document extraction, and match real-world progress to schedule activities in seconds.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
          <Link
            href="/time-agent"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm sm:text-base hover:opacity-90 shadow-[rgba(226,191,41,0.35)_0px_0px_20px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Time Agent</span>
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-card border border-primary/40 text-foreground font-bold text-sm sm:text-base hover:bg-muted hover:border-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Dashboard</span>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-10 sm:pt-14 w-full text-left">
          <div className="p-5 sm:p-6 bg-card border border-border/60 rounded-xl space-y-3 hover:border-primary transition-colors shadow-sm">
            <div className="size-10 rounded-lg bg-muted border border-primary/40 flex items-center justify-center text-primary">
              <Bot className="size-5" />
            </div>
            <h3 className="text-base font-bold font-heading text-foreground">AI Time Agent</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Supervisors can report daily milestones in plain speech or text with instant structured event extraction.
            </p>
          </div>

          <div className="p-5 sm:p-6 bg-card border border-border/60 rounded-xl space-y-3 hover:border-primary transition-colors shadow-sm">
            <div className="size-10 rounded-lg bg-muted border border-primary/40 flex items-center justify-center text-primary">
              <Upload className="size-5" />
            </div>
            <h3 className="text-base font-bold font-heading text-foreground">Multi-Format Ingestion</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Ingest Excel (.xlsx), CSV, TXT, and PDF reports directly into unified project records.
            </p>
          </div>

          <div className="p-5 sm:p-6 bg-card border border-border/60 rounded-xl space-y-3 hover:border-primary transition-colors shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="size-10 rounded-lg bg-muted border border-primary/40 flex items-center justify-center text-primary">
              <BarChart3 className="size-5" />
            </div>
            <h3 className="text-base font-bold font-heading text-foreground">Discipline Analytics</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Real-time KPIs, delayed activity flags, and interactive discipline progress charts for project planners.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 bg-card py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-heading font-bold text-primary">ProgressBridge AI</span>
          <span>Construction Progress Tracking & Schedule Reconciliation System</span>
        </div>
      </footer>
    </div>
  )
}


