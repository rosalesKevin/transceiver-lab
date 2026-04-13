import type { ReactNode } from 'react'
import type { MessageFormat, SessionState } from '../lib/types'

const formatCfg: Record<string, { color: string; bg: string; border: string; label: string }> = {
  cot:     { color: '#44aaff', bg: 'rgba(68,170,255,0.07)',   border: 'rgba(68,170,255,0.25)',  label: 'CoT'  },
  json:    { color: '#ffb000', bg: 'rgba(255,176,0,0.07)',    border: 'rgba(255,176,0,0.25)',   label: 'JSON' },
  vmf:     { color: '#ff2244', bg: 'rgba(255,34,68,0.07)',    border: 'rgba(255,34,68,0.25)',   label: 'VMF'  },
  raw:     { color: '#a07af0', bg: 'rgba(160,122,240,0.07)', border: 'rgba(160,122,240,0.25)', label: 'RAW'  },
  unknown: { color: '#383838', bg: 'rgba(56,56,56,0.07)',     border: 'rgba(56,56,56,0.25)',    label: '???'  },
}

export function FormatBadge({ format }: { format: MessageFormat | string }) {
  const cfg = formatCfg[format] ?? formatCfg.unknown
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 font-mono text-2xs font-medium tracking-widest uppercase"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

const stateCfg: Record<SessionState, { dot: string; label: string; color: string }> = {
  idle:    { dot: 'idle-dot',    label: 'IDLE',    color: '#383838' },
  running: { dot: 'running-dot', label: 'LIVE',    color: '#00ff87' },
  paused:  { dot: 'paused-dot',  label: 'PAUSED',  color: '#ffb000' },
  stopped: { dot: 'stopped-dot', label: 'STOPPED', color: '#ff2244' },
}

export function StateBadge({ state }: { state: SessionState }) {
  const cfg = stateCfg[state]
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-2xs font-medium tracking-widest uppercase" style={{ color: cfg.color }}>
      <span className={cfg.dot} />
      {cfg.label}
    </span>
  )
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 font-mono text-2xs tracking-wide border border-b1 text-t2 ${className}`}>
      {children}
    </span>
  )
}
