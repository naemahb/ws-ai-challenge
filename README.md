**WS AI Challenge — Personal Finance AI Assistant**

Live prototype: ws-ai-challenge.vercel.app
Walkthrough: Loom demo
Built for: Wealthsimple AI Builders Challenge

**What this is**
A regular Canadian can now manage a complex multi-institution financial picture — RRSP, TFSA, FHSA, workplace pension, outstanding debt — and get a ranked, personalized action plan in under two minutes.
No advisor. No financial literacy beyond knowing what accounts they hold.
One person can now do what previously required either expensive professional guidance or years of self-education.

**How it works**

The scoring engine
A rule-based engine evaluates your full financial picture across all accounts (not just Wealthsimple) and ranks every possible financial move by readiness and urgency. It continuously monitors for drift, upcoming deadlines, and optimization gaps.

**The AI layer**

The Claude API generates a personalized sentence for each ranked move — not a generic description, but a specific articulation of why this action matters for your situation right now. This is the difference between a to-do list and a financial advisor.

**Autonomous execution**

For pre-authorized, low-complexity moves, the system acts without prompting: opening accounts, setting up automatic contributions, flagging contribution room. It tracks completed actions and recalibrates your readiness score in real time.

**Human-in-the-loop**

The one decision that stays human: whether to act at all.
The system can rank moves, score readiness, flag urgency, and articulate why something matters. But it can't know what's actually happening in someone's life. A person might have a 94% readiness score on an RRSP contribution and still have a good reason not to act — a job change coming, a family situation, something they haven't told the app.
No scoring engine can account for that. The human decision isn't what to do. It's whether now is actually the right time given context the system can't see.


**Design philosophy**

This project is built around a core principle in AI product design: automation should reduce cognitive load, not replace judgment.
The AI earns trust by being specific, not just helpful. Generic advice ("maximize your TFSA") is noise. Personalized advice ("you have $14,500 of TFSA room and your contribution deadline is 60 days away") is signal. The gap between those two is where this product lives.
The human-in-the-loop boundary was the hardest design decision. I deliberately kept the final action decision with the user — not because the AI can't execute, but because the AI can't know what it doesn't know. That epistemic humility is what makes the system trustworthy.


**Tech stack**
TypeScript — full-stack
Claude API (Anthropic) — personalized action generation
Vercel — deployment
Built with Claude + Cursor (vibe-coded)


Why this matters
The average Canadian doesn't have a financial advisor. They have a bank app and anxiety. This prototype shows that AI can close that gap — not by replacing human judgment, but by doing the monitoring, ranking, and articulation work that currently requires either professional help or significant personal finance expertise.
The design challenge isn't technical. It's knowing exactly where the AI should stop and the human should begin.
