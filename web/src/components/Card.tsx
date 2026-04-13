import type { ReactNode } from 'react'

// Panel with terminal-style title cutout in top border
interface PanelProps {
  title?: ReactNode
  children: ReactNode
  className?: string
  headerRight?: ReactNode
  accent?: 'amber' | 'green' | 'red' | 'none'
}

const accentMap = {
  amber: 'border-l-amber/70',
  green: 'border-l-green/70',
  red:   'border-l-red/70',
  none:  'border-l-b1',
}

export function Panel({ title, children, className = '', headerRight, accent = 'none' }: PanelProps) {
  return (
    <div className={`relative border border-b1 border-l-2 ${accentMap[accent]} bg-surface ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-b1">
          <span className="font-mono font-medium text-2xs tracking-[0.2em] uppercase text-amber">
            {title}
          </span>
          {headerRight && (
            <span className="font-mono text-2xs text-t3">{headerRight}</span>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

export function PanelBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>
}

// Legacy aliases for backward compat with existing pages
export function Card({ children, className = '', accent }: {
  children: ReactNode; className?: string; accent?: 'cyan' | 'green' | 'amber' | 'red' | 'none'
}) {
  const legacyAccent: Record<string, 'amber' | 'green' | 'red' | 'none'> = {
    cyan: 'amber', green: 'green', amber: 'amber', red: 'red', none: 'none',
  }
  return (
    <div className={`border border-b1 border-l-2 ${accentMap[legacyAccent[accent ?? 'none'] ?? 'none']} bg-surface ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b border-b1 ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono font-medium text-2xs tracking-[0.2em] uppercase text-amber">
      {children}
    </span>
  )
}
