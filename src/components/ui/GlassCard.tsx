import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: 1 | 2 | 3;
  interactive?: boolean;
  glow?: 'none' | 'emerald' | 'gold';
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  level = 1,
  interactive = false,
  glow = 'none',
  children,
  className = '',
  ...rest
}) => {
  const levelClass =
    level === 1
      ? 'surface-glass-1'
      : level === 2
      ? 'surface-glass-2'
      : 'surface-glass-modal';

  const glowClass =
    glow === 'emerald' ? 'linear-glow' : glow === 'gold' ? 'gold-glow' : '';

  const interactiveClass = interactive
    ? 'hover:border-white/[0.18] hover:translate-y-[-1px] cursor-pointer active:scale-[0.99] transition-all duration-150'
    : '';

  return (
    <div
      className={`rounded-2xl p-4 text-neutral-200 relative overflow-hidden ${levelClass} ${glowClass} ${interactiveClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
