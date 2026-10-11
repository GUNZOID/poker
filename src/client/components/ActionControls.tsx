import React, { useState, useEffect } from 'react';
import { ActionType, AvailableActions, Player } from '../../shared/types.js';
import { sounds } from '../sound.js';

interface ActionControlsProps {
  player: Player;
  isMyTurn: boolean;
  actions: AvailableActions;
  currentHighBet: number;
  totalPot: number;
  bigBlind: number;
  onAction: (action: ActionType, amount?: number) => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  player,
  isMyTurn,
  actions,
  currentHighBet,
  totalPot,
  bigBlind,
  onAction,
}) => {
  const {
    canFold,
    canCheck,
    canCall,
    callAmount,
    canBet,
    minBet,
    maxBet,
    canRaise,
    minRaise,
    maxRaise,
    canAllIn,
    allInAmount,
  } = actions;

  const minSlider = canBet ? minBet : canRaise ? minRaise : 0;
  const maxSlider = canBet ? maxBet : canRaise ? maxRaise : player.chips + player.currentBet;

  const [betAmount, setBetAmount] = useState<number>(minSlider);

  // Synchronize default slider value when turn starts
  useEffect(() => {
    if (isMyTurn) {
      setBetAmount(minSlider);
      sounds.playTurn();
    }
  }, [isMyTurn, minSlider]);

  if (!isMyTurn) {
    return (
      <div className="bg-discord-dark/95 border-t border-discord-light/30 px-4 py-3 text-center text-xs text-slate-400 select-none">
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
          <span>Waiting for other players to act...</span>
        </div>
      </div>
    );
  }

  const handleFold = () => {
    sounds.playFold();
    onAction('fold');
  };

  const handleCheck = () => {
    sounds.playCheck();
    onAction('check');
  };

  const handleCall = () => {
    sounds.playChips();
    onAction('call');
  };

  const handleBetOrRaise = () => {
    sounds.playChips();
    if (canBet) {
      onAction('bet', betAmount);
    } else if (canRaise) {
      onAction('raise', betAmount);
    }
  };

  const handleAllIn = () => {
    sounds.playChips();
    onAction('all-in');
  };

  // Shortcut setters
  const setMinBet = () => setBetAmount(minSlider);
  const set2x = () => {
    const val = canBet ? bigBlind * 2 : currentHighBet * 2;
    setBetAmount(Math.min(maxSlider, Math.max(minSlider, val)));
  };
  const set3x = () => {
    const val = canBet ? bigBlind * 3 : currentHighBet * 3;
    setBetAmount(Math.min(maxSlider, Math.max(minSlider, val)));
  };
  const setHalfPot = () => {
    const val = Math.floor(totalPot / 2) + currentHighBet;
    setBetAmount(Math.min(maxSlider, Math.max(minSlider, val)));
  };
  const setFullPot = () => {
    const val = totalPot + currentHighBet;
    setBetAmount(Math.min(maxSlider, Math.max(minSlider, val)));
  };
  const setMax = () => setBetAmount(maxSlider);

  const canCommitWager = canBet || canRaise;

  return (
    <div className="bg-discord-dark/95 border-t border-discord-light/40 px-3 py-2.5 sm:px-6 sm:py-3 shadow-2xl backdrop-blur-md select-none">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Slider & Quick Bet Presets (if betting or raising is possible) */}
        {canCommitWager && (
          <div className="w-full sm:w-1/2 flex flex-col gap-1.5 order-2 sm:order-1">
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={setMinBet}
                className="px-2 py-1 rounded bg-discord-lighter hover:bg-discord-light text-slate-300 font-semibold transition-colors"
              >
                Min
              </button>
              <button
                type="button"
                onClick={set2x}
                className="px-2 py-1 rounded bg-discord-lighter hover:bg-discord-light text-slate-300 font-semibold transition-colors"
              >
                2x
              </button>
              <button
                type="button"
                onClick={set3x}
                className="px-2 py-1 rounded bg-discord-lighter hover:bg-discord-light text-slate-300 font-semibold transition-colors"
              >
                3x
              </button>
              <button
                type="button"
                onClick={setHalfPot}
                className="px-2 py-1 rounded bg-discord-lighter hover:bg-discord-light text-slate-300 font-semibold transition-colors"
              >
                1/2 Pot
              </button>
              <button
                type="button"
                onClick={setFullPot}
                className="px-2 py-1 rounded bg-discord-lighter hover:bg-discord-light text-slate-300 font-semibold transition-colors"
              >
                Pot
              </button>
              <button
                type="button"
                onClick={setMax}
                className="px-2 py-1 rounded bg-discord-lighter hover:bg-discord-light text-amber-400 font-semibold transition-colors"
              >
                Max
              </button>
            </div>

            {/* Range Slider & Manual Input */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={minSlider}
                max={maxSlider}
                step={bigBlind / 2 || 5}
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="flex-1 accent-discord-blurple h-1.5 bg-discord-darkest rounded-lg cursor-pointer"
              />
              <div className="flex items-center px-2 py-1 rounded bg-discord-darkest border border-discord-light/40 text-xs font-mono font-bold text-amber-300 min-w-[70px] justify-center">
                ${betAmount}
              </div>
            </div>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
          {/* Fold */}
          {canFold && (
            <button
              onClick={handleFold}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-discord-red/20 hover:bg-discord-red/35 active:scale-[0.98] text-red-400 font-bold text-xs sm:text-sm border border-discord-red/30 transition-all cursor-pointer"
            >
              Fold
            </button>
          )}

          {/* Check */}
          {canCheck && (
            <button
              onClick={handleCheck}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-discord-lighter hover:bg-discord-light active:scale-[0.98] text-slate-200 font-bold text-xs sm:text-sm border border-discord-light transition-all cursor-pointer"
            >
              Check
            </button>
          )}

          {/* Call */}
          {canCall && (
            <button
              onClick={handleCall}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-discord-green hover:bg-emerald-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              Call ${callAmount}
            </button>
          )}

          {/* Bet / Raise */}
          {canCommitWager && (
            <button
              onClick={handleBetOrRaise}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple-hover active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-discord-blurple/25 transition-all cursor-pointer"
            >
              {canBet ? `Bet $${betAmount}` : `Raise to $${betAmount}`}
            </button>
          )}

          {/* All In (if available and not already raising max) */}
          {canAllIn && !canCommitWager && (
            <button
              onClick={handleAllIn}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer animate-pulse"
            >
              All-In (${allInAmount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
