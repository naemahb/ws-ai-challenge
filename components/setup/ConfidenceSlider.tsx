'use client'

import { useState, useCallback } from 'react'
import { tokens } from '@/lib/tokens'

type ConfidenceSliderProps = {
  value: number
  onChange: (value: number) => void
  onComplete: () => void
}

export function ConfidenceSlider({
  value,
  onChange,
  onComplete,
}: ConfidenceSliderProps) {
  const [hasMoved, setHasMoved] = useState(false)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10)
      onChange(v)
      if (!hasMoved) {
        setHasMoved(true)
        setTimeout(onComplete, 800)
      }
    },
    [onChange, onComplete, hasMoved]
  )

  return (
    <div className="w-full">
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={handleChange}
        className="w-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${tokens.colors.foreground} 0%, ${tokens.colors.foreground} ${((value - 1) / 4) * 100}%, ${tokens.colors.border} ${((value - 1) / 4) * 100}%, ${tokens.colors.border} 100%)`,
        }}
      />
      <div className="flex justify-between mt-2" style={{ fontSize: tokens.typography.scale.xs, color: tokens.colors.foregroundMuted }}>
        <span>Pretty lost</span>
        <span>On top of it</span>
      </div>
    </div>
  )
}
