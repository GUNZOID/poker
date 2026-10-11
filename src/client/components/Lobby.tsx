import React, { useState } from 'react';
import { Users, Crown, Play, Share2, Check, Clock, Coins, ShieldCheck } from 'lucide-react';
import { Player, PublicTableState } from '../../shared/types.js';

interface LobbyProps {
  tableState: PublicTableState;
  currentUserId: string;
  onStartGame: () => void;
  onSit: (seatIndex: number) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  tableState,
  currentUserId,
  onStartGame,
  onSit,
}) => {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/?room=${tableState.roomId}`;
  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const seatedPlayers = tableState.players.filter((p): p is Player => p !== null);
  const me = tableState.players.find((p) => p?.id === currentUserId);
  const isHost = me?.isHost ?? false;
  const canStart = seatedPlayers.length >= 2;

  return (
    <div className="max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* Invite Share Card */}
      <div className="bg-discord-dark border border-discord-light/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-discord-blurple/20 text-discord-blurple flex items-center justify-center flex-shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm sm:text-base">Invite your friends</h3>
            <p className="text-slate-400 text-xs">Share this link or room code with up to 8 players</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="px-3 py-2 bg-discord-darkest rounded-lg font-mono font-bold text-discord-blurple text-sm tracking-wider border border-discord-light/20 select-all">
            {tableState.roomId}
          </div>
          <button
            onClick={handleCopyLink}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-discord-blurple hover:bg-discord-blurple-hover active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-md"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Copied Link!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Copy Invite Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table Seats Grid (8 seats) */}
      <div className="bg-discord-darker border border-discord-light/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-discord-light/20">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-discord-blurple" />
            <h2 className="text-white font-bold text-sm">
              Table Seats ({seatedPlayers.length} / 8)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {seatedPlayers.length < 2 ? 'Need at least 2 players' : 'Ready to start!'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tableState.players.map((player, seatIdx) => {
            if (player) {
              const isMe = player.id === currentUserId;
              return (
                <div
                  key={seatIdx}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isMe
                      ? 'bg-discord-blurple/15 border-discord-blurple/50'
                      : 'bg-discord-dark border-discord-light/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Seat {seatIdx + 1}
                    </span>
                    {player.isHost && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">
                        <Crown className="w-2.5 h-2.5" />
                        Host
                      </span>
                    )}
                  </div>

                  <div className="my-2.5 flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: player.avatarColor || '#5865F2' }}
                    >
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {player.name} {isMe && <span className="text-slate-400 text-xs">(You)</span>}
                      </div>
                      <div className="text-xs text-amber-400 font-medium">
                        {player.chips.toLocaleString()} chips
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Seated</span>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={seatIdx}
                onClick={() => onSit(seatIdx)}
                className="p-3.5 rounded-xl border border-dashed border-discord-light/30 hover:border-discord-blurple/60 bg-discord-dark/40 hover:bg-discord-dark/70 transition-all flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 group cursor-pointer"
              >
                <span className="text-[10px] font-semibold text-slate-600 group-hover:text-slate-400 uppercase tracking-wider">
                  Seat {seatIdx + 1}
                </span>
                <span className="text-xs font-medium group-hover:text-discord-blurple transition-colors">
                  + Sit Here
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Rules Card & Host Start Control */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Settings Recap */}
        <div className="sm:col-span-2 bg-discord-dark border border-discord-light/30 rounded-2xl p-4 flex items-center justify-around text-xs">
          <div className="flex items-center gap-2.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-slate-400">Starting Stack</div>
              <div className="text-white font-bold">{tableState.settings.startingChips.toLocaleString()}</div>
            </div>
          </div>
          <div className="h-8 w-px bg-discord-light/20" />
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-discord-blurple" />
            <div>
              <div className="text-slate-400">Blinds</div>
              <div className="text-white font-bold">
                {tableState.settings.smallBlind} / {tableState.settings.bigBlind}
              </div>
            </div>
          </div>
          <div className="h-8 w-px bg-discord-light/20" />
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-slate-400">Turn Timer</div>
              <div className="text-white font-bold">{tableState.settings.turnTimeLimit}s</div>
            </div>
          </div>
        </div>

        {/* Start Game Action */}
        <div className="flex items-center">
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                canStart
                  ? 'bg-discord-green hover:bg-emerald-600 text-white shadow-emerald-500/20 active:scale-[0.98]'
                  : 'bg-discord-lighter text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{canStart ? 'Start Game' : 'Waiting for Players...'}</span>
            </button>
          ) : (
            <div className="w-full py-4 px-4 rounded-2xl bg-discord-dark border border-discord-light/30 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Waiting for host to start...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
