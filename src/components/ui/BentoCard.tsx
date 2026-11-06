import React from 'react';
import { GlassCard } from './GlassCard';

export interface BentoCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trendText?: string;
  trendPositive?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  label,
  value,
  subValue,
  icon,
  iconBg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  trendText,
  trendPositive,
  onClick,
  className = '',
  children
}) => {
  return (
    <GlassCard
      level={1}
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={`flex flex-col justify-between gap-3 p-4 select-none ${className}`}
    >
      {/* Top Row: Icon & Label */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}
          >
            {icon}
          </div>
          <span className="text-xs font-semibold text-neutral-400 truncate">
            {label}
          </span>
        </div>

        {trendText && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium border shrink-0 ${
              trendPositive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
            }`}
          >
            {trendText}
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
          {value}
        </span>
        {subValue && (
          <span className="text-xs font-medium text-neutral-400 truncate">
            {subValue}
          </span>
        )}
      </div>

      {/* Optional Custom Slots (e.g., sparklines, progress bars) */}
      {children && <div className="mt-1">{children}</div>}
    </GlassCard>
  );
};
