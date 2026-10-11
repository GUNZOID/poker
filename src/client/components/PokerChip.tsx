import React from 'react';

interface PokerChipProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const PokerChip: React.FC<PokerChipProps> = ({
  amount,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  // Determine color based on amount
  let bgGradient = 'from-blue-600 to-blue-800 border-blue-400';
  let textColor = 'text-white';

  if (amount >= 1000) {
    bgGradient = 'from-amber-500 to-yellow-600 border-amber-300';
  } else if (amount >= 500) {
    bgGradient = 'from-purple-600 to-indigo-800 border-purple-400';
  } else if (amount >= 100) {
    bgGradient = 'from-zinc-800 to-neutral-900 border-zinc-500';
  } else if (amount >= 50) {
    bgGradient = 'from-emerald-600 to-green-800 border-emerald-400';
  } else if (amount >= 20) {
    bgGradient = 'from-rose-600 to-red-800 border-rose-400';
  }

  const sizeClasses = {
    sm: 'w-4 h-4 text-[9px] border',
    md: 'w-6 h-6 text-[10px] border-[1.5px]',
    lg: 'w-8 h-8 text-xs border-2',
  }[size];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div
        className={`relative ${sizeClasses} rounded-full bg-gradient-to-br ${bgGradient} shadow-chip flex items-center justify-center font-bold flex-shrink-0 select-none`}
      >
        <div className="w-[60%] h-[60%] rounded-full border border-dashed border-white/40 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-white/70" />
        </div>
      </div>
      {showLabel && (
        <span className={`font-semibold tracking-tight ${textColor} text-xs`}>
          {amount.toLocaleString()}
        </span>
      )}
    </div>
  );
};
