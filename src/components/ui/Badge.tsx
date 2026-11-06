import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple' | 'gold' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, { bg: string; dot: string }> = {
  emerald: {
    bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    dot: 'bg-emerald-400'
  },
  amber: {
    bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    dot: 'bg-amber-400'
  },
  rose: {
    bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
    dot: 'bg-rose-400'
  },
  cyan: {
    bg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    dot: 'bg-cyan-400'
  },
  purple: {
    bg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    dot: 'bg-purple-400'
  },
  gold: {
    bg: 'bg-amber-400/20 border-amber-400/40 text-amber-200',
    dot: 'bg-amber-300'
  },
  neutral: {
    bg: 'bg-white/[0.06] border-white/[0.1] text-neutral-300',
    dot: 'bg-neutral-400'
  }
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'text-[10px] px-2 py-0.5 rounded-md gap-1',
  md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5'
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'emerald',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  className = '',
  ...rest
}) => {
  const selected = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center font-medium border shrink-0 select-none ${selected.bg} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected.dot} ${
            pulse ? 'animate-pulse' : ''
          }`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
