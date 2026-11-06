import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400/30',
  secondary:
    'bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.12] shadow-sm',
  outline:
    'bg-transparent hover:bg-white/[0.06] text-emerald-400 border border-emerald-500/40 hover:border-emerald-500',
  danger:
    'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40',
  ghost:
    'bg-transparent hover:bg-white/[0.05] text-neutral-300 hover:text-white'
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'min-h-[48px] px-4 py-2.5 text-xs font-semibold rounded-xl gap-2', // Standard 48dp target
  lg: 'min-h-[56px] px-6 py-3.5 text-sm font-bold rounded-2xl gap-2.5'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading}
        className={`inline-flex items-center justify-center font-medium select-none focus-ring active:scale-[0.98] transition-all duration-150 ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${
          isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        } ${className}`}
        {...rest}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
