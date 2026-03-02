'use client'

import { useState, useCallback, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useUserProfile } from '@/lib/UserProfileContext'
import { ProgressBar } from '@/components/setup/ProgressBar'
import { SelectOption } from '@/components/setup/SelectOption'
import { Chip } from '@/components/setup/Chip'
import { ContinueButton } from '@/components/setup/ContinueButton'
import { tokens } from '@/lib/tokens'
import { calculateNextMoves } from '@/lib/scoring'

// =============================================================================
// Step definitions
// =============================================================================

const STEP_ORDER = [
  'accounts',
  'providers',
  'debts',
  'employment',
  'employerBenefits',
  'income',
  'age',
  'primaryGoal',
  'confidence',
]

// =============================================================================
// Main component
// =============================================================================

export default function SetupPage() {
  const router = useRouter()
  const { formState, updateForm, getProfile, setNextMoves } = useUserProfile()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showFinalTransition, setShowFinalTransition] = useState(false)
  const [transitionLine, setTransitionLine] = useState(0)

  // Build visible step order (skip employerBenefits if not employed/both)
  const visibleSteps = STEP_ORDER.filter((key) => {
    if (key === 'employerBenefits') {
      return formState.employmentType === 'employed' || formState.employmentType === 'both'
    }
    return true
  })

  const currentStepKey = visibleSteps[currentStepIndex]
  const totalSteps = visibleSteps.length

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1)
    } else {
      router.push('/')
    }
  }, [currentStepIndex, router])

  const advance = useCallback(() => {
    if (currentStepIndex < visibleSteps.length - 1) {
      setCurrentStepIndex((i) => i + 1)
    } else {
      setShowFinalTransition(true)
    }
  }, [currentStepIndex, visibleSteps.length])

  const advanceWithDelay = useCallback(
    (ms: number) => {
      setTimeout(advance, ms)
    },
    [advance]
  )

  // Final transition: show lines, then navigate
  useEffect(() => {
    if (!showFinalTransition) return

    const timers: NodeJS.Timeout[] = []
    const STEP_MS = 700

    // Lines 1–5 stagger in
    for (let i = 0; i < 5; i++) {
      timers.push(setTimeout(() => setTransitionLine(i + 1), STEP_MS * (i + 1)))
    }

    // Navigate after all lines + brief pause
    timers.push(
      setTimeout(() => {
        const profile = getProfile()
        const moves = calculateNextMoves(profile)
        setNextMoves(moves)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('userProfile', JSON.stringify(profile))
        }
        router.push('/dashboard')
      }, STEP_MS * 5 + 1200)
    )

    return () => timers.forEach(clearTimeout)
  }, [showFinalTransition, getProfile, setNextMoves, router])

  // ==========================================================================
  // Step: Accounts (multi)
  // ==========================================================================
  const renderAccountsStep = () => {
    const options = [
      { label: 'TFSA', value: 'tfsa' },
      { label: 'RRSP (personal)', value: 'rrsp_personal' },
      { label: 'RRSP (through work)', value: 'rrsp_group' },
      { label: 'FHSA', value: 'fhsa' },
      { label: 'RESP', value: 'resp' },
      { label: 'Pension (defined benefit)', value: 'pension_db' },
      { label: 'Pension (defined contribution)', value: 'pension_dc' },
      { label: 'None of these', value: 'none' },
    ]

    const selected = formState.accounts
    const hasSelection = selected.length > 0

    const toggle = (value: string) => {
      if (value === 'none') {
        updateForm({ accounts: ['none'] })
      } else {
        const next = selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected.filter((v) => v !== 'none'), value]
        updateForm({ accounts: next })
      }
    }

    return (
      <>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: tokens.radius.card,
            border: `1px solid ${tokens.colors.border}`,
            overflow: 'hidden',
          }}
        >
          {options.map((opt, i) => (
            <Fragment key={opt.value}>
              {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
              <SelectOption
                label={opt.label}
                selected={selected.includes(opt.value)}
                onSelect={() => toggle(opt.value)}
                multi
              />
            </Fragment>
          ))}
        </div>
        <div className="mt-6">
          <ContinueButton onClick={advance} disabled={!hasSelection} />
        </div>
      </>
    )
  }

  // ==========================================================================
  // Step: Providers (multi)
  // ==========================================================================
  const renderProvidersStep = () => {
    const options = [
      { label: 'Wealthsimple', value: 'wealthsimple' },
      { label: 'Major Canadian Bank', value: 'big6', subtext: 'TD, RBC, BMO, Scotia, CIBC or National Bank' },
      { label: 'Credit Union', value: 'credit_union' },
      { label: 'Manulife', value: 'manulife' },
      { label: 'Sun Life', value: 'sun_life' },
      { label: 'Canada Life', value: 'canada_life' },
      { label: 'Other', value: 'other' },
    ]

    const selected = formState.institutions
    const hasSelection = selected.length > 0

    const toggle = (value: string) => {
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
      updateForm({ institutions: next })
    }

    const showOtherInput = selected.includes('other')

    return (
      <>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: tokens.radius.card,
            border: `1px solid ${tokens.colors.border}`,
            overflow: 'hidden',
          }}
        >
          {options.map((opt, i) => (
            <Fragment key={opt.value}>
              {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
              <SelectOption
                label={opt.label}
                subtext={'subtext' in opt ? opt.subtext : undefined}
                selected={selected.includes(opt.value)}
                onSelect={() => toggle(opt.value)}
                multi
              />
            </Fragment>
          ))}
        </div>

        <AnimatePresence>
          {showOtherInput && (
            <motion.div
              key="other-input"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="mt-3">
                <input
                  type="text"
                  value={formState.otherInstitution}
                  onChange={(e) => updateForm({ otherInstitution: e.target.value })}
                  placeholder="e.g. Questrade, Desjardins, Investors Group..."
                  style={{
                    width: '100%',
                    backgroundColor: 'white',
                    border: `1px solid ${tokens.colors.border}`,
                    borderRadius: tokens.radius.input,
                    padding: '12px 16px',
                    fontSize: tokens.typography.scale.base,
                    color: tokens.colors.foreground,
                    outline: 'none',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6">
          <ContinueButton onClick={advance} disabled={!hasSelection} />
        </div>
      </>
    )
  }

  // ==========================================================================
  // Step: Debts (multi)
  // ==========================================================================
  const renderDebtsStep = () => {
    const options = [
      { label: 'Mortgage', value: 'mortgage' },
      { label: 'HELOC', value: 'heloc' },
      { label: 'Student loan', value: 'student_loan' },
      { label: 'Car loan', value: 'car_loan' },
      { label: 'Credit card balance', value: 'credit_card' },
      { label: 'None', value: 'none' },
    ]

    const selected = formState.debts
    const hasSelection = selected.length > 0

    const toggle = (value: string) => {
      if (value === 'none') {
        updateForm({ debts: ['none'] })
      } else {
        const next = selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected.filter((v) => v !== 'none'), value]
        updateForm({ debts: next })
      }
    }

    return (
      <>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: tokens.radius.card,
            border: `1px solid ${tokens.colors.border}`,
            overflow: 'hidden',
          }}
        >
          {options.map((opt, i) => (
            <Fragment key={opt.value}>
              {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
              <SelectOption
                label={opt.label}
                selected={selected.includes(opt.value)}
                onSelect={() => toggle(opt.value)}
                multi
              />
            </Fragment>
          ))}
        </div>
        <div className="mt-6">
          <ContinueButton onClick={advance} disabled={!hasSelection} />
        </div>
      </>
    )
  }

  // ==========================================================================
  // Step: Employment (single)
  // ==========================================================================
  const renderEmploymentStep = () => {
    const options = [
      { label: 'Employed full-time', value: 'employed' },
      { label: 'Self-employed', value: 'self_employed' },
      { label: 'Both', value: 'both' },
      { label: 'Retired', value: 'retired' },
    ]

    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: tokens.radius.card,
          border: `1px solid ${tokens.colors.border}`,
          overflow: 'hidden',
        }}
      >
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.employmentType === opt.value}
              onSelect={() => {
                updateForm({ employmentType: opt.value })
                advanceWithDelay(300)
              }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Employer benefits (single)
  // ==========================================================================
  const renderEmployerBenefitsStep = () => {
    const options = [
      { label: 'Yes, they match', value: 'yes' as const },
      { label: 'No match', value: 'no' as const },
      { label: 'Not sure', value: 'not_sure' as const },
    ]

    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: tokens.radius.card,
          border: `1px solid ${tokens.colors.border}`,
          overflow: 'hidden',
        }}
      >
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.employerMatch === opt.value}
              onSelect={() => {
                updateForm({ employerMatch: opt.value })
                advanceWithDelay(300)
              }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Income (single)
  // ==========================================================================
  const renderIncomeStep = () => {
    const options = [
      { label: 'Under $50,000', value: 'under_50k' },
      { label: '$50,000 – $100,000', value: '50_100k' },
      { label: '$100,000 – $150,000', value: '100_150k' },
      { label: '$150,000+', value: '150k_plus' },
    ]

    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: tokens.radius.card,
          border: `1px solid ${tokens.colors.border}`,
          overflow: 'hidden',
        }}
      >
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.incomeRange === opt.value}
              onSelect={() => {
                updateForm({ incomeRange: opt.value })
                advanceWithDelay(300)
              }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Age (single)
  // ==========================================================================
  const renderAgeStep = () => {
    const options = [
      { label: '20s', value: '20s' },
      { label: '30s', value: '30s' },
      { label: '40s', value: '40s' },
      { label: '50s+', value: '50s_plus' },
    ]

    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: tokens.radius.card,
          border: `1px solid ${tokens.colors.border}`,
          overflow: 'hidden',
        }}
      >
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.ageRange === opt.value}
              onSelect={() => {
                updateForm({ ageRange: opt.value })
                advanceWithDelay(300)
              }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step: Primary goal (single) + inline timeline sub-question
  // ==========================================================================
  const renderPrimaryGoalStep = () => {
    const goalOptions = [
      { label: 'Buy a home', value: 'buy_home' },
      { label: 'Retire early', value: 'retire_early' },
      { label: 'Build long-term wealth', value: 'build_wealth' },
      { label: 'Reduce my taxes', value: 'reduce_taxes' },
    ]

    const timelineOptions = [
      { label: 'Within 2 years', value: 'under_2yr' },
      { label: '2–5 years', value: '2_5yr' },
      { label: '5–10 years', value: '5_10yr' },
      { label: '10+ years', value: '10yr_plus' },
    ]

    return (
      <>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: tokens.radius.card,
            border: `1px solid ${tokens.colors.border}`,
            overflow: 'hidden',
          }}
        >
          {goalOptions.map((opt, i) => (
            <Fragment key={opt.value}>
              {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
              <SelectOption
                label={opt.label}
                selected={formState.primaryGoal === opt.value}
                onSelect={() => {
                  updateForm({ primaryGoal: opt.value, timeline: null })
                }}
              />
            </Fragment>
          ))}
        </div>

        <AnimatePresence>
          {formState.primaryGoal && (
            <motion.div
              key="timeline-sub"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-6"
            >
              <p
                className="mb-3"
                style={{
                  fontSize: tokens.typography.scale.sm,
                  fontWeight: 600,
                  color: tokens.colors.foreground,
                }}
              >
                When do you need the money?
              </p>
              <div className="flex flex-wrap gap-2">
                {timelineOptions.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={formState.timeline === opt.value}
                    onSelect={() => {
                      updateForm({ timeline: opt.value })
                      advanceWithDelay(300)
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  // ==========================================================================
  // Step: Confidence (single)
  // ==========================================================================
  const renderConfidenceStep = () => {
    const options = [
      { label: 'Honestly, pretty lost', value: 1 },
      { label: 'I know the basics', value: 2 },
      { label: 'Fairly confident', value: 3 },
      { label: 'On top of it', value: 4 },
    ]

    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: tokens.radius.card,
          border: `1px solid ${tokens.colors.border}`,
          overflow: 'hidden',
        }}
      >
        {options.map((opt, i) => (
          <Fragment key={opt.value}>
            {i > 0 && <div style={{ height: 1, backgroundColor: tokens.colors.border }} />}
            <SelectOption
              label={opt.label}
              selected={formState.confidenceLevel === opt.value}
              onSelect={() => {
                updateForm({ confidenceLevel: opt.value })
                advanceWithDelay(300)
              }}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  // ==========================================================================
  // Step content router
  // ==========================================================================
  const getStepContent = () => {
    switch (currentStepKey) {
      case 'accounts':
        return renderAccountsStep()
      case 'providers':
        return renderProvidersStep()
      case 'debts':
        return renderDebtsStep()
      case 'employment':
        return renderEmploymentStep()
      case 'employerBenefits':
        return renderEmployerBenefitsStep()
      case 'income':
        return renderIncomeStep()
      case 'age':
        return renderAgeStep()
      case 'primaryGoal':
        return renderPrimaryGoalStep()
      case 'confidence':
        return renderConfidenceStep()
      default:
        return null
    }
  }

  const getStepConfig = () => {
    const configs: Record<string, { question: string; subtext?: string }> = {
      accounts: {
        question: 'Which registered accounts do you have?',
        subtext: 'Select all that apply — include accounts at any institution',
      },
      providers: {
        question: 'Where do you hold your money?',
        subtext: 'Select all institutions',
      },
      debts: {
        question: 'Do you carry any of these?',
        subtext: 'Select all that apply',
      },
      employment: {
        question: 'How would you describe your work situation?',
      },
      employerBenefits: {
        question: 'Does your employer match retirement contributions?',
      },
      income: {
        question: "What's your approximate annual income?",
        subtext: 'This helps us assess tax optimization opportunities',
      },
      age: {
        question: 'Which age range are you in?',
      },
      primaryGoal: {
        question: "What's your main financial focus right now?",
      },
      confidence: {
        question: 'How confident do you feel about your finances?',
        subtext: 'Be honest — this shapes how we talk to you',
      },
    }
    return configs[currentStepKey] ?? { question: '', subtext: '' }
  }

  // ==========================================================================
  // Final transition screen
  // ==========================================================================
  if (showFinalTransition) {
    const accountLabels: Record<string, string> = {
      tfsa: 'TFSA', rrsp_personal: 'RRSP', rrsp_group: 'RRSP (group)',
      fhsa: 'FHSA', resp: 'RESP', pension_db: 'DB Pension', pension_dc: 'DC Pension',
    }
    const incomeLabels: Record<string, string> = {
      under_50k: 'Under $50k', '50_100k': '$50–100k',
      '100_150k': '$100–150k', '150k_plus': '$150k+',
    }
    const goalLabels: Record<string, string> = {
      buy_home: 'buy a home', retire_early: 'retire early',
      build_wealth: 'build wealth', reduce_taxes: 'reduce taxes', other: 'general planning',
    }

    const detectedAccounts = formState.accounts
      .filter((a) => a !== 'none')
      .map((a) => accountLabels[a] ?? a)
      .join(', ') || 'no registered accounts'

    const income = (formState.incomeRange ? incomeLabels[formState.incomeRange] : null) ?? formState.incomeRange ?? 'unknown'
    const goal = (formState.primaryGoal ? goalLabels[formState.primaryGoal] : null) ?? formState.primaryGoal ?? 'general planning'
    const scenarioCount = 12

    const lines = [
      { label: 'Reading your profile', detail: `${detectedAccounts} · ${income}` },
      { label: 'Checking RRSP deadline', detail: 'Contribution deadline in 3 days' },
      { label: `Evaluating ${scenarioCount} financial scenarios`, detail: `Goal: ${goal}` },
      { label: 'Scoring readiness and urgency', detail: 'Weighing tax, timeline, and opportunity cost' },
      { label: 'Generating your next moves', detail: 'AI is preparing personalized recommendations' },
    ]

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: tokens.colors.foreground }}
      >
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {lines.slice(0, transitionLine).map((line, i) => {
            const isDone = i < transitionLine - 1
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  backgroundColor: isDone ? '#3D7A5C' : 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', color: 'white', fontWeight: 700,
                }}>
                  {isDone ? '✓' : ''}
                </span>
                <div>
                  <p style={{ fontSize: tokens.typography.scale.sm, fontWeight: 500, color: isDone ? 'rgba(255,255,255,0.5)' : 'white' }}>
                    {line.label}
                  </p>
                  <p style={{ fontSize: '12px', color: isDone ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)', marginTop: '2px' }}>
                    {line.detail}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  // ==========================================================================
  // Main form layout
  // ==========================================================================
  const { question, subtext } = getStepConfig()

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: tokens.colors.background }}
    >
      <ProgressBar current={currentStepIndex + 1} total={totalSteps} />

      <div className="px-6 pt-4">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1"
          style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foreground }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[480px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepKey}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <h1
                className="mb-2"
                style={{
                  fontSize: tokens.typography.scale.xl,
                  color: tokens.colors.foreground,
                  fontWeight: 600,
                }}
              >
                {question}
              </h1>
              {subtext && (
                <p
                  className="mb-6"
                  style={{
                    fontSize: tokens.typography.scale.sm,
                    color: tokens.colors.foregroundMuted,
                  }}
                >
                  {subtext}
                </p>
              )}
              {!subtext && <div className="mb-6" />}
              {getStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
