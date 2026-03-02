'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { SharpenerQuestion } from '@/lib/scoring'
import type { UserProfile } from '@/lib/mockData'
import { tokens } from '@/lib/tokens'

// =============================================================================
// Question UI configs
// =============================================================================

type QuestionUI = {
  question: string
  hint: string
  type: 'radio' | 'checkbox'
  options: { value: string; label: string }[]
}

const QUESTION_UI: Record<SharpenerQuestion['id'], QuestionUI> = {
  tax_result: {
    question: "How did last year's tax return go?",
    hint: 'Helps flag over-withholding or missed RRSP deductions.',
    type: 'radio',
    options: [
      { value: 'big_refund', label: 'Big refund (over $500)' },
      { value: 'small_refund', label: 'Small refund' },
      { value: 'broke_even', label: 'Broke even' },
      { value: 'owed', label: 'I owed money' },
    ],
  },
  income_changes: {
    question: 'Any income changes coming up?',
    hint: 'Select all that apply — affects which moves matter most.',
    type: 'checkbox',
    options: [
      { value: 'bonus', label: 'Expecting a bonus' },
      { value: 'mat_leave', label: 'Going on mat/pat leave' },
      { value: 'job_change', label: 'Changing jobs soon' },
      { value: 'none', label: 'None of the above' },
    ],
  },
  rrsp_room: {
    question: 'Do you have unused RRSP contribution room?',
    hint: 'Carry-forward room from prior years can be used anytime.',
    type: 'radio',
    options: [
      { value: 'yes', label: 'Yes, I have carry-forward room' },
      { value: 'no', label: "No, I've used it up" },
      { value: 'not_sure', label: 'Not sure' },
      { value: 'cra_linked', label: "I'll check CRA My Account" },
    ],
  },
  home_ownership: {
    question: 'Do you currently own a home?',
    hint: 'Affects FHSA eligibility and mortgage-related moves.',
    type: 'radio',
    options: [
      { value: 'owns', label: 'Yes, I own a home' },
      { value: 'renting', label: "No, I'm renting" },
    ],
  },
}

// =============================================================================
// Build UserProfile patch from answers
// =============================================================================

function buildProfilePatch(
  questionId: SharpenerQuestion['id'],
  answer: string | string[]
): Partial<UserProfile> {
  switch (questionId) {
    case 'tax_result':
      return { taxResult: answer as UserProfile['taxResult'] }
    case 'income_changes': {
      const vals = answer as string[]
      return { expectedIncomeChange: vals.includes('none') ? [] : vals }
    }
    case 'rrsp_room':
      return { hasCarryForwardRoom: answer as UserProfile['hasCarryForwardRoom'] }
    case 'home_ownership':
      return { ownsHome: answer === 'owns' }
    default:
      return {}
  }
}

// =============================================================================
// CheckmarkAnimation
// =============================================================================

function CheckmarkAnimation() {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        backgroundColor: tokens.colors.success,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <motion.path
          d="M8 16.5l5.5 5.5 10.5-12"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  )
}

// =============================================================================
// SharpenerModal
// =============================================================================

type SharpenerModalProps = {
  questions: SharpenerQuestion[]
  isDesktop: boolean
  onComplete: (patch: Partial<UserProfile>) => void
  onClose: () => void
}

export function SharpenerModal({ questions, isDesktop, onComplete, onClose }: SharpenerModalProps) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [done, setDone] = useState(false)

  const currentQuestion = questions[step]
  const ui = currentQuestion ? QUESTION_UI[currentQuestion.id] : null
  const currentAnswer = answers[currentQuestion?.id ?? '']

  const isAnswered = ui?.type === 'checkbox'
    ? ((currentAnswer as string[] | undefined)?.length ?? 0) > 0
    : currentAnswer != null && currentAnswer !== ''

  function handleRadioSelect(value: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))
  }

  function handleCheckboxToggle(value: string) {
    setAnswers((prev) => {
      const current = (prev[currentQuestion.id] as string[] | undefined) ?? []
      if (value === 'none') {
        return { ...prev, [currentQuestion.id]: current.includes('none') ? [] : ['none'] }
      }
      const withoutNone = current.filter((v) => v !== 'none')
      const updated = withoutNone.includes(value)
        ? withoutNone.filter((v) => v !== value)
        : [...withoutNone, value]
      return { ...prev, [currentQuestion.id]: updated }
    })
  }

  function handleNext() {
    if (!isAnswered) return
    if (step < questions.length - 1) {
      setStep((s) => s + 1)
    } else {
      // Build combined patch from all answers
      const patch: Partial<UserProfile> = {}
      questions.forEach((q) => {
        const ans = answers[q.id]
        if (ans != null) {
          Object.assign(patch, buildProfilePatch(q.id, ans))
        }
      })
      onComplete(patch)
      setDone(true)
      // Auto-close after celebration
      setTimeout(() => onClose(), 2000)
    }
  }

  const panelStyle: React.CSSProperties = isDesktop
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

  const sheetStyle: React.CSSProperties = isDesktop
    ? {
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '32px',
        width: '440px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        position: 'relative',
      }
    : {
        backgroundColor: 'white',
        borderRadius: '20px 20px 0 0',
        padding: '28px 24px 40px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
      }

  return (
    <div style={panelStyle}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: -1,
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
        animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
        exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style={sheetStyle}
      >
        {/* Close button */}
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

        <AnimatePresence mode="wait">
          {done ? (
            /* Completion state */
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '16px 0' }}
            >
              <CheckmarkAnimation />
              <p
                style={{
                  fontSize: tokens.typography.scale.lg,
                  fontWeight: 600,
                  color: tokens.colors.foreground,
                  marginBottom: '8px',
                }}
              >
                Score sharpened
              </p>
              <p
                style={{
                  fontSize: tokens.typography.scale.sm,
                  color: tokens.colors.foregroundMuted,
                  lineHeight: '1.5',
                }}
              >
                Your moves have been updated with the new details.
              </p>
            </motion.div>
          ) : (
            /* Question step */
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {/* Progress dots */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  marginBottom: '24px',
                  paddingRight: '32px',
                }}
              >
                {questions.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: '3px',
                      flex: 1,
                      borderRadius: tokens.radius.pill,
                      backgroundColor: i <= step ? tokens.colors.foreground : tokens.colors.border,
                      transition: 'background-color 0.2s',
                    }}
                  />
                ))}
              </div>

              <p
                style={{
                  fontSize: tokens.typography.scale.xs,
                  color: tokens.colors.foregroundMuted,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                {step + 1} of {questions.length}
              </p>

              <p
                style={{
                  fontSize: tokens.typography.scale.lg,
                  fontWeight: 600,
                  color: tokens.colors.foreground,
                  lineHeight: '1.35',
                  marginBottom: '6px',
                }}
              >
                {ui?.question}
              </p>
              <p
                style={{
                  fontSize: tokens.typography.scale.sm,
                  color: tokens.colors.foregroundMuted,
                  marginBottom: '20px',
                  lineHeight: '1.5',
                }}
              >
                {ui?.hint}
              </p>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {ui?.options.map((opt) => {
                  const isSelected =
                    ui.type === 'checkbox'
                      ? ((currentAnswer as string[] | undefined) ?? []).includes(opt.value)
                      : currentAnswer === opt.value

                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        ui.type === 'checkbox'
                          ? handleCheckboxToggle(opt.value)
                          : handleRadioSelect(opt.value)
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        borderRadius: tokens.radius.input,
                        border: `1.5px solid ${isSelected ? tokens.colors.foreground : tokens.colors.border}`,
                        backgroundColor: isSelected ? tokens.colors.surface : 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.15s, background-color 0.15s',
                      }}
                    >
                      {/* Indicator */}
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: ui.type === 'checkbox' ? '4px' : '50%',
                          border: `2px solid ${isSelected ? tokens.colors.foreground : tokens.colors.border}`,
                          backgroundColor: isSelected ? tokens.colors.foreground : 'white',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            {ui.type === 'checkbox' ? (
                              <path
                                d="M2 5l2.5 2.5 3.5-4"
                                stroke="white"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            ) : (
                              <circle cx="5" cy="5" r="3" fill="white" />
                            )}
                          </svg>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: tokens.typography.scale.sm,
                          color: tokens.colors.foreground,
                          fontWeight: isSelected ? 500 : 400,
                        }}
                      >
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* CRA note for rrsp_room */}
              {currentQuestion?.id === 'rrsp_room' && (
                <p
                  style={{
                    fontSize: tokens.typography.scale.xs,
                    color: tokens.colors.foregroundMuted,
                    marginBottom: '16px',
                    lineHeight: '1.5',
                  }}
                >
                  Find your exact RRSP room on your{' '}
                  <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                    CRA My Account → RRSP/PRPP → Contribution room
                  </span>
                </p>
              )}

              <button
                onClick={handleNext}
                disabled={!isAnswered}
                style={{
                  width: '100%',
                  height: '48px',
                  backgroundColor: isAnswered ? tokens.colors.foreground : tokens.colors.border,
                  color: isAnswered ? 'white' : tokens.colors.foregroundMuted,
                  fontSize: tokens.typography.scale.sm,
                  fontWeight: 500,
                  borderRadius: tokens.radius.pill,
                  border: 'none',
                  cursor: isAnswered ? 'pointer' : 'default',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
              >
                {step < questions.length - 1 ? 'Next →' : 'Done'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
