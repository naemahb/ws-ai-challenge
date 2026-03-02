import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

type MoveInput = {
  id: string
  title: string
  readinessScore: number
  isUrgent: boolean
  scoreComposition: { label: string; score: number }[]
}

type ProfileInput = {
  incomeRange: string
  primaryGoal: string
  timeline: string
  ageRange: string
  accounts: string[]
  debts: string[]
  employmentType: string
  taxResult?: string | null
  ownsHome?: boolean | null
  hasPension?: string | null
  expectedIncomeChange?: string[] | null
}

export async function POST(req: NextRequest) {
  const { profile, moves }: { profile: ProfileInput; moves: MoveInput[] } = await req.json()

  const profileSummary = [
    `Income: ${profile.incomeRange}`,
    `Goal: ${profile.primaryGoal}`,
    `Timeline: ${profile.timeline}`,
    `Age: ${profile.ageRange}`,
    `Accounts: ${profile.accounts.join(', ') || 'none'}`,
    `Debts: ${profile.debts.join(', ') || 'none'}`,
    `Employment: ${profile.employmentType}`,
    profile.taxResult ? `Last tax return: ${profile.taxResult}` : null,
    profile.ownsHome != null ? `Owns home: ${profile.ownsHome}` : null,
    profile.hasPension ? `Pension: ${profile.hasPension}` : null,
    profile.expectedIncomeChange?.length ? `Expected changes: ${profile.expectedIncomeChange.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const movesText = moves
    .map(
      (m) =>
        `- ID: ${m.id} | Title: "${m.title}" | Readiness: ${m.readinessScore}% | Urgent: ${m.isUrgent} | Factors: ${m.scoreComposition.map((f) => `${f.label} (${f.score}%)`).join(', ')}`
    )
    .join('\n')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are an AI financial advisor assistant. Given a user's financial profile and a set of recommended financial moves, write a single compelling one-line summary for each move that is specific to this user's situation.

Each summary should:
- Be 10-15 words maximum
- Reference something specific from their profile (income, goal, accounts, or situation)
- Sound like insight, not a generic description
- Be direct and concrete — no filler words

User profile:
${profileSummary}

Recommended moves:
${movesText}

Respond with a JSON object where keys are move IDs and values are the one-line summaries. Example format:
{"move_id": "Your specific one-line summary here."}

Only return valid JSON, nothing else.`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'

  try {
    const summaries = JSON.parse(text)
    return NextResponse.json({ summaries })
  } catch {
    return NextResponse.json({ summaries: {} })
  }
}
