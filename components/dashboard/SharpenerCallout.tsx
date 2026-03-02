'use client'

import { motion } from 'framer-motion'

type SharpenerCalloutProps = {
  answeredPoints: number
  totalPoints: number
  missingCount: number
  onOpen: () => void
}

export function SharpenerCallout({
  onOpen,
}: SharpenerCalloutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1.5px solid #C17F3A',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: '32px',
      }}
    >
      {/* Title */}
      <p
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#1A1A1A',
        }}
      >
        My recommendations have gaps
      </p>

      {/* Badge — own row */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: '#FDF6EE',
          color: '#C17F3A',
          fontSize: '12px',
          fontWeight: 500,
          borderRadius: '9999px',
          padding: '3px 8px',
          marginTop: '8px',
        }}
      >
        4 data points missing
      </span>

      {/* Body */}
      <p
        style={{
          fontSize: '14px',
          color: '#6B6B6B',
          lineHeight: '1.5',
          marginTop: '8px',
        }}
      >
        I&apos;m missing details that would change what I surface for you.
      </p>

      {/* CTA */}
      <button
        onClick={onOpen}
        style={{
          display: 'block',
          width: '100%',
          height: '40px',
          backgroundColor: '#1A1A1A',
          border: 'none',
          borderRadius: '9999px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'white',
          cursor: 'pointer',
          marginTop: '16px',
        }}
      >
        Fill the gaps →
      </button>
    </motion.div>
  )
}
