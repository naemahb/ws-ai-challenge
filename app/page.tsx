'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/lib/UserProfileContext'
import { calculateNextMoves } from '@/lib/scoring'
import { tokens } from '@/lib/tokens'
import type { NextMove, UserProfile } from '@/lib/mockData'
import { TopNav } from '@/components/TopNav'

// =============================================================================
// useIsDesktop
// =============================================================================

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isDesktop
}

// =============================================================================
// Constants
// =============================================================================

const TIME_FILTERS = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'] as const
type TimeFilter = (typeof TIME_FILTERS)[number]

const MOCK_ACCOUNTS: { name: string; value: string; subtext: string | null; chevron: boolean }[] = [
  { name: 'Chequing', value: '$8,240.00', subtext: null, chevron: false },
  { name: 'USD savings', value: '$2,100 USD', subtext: null, chevron: false },
  { name: 'TFSA', value: '$4,180.00', subtext: '2 accounts', chevron: false },
  { name: 'FHSA', value: '$0.00', subtext: null, chevron: false },
  { name: 'RRSP', value: '$2,864.63', subtext: '3 accounts', chevron: true },
  { name: 'Non-registered', value: '$847.00', subtext: null, chevron: false },
]

// Upward-trending polyline; viewBox 0 0 300 80, y=80 is bottom
const CHART_POINTS = '0,72 30,68 60,65 90,60 120,57 150,62 180,50 210,43 240,35 270,26 300,18'

// =============================================================================
// PortfolioHero
// =============================================================================

function PortfolioHero({
  timeFilter,
  onTimeFilterChange,
  isDesktop,
}: {
  timeFilter: TimeFilter
  onTimeFilterChange: (f: TimeFilter) => void
  isDesktop: boolean
}) {
  return (
    <div style={{ padding: isDesktop ? '0 0 32px' : '24px 24px 0' }}>
      <p style={{ fontSize: '14px', color: tokens.colors.foregroundMuted }}>
        Total portfolio
      </p>
      <p
        style={{
          fontSize: isDesktop ? '52px' : '40px',
          fontWeight: 700,
          color: tokens.colors.foreground,
          lineHeight: '1.05',
          marginTop: '2px',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        $15,284.63
      </p>
      <p style={{ fontSize: '14px', color: tokens.colors.success, marginTop: '6px' }}>
        +$2,847 (+2.43%) all time →
      </p>

      {/* SVG chart */}
      <div style={{ height: isDesktop ? '160px' : '80px', marginTop: '24px' }}>
        <svg
          width="100%"
          height={isDesktop ? '160' : '80'}
          viewBox="0 0 300 80"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3D7A5C" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3D7A5C" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Gradient fill under the line */}
          <path
            d="M0,72 30,68 60,65 90,60 120,57 150,62 180,50 210,43 240,35 270,26 300,18 L300,80 L0,80 Z"
            fill="url(#chartGradient)"
            stroke="none"
          />
          {/* Line on top */}
          <polyline
            points={CHART_POINTS}
            fill="none"
            stroke={tokens.colors.success}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Time filters */}
      <div
        style={{
          display: 'flex',
          gap: isDesktop ? '24px' : '16px',
          marginTop: '16px',
          paddingBottom: isDesktop ? '0' : '24px',
        }}
      >
        {TIME_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => onTimeFilterChange(f)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: timeFilter === f ? 600 : 400,
              color:
                timeFilter === f ? tokens.colors.foreground : tokens.colors.foregroundMuted,
              textDecoration: timeFilter === f ? 'underline' : 'none',
              textUnderlineOffset: '3px',
            }}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// QuickActions
// =============================================================================

const LINK_ACTIONS = ['+ Add an account', '⇄ Move an account', '📄 View 2025 tax documents']

function QuickActions({ isDesktop }: { isDesktop: boolean }) {
  const btnStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    color: tokens.colors.foreground,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
  }

  return (
    <div style={{ padding: isDesktop ? '0 0 20px' : '0 24px 20px' }}>
      {/* Buttons above the card */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button style={btnStyle}>+ Add money</button>
        <button style={btnStyle}>⇄ Transfer</button>
      </div>

      {/* Card with link actions */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '0 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {LINK_ACTIONS.map((action, i) => (
          <div key={action}>
            <div style={{ padding: '13px 0', cursor: 'pointer' }}>
              <span style={{ fontSize: '14px', color: tokens.colors.foreground }}>{action}</span>
            </div>
            {i < LINK_ACTIONS.length - 1 && (
              <div style={{ height: '1px', backgroundColor: '#EDEAE3' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// AccountsList
// =============================================================================

function AccountsList({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div style={{ padding: isDesktop ? '0 0 32px' : '0 24px 28px' }}>
      <p style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.foreground, marginBottom: '12px' }}>
        Accounts
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {MOCK_ACCOUNTS.map((acc) => (
          <div
            key={acc.name}
            style={{
              backgroundColor: 'white',
              borderRadius: '14px',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div>
              <p style={{ fontSize: '14px', color: tokens.colors.foreground, margin: 0 }}>{acc.name}</p>
              {acc.subtext && (
                <p style={{ fontSize: '12px', color: tokens.colors.foregroundMuted, margin: '2px 0 0' }}>
                  {acc.subtext}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', color: tokens.colors.foreground, fontVariantNumeric: 'tabular-nums' }}>
                {acc.value}
              </span>
              {acc.chevron && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3l4 4-4 4" stroke={tokens.colors.foregroundMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Carousel card helpers
// =============================================================================

function getCardBg(category: string): string {
  const c = category.toLowerCase()
  if (c.includes('tax')) return '#E8DDD8'
  if (c.includes('invest') || c.includes('capital') || c.includes('portfolio')) return '#DDE0E8'
  if (c.includes('debt') || c.includes('mortgage') || c.includes('credit')) return '#E8E4D0'
  return '#D6DDD0'
}

function CardIllustration({ category }: { category: string }) {
  const c = category.toLowerCase()
  const fill = 'rgba(0,0,0,0.13)'

  if (c.includes('tax')) {
    // Document with checkmark
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <rect x="10" y="6" width="28" height="36" rx="4" fill={fill} />
        <rect x="10" y="6" width="28" height="36" rx="4" fill={fill} opacity="0.5" />
        <path d="M18 6v6a2 2 0 0 1-2 2H10" stroke="rgba(0,0,0,0.10)" strokeWidth="1.5" />
        <rect x="16" y="19" width="16" height="2" rx="1" fill="rgba(0,0,0,0.15)" />
        <rect x="16" y="24" width="12" height="2" rx="1" fill="rgba(0,0,0,0.12)" />
        <rect x="16" y="29" width="14" height="2" rx="1" fill="rgba(0,0,0,0.12)" />
        <circle cx="37" cy="38" r="8" fill="rgba(0,0,0,0.12)" />
        <path d="M33 38l3 3 5-5" stroke="rgba(0,0,0,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (c.includes('invest') || c.includes('capital') || c.includes('portfolio')) {
    // Bar chart with upward trend line
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <rect x="8" y="30" width="8" height="14" rx="2" fill={fill} />
        <rect x="20" y="22" width="8" height="22" rx="2" fill={fill} />
        <rect x="32" y="14" width="8" height="30" rx="2" fill={fill} />
        <rect x="44" y="8" width="8" height="36" rx="2" fill={fill} />
        <path d="M12 28 L24 20 L36 12 L48 6" stroke="rgba(0,0,0,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="48" cy="6" r="3" fill="rgba(0,0,0,0.22)" />
      </svg>
    )
  }

  if (c.includes('debt') || c.includes('mortgage') || c.includes('credit')) {
    // Credit card
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <rect x="4" y="13" width="44" height="28" rx="5" fill={fill} />
        <rect x="4" y="13" width="44" height="28" rx="5" fill={fill} opacity="0.4" />
        <rect x="4" y="21" width="44" height="7" fill="rgba(0,0,0,0.10)" />
        <rect x="10" y="33" width="10" height="4" rx="1.5" fill="rgba(0,0,0,0.15)" />
        <rect x="24" y="33" width="6" height="4" rx="1.5" fill="rgba(0,0,0,0.10)" />
        <circle cx="37" cy="17" r="4" fill="rgba(0,0,0,0.12)" />
        <circle cx="43" cy="17" r="4" fill="rgba(0,0,0,0.10)" />
      </svg>
    )
  }

  // Default: stacked coins / piggy bank feel
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <ellipse cx="26" cy="40" rx="16" ry="5" fill={fill} />
      <ellipse cx="26" cy="33" rx="16" ry="5" fill={fill} />
      <ellipse cx="26" cy="26" rx="16" ry="5" fill={fill} />
      <ellipse cx="26" cy="19" rx="16" ry="5" fill="rgba(0,0,0,0.16)" />
      <ellipse cx="26" cy="19" rx="16" ry="5" fill={fill} />
    </svg>
  )
}

function ConfidenceBadge({ state }: { state: NextMove['confidenceState'] }) {
  const map: Record<NextMove['confidenceState'], { bg: string; color: string; label: string }> = {
    ready: { bg: 'white', color: '#3D7A5C', label: 'Ready' },
    almost: { bg: 'white', color: '#C17F3A', label: 'Almost there' },
    needs_attention: { bg: 'white', color: '#B94040', label: 'Needs attention' },
    needs_human: { bg: '#1A1A1A', color: 'white', label: 'Talk to advisor' },
  }
  const s = map[state]
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.color,
        fontSize: '12px',
        fontWeight: 500,
        padding: '4px 10px',
        borderRadius: '9999px',
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  )
}

// =============================================================================
// CarouselCard
// =============================================================================

function CarouselCard({ move, onClick }: { move: NextMove; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: '85%',
        height: '180px',
        backgroundColor: getCardBg(move.category),
        borderRadius: '20px',
        padding: '24px',
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
        scrollSnapAlign: 'start',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Urgent pill — top right */}
      {move.isUrgent && (
        <span
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: '#1A1A1A',
            color: 'white',
            fontSize: '10px',
            fontWeight: 500,
            padding: '3px 8px',
            borderRadius: '9999px',
          }}
        >
          ⚡ Time sensitive
        </span>
      )}

      {/* Top: title + subtext */}
      <div style={{ paddingRight: move.isUrgent ? '110px' : '0' }}>
        <p
          className="home-line-clamp"
          style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.foreground, lineHeight: '1.3', margin: 0 }}
        >
          {move.title}
        </p>
        <p
          className="home-line-clamp"
          style={{ fontSize: '14px', color: tokens.colors.foregroundMuted, marginTop: '4px', lineHeight: '1.4' }}
        >
          {move.oneLineSummary}
        </p>
      </div>

      {/* Bottom: illustration + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <CardIllustration category={move.category} />
        <ConfidenceBadge state={move.confidenceState} />
      </div>
    </button>
  )
}

// =============================================================================
// NextMovesSection
// =============================================================================

function NextMovesSection({
  moves,
  onGetStarted,
  onSeeAll,
  isDesktop,
}: {
  moves: NextMove[]
  onGetStarted: () => void
  onSeeAll: () => void
  isDesktop: boolean
}) {
  const profileComplete = moves.length > 0
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const visibleMoves = moves.slice(0, 5)

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, clientWidth } = scrollRef.current
    const cardWidth = clientWidth * 0.85 + 12
    const idx = Math.round(scrollLeft / cardWidth)
    setActiveIndex(Math.min(idx, visibleMoves.length - 1))
  }, [visibleMoves.length])

  const scrollTo = useCallback((idx: number) => {
    if (!scrollRef.current) return
    const { clientWidth } = scrollRef.current
    const cardWidth = clientWidth * 0.85 + 12
    scrollRef.current.scrollTo({ left: cardWidth * idx, behavior: 'smooth' })
  }, [])

  const scrollPrev = useCallback(() => scrollTo(Math.max(0, activeIndex - 1)), [activeIndex, scrollTo])
  const scrollNext = useCallback(() => scrollTo(Math.min(visibleMoves.length - 1, activeIndex + 1)), [activeIndex, visibleMoves.length, scrollTo])

  if (!profileComplete) {
    return (
      <div style={{ padding: isDesktop ? '0' : '0 24px 24px' }}>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              backgroundColor: tokens.colors.foreground,
              color: 'white',
              padding: '2px 8px',
              borderRadius: '9999px',
            }}
          >
            New
          </span>
          <p
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: tokens.colors.foreground,
              marginTop: '10px',
              lineHeight: '1.3',
            }}
          >
            See your next financial moves
          </p>
          <p
            style={{
              fontSize: '14px',
              color: tokens.colors.foregroundMuted,
              marginTop: '6px',
              lineHeight: '1.5',
            }}
          >
            Answer 9 quick questions and we&apos;ll rank your biggest opportunities — across all
            your accounts, not just Wealthsimple.
          </p>
          <button
            onClick={onGetStarted}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: tokens.colors.foreground,
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: tokens.radius.pill,
              border: 'none',
              cursor: 'pointer',
              marginTop: '16px',
            }}
          >
            Get started →
          </button>
        </div>
      </div>
    )
  }

  const navArrowStyle: React.CSSProperties = {
    backgroundColor: 'white',
    border: 'none',
    cursor: 'pointer',
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    color: tokens.colors.foreground,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    flexShrink: 0,
  }

  return (
    <div style={{ paddingBottom: isDesktop ? '28px' : '24px' }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          padding: isDesktop ? '0' : '0 24px',
        }}
      >
        <p style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.foreground }}>
          Your next moves
        </p>
        <button
          onClick={onSeeAll}
          style={{
            fontSize: '14px',
            color: tokens.colors.foregroundMuted,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          See all →
        </button>
      </div>

      {/* Count + arrow nav row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          padding: isDesktop ? '0' : '0 24px',
        }}
      >
        <span style={{ fontSize: '14px', color: tokens.colors.foregroundMuted }}>
          {activeIndex + 1} of {visibleMoves.length}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={scrollPrev}
            disabled={activeIndex === 0}
            style={{
              ...navArrowStyle,
              opacity: activeIndex === 0 ? 0.3 : 1,
              cursor: activeIndex === 0 ? 'default' : 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M6.18668 10.1512C6.08173 9.80878 6.16487 9.42111 6.43571 9.1502L13.2931 2.29278C13.6836 1.90244 14.3167 1.90237 14.7072 2.29278C15.0977 2.68325 15.0975 3.3163 14.7072 3.70684L8.47086 9.94317L14.6701 16.1414C15.0605 16.5319 15.0605 17.165 14.6701 17.5555C14.2796 17.946 13.6465 17.9459 13.256 17.5555L6.47574 10.7762C6.3015 10.6019 6.20541 10.379 6.18668 10.1512Z" fill="currentColor"/></svg>
          </button>
          <button
            onClick={scrollNext}
            disabled={activeIndex === visibleMoves.length - 1}
            style={{
              ...navArrowStyle,
              opacity: activeIndex === visibleMoves.length - 1 ? 0.3 : 1,
              cursor: activeIndex === visibleMoves.length - 1 ? 'default' : 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M14.8133 9.84882C14.9183 10.1912 14.8351 10.5789 14.5643 10.8498L7.70687 17.7072C7.31635 18.0976 6.68328 18.0976 6.29281 17.7072C5.90234 17.3168 5.90245 16.6837 6.29281 16.2932L12.5291 10.0568L6.32992 3.85859C5.9395 3.46807 5.93947 2.83502 6.32992 2.44452C6.72041 2.05403 7.35345 2.05409 7.74398 2.44452L14.5243 9.22382C14.6985 9.3981 14.7946 9.62105 14.8133 9.84882Z" fill="currentColor"/></svg>
          </button>
        </div>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="home-moves-scroll"
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingLeft: isDesktop ? '0' : '24px',
          paddingRight: isDesktop ? '0' : '72px',
          paddingBottom: '4px',
          marginLeft: isDesktop ? '0' : '-24px',
          marginRight: isDesktop ? '0' : '-24px',
        }}
      >
        {visibleMoves.map((move) => (
          <CarouselCard key={move.id} move={move} onClick={onSeeAll} />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Page
// =============================================================================

export default function HomePage() {
  const router = useRouter()
  const { nextMoves, setNextMoves } = useUserProfile()
  const isDesktop = useIsDesktop()

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL')
  const [moves, setMoves] = useState<NextMove[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (nextMoves.length > 0) {
      setMoves(nextMoves)
      setReady(true)
      return
    }

    const stored =
      typeof window !== 'undefined' ? sessionStorage.getItem('userProfile') : null
    if (stored) {
      try {
        const prof = JSON.parse(stored) as UserProfile
        const m = calculateNextMoves(prof)
        setMoves(m)
        setNextMoves(m)
      } catch {
        /* ignore malformed data */
      }
    }

    setReady(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        backgroundColor: tokens.colors.background,
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      <style>{`
        .home-moves-scroll::-webkit-scrollbar { display: none; }
        .home-line-clamp {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div
        style={{
          maxWidth: isDesktop ? '1100px' : '480px',
          margin: '0 auto',
          padding: isDesktop ? '0 48px' : '0',
        }}
      >
        <TopNav activeLink="Home" isDesktop={isDesktop} />

        {isDesktop ? (
          <div
            style={{
              display: 'flex',
              gap: '64px',
              alignItems: 'flex-start',
              paddingTop: '8px',
            }}
          >
            {/* Left: portfolio hero + accounts */}
            <div style={{ flex: '1.5', minWidth: 0 }}>
              <PortfolioHero
                timeFilter={timeFilter}
                onTimeFilterChange={setTimeFilter}
                isDesktop={isDesktop}
              />
              <AccountsList isDesktop={isDesktop} />
            </div>

            {/* Right: quick actions + next moves */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: '8px', paddingBottom: '48px' }}>
              <QuickActions isDesktop={isDesktop} />
              {ready && (
                <NextMovesSection
                  moves={moves}
                  onGetStarted={() => router.push('/setup')}
                  onSeeAll={() => router.push('/dashboard')}
                  isDesktop={isDesktop}
                />
              )}
            </div>
          </div>
        ) : (
          <div style={{ paddingBottom: '48px' }}>
            {ready && (
              <NextMovesSection
                moves={moves}
                onGetStarted={() => router.push('/setup')}
                onSeeAll={() => router.push('/dashboard')}
                isDesktop={isDesktop}
              />
            )}
            <PortfolioHero
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              isDesktop={isDesktop}
            />
            <AccountsList isDesktop={isDesktop} />
            <QuickActions isDesktop={isDesktop} />
          </div>
        )}
      </div>

    </div>
  )
}
