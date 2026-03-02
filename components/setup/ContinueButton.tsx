'use client'

import { motion } from 'framer-motion'
import { tokens } from '@/lib/tokens'

type ContinueButtonProps = {
  onClick: () => void
  disabled?: boolean
}

export function ContinueButton({ onClick, disabled }: ContinueButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-3 rounded-full font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: tokens.colors.accent,
        color: tokens.colors.accentForeground,
        borderRadius: tokens.radius.pill,
      }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      Continue
    </motion.button>
  )
}
