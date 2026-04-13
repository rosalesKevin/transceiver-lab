import type { ReactNode } from 'react'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="block font-mono font-medium text-2xs tracking-[0.18em] uppercase text-t3">
        {label}
      </label>
      {children}
      {hint && <p className="text-2xs text-t3 font-mono leading-relaxed">{hint}</p>}
    </div>
  )
}
