import React from 'react';
import { motion } from 'framer-motion';
import { Card, Rank, Suit } from '../../shared/types.js';

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  isWinningCard?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<Suit, { text: string; bg: string }> = {
  hearts: { text: 'text-red-500', bg: 'bg-red-500/10' },
  diamonds: { text: 'text-red-500', bg: 'bg-red-500/10' },
  clubs: { text: 'text-slate-800', bg: 'bg-slate-500/10' },
  spades: { text: 'text-slate-800', bg: 'bg-slate-500/10' },
};

const RANK_LABELS: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  isWinningCard = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-12 text-xs rounded',
    md: 'w-12 h-18 text-sm rounded-md',
    lg: 'w-16 h-24 text-base rounded-lg',
  }[size];

  // If card is face-down or no card provided
  if (faceDown || !card) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`relative ${sizeClasses} bg-discord-blurple/90 border border-indigo-400/30 shadow-md flex items-center justify-center overflow-hidden select-none ${className}`}
      >
        {/* Subtle geometric pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#4752c4_1px,transparent_1px)] [background-size:6px_6px] opacity-70" />
        <div className="w-5 h-7 rounded border border-white/20 bg-indigo-900/40 flex items-center justify-center">
          <span className="text-white/40 text-[10px] font-bold">♠</span>
        </div>
      </motion.div>
    );
  }

  const { suit, rank } = card;
  const label = RANK_LABELS[rank] || String(rank);
  const symbol = SUIT_SYMBOLS[suit];
  const { text: colorClass } = SUIT_COLORS[suit];

  return (
    <motion.div
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`relative ${sizeClasses} bg-white text-slate-900 border ${
        isWinningCard ? 'border-yellow-400 ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900' : 'border-slate-300'
      } shadow-md flex flex-col justify-between p-1 font-semibold select-none ${className}`}
    >
      {/* Top Left */}
      <div className={`flex flex-col items-center leading-none ${colorClass}`}>
        <span className="text-[11px] font-bold tracking-tight">{label}</span>
        <span className="text-[10px]">{symbol}</span>
      </div>

      {/* Center Suit */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none opacity-85 text-xl ${colorClass}`}>
        {symbol}
      </div>

      {/* Bottom Right Inverted */}
      <div className={`flex flex-col items-center leading-none rotate-180 self-end ${colorClass}`}>
        <span className="text-[11px] font-bold tracking-tight">{label}</span>
        <span className="text-[10px]">{symbol}</span>
      </div>
    </motion.div>
  );
};
