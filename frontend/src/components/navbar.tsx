'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/lib/hooks/use-user'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const currentUser = useCurrentUser()

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
    <header className="w-full bg-[#070707] text-[#ffffff] border-b border-[#e2bf29]/30 px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-8">
        <Link
          href="/time-agent"
          className="text-xl font-bold tracking-tight text-[#e2bf29] font-heading hover:opacity-90 transition-opacity"
        >
          ProgressBridge AI
        </Link>
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/activities'
                ? pathname.startsWith('/activities')
                : pathname === link.href

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#e2bf29] font-semibold border-b-2 border-[#e2bf29] pb-0.5'
                    : 'text-[#f1f2f3]/70 hover:text-[#ffffff]'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {currentUser?.role && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full border border-[#e2bf29]/40 bg-[#111111] text-[#e2bf29] capitalize tracking-wide shadow-sm">
            {currentUser.role}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="border border-[#e2bf29] text-[#e2bf29] hover:bg-[#e2bf29] hover:text-[#111111] font-bold transition-colors cursor-pointer"
        >
          Sign Out
        </Button>
      </div>
    </header>
  )
}
