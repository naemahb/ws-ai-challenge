'use client'

import { motion } from 'framer-motion'
import { tokens } from '@/lib/tokens'

type OptionCardProps = {
  label: string
  subtext: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function OptionCard({
  label,
  subtext,
  icon,
  onClick,
  variant = 'primary',
}: OptionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 rounded-card flex items-start gap-3"
      style={{
        backgroundColor: variant === 'primary' ? tokens.colors.surface : tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
      }}
      whileTap={{ scale: 0.99 }}
    >
      {icon && (
        <div
          className="flex-shrink-0 w-6 h-6 rounded"
          style={{ backgroundColor: tokens.colors.foregroundMuted }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div
          className="font-medium"
          style={{ fontSize: tokens.typography.scale.base, color: tokens.colors.foreground }}
        >
          {label}
        </div>
        <div
          className="mt-1"
          style={{ fontSize: tokens.typography.scale.sm, color: tokens.colors.foregroundMuted }}
        >
          {subtext}
        </div>
      </div>
    </motion.button>
  )
}
