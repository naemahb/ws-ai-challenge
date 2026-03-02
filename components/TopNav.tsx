'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserProfile } from '@/lib/UserProfileContext'
import { tokens } from '@/lib/tokens'

const NAV_LINKS = ['Home', 'Household', 'Move', 'Activity', 'Tax', 'Mortgage', 'Next moves'] as const
type NavLink = (typeof NAV_LINKS)[number]

const NAV_ROUTES: Partial<Record<NavLink, string>> = {
  Home: '/',
  'Next moves': '/dashboard',
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 3a5 5 0 00-5 5v3.5L4 14h14l-2-2.5V8a5 5 0 00-5-5z" stroke={tokens.colors.foregroundMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 17a2 2 0 004 0" stroke={tokens.colors.foregroundMuted} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function AvatarIcon() {
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: tokens.colors.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5.5" r="2.5" stroke={tokens.colors.foregroundMuted} strokeWidth="1.5" />
        <path d="M2 14.5c0-2.76 2.686-5 6-5s6 2.24 6 5" stroke={tokens.colors.foregroundMuted} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function TopNav({ activeLink, isDesktop }: { activeLink: NavLink; isDesktop: boolean }) {
  const router = useRouter()
  const { setNextMoves } = useUserProfile()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNavClick = (link: NavLink) => {
    const route = NAV_ROUTES[link]
    if (route) router.push(route)
  }

  const handleReset = () => {
    if (typeof window !== 'undefined') sessionStorage.clear()
    setNextMoves([])
    router.push('/')
  }

  if (isDesktop) {
    return (
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 0',
          borderBottom: `1px solid ${tokens.colors.border}`,
          marginBottom: '32px',
        }}
      >
        {/* Left: wordmark + nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.foreground, letterSpacing: '-0.02em' }}>
            W
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {NAV_LINKS.map((link) => {
              const isActive = link === activeLink
              return (
                <span
                  key={link}
                  onClick={() => handleNavClick(link)}
                  style={{
                    fontSize: '14px',
                    color: isActive ? tokens.colors.foreground : tokens.colors.foregroundMuted,
                    fontWeight: isActive ? 500 : 400,
                    textDecoration: isActive ? 'underline' : 'none',
                    textUnderlineOffset: '4px',
                    cursor: NAV_ROUTES[link] ? 'pointer' : 'default',
                  }}
                >
                  {link}
                </span>
              )
            })}
          </div>
        </div>

        {/* Right: search + bell + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.radius.pill,
              padding: '8px 14px',
              width: '200px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4" stroke={tokens.colors.foregroundMuted} strokeWidth="1.5" />
              <path d="M9.5 9.5l3 3" stroke={tokens.colors.foregroundMuted} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: '12px', color: tokens.colors.foregroundMuted }}>
              Search name or symbol
            </span>
          </div>
          <BellIcon />
          <div onClick={handleReset} style={{ cursor: 'pointer' }}>
            <AvatarIcon />
          </div>
        </div>
      </nav>
    )
  }

  // Mobile nav
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.foreground, letterSpacing: '-0.02em' }}>
          W
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <BellIcon />
          <div onClick={handleReset} style={{ cursor: 'pointer' }}>
            <AvatarIcon />
          </div>
          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '5px' }}
          >
            <span style={{ display: 'block', width: 22, height: 1.5, backgroundColor: tokens.colors.foreground, borderRadius: 2 }} />
            <span style={{ display: 'block', width: 22, height: 1.5, backgroundColor: tokens.colors.foreground, borderRadius: 2 }} />
            <span style={{ display: 'block', width: 22, height: 1.5, backgroundColor: tokens.colors.foreground, borderRadius: 2 }} />
          </button>
        </div>
      </div>

      {/* Slide-in menu panel */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'fixed', inset: 0,
                backgroundColor: 'rgba(0,0,0,0.3)',
                zIndex: 100,
              }}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: '72%', maxWidth: '280px',
                backgroundColor: tokens.colors.background,
                zIndex: 101,
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setMenuOpen(false)}
                style={{ alignSelf: 'flex-end', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '32px' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 4l12 12M16 4L4 16" stroke={tokens.colors.foregroundMuted} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {/* Nav links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {NAV_LINKS.map((link) => {
                  const isActive = link === activeLink
                  return (
                    <span
                      key={link}
                      onClick={() => {
                        setMenuOpen(false)
                        handleNavClick(link)
                      }}
                      style={{
                        fontSize: '18px',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? tokens.colors.foreground : tokens.colors.foregroundMuted,
                        padding: '10px 0',
                        cursor: NAV_ROUTES[link] ? 'pointer' : 'default',
                        borderBottom: `1px solid ${tokens.colors.border}`,
                      }}
                    >
                      {link}
                    </span>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
