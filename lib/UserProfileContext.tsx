'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { UserProfile, NextMove } from './mockData'

// =============================================================================
// Form state types (internal)
// =============================================================================

export type SetupFormState = {
  accounts: string[]
  institutions: string[]
  otherInstitution: string
  debts: string[]
  employmentType: string | null
  employerMatch: 'yes' | 'no' | 'not_sure' | null
  incomeRange: string | null
  ageRange: string | null
  primaryGoal: string | null
  timeline: string | null
  confidenceLevel: number | null
}

const initialFormState: SetupFormState = {
  accounts: [],
  institutions: [],
  otherInstitution: '',
  debts: [],
  employmentType: null,
  employerMatch: null,
  incomeRange: null,
  ageRange: null,
  primaryGoal: null,
  timeline: null,
  confidenceLevel: null,
}

// =============================================================================
// Context
// =============================================================================

type UserProfileContextValue = {
  formState: SetupFormState
  updateForm: (updates: Partial<SetupFormState>) => void
  getProfile: () => UserProfile
  resetForm: () => void
  nextMoves: NextMove[]
  setNextMoves: (moves: NextMove[]) => void
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null)

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [formState, setFormState] = useState<SetupFormState>(initialFormState)
  const [nextMoves, setNextMoves] = useState<NextMove[]>([])

  const updateForm = useCallback((updates: Partial<SetupFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetForm = useCallback(() => {
    setFormState(initialFormState)
  }, [])

  const getProfile = useCallback((): UserProfile => {
    const s = formState

    // Derive hasPension from accounts
    let hasPension: UserProfile['hasPension'] = 'none'
    if (s.accounts.includes('pension_db')) hasPension = 'defined_benefit'
    else if (s.accounts.includes('pension_dc')) hasPension = 'defined_contribution'

    const accounts = s.accounts.filter(
      (a) => !['pension_db', 'pension_dc', 'none'].includes(a)
    )

    const accountProviders = s.institutions.filter((p) => p !== 'none')
    const employmentType = (s.employmentType as UserProfile['employmentType']) ?? 'employed'
    const employerMatch = s.employerMatch === 'yes'
    const incomeRange = (s.incomeRange as UserProfile['incomeRange']) ?? '50_100k'
    const ageRange = (s.ageRange as UserProfile['ageRange']) ?? '30s'
    const primaryGoal = (s.primaryGoal as UserProfile['primaryGoal']) ?? 'build_wealth'
    const timeline = (s.timeline as UserProfile['timeline']) ?? '5_10yr'

    return {
      accounts,
      accountProviders,
      debts: s.debts.filter((d) => d !== 'none'),
      employmentType,
      hasPension,
      employerMatch,
      incomeRange,
      ageRange,
      primaryGoal,
      timeline,
      confidenceLevel: s.confidenceLevel ?? 3,
      otherInstitution: s.otherInstitution || undefined,
    }
  }, [formState])

  const value = useMemo(
    () => ({ formState, updateForm, getProfile, resetForm, nextMoves, setNextMoves }),
    [formState, updateForm, getProfile, resetForm, nextMoves, setNextMoves]
  )

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext)
  if (!ctx) {
    throw new Error('useUserProfile must be used within UserProfileProvider')
  }
  return ctx
}
