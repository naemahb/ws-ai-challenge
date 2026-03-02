'use client'

import { motion } from 'framer-motion'

type TimeToggleProps = {
  value: 'day1' | 'day30'
  onChange: (v: 'day1' | 'day30') => void
}

export function TimeToggle({ value, onChange }: TimeToggleProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
      <div
        style={{
          backgroundColor: '#EDEAE3',
          borderRadius: '9999px',
          padding: '4px',
          display: 'inline-flex',
          position: 'relative',
        }}
      >
        {(['day1', 'day30'] as const).map((tab) => {
          const isActive = value === tab
          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              style={{
                position: 'relative',
                padding: '8px 24px',
                borderRadius: '9999px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#1A1A1A' : '#888',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'color 0.15s',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="time-toggle-pill"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '9999px',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              {tab === 'day1' ? (
                'Day 1'
              ) : (
                <>
                  Day 30{' '}
                  <span style={{ color: '#3D7A5C', fontSize: '12px', lineHeight: 1 }}>✦</span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
