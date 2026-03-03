'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserProfile } from '@/lib/UserProfileContext'
import { calculateNextMoves, getWhatIfMoves, getDataCompleteness } from '@/lib/scoring'
import { SharpenerCallout } from '@/components/dashboard/SharpenerCallout'
import { SharpenerModal } from '@/components/dashboard/SharpenerModal'
import { TopNav } from '@/components/TopNav'
import { tokens } from '@/lib/tokens'
import type { NextMove, UserProfile, AISignal } from '@/lib/mockData'
import { defaultAISignals, day30State } from '@/lib/mockData'
import { TimeToggle } from '@/components/dashboard/TimeToggle'
import { ChevronDown } from 'lucide-react'

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
// Types & constants
// =============================================================================

type ScenarioKey =
  | 'received_bonus'
  | 'changing_jobs'
  | 'buying_home_soon'
  | 'got_raise'
  | 'retiring_soon'
  | 'debt_free'

const SCENARIOS: { key: ScenarioKey; label: string; description: string }[] = [
  { key: 'received_bonus', label: 'I get a bonus', description: 'you receive a bonus' },
  { key: 'changing_jobs', label: 'I change jobs', description: 'you change jobs' },
  { key: 'buying_home_soon', label: 'I buy a home soon', description: 'you buy a home soon' },
  { key: 'got_raise', label: 'I got a raise', description: 'your income goes up' },
  { key: 'retiring_soon', label: "I'm retiring soon", description: "you're retiring soon" },
  { key: 'debt_free', label: 'I paid off my debt', description: 'you become debt-free' },
]

// =============================================================================
// AI decision system
// =============================================================================

const AI_CONFIG: Record<
  NextMove['aiDecision'],
  {
    bg: string
    dot: string
    label: string
    labelColor: string
    buttonText: string
    buttonBg: string
    buttonColor: string
    buttonBorder?: string
  }
> = {
  auto: {
    bg: '#F0F7F4',
    dot: '#3D7A5C',
    label: 'AI can do this for you',
    labelColor: '#3D7A5C',
    buttonText: 'Let AI handle this →',
    buttonBg: tokens.colors.foreground,
    buttonColor: 'white',
  },
  needs_approval: {
    bg: '#FDF6EE',
    dot: '#C17F3A',
    label: 'AI will prepare, you approve',
    labelColor: '#C17F3A',
    buttonText: 'Review AI plan →',
    buttonBg: tokens.colors.foreground,
    buttonColor: 'white',
  },
  human_required: {
    bg: '#DDE9F1',
    dot: '#3A7CA5',
    label: 'Needs your judgment',
    labelColor: '#2C5F7A',
    buttonText: 'Talk to an advisor →',
    buttonBg: 'white',
    buttonColor: tokens.colors.foreground,
    buttonBorder: `1px solid ${tokens.colors.border}`,
  },
}


const AI_RECOMMENDATIONS: Record<string, string> = {
  fhsa_maxed: 'Your FHSA is maxed for the year. With your home purchase timeline approaching, the AI recommends shifting to a conservative allocation — 60% fixed income, 40% equity — to reduce volatility risk in the 12–24 months before your planned purchase.',
  tfsa_underutilized: 'Your TFSA has unused contribution room growing by $7,000 every January. Based on your timeline and wealth-building goal, the AI recommends transferring $7,000 from savings into a diversified equity ETF portfolio inside your TFSA this month. All future growth and withdrawals will be tax-free.',
  tfsa_optimized: 'Your TFSA is fully maxed — excellent position. Based on your high income and long timeline, the AI recommends holding your highest-growth, least tax-efficient assets inside the TFSA. Consider shifting Canadian equity here and holding fixed income in your RRSP.',
  rrsp_high_income: 'Based on your income bracket and today being the RRSP deadline, the AI recommends contributing $15,000 to your RRSP today. At your marginal rate of approximately 43%, this generates an estimated $6,450 in tax savings — an immediate 43% return on capital deployed.',
  tax_refund_inefficiency: 'Your refund pattern suggests over-withholding of approximately $3,000–4,000 per year. The AI recommends filing a revised TD1 with your payroll department to reduce monthly withholdings by $275, freeing up cash flow now instead of lending it to the CRA interest-free all year.',
  mat_pat_leave: 'During parental leave your taxable income drops significantly, reducing the RRSP deduction benefit. The AI recommends pausing RRSP contributions during your leave year and directing that savings to your TFSA instead — maximizing flexibility and tax-free growth during the lower-income period.',
}

function parseImpact(impactStr: string): number {
  const match = impactStr.match(/\+?(\d+)%/)
  return match ? parseInt(match[1], 10) : 0
}

const IMPACT_SCORES: Record<string, string> = {
  capital_gains_complexity: '↑6% readiness potential',
  rrsp_personal_vs_group: '↑8% readiness potential',
  rrsp_high_income: '↑5% readiness potential',
  tfsa_underutilized: '↑4% readiness potential',
  fhsa_opportunity: '↑9% readiness potential',
  employer_match: '↑7% readiness potential',
  db_pension_rrsp_room: '↑3% readiness potential',
  heloc_mortgage_vs_investing: '↑5% readiness potential',
  tax_refund_inefficiency: '↑4% readiness potential',
  mat_pat_leave: '↑3% readiness potential',
  automate_tfsa: '↑4% readiness potential',
}

const CONFIDENCE_CONFIG: Record<NextMove['confidenceState'], { label: string; color: string }> = {
  ready: { label: 'Ready to act', color: '#3D7A5C' },
  almost: { label: 'Almost there', color: '#C17F3A' },
  needs_attention: { label: 'Needs attention', color: '#B94040' },
  needs_human: { label: 'Needs your judgment', color: '#6B6B6B' },
}

// =============================================================================
// AnimatedNumber — counts from previous value to new value
// =============================================================================

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayed, setDisplayed] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value
    const start = Date.now()
    let rafId: number

    const frame = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(from + (value - from) * eased))
      if (progress < 1) {
        rafId = requestAnimationFrame(frame)
      }
    }

    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [value, duration])

  return <>{displayed}</>
}

// =============================================================================
// HeroSection
// =============================================================================

function HeroSection({ score, trajectory }: { score: number; trajectory: string }) {
  const [trajPart1, trajPart2] = trajectory.split(' · ')
  // Gauge geometry
  const W = 280
  const H = 158
  const cx = W / 2       // 140
  const cy = H           // 158 — arc center sits at bottom edge
  const r = 124          // radius
  const sw = 18          // stroke width

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ marginBottom: '36px' }}
    >
      <p
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: tokens.colors.foregroundMuted,
          marginBottom: '4px',
          textAlign: 'center',
        }}
      >
        Your financial readiness
      </p>
      <p style={{ textAlign: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', color: '#3D7A5C' }}>{trajPart1}</span>
      </p>

      {/* Gauge */}
      <div style={{ position: 'relative', width: `${W}px`, height: `${H}px`, margin: '0 auto' }}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Background track */}
          <path
            d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
            stroke={tokens.colors.border}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
          />
          {/* Progress arc — animates via pathLength (0 → score/100) */}
          <motion.path
            d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
            stroke={tokens.colors.foreground}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: score / 100 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>

        {/* Score number — floats inside the arc opening */}
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: '2px',
            lineHeight: 1,
          }}
        >
          <span
            style={{
              fontSize: '60px',
              fontWeight: 700,
              color: tokens.colors.foreground,
              lineHeight: '1',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <AnimatedNumber value={score} duration={1000} />
          </span>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 400,
              color: tokens.colors.foregroundMuted,
              lineHeight: '1',
              marginTop: '8px',
            }}
          >
            %
          </span>
        </div>
      </div>


      <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', color: tokens.colors.foregroundMuted }}>
        Updated today
      </p>
      {trajPart2 && (
        <p style={{ textAlign: 'center', marginTop: '4px' }}>
          <span style={{ fontSize: '14px', color: tokens.colors.foregroundMuted, fontStyle: 'italic' }}>{trajPart2}</span>
        </p>
      )}
    </motion.div>
  )
}

// =============================================================================
// ScoreBar
// =============================================================================

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '10px',
      }}
    >
      <span
        style={{
          flex: 1,
          fontSize: tokens.typography.scale.sm,
          color: tokens.colors.foregroundMuted,
          lineHeight: '1.4',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <div
          style={{
            width: '80px',
            height: '4px',
            borderRadius: '9999px',
            backgroundColor: tokens.colors.border,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${score}%`,
              borderRadius: '9999px',
              backgroundColor: tokens.colors.foreground,
            }}
          />
        </div>
        <span
          style={{
            fontSize: tokens.typography.scale.xs,
            color: tokens.colors.foregroundMuted,
            width: '24px',
            textAlign: 'right',
          }}
        >
          {score}
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// AiActionRow
// =============================================================================

function AiActionRow({
  move,
  onAction,
  isLoading,
}: {
  move: NextMove
  onAction: (move: NextMove) => void
  isLoading: boolean
}) {
  const cfg = AI_CONFIG[move.aiDecision]
  const showSpinner = isLoading && move.aiDecision === 'auto'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '16px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Action button / loading state */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
        {showSpinner ? (
          <div
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: tokens.radius.pill,
              backgroundColor: '#1A1A1A',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '2px solid white',
                borderTopColor: 'transparent',
                animation: 'spin 600ms linear infinite',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>
              AI is working...
            </span>
          </div>
        ) : (
          <button
            onClick={() => onAction(move)}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: tokens.radius.pill,
              border: cfg.buttonBorder ?? 'none',
              backgroundColor: cfg.buttonBg,
              color: cfg.buttonColor,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {move.aiDecision === 'human_required' ? 'Connect with an advisor →' : cfg.buttonText}
          </button>
        )}
        {move.aiDecision === 'human_required' && (
          <p style={{ fontSize: '12px', color: '#6B6B6B', fontStyle: 'italic', marginTop: '4px', textAlign: 'right' }}>
            Expand to see AI briefing
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// AiReviewSheet
// =============================================================================

function AiReviewSheet({
  move,
  isDesktop,
  onClose,
  onApprove,
}: {
  move: NextMove
  isDesktop: boolean
  onClose: () => void
  onApprove: () => void
}) {
  const recommendation = AI_RECOMMENDATIONS[move.id] ?? `The AI recommends reviewing ${move.title.toLowerCase()} based on your current profile and goals.`

  const sheetStyle: React.CSSProperties = isDesktop
    ? {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }
    : {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        zIndex: 1000,
      }

  const panelStyle: React.CSSProperties = isDesktop
    ? {
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '32px',
        width: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        position: 'relative',
      }
    : {
        backgroundColor: 'white',
        borderRadius: '20px 20px 0 0',
        padding: '28px 24px 40px',
        width: '100%',
        position: 'relative',
      }

  return (
    <div style={sheetStyle}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: -1 }}
      />
      <motion.div
        initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
        animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
        exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style={panelStyle}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            color: tokens.colors.foregroundMuted,
            lineHeight: 1,
            padding: '4px 8px',
          }}
        >
          ×
        </button>

        <p
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: tokens.colors.foregroundMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '6px',
          }}
        >
          AI&apos;s recommended action
        </p>
        <p
          style={{
            fontSize: tokens.typography.scale.lg,
            fontWeight: 600,
            color: tokens.colors.foreground,
            marginBottom: '16px',
            lineHeight: '1.3',
            paddingRight: '24px',
          }}
        >
          {move.title}
        </p>
        <p
          style={{
            fontSize: tokens.typography.scale.sm,
            color: tokens.colors.foreground,
            lineHeight: '1.6',
            marginBottom: '24px',
          }}
        >
          {recommendation}
        </p>

        <button
          onClick={onApprove}
          style={{
            width: '100%',
            height: '48px',
            backgroundColor: tokens.colors.foreground,
            color: 'white',
            fontSize: tokens.typography.scale.sm,
            fontWeight: 500,
            borderRadius: tokens.radius.pill,
            border: 'none',
            cursor: 'pointer',
            marginBottom: '12px',
          }}
        >
          Approve &amp; apply
        </button>
        <button
          onClick={onClose}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            fontSize: tokens.typography.scale.sm,
            color: tokens.colors.foregroundMuted,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          Not now
        </button>
      </motion.div>
    </div>
  )
}

// =============================================================================
// MoveCard
// =============================================================================

function MoveCard({
  move,
  index,
  isExpanded,
  onToggle,
  onAiAction,
  isNew,
  isNewThisMonth,
  isCompleted,
  isLoading,
  summaryLoading,
}: {
  move: NextMove
  index: number
  isExpanded: boolean
  onToggle: () => void
  onAiAction: (move: NextMove) => void
  isNew?: boolean
  isNewThisMonth?: boolean
  isCompleted: boolean
  isLoading: boolean
  summaryLoading?: boolean
}) {
  const conf = CONFIDENCE_CONFIG[move.confidenceState]

  // Completed card layout (AI-actioned this session)
  if (isCompleted) {
    return (
      <motion.div
        layout
        key={move.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '18px 20px',
          width: '100%',
          border: '1.5px solid #3D7A5C',
          boxShadow: '0 0 20px rgba(61,122,92,0.10), 0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Row 1: category chip + completion pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: tokens.typography.scale.xs,
              color: tokens.colors.foregroundMuted,
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.radius.pill,
              padding: '4px 10px',
              textTransform: 'capitalize',
            }}
          >
            {move.category}
          </span>
          <span
            style={{
              backgroundColor: '#F0F7F4',
              color: '#3D7A5C',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '9999px',
              padding: '4px 10px',
            }}
          >
            ✓ AI completed this
          </span>
        </div>

        {/* Row 2: title with strikethrough */}
        <p
          style={{
            fontSize: '17px',
            fontWeight: 600,
            color: '#6B6B6B',
            textDecoration: 'line-through',
            marginTop: '10px',
            lineHeight: '1.3',
          }}
        >
          {move.title}
        </p>

        {/* Row 3: completion message */}
        <p style={{ fontSize: '14px', color: '#6B6B6B', marginTop: '6px', lineHeight: '1.5' }}>
          AI has actioned this move. Check your Wealthsimple account for confirmation.
        </p>

        {/* Row 4: link */}
        <p
          style={{
            fontSize: '14px',
            color: '#3D7A5C',
            textAlign: 'right',
            marginTop: '12px',
            cursor: 'pointer',
          }}
        >
          View in Wealthsimple →
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      key={move.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, delay: index * 0.06, ease: 'easeOut' }}
      onClick={isLoading ? undefined : onToggle}
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '18px 20px',
        width: '100%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        cursor: isLoading ? 'default' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        opacity: move.isCompleted ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Urgent / new label */}
      {move.isUrgent && (
        <div style={{ marginBottom: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: tokens.colors.foreground,
              color: 'white',
              borderRadius: '9999px',
              padding: '3px 10px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Time sensitive
          </span>
        </div>
      )}
      {isNewThisMonth && !move.isUrgent && (
        <p
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: tokens.colors.success,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}
        >
          ✦ New this month
        </p>
      )}
      {isNew && !move.isUrgent && !isNewThisMonth && (
        <p
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: tokens.colors.success,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}
        >
          New opportunity
        </p>
      )}

      {/* Row 1: Category chip + impact (left) · confidence label + caret (right) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: tokens.typography.scale.xs,
              color: tokens.colors.foregroundMuted,
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.radius.pill,
              padding: '4px 10px',
              textTransform: 'capitalize',
              flexShrink: 0,
            }}
          >
            {move.category}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#3D7A5C' }}>
            {IMPACT_SCORES[move.id] ?? '↑4% readiness potential'}
          </span>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {conf && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 500,
                color: conf.color,
                backgroundColor: conf.color + '18',
                borderRadius: '9999px',
                padding: '3px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: conf.color, flexShrink: 0, display: 'inline-block' }} />
              {conf.label}
            </span>
          )}
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <ChevronDown size={16} color="#6B6B6B" />
          </motion.span>
        </div>
      </div>

      {/* Title */}
      <p
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: tokens.colors.foreground,
          marginTop: '10px',
          lineHeight: '1.3',
          textDecoration: move.isCompleted ? 'line-through' : 'none',
        }}
      >
        {move.title}
      </p>

      {/* Summary — clamped to 2 lines */}
      <p
        style={{
          fontSize: tokens.typography.scale.sm,
          color: tokens.colors.foregroundMuted,
          marginTop: '6px',
          lineHeight: '1.5',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
        }}
      >
        {summaryLoading ? (
          <span style={{ opacity: 0.4, fontStyle: 'italic' }}>AI is personalizing this…</span>
        ) : (
          move.oneLineSummary
        )}
      </p>

      {/* Hairline divider — collapsed only */}
      {!isExpanded && (
        <div style={{ height: 1, backgroundColor: '#EDEAE3', margin: '12px 0' }} />
      )}

      {move.isCompleted ? (
        <p
          style={{
            marginTop: '16px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#3D7A5C',
          }}
        >
          ✓ Completed
        </p>
      ) : (
        <AiActionRow move={move} onAction={onAiAction} isLoading={isLoading} />
      )}

      {/* What changed banner */}
      {move.whatChanged && (
        <div
          style={{
            backgroundColor: '#F5F3EF',
            padding: '8px 12px',
            borderRadius: '8px',
            marginTop: '12px',
          }}
        >
          <p
            style={{
              fontSize: tokens.typography.scale.xs,
              color: tokens.colors.foregroundMuted,
              fontStyle: 'italic',
            }}
          >
            ↑ What changed: {move.whatChanged}
          </p>
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: '16px' }}>
              <div style={{ height: 1, backgroundColor: '#F5F3EF', marginBottom: '18px' }} />

              {move.aiDecision === 'human_required' ? (
                <>
                  {/* AI briefing block */}
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        backgroundColor: '#EDEAE3',
                        padding: '8px 12px',
                        borderRadius: '8px 8px 0 0',
                      }}
                    >
                      <p style={{ fontSize: '16px', fontWeight: 600, color: '#1A1A1A' }}>
                        AI briefing for your advisor
                      </p>
                    </div>
                    <div
                      style={{
                        backgroundColor: '#F5F3EF',
                        padding: '12px',
                        borderRadius: '0 0 8px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {[
                        { label: 'Situation', value: move.oneLineSummary },
                        { label: 'Complexity', value: move.whatIsBlocking },
                        { label: 'Recommended discussion', value: move.advisorNote },
                      ].map(({ label, value }) => value && (
                        <div key={label}>
                          <p style={{ fontSize: '12px', color: tokens.colors.foregroundMuted }}>{label}</p>
                          <p style={{ fontSize: '14px', color: '#1A1A1A', marginTop: '2px' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next step */}
                  <p style={sectionLabelStyle}>Next step</p>
                  <p
                    style={{
                      fontSize: tokens.typography.scale.sm,
                      color: tokens.colors.foreground,
                      lineHeight: '1.5',
                      marginBottom: '20px',
                    }}
                  >
                    {move.nextStep}
                  </p>
                </>
              ) : (
                <>
                  {/* Next step */}
                  <p style={sectionLabelStyle}>Next step</p>
                  <p
                    style={{
                      fontSize: tokens.typography.scale.sm,
                      color: tokens.colors.foreground,
                      lineHeight: '1.5',
                      marginBottom: '20px',
                    }}
                  >
                    {move.nextStep}
                  </p>

                  {/* Why this matters */}
                  <p style={sectionLabelStyle}>Why this matters</p>
                  <p
                    style={{
                      fontSize: tokens.typography.scale.sm,
                      color: tokens.colors.foreground,
                      lineHeight: '1.6',
                      marginBottom: '20px',
                    }}
                  >
                    {move.fullReasoning}
                  </p>

                  {/* Score breakdown */}
                  <p style={{ ...sectionLabelStyle, marginBottom: '12px' }}>Score breakdown</p>
                  <div style={{ marginBottom: '20px' }}>
                    {move.scoreComposition.map((item) => (
                      <ScoreBar key={item.label} label={item.label} score={item.score} />
                    ))}
                  </div>

                  {/* What's holding you back */}
                  {move.readinessScore < 90 && (
                    <div style={{ marginBottom: '20px' }}>
                      <p style={sectionLabelStyle}>What&apos;s holding you back</p>
                      <p
                        style={{
                          fontSize: tokens.typography.scale.sm,
                          color: tokens.colors.foregroundMuted,
                          fontStyle: 'italic',
                          lineHeight: '1.5',
                        }}
                      >
                        {move.whatIsBlocking}
                      </p>
                    </div>
                  )}

                  {/* Advisor note */}
                  {move.advisorNote && (
                    <div
                      style={{
                        backgroundColor: '#F5F3EF',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: tokens.colors.foregroundMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          marginBottom: '4px',
                        }}
                      >
                        Advisor note
                      </p>
                      <p
                        style={{
                          fontSize: tokens.typography.scale.sm,
                          color: tokens.colors.foreground,
                          lineHeight: '1.5',
                        }}
                      >
                        {move.advisorNote}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Show less */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggle() }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  fontSize: tokens.typography.scale.sm,
                  color: tokens.colors.foregroundMuted,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                }}
              >
                Show less
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Shared style objects
const sectionLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: tokens.colors.foregroundMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '6px',
}


// =============================================================================
// WhatIfSection
// =============================================================================

function WhatIfSection({
  activeScenarios,
  onToggleScenario,
}: {
  activeScenarios: ScenarioKey[]
  onToggleScenario: (key: ScenarioKey) => void
}) {
  return (
    <div>
      <p
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: tokens.colors.foreground,
          marginBottom: '2px',
        }}
      >
        What if...
      </p>
      <p
        style={{
          fontSize: tokens.typography.scale.sm,
          color: tokens.colors.foregroundMuted,
          marginBottom: '16px',
        }}
      >
        Mix and match to see how your moves change
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {SCENARIOS.map((s) => {
          const isActive = activeScenarios.includes(s.key)
          return (
            <button
              key={s.key}
              onClick={() => onToggleScenario(s.key)}
              style={{
                backgroundColor: isActive ? tokens.colors.foreground : 'white',
                color: isActive ? 'white' : tokens.colors.foreground,
                border: `1px solid ${isActive ? tokens.colors.foreground : tokens.colors.border}`,
                borderRadius: tokens.radius.pill,
                padding: '6px 16px',
                fontSize: tokens.typography.scale.sm,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Empty state
// =============================================================================

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '0 24px',
        textAlign: 'center',
        backgroundColor: tokens.colors.background,
      }}
    >
      <p
        style={{
          fontSize: tokens.typography.scale.lg,
          fontWeight: 600,
          color: tokens.colors.foreground,
          marginBottom: '8px',
        }}
      >
        No results yet
      </p>
      <p
        style={{
          fontSize: tokens.typography.scale.sm,
          color: tokens.colors.foregroundMuted,
          marginBottom: '24px',
        }}
      >
        Answer a few questions to see your next moves.
      </p>
      <button
        onClick={onStart}
        style={{
          backgroundColor: tokens.colors.foreground,
          color: 'white',
          fontSize: tokens.typography.scale.base,
          fontWeight: 500,
          padding: '14px 32px',
          borderRadius: tokens.radius.pill,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Get started
      </button>
    </div>
  )
}

// =============================================================================
// AISignalsSection
// =============================================================================

const SIGNAL_SEVERITY_COLOR: Record<AISignal['severity'], string> = {
  high: '#C0392B',
  medium: '#C17F3A',
  low: tokens.colors.foregroundMuted,
}

function AISignalsSection({ signals, resolvedCount }: { signals: AISignal[]; resolvedCount?: number }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div style={{ marginBottom: '28px' }}>
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#C0392B' }} />
        <p
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: tokens.colors.foreground,
          }}
        >
          AI Signals
        </p>
        {resolvedCount != null && resolvedCount > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#F0F7F4',
              color: '#3D7A5C',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '9999px',
              padding: '4px 12px',
            }}
          >
            ✓ {resolvedCount} signal{resolvedCount !== 1 ? 's' : ''} resolved this month
          </span>
        )}
      </div>

      {/* Signal list */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: tokens.radius.card,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {signals.map((signal, i) => {
          const isLast = i === signals.length - 1
          const isExpanded = expanded === signal.id
          const dotColor = SIGNAL_SEVERITY_COLOR[signal.severity]

          return (
            <div
              key={signal.id}
              style={{ borderBottom: isLast ? 'none' : `1px solid ${tokens.colors.border}` }}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : signal.id)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {/* Severity dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: dotColor,
                    flexShrink: 0,
                  }}
                />

                {/* Title */}
                <span
                  style={{
                    fontSize: tokens.typography.scale.sm,
                    fontWeight: 500,
                    color: tokens.colors.foreground,
                    flex: 1,
                  }}
                >
                  {signal.title}
                </span>

                {/* Impact badge */}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#3D7A5C',
                    backgroundColor: '#F0F7F4',
                    borderRadius: tokens.radius.pill,
                    padding: '2px 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {signal.impact}
                </span>

                {/* Chevron */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <path
                    d="M3 5l4 4 4-4"
                    stroke={tokens.colors.foregroundMuted}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 16px 16px 36px' }}>
                      <p
                        style={{
                          fontSize: tokens.typography.scale.sm,
                          color: tokens.colors.foregroundMuted,
                          lineHeight: '1.5',
                          marginBottom: '10px',
                        }}
                      >
                        {signal.why}
                      </p>
                      <p
                        style={{
                          fontSize: tokens.typography.scale.sm,
                          color: tokens.colors.foreground,
                          fontWeight: 500,
                        }}
                      >
                        {signal.suggestedAction}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Page
// =============================================================================

export default function DashboardPage() {
  const router = useRouter()
  const { nextMoves, setNextMoves } = useUserProfile()
  const isDesktop = useIsDesktop()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [originalMoves, setOriginalMoves] = useState<NextMove[]>([])
  const [displayMoves, setDisplayMoves] = useState<NextMove[]>([])
  const [aiSummariesLoading, setAiSummariesLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeScenarios, setActiveScenarios] = useState<ScenarioKey[]>([])
  const [sharpenerOpen, setSharpenerOpen] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [aiToast, setAiToast] = useState<string | null>(null)
  const [reviewMove, setReviewMove] = useState<NextMove | null>(null)
  const [timeState, setTimeState] = useState<'day1' | 'day30'>('day1')
  const [completedMoveIds, setCompletedMoveIds] = useState<string[]>([])
  const [sortedToBottomIds, setSortedToBottomIds] = useState<string[]>([])
  const [loadingMoveId, setLoadingMoveId] = useState<string | null>(null)
  const [scoreBonus, setScoreBonus] = useState(0)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [trajectoryOverride, setTrajectoryOverride] = useState<string | null>(null)
  const scoreRef = useRef(0)

  // Load on mount — use context if populated, else fall back to sessionStorage
  useEffect(() => {
    let prof: UserProfile | null = null

    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('userProfile')
      if (stored) {
        try { prof = JSON.parse(stored) as UserProfile } catch { /* ignore */ }
      }
    }

    setProfile(prof)

    const moves =
      nextMoves.length > 0
        ? nextMoves
        : prof
        ? calculateNextMoves(prof)
        : []

    setOriginalMoves(moves)
    setDisplayMoves(moves)

    if (nextMoves.length === 0 && moves.length > 0) {
      setNextMoves(moves)
    }

    // Fetch AI-generated summaries
    if (prof && moves.length > 0) {
      setAiSummariesLoading(true)
      fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: prof,
          moves: moves.map((m) => ({
            id: m.id,
            title: m.title,
            readinessScore: m.readinessScore,
            isUrgent: m.isUrgent,
            scoreComposition: m.scoreComposition,
          })),
        }),
      })
        .then((r) => r.json())
        .then(({ summaries }: { summaries: Record<string, string> }) => {
          if (!summaries || Object.keys(summaries).length === 0) return
          setDisplayMoves((prev) =>
            prev.map((m) =>
              summaries[m.id] ? { ...m, oneLineSummary: summaries[m.id] } : m
            )
          )
          setOriginalMoves((prev) =>
            prev.map((m) =>
              summaries[m.id] ? { ...m, oneLineSummary: summaries[m.id] } : m
            )
          )
        })
        .catch(() => { /* silently fall back to static summaries */ })
        .finally(() => setAiSummariesLoading(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const baseScore =
    displayMoves.length > 0
      ? Math.round(
          displayMoves.reduce((sum, m) => sum + m.readinessScore, 0) / displayMoves.length
        )
      : 0
  const overallScore = Math.min(100, baseScore + scoreBonus)
  scoreRef.current = overallScore

  const completeness = profile ? getDataCompleteness(profile) : null

  // Time-state derived data
  const activeScore = timeState === 'day30' ? day30State.overallScore : overallScore
  const activeTrajectory = timeState === 'day30'
    ? day30State.trajectory
    : trajectoryOverride ?? '↑ +4.2% this month · AI recalculates daily'
  const activeSignals = timeState === 'day30' ? day30State.signals : defaultAISignals
  const resolvedSignalCount = timeState === 'day30' ? day30State.resolvedSignalCount : 0
  const activeMoves: NextMove[] = timeState === 'day30'
    ? [
        ...day30State.extraMoves,
        ...displayMoves.filter((m) => !day30State.completedMoveIds.includes(m.id)),
        ...displayMoves
          .filter((m) => day30State.completedMoveIds.includes(m.id))
          .map((m) => ({ ...m, isCompleted: true })),
      ]
    : [
        ...displayMoves.filter((m) => !sortedToBottomIds.includes(m.id)),
        ...displayMoves.filter((m) => sortedToBottomIds.includes(m.id)),
      ]

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const handleToggleScenario = useCallback(
    (key: ScenarioKey) => {
      const next = activeScenarios.includes(key)
        ? activeScenarios.filter((k) => k !== key)
        : [...activeScenarios, key]

      setActiveScenarios(next)
      setExpandedId(null)

      if (!profile || next.length === 0) {
        setDisplayMoves(originalMoves)
      } else {
        setDisplayMoves(getWhatIfMoves(profile, next))
      }
    },
    [activeScenarios, profile, originalMoves]
  )

  const handleResetScenarios = useCallback(() => {
    setActiveScenarios([])
    setExpandedId(null)
    setDisplayMoves(originalMoves)
  }, [originalMoves])

  const handleSharpenerComplete = useCallback(
    (patch: Partial<UserProfile>) => {
      if (!profile) return
      const updatedProfile = { ...profile, ...patch }
      setProfile(updatedProfile)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userProfile', JSON.stringify(updatedProfile))
      }
      const newMoves = calculateNextMoves(updatedProfile)
      setOriginalMoves(newMoves)
      setDisplayMoves(newMoves)
      setNextMoves(newMoves)
      setActiveScenarios([])
      // Show toast
      setToastVisible(true)
      setTimeout(() => setToastVisible(false), 3000)
    },
    [profile, setNextMoves]
  )

  const handleAiAction = useCallback((move: NextMove) => {
    if (move.aiDecision === 'auto') {
      // Step 1: loading state immediately
      setLoadingMoveId(move.id)

      // Step 2: working toast after 300ms
      setTimeout(() => {
        setAiToast('AI is working on this...')
      }, 300)

      // Step 3: card transforms after 2000ms
      setTimeout(() => {
        setAiToast(null)
        setLoadingMoveId(null)
        setCompletedMoveIds((prev) => [...prev, move.id])

        // Step 4: move to bottom + score update after 400ms
        setTimeout(() => {
          setSortedToBottomIds((prev) => [...prev, move.id])
          const impact = parseImpact(IMPACT_SCORES[move.id] ?? '↑0% readiness potential')
          setScoreBonus((prev) => prev + impact)
          setTrajectoryOverride('↑ Just improved · AI recalculates daily')

          // Step 6: success toast after 200ms — read scoreRef after re-render
          setTimeout(() => {
            setSuccessToast(`✓ Done — your readiness score updated to ${scoreRef.current}%`)
            setTimeout(() => setSuccessToast(null), 3000)
          }, 200)
        }, 400)
      }, 2000)
    } else if (move.aiDecision === 'needs_approval') {
      setReviewMove(move)
    }
  }, [])

  const handleApproveMove = useCallback((move: NextMove) => {
    // Skip loading state — go straight to card transform after 500ms pause
    setTimeout(() => {
      setCompletedMoveIds((prev) => [...prev, move.id])

      setTimeout(() => {
        setSortedToBottomIds((prev) => [...prev, move.id])
        const impact = parseImpact(IMPACT_SCORES[move.id] ?? '↑0% readiness potential')
        setScoreBonus((prev) => prev + impact)
        setTrajectoryOverride('↑ Just improved · AI recalculates daily')

        setTimeout(() => {
          setSuccessToast(`✓ Done — your readiness score updated to ${scoreRef.current}%`)
          setTimeout(() => setSuccessToast(null), 3000)
        }, 200)
      }, 400)
    }, 500)
  }, [])

  const activeDescription =
    activeScenarios.length > 0
      ? activeScenarios
          .map((k) => SCENARIOS.find((s) => s.key === k)?.description)
          .filter(Boolean)
          .join(' + ')
      : null

  if (originalMoves.length === 0 && displayMoves.length === 0) {
    return <EmptyState onStart={() => router.push('/')} />
  }

  return (
    <div style={{ backgroundColor: tokens.colors.background, minHeight: '100vh', paddingBottom: '48px' }}>
      <style>{`
        .cards-scroll::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isDesktop ? '0 48px' : '0 24px' }}>

        <TopNav activeLink="Next moves" isDesktop={isDesktop} />
        <TimeToggle value={timeState} onChange={setTimeState} />

        {/* Fixed-position overlays */}
        {/* Toast */}
        <AnimatePresence>
          {toastVisible && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: tokens.colors.foreground,
                color: 'white',
                borderRadius: tokens.radius.pill,
                padding: '10px 20px',
                fontSize: tokens.typography.scale.sm,
                fontWeight: 500,
                zIndex: 2000,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              }}
            >
              Score sharpened — moves updated ✓
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sharpener modal */}
        <AnimatePresence>
          {sharpenerOpen && completeness && (
            <SharpenerModal
              questions={completeness.missingQuestions}
              isDesktop={isDesktop}
              onComplete={handleSharpenerComplete}
              onClose={() => setSharpenerOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* AI working toast */}
        <AnimatePresence>
          {aiToast && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: tokens.colors.success,
                color: 'white',
                borderRadius: tokens.radius.pill,
                padding: '10px 20px',
                fontSize: tokens.typography.scale.sm,
                fontWeight: 500,
                zIndex: 2000,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              }}
            >
              {aiToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success toast */}
        <AnimatePresence>
          {successToast && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#3D7A5C',
                color: 'white',
                borderRadius: '9999px',
                padding: '10px 20px',
                fontSize: tokens.typography.scale.sm,
                fontWeight: 500,
                zIndex: 2000,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              }}
            >
              {successToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI review sheet */}
        <AnimatePresence>
          {reviewMove && (
            <AiReviewSheet
              move={reviewMove}
              isDesktop={isDesktop}
              onClose={() => setReviewMove(null)}
              onApprove={() => {
                const move = reviewMove
                setReviewMove(null)
                handleApproveMove(move)
              }}
            />
          )}
        </AnimatePresence>

        {/* Animated content — re-mounts on time state change */}
        <motion.div
          key={timeState}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <HeroSection score={activeScore} trajectory={activeTrajectory} />

          {/* Mobile-only: SharpenerCallout above columns */}
          {!isDesktop && (timeState === 'day30' ? (
            <p
              style={{
                textAlign: 'center',
                fontSize: '14px',
                color: '#3D7A5C',
                fontStyle: 'italic',
                marginBottom: '28px',
              }}
            >
              ✦ Model fully trained on your profile
            </p>
          ) : completeness && completeness.missingQuestions.length > 0 && (
            <SharpenerCallout
              answeredPoints={completeness.answeredPoints}
              totalPoints={completeness.totalPoints}
              missingCount={completeness.missingQuestions.length}
              onOpen={() => setSharpenerOpen(true)}
            />
          ))}

          {/* Two-column on desktop: left (AI Signals + cards) · right (SharpenerCallout + what-if) */}
          <div
            style={
              isDesktop
                ? { display: 'flex', gap: '40px', alignItems: 'flex-start' }
                : {}
            }
          >
            {/* Left column — AI Signals + section header + cards */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <AISignalsSection signals={activeSignals} resolvedCount={resolvedSignalCount} />

              {/* Section header */}
              <div style={{ marginBottom: '16px' }}>
                <p
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: tokens.colors.foreground,
                  }}
                >
                  Your next moves
                </p>
                <p
                  style={{
                    fontSize: tokens.typography.scale.sm,
                    color: tokens.colors.foregroundMuted,
                    marginTop: '2px',
                  }}
                >
                  {activeMoves.filter((m) => !m.isCompleted && !completedMoveIds.includes(m.id)).length}{' '}
                  {activeMoves.filter((m) => !m.isCompleted && !completedMoveIds.includes(m.id)).length === 1 ? 'opportunity' : 'opportunities'}, ranked by impact
                </p>
              </div>

              {/* What-if banner */}
              <AnimatePresence>
                {activeDescription && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', marginBottom: '12px' }}
                  >
                    <div
                      style={{
                        backgroundColor: tokens.colors.surface,
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <p style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foreground }}>
                        Showing your picture if: <strong>{activeDescription}</strong>
                      </p>
                      <button
                        onClick={handleResetScenarios}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          flexShrink: 0,
                          fontSize: tokens.typography.scale.sm,
                          color: tokens.colors.foregroundMuted,
                          fontWeight: 500,
                        }}
                      >
                        × Reset
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cards — single column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AnimatePresence mode="popLayout">
                  {activeMoves.map((move, i) => {
                    const isNew =
                      activeScenarios.length > 0 && !originalMoves.find((m) => m.id === move.id)
                    const isNewThisMonth = timeState === 'day30' && move.id === 'automate_tfsa'
                    return (
                      <MoveCard
                        key={move.id}
                        move={move}
                        index={i}
                        isExpanded={expandedId === move.id}
                        onToggle={() => handleToggle(move.id)}
                        onAiAction={handleAiAction}
                        isNew={isNew}
                        isNewThisMonth={isNewThisMonth}
                        isCompleted={completedMoveIds.includes(move.id)}
                        isLoading={loadingMoveId === move.id}
                        summaryLoading={aiSummariesLoading}
                      />
                    )
                  })}
                </AnimatePresence>
              </div>

            </div>

            {/* Right column — SharpenerCallout (desktop) + what-if */}
            <div
              style={
                isDesktop
                  ? {
                      width: '220px',
                      flexShrink: 0,
                      position: 'sticky',
                      top: '48px',
                    }
                  : { marginTop: '36px' }
              }
            >
              {isDesktop && (timeState === 'day30' ? (
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#3D7A5C',
                    fontStyle: 'italic',
                    marginBottom: '28px',
                  }}
                >
                  ✦ Model fully trained on your profile
                </p>
              ) : completeness && completeness.missingQuestions.length > 0 && (
                <SharpenerCallout
                  answeredPoints={completeness.answeredPoints}
                  totalPoints={completeness.totalPoints}
                  missingCount={completeness.missingQuestions.length}
                  onOpen={() => setSharpenerOpen(true)}
                />
              ))}
              <WhatIfSection
                activeScenarios={activeScenarios}
                onToggleScenario={handleToggleScenario}
              />
            </div>

          </div>

        </motion.div>

      </div>
    </div>
  )
}
