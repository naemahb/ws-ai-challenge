import type { UserProfile, NextMove } from './mockData'
import { SCENARIO_TEMPLATES } from './mockData'

// =============================================================================
// Constants
// =============================================================================

const RRSP_DEADLINE_MONTH = 3
const RRSP_DEADLINE_DAY = 2
const CURRENT_MONTH = 2 // late February
const CURRENT_DAY = 28

export type WhatIfScenario =
  | 'received_bonus'
  | 'changing_jobs'
  | 'buying_home_soon'
  | 'got_raise'
  | 'retiring_soon'
  | 'debt_free'

// =============================================================================
// Helpers
// =============================================================================

function getTone(confidenceLevel: number): 'warm' | 'technical' {
  return confidenceLevel <= 2 ? 'warm' : 'technical'
}

function getConfidenceState(
  readinessScore: number,
  advisorNote: string | null
): NextMove['confidenceState'] {
  if (advisorNote) return 'needs_human'
  if (readinessScore >= 80) return 'ready'
  if (readinessScore >= 60) return 'almost'
  if (readinessScore >= 40) return 'needs_attention'
  return 'needs_human'
}

function isRRSPDeadlineWithin60Days(): boolean {
  const now = new Date(CURRENT_MONTH, CURRENT_DAY - 1) // 0-indexed month
  const deadline = new Date(now.getFullYear(), RRSP_DEADLINE_MONTH - 1, RRSP_DEADLINE_DAY)
  const diffMs = deadline.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 60
}

function hasAccount(profile: UserProfile, account: string): boolean {
  return profile.accounts.includes(account)
}

function hasAnyRRSP(profile: UserProfile): boolean {
  return (
    profile.accounts.includes('rrsp_personal') || profile.accounts.includes('rrsp_group')
  )
}

function hasTFSA(profile: UserProfile): boolean {
  return profile.accounts.includes('tfsa')
}

// =============================================================================
// Relevance & Scoring per Scenario
// =============================================================================

type ScenarioEval = {
  relevant: boolean
  readinessScore: number
  scoreComposition: { label: string; score: number; weight: number }[]
  isUrgent: boolean
  advisorNote: string | null
}

function evaluateFhsaOpportunity(profile: UserProfile): ScenarioEval {
  const hasFhsa = hasAccount(profile, 'fhsa')
  const goalOk =
    profile.primaryGoal === 'buy_home' || profile.primaryGoal === 'build_wealth'
  const notHomeowner = !(profile.ownsHome ?? false)

  if (hasFhsa || !goalOk || (profile.ownsHome ?? false)) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  let score = 20
  const composition: { label: string; score: number; weight: number }[] = []

  if (!hasFhsa) {
    composition.push({ label: 'Account eligibility', score: 25, weight: 0.3 })
    score += 25
  }
  if (goalOk) {
    composition.push({ label: 'Goal alignment', score: 30, weight: 0.25 })
    score += 30
  }
  const timelineShort = ['under_2yr', '2_5yr'].includes(profile.timeline)
  if (timelineShort) {
    composition.push({ label: 'Timeline fit', score: 25, weight: 0.2 })
    score += 25
  }
  const incomeOk = ['50_100k', '100_150k', '150k_plus'].includes(profile.incomeRange)
  if (incomeOk) {
    composition.push({ label: 'Income capacity', score: 20, weight: 0.25 })
    score += 20
  }

  const isUrgent =
    notHomeowner &&
    profile.primaryGoal === 'buy_home' &&
    ['under_2yr', '2_5yr'].includes(profile.timeline)

  return {
    relevant: true,
    readinessScore: Math.min(100, score),
    scoreComposition: composition.length > 0 ? composition : [
      { label: 'Account eligibility', score: 30, weight: 0.3 },
      { label: 'Goal alignment', score: 25, weight: 0.25 },
      { label: 'Timeline fit', score: 20, weight: 0.2 },
      { label: 'Income capacity', weight: 0.25, score: 25 },
    ],
    isUrgent,
    advisorNote: null,
  }
}

function evaluateFhsaMaxed(profile: UserProfile): ScenarioEval {
  const hasFhsa = hasAccount(profile, 'fhsa')
  const goalOk = profile.primaryGoal === 'buy_home'

  if (!hasFhsa || !goalOk) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const score = 85
  const composition = [
    { label: 'Contribution utilization', score: 90, weight: 0.4 },
    { label: 'Investment allocation', score: 85, weight: 0.3 },
    { label: 'Withdrawal timing', score: 80, weight: 0.3 },
  ]

  return {
    relevant: true,
    readinessScore: Math.min(100, score),
    scoreComposition: composition,
    isUrgent: false,
    advisorNote: null,
  }
}

function evaluateTfsaUnderutilized(profile: UserProfile): ScenarioEval {
  if (!hasTFSA(profile)) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const incomeHigh = ['100_150k', '150k_plus'].includes(profile.incomeRange)
  const timelineLong = ['5_10yr', '10yr_plus'].includes(profile.timeline)
  if (incomeHigh && timelineLong) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  let score = 35
  const composition: { label: string; score: number; weight: number }[] = [
    { label: 'Room utilization', score: 30, weight: 0.35 },
    { label: 'Goal alignment', score: 40, weight: 0.25 },
    { label: 'Timeline fit', score: 35, weight: 0.2 },
    { label: 'Liquidity need', score: 40, weight: 0.2 },
  ]

  if (profile.primaryGoal === 'build_wealth' || profile.primaryGoal === 'retire_early') score += 15
  if (['under_2yr', '2_5yr'].includes(profile.timeline)) score += 10
  if (['20s', '30s'].includes(profile.ageRange)) score += 10

  const isUrgent =
    ['under_2yr', '2_5yr'].includes(profile.timeline) &&
    (profile.primaryGoal === 'buy_home' || profile.primaryGoal === 'build_wealth')

  return {
    relevant: true,
    readinessScore: Math.min(100, score),
    scoreComposition: composition,
    isUrgent,
    advisorNote: null,
  }
}

function evaluateTfsaOptimized(profile: UserProfile): ScenarioEval {
  if (!hasTFSA(profile)) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const incomeHigh = ['100_150k', '150k_plus'].includes(profile.incomeRange)
  const timelineLong = ['5_10yr', '10yr_plus'].includes(profile.timeline)
  if (!incomeHigh || !timelineLong) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const composition = [
    { label: 'Room utilization', score: 95, weight: 0.5 },
    { label: 'Investment efficiency', score: 90, weight: 0.5 },
  ]

  return {
    relevant: true,
    readinessScore: 92,
    scoreComposition: composition,
    isUrgent: false,
    advisorNote: null,
  }
}

function evaluateRrspPersonalVsGroup(profile: UserProfile): ScenarioEval {
  const hasBoth =
    profile.accounts.includes('rrsp_personal') && profile.accounts.includes('rrsp_group')
  if (!hasBoth) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const score = 45
  const composition = [
    { label: 'Coordination risk', score: 40, weight: 0.35 },
    { label: 'Contribution split', score: 50, weight: 0.3 },
    { label: 'Investment options', score: 45, weight: 0.35 },
  ]

  const advisorNote =
    'Multiple institutions involved in RRSP contributions; coordination and portability strategy should be reviewed with an advisor.'

  return {
    relevant: true,
    readinessScore: Math.min(100, score),
    scoreComposition: composition,
    isUrgent: isRRSPDeadlineWithin60Days(),
    advisorNote,
  }
}

function evaluateRrspHighIncome(profile: UserProfile): ScenarioEval {
  const incomeHigh = ['100_150k', '150k_plus'].includes(profile.incomeRange)
  if (!incomeHigh || !hasAnyRRSP(profile)) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  let score = 50
  const composition = [
    { label: 'Marginal rate benefit', score: 55, weight: 0.35 },
    { label: 'Room utilization', score: 45, weight: 0.35 },
    { label: 'Goal alignment', score: 50, weight: 0.3 },
  ]

  if (profile.primaryGoal === 'reduce_taxes') score += 20
  if (profile.taxResult === 'owed') score -= 10

  const isUrgent = isRRSPDeadlineWithin60Days()

  return {
    relevant: true,
    readinessScore: Math.min(100, Math.max(0, score)),
    scoreComposition: composition,
    isUrgent,
    advisorNote: null,
  }
}

function evaluateDbPensionRrspRoom(profile: UserProfile): ScenarioEval {
  if ((profile.hasPension ?? 'none') !== 'defined_benefit') {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const composition = [
    { label: 'Pension adjustment impact', score: 35, weight: 0.4 },
    { label: 'Room clarity', score: 40, weight: 0.3 },
    { label: 'Contribution strategy', score: 45, weight: 0.3 },
  ]

  const advisorNote =
    'Defined benefit pension and Pension Adjustment affect RRSP room; advisor review recommended for accurate room and contribution strategy.'

  return {
    relevant: true,
    readinessScore: 40,
    scoreComposition: composition,
    isUrgent: isRRSPDeadlineWithin60Days(),
    advisorNote,
  }
}

function evaluateEmployerMatch(profile: UserProfile): ScenarioEval {
  const employed = profile.employmentType === 'employed' || profile.employmentType === 'both'
  if (!employed || profile.employerMatch) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const composition = [
    { label: 'Match capture', score: 25, weight: 0.5 },
    { label: 'Contribution level', score: 30, weight: 0.5 },
  ]

  return {
    relevant: true,
    readinessScore: 28,
    scoreComposition: composition,
    isUrgent: true,
    advisorNote: null,
  }
}

function evaluateHelocMortgageVsInvesting(profile: UserProfile): ScenarioEval {
  const hasMortgage = profile.debts.includes('mortgage')
  const goalOk =
    profile.primaryGoal === 'build_wealth' || profile.primaryGoal === 'retire_early'
  if (!hasMortgage || !goalOk) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const score = 50
  const composition = [
    { label: 'Interest rate vs return', score: 50, weight: 0.35 },
    { label: 'Risk tolerance', score: 45, weight: 0.25 },
    { label: 'Goal alignment', score: 55, weight: 0.2 },
    { label: 'Tax efficiency', score: 48, weight: 0.2 },
  ]

  return {
    relevant: true,
    readinessScore: Math.min(100, score),
    scoreComposition: composition,
    isUrgent: false,
    advisorNote: null,
  }
}

function evaluateTaxRefundInefficiency(profile: UserProfile): ScenarioEval {
  if (profile.taxResult !== 'big_refund') {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const composition = [
    { label: 'Refund size', score: 35, weight: 0.4 },
    { label: 'Withholding efficiency', score: 40, weight: 0.3 },
    { label: 'Cash flow impact', score: 45, weight: 0.3 },
  ]

  return {
    relevant: true,
    readinessScore: 40,
    scoreComposition: composition,
    isUrgent: false,
    advisorNote: null,
  }
}

function evaluateCapitalGainsComplexity(profile: UserProfile): ScenarioEval {
  const multiProvider = profile.accountProviders.length >= 2
  if (!multiProvider) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const composition = [
    { label: 'ACB tracking', score: 30, weight: 0.3 },
    { label: 'Institution complexity', score: 25, weight: 0.35 },
    { label: 'Tax optimization', score: 35, weight: 0.35 },
  ]

  const advisorNote =
    'Capital gains, investment income, and multi-institution complexity; advisor review recommended for ACB and tax optimization.'

  return {
    relevant: true,
    readinessScore: 30,
    scoreComposition: composition,
    isUrgent: false,
    advisorNote,
  }
}

function evaluateMatPatLeave(profile: UserProfile): ScenarioEval {
  const hasMatLeave = (profile.expectedIncomeChange ?? []).includes('mat_leave')
  if (!hasMatLeave) {
    return { relevant: false, readinessScore: 0, scoreComposition: [], isUrgent: false, advisorNote: null }
  }

  const score = 45
  const composition = [
    { label: 'Income drop timing', score: 40, weight: 0.3 },
    { label: 'RRSP vs TFSA', score: 50, weight: 0.35 },
    { label: 'EI + top-up', score: 45, weight: 0.2 },
    { label: 'FHSA eligibility', score: 55, weight: 0.15 },
  ]

  return {
    relevant: true,
    readinessScore: Math.min(100, score),
    scoreComposition: composition,
    isUrgent: false,
    advisorNote: null,
  }
}

// =============================================================================
// Scenario Evaluator Map
// =============================================================================

const EVALUATORS: ((p: UserProfile) => ScenarioEval)[] = [
  evaluateFhsaOpportunity,
  evaluateFhsaMaxed,
  evaluateTfsaUnderutilized,
  evaluateTfsaOptimized,
  evaluateRrspPersonalVsGroup,
  evaluateRrspHighIncome,
  evaluateDbPensionRrspRoom,
  evaluateEmployerMatch,
  evaluateHelocMortgageVsInvesting,
  evaluateTaxRefundInefficiency,
  evaluateCapitalGainsComplexity,
  evaluateMatPatLeave,
]

// =============================================================================
// Main: calculateNextMoves
// =============================================================================

export function calculateNextMoves(profile: UserProfile): NextMove[] {
  const tone = getTone(profile.confidenceLevel)
  const moves: NextMove[] = []

  for (let i = 0; i < SCENARIO_TEMPLATES.length; i++) {
    const template = SCENARIO_TEMPLATES[i]
    const evaluator = EVALUATORS[i]
    const evalResult = evaluator(profile)

    if (!evalResult.relevant) continue

    const confidenceState = getConfidenceState(
      evalResult.readinessScore,
      evalResult.advisorNote
    )

    moves.push({
      id: template.id,
      title: template.title,
      category: template.category,
      aiDecision: template.aiDecision,
      readinessScore: evalResult.readinessScore,
      confidenceState,
      isUrgent: evalResult.isUrgent,
      scoreComposition: evalResult.scoreComposition,
      oneLineSummary: template.oneLineSummary[tone],
      fullReasoning: template.fullReasoning[tone],
      whatIsBlocking: template.whatIsBlocking,
      nextStep: template.nextStep,
      advisorNote: evalResult.advisorNote ?? template.advisorNoteDefault,
      whatChanged: null,
    })
  }

  moves.sort((a, b) => {
    if (a.isUrgent && !b.isUrgent) return -1
    if (!a.isUrgent && b.isUrgent) return 1
    return a.readinessScore - b.readinessScore
  })

  return moves.slice(0, 5)
}

// =============================================================================
// getWhatIfMoves
// =============================================================================

function adjustProfileForScenario(
  profile: UserProfile,
  scenario: WhatIfScenario
): UserProfile {
  const adjusted = { ...profile, expectedIncomeChange: [...(profile.expectedIncomeChange ?? [])] }

  switch (scenario) {
    case 'received_bonus':
      if (!adjusted.expectedIncomeChange.includes('bonus')) {
        adjusted.expectedIncomeChange.push('bonus')
      }
      if (adjusted.incomeRange === '50_100k') {
        adjusted.incomeRange = '100_150k'
      }
      break

    case 'changing_jobs':
      if (!adjusted.expectedIncomeChange.includes('job_change')) {
        adjusted.expectedIncomeChange.push('job_change')
      }
      break

    case 'buying_home_soon':
      adjusted.primaryGoal = 'buy_home'
      adjusted.timeline = 'under_2yr'
      adjusted.ownsHome = false
      break

    case 'got_raise': {
      const ranges: UserProfile['incomeRange'][] = ['under_50k', '50_100k', '100_150k', '150k_plus']
      const idx = ranges.indexOf(adjusted.incomeRange)
      if (idx >= 0 && idx < ranges.length - 1) {
        adjusted.incomeRange = ranges[idx + 1]
      }
      break
    }

    case 'retiring_soon':
      adjusted.primaryGoal = 'retire_early'
      adjusted.timeline = 'under_2yr'
      break

    case 'debt_free':
      adjusted.debts = []
      break

    default:
      break
  }

  return adjusted
}

// =============================================================================
// getDataCompleteness
// =============================================================================

export type SharpenerQuestion = {
  id: 'tax_result' | 'income_changes' | 'rrsp_room' | 'home_ownership'
  label: string
  hint: string
}

export type DataCompletenessResult = {
  answeredPoints: number
  totalPoints: number
  missingQuestions: SharpenerQuestion[]
}

const SHARPENER_QUESTIONS: SharpenerQuestion[] = [
  {
    id: 'tax_result',
    label: "Last year's tax return",
    hint: 'Refund, owed, or broke even?',
  },
  {
    id: 'income_changes',
    label: 'Expected income changes',
    hint: 'Bonus, mat/pat leave, or job change coming up?',
  },
  {
    id: 'rrsp_room',
    label: 'RRSP carry-forward room',
    hint: 'Unused room from prior years via CRA My Account.',
  },
  {
    id: 'home_ownership',
    label: 'Home ownership status',
    hint: 'Own a home or renting?',
  },
]

export function getDataCompleteness(profile: UserProfile): DataCompletenessResult {
  const totalPoints = 12
  const missingQuestions: SharpenerQuestion[] = []
  let answeredPoints = 8 // 8 always-collected: accounts, institutions, debts, employment, income, age, goal, timeline

  const checks: { question: SharpenerQuestion; answered: boolean }[] = [
    { question: SHARPENER_QUESTIONS[0], answered: profile.taxResult != null },
    { question: SHARPENER_QUESTIONS[1], answered: profile.expectedIncomeChange != null },
    { question: SHARPENER_QUESTIONS[2], answered: profile.hasCarryForwardRoom != null },
    { question: SHARPENER_QUESTIONS[3], answered: profile.ownsHome != null },
  ]

  for (const { question, answered } of checks) {
    if (answered) {
      answeredPoints += 1
    } else {
      missingQuestions.push(question)
    }
  }

  return { answeredPoints, totalPoints, missingQuestions }
}

export function getWhatIfMoves(
  profile: UserProfile,
  scenarios: string | string[]
): NextMove[] {
  const validScenarios: WhatIfScenario[] = [
    'received_bonus',
    'changing_jobs',
    'buying_home_soon',
    'got_raise',
    'retiring_soon',
    'debt_free',
  ]

  const keys = (Array.isArray(scenarios) ? scenarios : [scenarios]).filter(
    (s): s is WhatIfScenario => validScenarios.includes(s as WhatIfScenario)
  )

  if (keys.length === 0) return calculateNextMoves(profile)

  const adjustedProfile = keys.reduce(
    (p, scenario) => adjustProfileForScenario(p, scenario),
    profile
  )
  return calculateNextMoves(adjustedProfile)
}
