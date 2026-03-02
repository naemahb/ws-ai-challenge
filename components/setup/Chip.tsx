'use client'

import { motion } from 'framer-motion'
import { tokens } from '@/lib/tokens'

type ChipProps = {
  label: string
  selected: boolean
  onSelect: () => void
}

export function Chip({ label, selected, onSelect }: ChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
      style={{
        backgroundColor: selected ? tokens.colors.accent : 'white',
        color: selected ? tokens.colors.accentForeground : tokens.colors.foreground,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radius.pill,
      }}
      whileTap={{ scale: 0.98 }}
    >
      {label}
    </motion.button>
  )
}
