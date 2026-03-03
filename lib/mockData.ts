// =============================================================================
// Types
// =============================================================================

export type UserProfile = {
  accounts: string[]
  accountProviders: string[]
  debts: string[]
  employmentType: 'employed' | 'self_employed' | 'both' | 'retired'
  hasPension?: 'none' | 'defined_contribution' | 'defined_benefit'
  employerMatch: boolean
  incomeRange: 'under_50k' | '50_100k' | '100_150k' | '150k_plus'
  ageRange: '20s' | '30s' | '40s' | '50s_plus'
  primaryGoal: 'buy_home' | 'retire_early' | 'build_wealth' | 'reduce_taxes'
  timeline: 'under_2yr' | '2_5yr' | '5_10yr' | '10yr_plus'
  ownsHome?: boolean
  taxResult?: 'big_refund' | 'small_refund' | 'broke_even' | 'owed'
  hasCarryForwardRoom?: 'yes' | 'no' | 'not_sure' | 'cra_linked'
  expectedIncomeChange?: string[]
  confidenceLevel: number
  otherInstitution?: string
}

export type NextMove = {
  id: string
  title: string
  category: 'registered' | 'tax' | 'debt' | 'protection' | 'investment'
  aiDecision: 'auto' | 'needs_approval' | 'human_required'
  readinessScore: number
  confidenceState: 'ready' | 'almost' | 'needs_attention' | 'needs_human'
  isUrgent: boolean
  isCompleted?: boolean
  scoreComposition: {
    label: string
    score: number
    weight: number
  }[]
  oneLineSummary: string
  fullReasoning: string
  whatIsBlocking: string
  nextStep: string
  advisorNote: string | null
  whatChanged: string | null
}

export type NextMoveTemplate = {
  id: string
  title: string
  category: NextMove['category']
  aiDecision: NextMove['aiDecision']
  scoreCompositionTemplate: { label: string; weight: number }[]
  fullReasoning: { warm: string; technical: string }
  oneLineSummary: { warm: string; technical: string }
  whatIsBlocking: string
  nextStep: string
  advisorNoteDefault: string | null
}

export type AISignal = {
  id: string
  type: 'drift' | 'cash_drag' | 'risk_mismatch' | 'deadline' | 'opportunity'
  severity: 'high' | 'medium' | 'low'
  title: string
  why: string
  suggestedAction: string
  impact: string
}

// =============================================================================
// Scenario Templates - 12 Canadian Financial Response Blocks
// =============================================================================

export const SCENARIO_TEMPLATES: NextMoveTemplate[] = [
  // 1. FHSA opportunity (doesn't have one, qualifies)
  {
    id: 'fhsa_opportunity',
    title: 'Open a First Home Savings Account (FHSA)',
    category: 'registered',
    aiDecision: 'auto',
    scoreCompositionTemplate: [
      { label: 'Account eligibility', weight: 0.3 },
      { label: 'Goal alignment', weight: 0.25 },
      { label: 'Timeline fit', weight: 0.2 },
      { label: 'Income capacity', weight: 0.25 },
    ],
    fullReasoning: {
      warm: "You're a first-time buyer and you don't have an FHSA yet — that's leaving real money on the table. The FHSA lets you contribute up to $8,000 per year (up to $40,000 lifetime), and every dollar is tax-deductible like an RRSP. The catch: you have 15 years from opening to use it for a home, or it rolls into your RRSP. Given your goal and timeline, opening one now and maxing contributions gives you a tax break today and tax-free growth for your down payment. It's one of the best deals in Canadian tax law.",
      technical:
        "FHSA eligibility: first-time buyer, Canadian resident, 18+. Annual limit $8,000, lifetime $40,000. Contributions are tax-deductible (reduce taxable income); withdrawals for qualifying home purchase are tax-free. Unused room carries forward. 15-year maximum account lifetime; balance must be withdrawn or transferred to RRSP/RRIF by year-end of the year you turn 71 or 15 years after opening, whichever is earlier. Optimal strategy: open early, contribute annually, invest in growth assets. Coordination with RRSP: FHSA room is separate; you can use both for a home.",
    },
    oneLineSummary: {
      warm: "You qualify for an FHSA and don't have one yet — up to $8K/year in tax-free savings for your first home.",
      technical: 'FHSA room available: $8K/year, $40K lifetime, tax-deductible contributions, tax-free qualified withdrawal.',
    },
    whatIsBlocking: 'No FHSA account opened; contribution room is accumulating unused.',
    nextStep: 'Open an FHSA at your preferred institution (banks, Wealthsimple, Questrade, etc.) and contribute what you can — even $1,000 now starts the clock and captures the deduction.',
    advisorNoteDefault: null,
  },

  // 2. FHSA maxed and optimized
  {
    id: 'fhsa_maxed',
    title: 'FHSA is maxed and optimized',
    category: 'registered',
    aiDecision: 'needs_approval',
    scoreCompositionTemplate: [
      { label: 'Contribution utilization', weight: 0.4 },
      { label: 'Investment allocation', weight: 0.3 },
      { label: 'Withdrawal timing', weight: 0.3 },
    ],
    fullReasoning: {
      warm: "You're doing it right. Your FHSA is maxed, you're capturing the full $8,000/year deduction, and your money is growing tax-free. When you're ready to buy, you can withdraw the full balance tax-free for a qualifying first home. Just make sure you're investing the funds appropriately for your timeline — if you're buying in under 2 years, dial back risk; if it's 5+ years out, you can afford more growth.",
      technical:
        'FHSA contributions maximized; tax deduction captured. Qualified withdrawal for first home is tax-free. Ensure investment allocation matches timeline: shorter horizon warrants lower equity exposure. Withdrawal must be for qualifying home; 15-year/age-71 rules apply. If purchase delayed, consider transfer to RRSP to preserve tax-deferred status.',
    },
    oneLineSummary: {
      warm: "Your FHSA is maxed — you're on track for a tax-free down payment.",
      technical: 'FHSA fully utilized; tax deduction and tax-free growth optimized for qualified withdrawal.',
    },
    whatIsBlocking: 'Nothing — this move is optimized.',
    nextStep: 'Keep contributing annually; review investment allocation as purchase timeline approaches.',
    advisorNoteDefault: null,
  },

  // 3. TFSA underutilized
  {
    id: 'tfsa_underutilized',
    title: 'Maximize your TFSA contributions',
    category: 'registered',
    aiDecision: 'needs_approval',
    scoreCompositionTemplate: [
      { label: 'Room utilization', weight: 0.35 },
      { label: 'Goal alignment', weight: 0.25 },
      { label: 'Timeline fit', weight: 0.2 },
      { label: 'Liquidity need', weight: 0.2 },
    ],
    fullReasoning: {
      warm: "You've got TFSA room you're not using. The TFSA is one of the most flexible accounts in Canada — $7,000 new room each year (2024–25), and if you've been eligible since 2009, your total room could be around $102,000. Everything grows tax-free and you can withdraw anytime with no tax hit. Unused room carries forward forever. If you're building wealth or saving for anything medium-term, parking cash or investments here beats a taxable account every time.",
      technical:
        'TFSA: $7,000 annual limit (2024–25); lifetime room ~$102K if eligible since inception. Contributions not tax-deductible; growth and withdrawals are tax-free. Room carries forward indefinitely. Overcontribution triggers 1% per month penalty. Optimal use: emergency fund, medium-term goals, tax-efficient growth. Prioritize over taxable investing when marginal rate is low or when RRSP deduction value is limited.',
    },
    oneLineSummary: {
      warm: "You have TFSA room you're not using — every dollar in there grows tax-free.",
      technical: 'TFSA underutilized; $7K/year room, ~$102K lifetime; tax-free growth and withdrawals.',
    },
    whatIsBlocking: 'Available TFSA contribution room is unused; capital may be in taxable accounts or cash.',
    nextStep: 'Check your CRA My Account for exact contribution room, then move available cash or investments into your TFSA.',
    advisorNoteDefault: null,
  },

  // 4. TFSA optimized
  {
    id: 'tfsa_optimized',
    title: 'TFSA is fully optimized',
    category: 'registered',
    aiDecision: 'needs_approval',
    scoreCompositionTemplate: [
      { label: 'Room utilization', weight: 0.5 },
      { label: 'Investment efficiency', weight: 0.5 },
    ],
    fullReasoning: {
      warm: "Your TFSA is maxed and working for you. You're capturing all the tax-free growth you can, and you're not overcontributing (which would trigger that nasty 1% per month penalty). Nice work.",
      technical:
        'TFSA fully utilized; no overcontribution. Tax-free growth maximized. Ensure CRA My Account reflects accurate room; reconcile with institution statements if multiple TFSAs exist.',
    },
    oneLineSummary: {
      warm: "Your TFSA is maxed — you're getting all the tax-free growth you can.",
      technical: 'TFSA fully utilized; contribution room optimized; no overcontribution.',
    },
    whatIsBlocking: 'Nothing — this move is optimized.',
    nextStep: 'Continue contributing each year as new room becomes available.',
    advisorNoteDefault: null,
  },

  // 5. RRSP personal vs group coordination risk
  {
    id: 'rrsp_personal_vs_group',
    title: 'Coordinate your personal and group RRSP',
    category: 'registered',
    aiDecision: 'human_required',
    scoreCompositionTemplate: [
      { label: 'Coordination risk', weight: 0.35 },
      { label: 'Contribution split', weight: 0.3 },
      { label: 'Investment options', weight: 0.35 },
    ],
    fullReasoning: {
      warm: "You've got both a personal RRSP and a group RRSP — that's common, but it creates coordination risk. Your total RRSP room is shared across both; if your group plan contributions aren't tracked properly, you could overcontribute and face penalties. Plus, group plans often have limited investment options and higher fees. A human advisor can help you map out how much to put where, and whether it makes sense to transfer from group to personal when you change jobs.",
      technical:
        'RRSP room is unified across personal and group plans. Overcontribution (beyond $2,000 buffer) incurs 1% per month penalty. Group plans: typically limited fund lineup, possible employer match, portability on job change. Coordination strategy: track total contributions against NOA room; optimize personal vs group based on match, fees, and investment choice. Multi-institution scenario warrants advisor review for transfer timing and tax implications.',
    },
    oneLineSummary: {
      warm: "Your personal and group RRSPs share one pool of room — make sure you're not overcontributing and that you're getting the best options.",
      technical: 'Personal + group RRSP coordination required; unified room, overcontribution risk, fee/option optimization.',
    },
    whatIsBlocking: 'Multiple RRSP accounts across institutions; contribution tracking and allocation strategy unclear.',
    nextStep: 'Reconcile your Notice of Assessment RRSP room with contributions across all accounts; consider advisor review for allocation and portability strategy.',
    advisorNoteDefault:
      'Multiple institutions involved in RRSP contributions; coordination and portability strategy should be reviewed with an advisor.',
  },

  // 6. RRSP optimization for high income
  {
    id: 'rrsp_high_income',
    title: 'Maximize RRSP contributions for tax savings',
    category: 'registered',
    aiDecision: 'needs_approval',
    scoreCompositionTemplate: [
      { label: 'Marginal rate benefit', weight: 0.35 },
      { label: 'Room utilization', weight: 0.35 },
      { label: 'Goal alignment', weight: 0.3 },
    ],
    fullReasoning: {
      warm: "At your income level, every dollar you put into an RRSP is worth more. You're likely in a 40%+ marginal bracket, so a $10,000 contribution could save you $4,000 or more in tax. Your limit is 18% of earned income, capped at $32,490 for 2025 — check your Notice of Assessment for your exact room. Today is the March 2 deadline — the last day to contribute and claim the deduction on your 2025 tax return.",
      technical:
        'RRSP deduction value = contribution × marginal tax rate. At 100k+ income, marginal rate typically 37–53% depending on province. 2025 cap: $32,490. First 60 days of calendar year: contributions deductible against prior year. Optimal strategy: contribute when marginal rate is highest; consider deferring deduction to higher-income year if room allows. Coordinate with employer match and pension adjustment.',
    },
    oneLineSummary: {
      warm: "At your income, RRSP contributions pack a big tax punch — today is the last day to claim the deduction on your 2025 return.",
      technical: 'High marginal rate; RRSP deduction value maximized; $32,490 cap (2025); 60-day prior-year deadline applies.',
    },
    whatIsBlocking: 'RRSP room may be underutilized; high-income tax savings not fully captured.',
    nextStep: 'Check your NOA for RRSP room; contribute today (March 2) to claim on your 2025 return, or contribute anytime after for the 2026 tax year.',
    advisorNoteDefault: null,
  },

  // 7. Defined benefit pension impact on RRSP room
  {
    id: 'db_pension_rrsp_room',
    title: 'Understand how your pension affects RRSP room',
    category: 'registered',
    aiDecision: 'human_required',
    scoreCompositionTemplate: [
      { label: 'Pension adjustment impact', weight: 0.4 },
      { label: 'Room clarity', weight: 0.3 },
      { label: 'Contribution strategy', weight: 0.3 },
    ],
    fullReasoning: {
      warm: "With a defined benefit pension, your employer is already building retirement savings for you — and the government reduces your RRSP room accordingly. Your Notice of Assessment shows your exact room after the pension adjustment. It's easy to overcontribute if you don't account for this, and the rules are fiddly. A quick chat with an advisor or your pension administrator can clarify how much room you actually have and whether it's worth using it.",
      technical:
        'Defined benefit pension generates Pension Adjustment (PA) that reduces RRSP contribution room. PA approximates value of pension earned; exact formula in ITA. NOA shows net RRSP room after PA. Overcontribution risk is higher with DB plans. Past Service Pension Adjustment (PSPA) can further reduce room. Advisor recommended: PA calculation and room reconciliation are complex; human review ensures accuracy.',
    },
    oneLineSummary: {
      warm: "Your pension eats into your RRSP room — get your exact number from your NOA before contributing.",
      technical: 'PA reduces RRSP room; NOA is authoritative; overcontribution risk; advisor review recommended.',
    },
    whatIsBlocking: 'Pension adjustment reduces RRSP room; exact room requires NOA and possible advisor interpretation.',
    nextStep: 'Pull your latest Notice of Assessment; reconcile RRSP room with any planned contributions. Consider advisor review for PA/PSPA clarity.',
    advisorNoteDefault:
      'Defined benefit pension and Pension Adjustment affect RRSP room; advisor review recommended for accurate room and contribution strategy.',
  },

  // 8. Employer match not being maximized
  {
    id: 'employer_match',
    title: 'Capture your full employer match',
    category: 'registered',
    aiDecision: 'auto',
    scoreCompositionTemplate: [
      { label: 'Match capture', weight: 0.5 },
      { label: 'Contribution level', weight: 0.5 },
    ],
    fullReasoning: {
      warm: "Your employer is offering free money — a match on your retirement contributions — and you're not taking it. That's an instant 50–100% return before any investment growth. Most plans match 3–6% of salary; not maxing that is leaving thousands on the table every year. Bump your contribution to at least the match level. It's the highest-return move in most people's financial lives.",
      technical:
        'Employer match: typically 50–100% of employee contribution up to 3–6% of salary. Immediate, risk-free return. Vesting may apply; check plan terms. Optimal strategy: contribute at least to max match before other savings. Opportunity cost of not capturing: forgone match + compounding. Prioritize over additional TFSA/RRSP if match is available.',
    },
    oneLineSummary: {
      warm: "You're leaving employer match money on the table — that's free cash you can't get back.",
      technical: 'Employer match not maximized; immediate 50–100% return forfeited; prioritize to match threshold.',
    },
    whatIsBlocking: 'Contribution level below employer match threshold; free money not captured.',
    nextStep: 'Increase your group RRSP/pension contribution to at least the level that gets the full employer match.',
    advisorNoteDefault: null,
  },

  // 9. HELOC or mortgage vs investing decision
  {
    id: 'heloc_mortgage_vs_investing',
    title: 'Evaluate mortgage paydown vs investing',
    category: 'debt',
    aiDecision: 'human_required',
    scoreCompositionTemplate: [
      { label: 'Interest rate vs return', weight: 0.35 },
      { label: 'Risk tolerance', weight: 0.25 },
      { label: 'Goal alignment', weight: 0.2 },
      { label: 'Tax efficiency', weight: 0.2 },
    ],
    fullReasoning: {
      warm: "You've got a mortgage and you're thinking about investing. The math: if your mortgage rate is 6%, paying it down is a guaranteed 6% after-tax return. Investing might beat that over time, but it's not guaranteed. For most people, a mix makes sense — capture employer match and TFSA room first, then decide between extra mortgage payments and RRSP/TFSA based on your risk tolerance. The Smith Maneuver (borrowing to invest and deducting interest) exists but adds complexity and risk; it's not for everyone.",
      technical:
        'Mortgage paydown: guaranteed return = interest rate, after-tax. Investing: expected return higher but volatile; tax treatment varies (dividends, cap gains, interest). Opportunity cost: forgone investment growth vs interest saved. Smith Maneuver: HELOC used to invest in taxable account; interest deductible under 20(1)(c); requires discipline and risk tolerance. Compare: mortgage rate vs expected after-tax investment return; factor in risk and liquidity.',
    },
    oneLineSummary: {
      warm: "Paying down your mortgage is a guaranteed return; investing might beat it — but it depends on your risk tolerance and goals.",
      technical: 'Mortgage paydown vs investing: compare interest rate to expected after-tax return; Smith Maneuver is advanced strategy.',
    },
    whatIsBlocking: 'Trade-off between guaranteed debt paydown and uncertain investment returns; strategy unclear.',
    nextStep: 'Compare your mortgage rate to your expected after-tax investment return; prioritize employer match and TFSA, then decide based on risk tolerance.',
    advisorNoteDefault: null,
  },

  // 10. Tax refund inefficiency
  {
    id: 'tax_refund_inefficiency',
    title: 'Optimize your tax withholdings',
    category: 'tax',
    aiDecision: 'needs_approval',
    scoreCompositionTemplate: [
      { label: 'Refund size', weight: 0.4 },
      { label: 'Withholding efficiency', weight: 0.3 },
      { label: 'Cash flow impact', weight: 0.3 },
    ],
    fullReasoning: {
      warm: "A big tax refund feels great, but it means you've been lending the CRA your money interest-free all year. You could have had that cash in your pocket (or invested) instead. Options: adjust your TD1/TD1ON to reduce withholdings, or time RRSP contributions so you're not over-withheld. The goal is to owe a little or get a small refund — not to give the government an interest-free loan.",
      technical:
        'Large refund = over-withholding; opportunity cost of foregone investment/use of funds. CRA does not pay interest on overpayments during the year. Mitigation: file revised TD1 to reduce withholdings; time RRSP contributions (contribute in first 60 days to reduce prior-year liability vs spread through year). Target: near-zero refund/owing. Consider quarterly instalments if self-employed.',
    },
    oneLineSummary: {
      warm: "A big refund means you're lending the CRA money for free — adjust your withholdings and keep more cash during the year.",
      technical: 'Over-withholding creates interest-free loan to CRA; revise TD1 or time RRSP to optimize cash flow.',
    },
    whatIsBlocking: 'Excess tax withholdings; refund indicates overpayment and opportunity cost.',
    nextStep: 'Review your TD1 form with HR; consider reducing withholdings if you consistently get a large refund.',
    advisorNoteDefault: null,
  },

  // 11. Capital gains or investment income complexity
  {
    id: 'capital_gains_complexity',
    title: 'Review investment income and capital gains strategy',
    category: 'investment',
    aiDecision: 'human_required',
    scoreCompositionTemplate: [
      { label: 'ACB tracking', weight: 0.3 },
      { label: 'Institution complexity', weight: 0.35 },
      { label: 'Tax optimization', weight: 0.35 },
    ],
    fullReasoning: {
      warm: "You've got investments across multiple accounts and institutions — that makes tax reporting trickier. Adjusted cost base (ACB) tracking, superficial loss rules, and dividend vs capital gains treatment all matter. Getting this wrong can cost you at tax time or trigger CRA questions. An advisor or tax pro can help you sort through your slips and make sure you're not missing any optimizations or making reporting errors.",
      technical:
        'Multiple institutions: ACB must be tracked across accounts; superficial loss rules apply (30-day window). T3/T5 slips may be incomplete; capital gains reporting requires reconciliation. Tax-loss harvesting, dividend gross-up, and foreign withholding add complexity. Advisor recommended: multi-institution, multi-account scenarios warrant human review for accuracy and optimization.',
    },
    oneLineSummary: {
      warm: "Multiple investment accounts mean trickier tax reporting — an advisor can help you get it right.",
      technical: 'ACB tracking, superficial loss rules, multi-institution reporting; advisor review recommended.',
    },
    whatIsBlocking: 'Multiple institutions and account types; ACB and tax reporting complexity.',
    nextStep: 'Gather all T3/T5 slips and investment statements; consider advisor or tax pro for ACB reconciliation and optimization.',
    advisorNoteDefault:
      'Capital gains, investment income, and multi-institution complexity; advisor review recommended for ACB and tax optimization.',
  },

  // 12. Mat/pat leave income planning
  {
    id: 'mat_pat_leave',
    title: 'Optimize finances for parental leave',
    category: 'tax',
    aiDecision: 'needs_approval',
    scoreCompositionTemplate: [
      { label: 'Income drop timing', weight: 0.3 },
      { label: 'RRSP vs TFSA', weight: 0.35 },
      { label: 'EI + top-up', weight: 0.2 },
      { label: 'FHSA eligibility', weight: 0.15 },
    ],
    fullReasoning: {
      warm: "Mat or pat leave means a year of lower income — and that changes the math. EI plus any employer top-up is taxable, but your total income might drop into a lower bracket. That can make RRSP contributions less valuable (smaller deduction) and TFSA more attractive for flexibility. If you're buying a home after leave, FHSA still works — you have 15 years from opening. Run the numbers: contributing to RRSP in a low-income year might not beat TFSA, and you'll want cash accessible for baby expenses.",
      technical:
        'Parental leave: EI taxable; employer top-up taxable. Reduced income year: marginal rate lower; RRSP deduction value decreases. TFSA may be preferable for flexibility and tax efficiency. FHSA: eligibility unaffected; 15-year window. Strategy: maximize EI + top-up; prioritize TFSA for liquidity; defer RRSP if marginal rate is low. Consider income-splitting with spouse if applicable.',
    },
    oneLineSummary: {
      warm: "Lower income during leave changes the RRSP vs TFSA trade-off — TFSA might win for flexibility and tax efficiency.",
      technical: 'Reduced income year; RRSP deduction value lower; TFSA preferred for liquidity and efficiency; FHSA eligibility intact.',
    },
    whatIsBlocking: 'Income volatility during leave; optimal account choice (RRSP vs TFSA) unclear.',
    nextStep: 'Estimate your total taxable income for the leave year; compare RRSP deduction value to TFSA flexibility; prioritize liquidity for new expenses.',
    advisorNoteDefault: null,
  },
]

// =============================================================================
// Default AI Signals
// =============================================================================

export const defaultAISignals: AISignal[] = [
  {
    id: 'rrsp_deadline',
    type: 'deadline',
    severity: 'high',
    title: 'RRSP deadline is today — last chance',
    why: 'The 60-day window for prior-year RRSP contributions closes today, March 2. Any contributions made after today apply to the 2026 tax year only.',
    suggestedAction: 'Contribute today to claim the deduction on your 2025 tax return.',
    impact: '↑8% readiness potential',
  },
  {
    id: 'cash_drag',
    type: 'cash_drag',
    severity: 'high',
    title: 'Cash drag detected in your FHSA',
    why: 'Your FHSA balance is sitting uninvested. Cash misses tax-free compounding and loses purchasing power over time.',
    suggestedAction: 'Invest your FHSA balance in a growth portfolio matched to your timeline.',
    impact: '↑5% readiness potential',
  },
  {
    id: 'portfolio_drift',
    type: 'drift',
    severity: 'medium',
    title: 'Portfolio drift from target allocation',
    why: 'Market movements have shifted your equity/bond split beyond your target range, increasing your effective risk level.',
    suggestedAction: 'Rebalance to restore your target allocation.',
    impact: '↑3% readiness potential',
  },
  {
    id: 'tfsa_room',
    type: 'opportunity',
    severity: 'medium',
    title: 'Unused TFSA room detected',
    why: 'You have carry-forward TFSA contribution room that is generating no tax-free growth.',
    suggestedAction: 'Move available savings into your TFSA to shelter future growth from tax.',
    impact: '↑4% readiness potential',
  },
  {
    id: 'risk_mismatch',
    type: 'risk_mismatch',
    severity: 'low',
    title: 'Portfolio risk above your stated tolerance',
    why: 'Your current portfolio risk score slightly exceeds your stated comfort level, which may prompt reactive selling during downturns.',
    suggestedAction: 'Shift 5–10% of your portfolio toward lower-volatility assets.',
    impact: '↑2% readiness potential',
  },
]

// =============================================================================
// Day 30 State — shows how the AI system evolves over time
// =============================================================================

export const day30State: {
  overallScore: number
  trajectory: string
  completedMoveIds: string[]
  resolvedSignalCount: number
  signals: AISignal[]
  extraMoves: NextMove[]
} = {
  overallScore: 74,
  trajectory: '↑ +16.2% since you started · AI learns from your patterns',
  completedMoveIds: ['fhsa_opportunity', 'employer_match'],
  resolvedSignalCount: 2,
  signals: [
    {
      id: 'portfolio_drift',
      type: 'drift',
      severity: 'medium',
      title: 'Portfolio drift from target allocation',
      why: 'Market movements have shifted your equity/bond split beyond your target range, increasing your effective risk level.',
      suggestedAction: 'Rebalance to restore your target allocation.',
      impact: '↑3% readiness potential',
    },
    {
      id: 'risk_mismatch',
      type: 'risk_mismatch',
      severity: 'medium',
      title: 'Portfolio risk above your stated tolerance',
      why: 'Your current portfolio risk score slightly exceeds your stated comfort level, which may prompt reactive selling during downturns.',
      suggestedAction: 'Shift 5–10% of your portfolio toward lower-volatility assets.',
      impact: '↑2% readiness potential',
    },
    {
      id: 'new_contribution_room',
      type: 'opportunity',
      severity: 'low',
      title: 'New TFSA room available in 2026',
      why: 'The 2026 TFSA limit increased by $7,000. Based on your cash flow patterns the AI detected over the past 30 days, you likely have capacity to contribute $400/month without affecting your spending.',
      suggestedAction: 'Set up a $400/month automatic contribution to your TFSA.',
      impact: '↑4% readiness potential',
    },
  ],
  extraMoves: [
    {
      id: 'automate_tfsa',
      title: 'Automate your TFSA contributions',
      category: 'registered',
      aiDecision: 'auto',
      readinessScore: 88,
      confidenceState: 'ready',
      isUrgent: false,
      isCompleted: false,
      scoreComposition: [
        { label: 'Contribution optimization', score: 92, weight: 0.4 },
        { label: 'Tax efficiency', score: 88, weight: 0.35 },
        { label: 'Timeline alignment', score: 82, weight: 0.25 },
      ],
      oneLineSummary: 'AI detected consistent monthly cash surplus — automate it before lifestyle creep absorbs it.',
      fullReasoning: 'Over the past 30 days the AI observed your account patterns and identified a recurring $400–600 surplus after expenses. This is exactly the kind of signal that\'s invisible without continuous monitoring. Automating now locks in the behaviour before spending patterns shift.',
      whatIsBlocking: 'Nothing — this is ready to action immediately.',
      nextStep: 'Set up $400/month auto-deposit to TFSA starting next pay cycle.',
      advisorNote: null,
      whatChanged: 'New signal — detected from 30 days of account observation',
    },
  ],
}
