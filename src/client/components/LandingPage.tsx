import React, { useState, useEffect } from 'react';
import { Users, PlusCircle, ArrowRight, ShieldAlert, Sparkles, Sliders } from 'lucide-react';
import { TableSettings } from '../../shared/types.js';

interface LandingPageProps {
  onCreateRoom: (name: string, settings: Partial<TableSettings>) => void;
  onJoinRoom: (name: string, roomId: string) => void;
  initialRoomId?: string;
  defaultPlayerName?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateRoom,
  onJoinRoom,
  initialRoomId = '',
  defaultPlayerName = '',
}) => {
  const [tab, setTab] = useState<'create' | 'join'>(initialRoomId ? 'join' : 'create');
  const [name, setName] = useState(defaultPlayerName);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(10);
  const [bigBlind, setBigBlind] = useState(20);
  const [turnTime, setTurnTime] = useState(30);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId.toUpperCase());
      setTab('join');
    }
  }, [initialRoomId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a display name.');
      return;
    }

    if (tab === 'join') {
      const trimmedRoom = roomId.trim().toUpperCase();
      if (!trimmedRoom) {
        setError('Please enter a room code.');
        return;
      }
      onJoinRoom(trimmedName, trimmedRoom);
    } else {
      onCreateRoom(trimmedName, {
        startingChips,
        smallBlind,
        bigBlind,
        turnTimeLimit: turnTime,
      });
    }
  };

  return (
    <div className="min-h-screen bg-discord-darkest flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar Wordmark */}
      <div className="max-w-md w-full mx-auto flex items-center justify-center gap-2 pt-4">
        <div className="w-10 h-10 rounded-xl bg-discord-blurple flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-discord-blurple/20">
          ♠
        </div>
        <span className="text-xl font-extrabold tracking-wide text-white">
          POKER NIGHT
        </span>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="bg-discord-darker border border-discord-light/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1 bg-discord-darkest/70 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setTab('create');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'create'
                  ? 'bg-discord-blurple text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Create Room
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('join');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'join'
                  ? 'bg-discord-blurple text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Join Room
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Your Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maverick, Alex, Shadow"
                maxLength={18}
                className="w-full px-4 py-3 rounded-xl bg-discord-darkest border border-discord-light/40 text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple text-sm transition-all"
                autoFocus
              />
            </div>

            {/* Room Code (if join) */}
            {tab === 'join' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="e.g. POKER7"
                  maxLength={10}
                  className="w-full px-4 py-3 rounded-xl bg-discord-darkest border border-discord-light/40 text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple text-sm font-mono tracking-wider transition-all"
                />
              </div>
            )}

            {/* Host Settings (if create) */}
            {tab === 'create' && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1"
                >
                  <Sliders className="w-3.5 h-3.5 text-discord-blurple" />
                  <span>{showAdvanced ? 'Hide Room Settings' : 'Configure Table Settings'}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-4 bg-discord-darkest/60 border border-discord-light/20 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Starting Chips</span>
                      <select
                        value={startingChips}
                        onChange={(e) => setStartingChips(Number(e.target.value))}
                        className="bg-discord-dark border border-discord-light/40 rounded px-2.5 py-1 text-slate-200 focus:outline-none"
                      >
                        <option value={500}>500 chips</option>
                        <option value={1000}>1,000 chips (Default)</option>
                        <option value={2000}>2,000 chips</option>
                        <option value={5000}>5,000 chips</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Blinds</span>
                      <select
                        value={`${smallBlind}/${bigBlind}`}
                        onChange={(e) => {
                          const [sb, bb] = e.target.value.split('/').map(Number);
                          setSmallBlind(sb);
                          setBigBlind(bb);
                        }}
                        className="bg-discord-dark border border-discord-light/40 rounded px-2.5 py-1 text-slate-200 focus:outline-none"
                      >
                        <option value="5/10">5 / 10</option>
                        <option value="10/20">10 / 20 (Default)</option>
                        <option value="25/50">25 / 50</option>
                        <option value="50/100">50 / 100</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Turn Timer</span>
                      <select
                        value={turnTime}
                        onChange={(e) => setTurnTime(Number(e.target.value))}
                        className="bg-discord-dark border border-discord-light/40 rounded px-2.5 py-1 text-slate-200 focus:outline-none"
                      >
                        <option value={20}>20 seconds</option>
                        <option value={30}>30 seconds (Default)</option>
                        <option value={45}>45 seconds</option>
                        <option value={60}>60 seconds</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-discord-red text-xs font-medium px-3 py-2 bg-discord-red/10 border border-discord-red/20 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-discord-blurple hover:bg-discord-blurple-hover active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-discord-blurple/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{tab === 'create' ? 'Create Table' : 'Join Table'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Note on virtual chips */}
        <div className="mt-4 text-center px-4">
          <p className="text-slate-500 text-xs flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-discord-blurple/70" />
            <span>Virtual chips only. Purely for casual friendly play.</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center text-[11px] text-slate-600 pb-2">
        Discord-inspired lightweight multiplayer Texas Hold'em. 2–8 players.
      </footer>
    </div>
  );
};
