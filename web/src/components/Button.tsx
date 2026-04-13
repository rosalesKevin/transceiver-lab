import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'danger' | 'ghost' | 'outline' | 'amber'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'xs' | 'sm' | 'md'
  children: ReactNode
}

export function Button({ variant = 'outline', size = 'md', children, className = '', ...props }: Props) {
  const base = 'inline-flex items-center gap-1.5 font-mono font-medium tracking-widest uppercase transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed select-none'

  const sizes = {
    xs: 'px-2 py-0.5 text-2xs',
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-1.5 text-xs',
  }

  const variants: Record<Variant, string> = {
    primary: [
      'bg-transparent text-amber border border-amber/50',
      'hover:bg-amber/8 hover:border-amber hover:shadow-glow-amber',
      'active:scale-[0.97]',
    ].join(' '),
    danger: [
      'bg-transparent text-red border border-red/40',
      'hover:bg-red/8 hover:border-red hover:shadow-glow-red',
      'active:scale-[0.97]',
    ].join(' '),
    amber: [
      'bg-transparent text-amber border border-amber/40',
      'hover:bg-amber/10 hover:border-amber/70',
      'active:scale-[0.97]',
    ].join(' '),
    outline: [
      'bg-transparent text-t2 border border-b1',
      'hover:text-t1 hover:border-b2',
      'active:scale-[0.97]',
    ].join(' '),
    ghost: [
      'bg-transparent text-t2 border border-transparent',
      'hover:text-t1 hover:bg-raised',
      'active:scale-[0.97]',
    ].join(' '),
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
