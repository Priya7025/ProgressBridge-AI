'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/lib/hooks/use-user'
import { Menu, X, LogOut, Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const currentUser = useCurrentUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isPlanner = currentUser?.role === 'planner'

  const navLinks = [
    { name: 'Time Agent', href: '/time-agent', show: true },
    { name: 'Upload', href: '/upload', show: true },
    { name: 'Dashboard', href: '/dashboard', show: isPlanner },
    { name: 'Review', href: '/review', show: isPlanner },
    { name: 'Activities', href: '/activities', show: isPlanner },
  ].filter((link) => link.show)

  return (
    <header className="w-full bg-card/95 dark:bg-[#070707] text-card-foreground border-b border-border/40 sticky top-0 z-50 shadow-md backdrop-blur-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand & Desktop Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            href="/time-agent"
            className="text-lg sm:text-xl font-bold tracking-tight text-primary font-heading hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Sparkles className="size-4 sm:size-5 text-primary shrink-0" />
            <span>ProgressBridge AI</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/activities'
                  ? pathname.startsWith('/activities')
                  : pathname === link.href

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors py-1 ${
                    isActive
                      ? 'text-primary font-bold border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Desktop User Section */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {currentUser?.role && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-primary/40 bg-muted/60 text-primary capitalize tracking-wide shadow-sm">
              {currentUser.role}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="border border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground font-bold transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5 mr-1" />
            Sign Out
          </Button>
        </div>

        {/* Mobile Menu & Theme Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />

          {currentUser?.role && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-primary/40 bg-muted/60 text-primary capitalize tracking-wide">
              {currentUser.role}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Navigation Menu"
            className="p-2 rounded-lg bg-muted text-primary border border-border/40 hover:border-primary transition-colors focus:outline-none cursor-pointer"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-card border-b border-border/40 px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/activities'
                  ? pathname.startsWith('/activities')
                  : pathname === link.href

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{link.name}</span>
                  {isActive && <span className="size-1.5 rounded-full bg-primary" />}
                </Link>
              )
            })}
          </nav>

          <div className="pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate max-w-[170px]">
              {currentUser?.email || 'Logged in'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold transition-colors text-xs py-1.5 px-3 cursor-pointer"
            >
              <LogOut className="size-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}


