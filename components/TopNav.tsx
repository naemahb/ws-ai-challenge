'use client'

import { useRouter } from 'next/navigation'
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

  const handleNavClick = (link: NavLink) => {
    const route = NAV_ROUTES[link]
    if (route) router.push(route)
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
          <AvatarIcon />
        </div>
      </nav>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
      <span style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.foreground, letterSpacing: '-0.02em' }}>
        W
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <BellIcon />
        <AvatarIcon />
      </div>
    </div>
  )
}
