import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ActionType,
  AvailableActions,
  Player,
  PublicTableState,
} from '../../shared/types.js';
import { PlayerSeat } from './PlayerSeat.js';
import { PlayingCard } from './PlayingCard.js';
import { PokerChip } from './PokerChip.js';
import { ActionControls } from './ActionControls.js';
import { WinnerOverlay } from './WinnerOverlay.js';

interface PokerTableProps {
  tableState: PublicTableState;
  currentUserId: string;
  onAction: (action: ActionType, amount?: number) => void;
  onSit: (seatIndex: number) => void;
}

// Seat positions around the oval table (percentage coordinates for desktop)
const SEAT_POSITIONS: Record<number, string> = {
  0: 'top-2 left-1/2 -translate-x-1/2', // Top center
  1: 'top-6 right-[15%]',               // Top right
  2: 'top-1/2 right-2 -translate-y-1/2',// Right center
  3: 'bottom-6 right-[15%]',            // Bottom right
  4: 'bottom-2 left-1/2 -translate-x-1/2',// Bottom center (User preferred seat)
  5: 'bottom-6 left-[15%]',             // Bottom left
  6: 'top-1/2 left-2 -translate-y-1/2', // Left center
  7: 'top-6 left-[15%]',                // Top left
};

export const PokerTable: React.FC<PokerTableProps> = ({
  tableState,
  currentUserId,
  onAction,
  onSit,
}) => {
  const {
    stage,
    players,
    communityCards,
    pots,
    totalPot,
    dealerSeat,
    smallBlindSeat,
    bigBlindSeat,
    currentTurnSeat,
    currentHighBet,
    settings,
    winners,
    turnExpiresAt,
  } = tableState;

  // Find current user player
  const myPlayer = players.find((p) => p?.id === currentUserId) ?? null;
  const isMyTurn = myPlayer !== null && currentTurnSeat === myPlayer.seatIndex;

  // Turn remaining countdown calculation
  const [remainingSecs, setRemainingSecs] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!turnExpiresAt || currentTurnSeat === null) {
      setRemainingSecs(undefined);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((turnExpiresAt - Date.now()) / 1000));
      setRemainingSecs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [turnExpiresAt, currentTurnSeat]);

  // Calculate local available actions for current user
  const availableActions: AvailableActions = React.useMemo(() => {
    if (!myPlayer || !isMyTurn || myPlayer.hasFolded || myPlayer.isAllIn || myPlayer.chips <= 0) {
      return {
        canFold: false,
        canCheck: false,
        canCall: false,
        callAmount: 0,
        canBet: false,
        minBet: 0,
        maxBet: 0,
        canRaise: false,
        minRaise: 0,
        maxRaise: 0,
        canAllIn: false,
        allInAmount: 0,
      };
    }

    const toCall = currentHighBet - myPlayer.currentBet;
    const canFold = true;
    const canCheck = toCall === 0;
    const canCall = toCall > 0 && myPlayer.chips >= toCall;
    const callAmount = Math.min(toCall, myPlayer.chips);
    const canAllIn = myPlayer.chips > 0;
    const allInAmount = myPlayer.chips + myPlayer.currentBet;

    let canBet = false;
    let minBet = 0;
    let maxBet = 0;
    let canRaise = false;
    let minRaise = 0;
    let maxRaise = 0;

    if (currentHighBet === 0) {
      if (myPlayer.chips > 0) {
        canBet = true;
        minBet = Math.min(myPlayer.chips, settings.bigBlind);
        maxBet = myPlayer.chips;
      }
    } else {
      const minRaiseTarget = currentHighBet + Math.max(tableState.minRaise, settings.bigBlind);
      if (allInAmount > currentHighBet) {
        canRaise = true;
        minRaise = Math.min(allInAmount, minRaiseTarget);
        maxRaise = allInAmount;
      }
    }

    return {
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
    };
  }, [myPlayer, isMyTurn, currentHighBet, tableState.minRaise, settings.bigBlind]);

  // Rotate seat view so the current user is conveniently anchored at bottom (seat 4)
  const userSeat = myPlayer?.seatIndex ?? 0;
  const seatOffset = (4 - userSeat + 8) % 8;

  const getVisualSeatIndex = (seatIndex: number): number => {
    return (seatIndex + seatOffset) % 8;
  };

  return (
    <div className="flex-1 flex flex-col justify-between relative overflow-hidden bg-discord-darkest select-none">
      {/* Winner Overlay Banner */}
      <WinnerOverlay winners={winners} />

      {/* Main Table Felt Container */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-6 w-full max-w-6xl mx-auto min-h-[480px]">
        {/* The Oval Felt Table */}
        <div className="relative w-full h-[440px] sm:h-[480px] rounded-[140px] sm:rounded-[200px] poker-felt flex items-center justify-center shadow-table">
          {/* Felt Inner Line */}
          <div className="absolute inset-5 rounded-[120px] sm:rounded-[180px] border border-emerald-600/30 pointer-events-none" />

          {/* Center Felt Content: Pot & Community Cards */}
          <div className="flex flex-col items-center justify-center gap-3 z-10 px-4 text-center">
            {/* Stage Badge & Total Pot */}
            <div className="flex flex-col items-center gap-1">
              <span className="px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10 text-emerald-400 font-bold uppercase tracking-widest text-[10px]">
                {stage === 'ended' ? 'Showdown' : stage}
              </span>

              {totalPot > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-yellow-500/30 backdrop-blur-sm shadow-md">
                  <span className="text-slate-400 text-xs font-semibold">Pot:</span>
                  <PokerChip amount={totalPot} size="md" />
                </div>
              )}

              {/* Side Pots breakdown if any */}
              {pots.length > 1 && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                  {pots.map((pot, idx) => (
                    <span key={idx} className="bg-black/40 px-1.5 py-0.5 rounded">
                      {idx === 0 ? 'Main' : `Side ${idx}`}: ${pot.amount}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 5 Community Cards */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[0, 1, 2, 3, 4].map((idx) => {
                const card = communityCards[idx] ?? null;
                return (
                  <div key={idx} className="w-10 h-14 sm:w-14 sm:h-20">
                    {card ? (
                      <PlayingCard
                        card={card}
                        size="md"
                        isWinningCard={winners?.some((w) => w.cards.some((c) => c.id === card.id))}
                      />
                    ) : (
                      <div className="w-full h-full rounded-md border border-dashed border-white/20 bg-black/20 flex items-center justify-center">
                        <span className="text-white/10 text-xs">♠</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8 Seats Arranged Around the Oval */}
          {players.map((player, seatIdx) => {
            const visualPositionIndex = getVisualSeatIndex(seatIdx);
            const posClass = SEAT_POSITIONS[visualPositionIndex];
            const isTurn = currentTurnSeat === seatIdx;

            return (
              <div key={seatIdx} className={`absolute ${posClass} z-20`}>
                <PlayerSeat
                  player={player}
                  seatIndex={seatIdx}
                  isCurrentTurn={isTurn}
                  isDealer={dealerSeat === seatIdx}
                  isSmallBlind={smallBlindSeat === seatIdx}
                  isBigBlind={bigBlindSeat === seatIdx}
                  isCurrentUser={player?.id === currentUserId}
                  stage={stage}
                  turnRemainingSeconds={isTurn ? remainingSecs : undefined}
                  canSit={stage === 'waiting' && myPlayer === null}
                  onSit={() => onSit(seatIdx)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Controls */}
      {myPlayer && (
        <ActionControls
          player={myPlayer}
          isMyTurn={isMyTurn}
          actions={availableActions}
          currentHighBet={currentHighBet}
          totalPot={totalPot}
          bigBlind={settings.bigBlind}
          onAction={onAction}
        />
      )}
    </div>
  );
};
