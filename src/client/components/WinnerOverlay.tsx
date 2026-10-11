import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import { HandWinner } from '../../shared/types.js';
import { PlayingCard } from './PlayingCard.js';
import { sounds } from '../sound.js';

interface WinnerOverlayProps {
  winners: HandWinner[] | null;
}

export const WinnerOverlay: React.FC<WinnerOverlayProps> = ({ winners }) => {
  useEffect(() => {
    if (winners && winners.length > 0) {
      sounds.playWin();
    }
  }, [winners]);

  if (!winners || winners.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-lg w-[90%] bg-discord-dark/95 border border-yellow-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-yellow-400 animate-bounce" />
          <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide uppercase">
            {winners.length > 1 ? 'Split Pot!' : 'Hand Winner!'}
          </h3>
          <Sparkles className="w-4 h-4 text-yellow-400" />
        </div>

        <div className="space-y-3">
          {winners.map((w, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div className="text-xs sm:text-sm font-semibold text-slate-200">
                <span className="text-yellow-400 font-bold text-base mr-1">{w.name}</span>
                <span>won</span>{' '}
                <span className="font-mono font-extrabold text-emerald-400 text-sm">
                  +{w.amount.toLocaleString()} chips
                </span>{' '}
                <span className="text-slate-400">({w.handName})</span>
              </div>

              {w.cards && w.cards.length > 0 && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  {w.cards.map((c) => (
                    <PlayingCard key={c.id} card={c} size="sm" isWinningCard />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
