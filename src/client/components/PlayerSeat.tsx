import React from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { Player } from '../../shared/types.js';
import { PlayingCard } from './PlayingCard.js';
import { PokerChip } from './PokerChip.js';

interface PlayerSeatProps {
  player: Player | null;
  seatIndex: number;
  isCurrentTurn: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isCurrentUser: boolean;
  stage: string;
  turnRemainingSeconds?: number;
  onSit?: () => void;
  canSit?: boolean;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  seatIndex,
  isCurrentTurn,
  isDealer,
  isSmallBlind,
  isBigBlind,
  isCurrentUser,
  stage,
  turnRemainingSeconds,
  onSit,
  canSit,
}) => {
  // Vacant Seat
  if (!player) {
    if (canSit && onSit) {
      return (
        <button
          onClick={onSit}
          className="flex flex-col items-center justify-center w-28 h-20 rounded-xl border border-dashed border-white/20 hover:border-discord-blurple bg-black/25 hover:bg-black/45 transition-all text-slate-400 hover:text-white p-2 group cursor-pointer"
        >
          <span className="text-[10px] text-slate-500 font-semibold uppercase">Seat {seatIndex + 1}</span>
          <span className="text-xs font-bold text-discord-blurple group-hover:scale-105 transition-transform">
            + Sit
          </span>
        </button>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center w-28 h-20 rounded-xl border border-white/10 bg-black/15 opacity-40 p-2">
        <span className="text-[10px] text-slate-500 font-semibold uppercase">Seat {seatIndex + 1}</span>
        <span className="text-xs text-slate-600">Empty</span>
      </div>
    );
  }

  const { name, chips, currentBet, status, holeCards, avatarColor, hasFolded, isAllIn, lastAction, isHost } = player;
  const isFolded = hasFolded || status === 'folded';

  return (
    <div className={`relative flex flex-col items-center select-none ${isFolded ? 'opacity-40 filter grayscale' : ''}`}>
      {/* Turn Countdown Badge */}
      {isCurrentTurn && turnRemainingSeconds !== undefined && (
        <div className="absolute -top-6 px-2 py-0.5 rounded-full bg-discord-blurple text-white font-mono font-bold text-[10px] shadow-lg animate-bounce z-20">
          {turnRemainingSeconds}s
        </div>
      )}

      {/* Hole Cards Container */}
      <div className="flex items-center -space-x-3 mb-1.5 z-10">
        {holeCards.length === 2 ? (
          <>
            <PlayingCard
              card={holeCards[0]}
              size="sm"
              isWinningCard={!!player.handResult}
              className="shadow-md"
            />
            <PlayingCard
              card={holeCards[1]}
              size="sm"
              isWinningCard={!!player.handResult}
              className="shadow-md"
            />
          </>
        ) : !isFolded && stage !== 'waiting' && stage !== 'ended' ? (
          <>
            <PlayingCard faceDown size="sm" className="shadow-md" />
            <PlayingCard faceDown size="sm" className="shadow-md" />
          </>
        ) : null}
      </div>

      {/* Player Pod */}
      <div
        className={`relative w-28 sm:w-32 bg-discord-dark/95 border rounded-xl p-2 shadow-lg flex flex-col items-center text-center transition-all ${
          isCurrentTurn
            ? 'turn-active border-discord-blurple bg-discord-dark'
            : isCurrentUser
            ? 'border-indigo-400/40 bg-discord-dark'
            : 'border-white/10'
        }`}
      >
        {/* Badges: Dealer, SB, BB, Host */}
        <div className="absolute -top-2.5 -right-2 flex items-center gap-1 z-20">
          {isDealer && (
            <span
              title="Dealer Button"
              className="w-5 h-5 rounded-full bg-yellow-400 text-slate-900 font-extrabold text-[10px] flex items-center justify-center shadow-md border border-yellow-200"
            >
              D
            </span>
          )}
          {isSmallBlind && (
            <span
              title="Small Blind"
              className="px-1.5 py-0.5 rounded-full bg-sky-500 text-white font-bold text-[9px] shadow-sm"
            >
              SB
            </span>
          )}
          {isBigBlind && (
            <span
              title="Big Blind"
              className="px-1.5 py-0.5 rounded-full bg-purple-500 text-white font-bold text-[9px] shadow-sm"
            >
              BB
            </span>
          )}
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-1.5 w-full justify-center">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: avatarColor || '#5865F2' }}
          >
            {name.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-slate-100 truncate max-w-[70px]">
            {name}
          </span>
          {isHost && (
            <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" title="Room Host" />
          )}
        </div>

        {/* Chips Balance */}
        <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-300">
          <span>{chips.toLocaleString()}</span>
        </div>

        {/* Status / Hand Result tag */}
        {player.handResult ? (
          <div className="mt-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold truncate max-w-full">
            {player.handResult.rankName}
          </div>
        ) : isFolded ? (
          <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 text-[9px] font-bold">
            Folded
          </div>
        ) : isAllIn ? (
          <div className="mt-1 px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold animate-pulse">
            ALL-IN
          </div>
        ) : lastAction ? (
          <div className="mt-1 px-1.5 py-0.5 rounded bg-discord-light text-slate-300 text-[9px] font-medium truncate max-w-full">
            {lastAction.type.toUpperCase()} {lastAction.amount ? `$${lastAction.amount}` : ''}
          </div>
        ) : null}
      </div>

      {/* Round Bet Chips in front of player */}
      {currentBet > 0 && (
        <div className="mt-1.5 z-10 px-2 py-0.5 rounded-full bg-black/60 border border-white/20 backdrop-blur-sm shadow-md flex items-center gap-1">
          <PokerChip amount={currentBet} size="sm" showLabel />
        </div>
      )}
    </div>
  );
};
