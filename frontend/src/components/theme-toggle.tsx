/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import React, { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme-provider'
import { Button } from '@/components/ui/button'

interface ThemeToggleProps {
  showLabel?: boolean
  className?: string
}

export function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={showLabel ? 'sm' : 'icon-sm'}
        className={`text-[#e2bf29] hover:bg-[#e2bf29]/15 border border-[#e2bf29]/30 rounded-lg ${className}`}
        aria-label="Toggle theme"
      >
        <span className="size-4 opacity-0" />
        {showLabel && <span className="text-xs">Theme</span>}
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size={showLabel ? 'sm' : 'icon-sm'}
      onClick={toggleTheme}
      className={`relative border border-[#e2bf29]/40 hover:border-[#e2bf29] bg-[#111111]/80 dark:bg-[#111111] light:bg-[#f4f4f5] text-[#e2bf29] hover:bg-[#e2bf29]/15 dark:hover:bg-[#e2bf29]/20 rounded-lg transition-all duration-200 cursor-pointer ${
        showLabel ? 'px-3 gap-2' : 'size-8.5'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle Light and Dark Theme"
    >
      <div className="relative size-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="size-4 text-[#e2bf29] transition-transform duration-300 rotate-0 scale-100 hover:rotate-45" />
        ) : (
          <Moon className="size-4 text-[#b8860b] dark:text-[#e2bf29] transition-transform duration-300 -rotate-12 scale-100" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-foreground">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </Button>
  )
}
