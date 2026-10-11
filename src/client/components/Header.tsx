import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, LogOut, Share2 } from 'lucide-react';
import { sounds } from '../sound.js';

interface HeaderProps {
  roomId: string;
  isConnected: boolean;
  onLeave: () => void;
}

export const Header: React.FC<HeaderProps> = ({ roomId, isConnected, onLeave }) => {
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.isEnabled());

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSound = () => {
    const nextState = sounds.toggle();
    setSoundEnabled(nextState);
  };

  return (
    <header className="h-14 px-4 bg-discord-dark border-b border-discord-light/40 flex items-center justify-between select-none">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-discord-blurple flex items-center justify-center text-white font-bold text-base shadow-sm">
            ♠
          </div>
          <span className="font-bold text-white tracking-wide text-sm hidden sm:inline">
            Poker Night
          </span>
        </div>

        <div className="h-4 w-px bg-discord-light mx-1 hidden sm:block" />

        {/* Room Code Pill */}
        <button
          onClick={handleCopyLink}
          title="Click to copy invite link"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-discord-lighter hover:bg-discord-light text-slate-200 text-xs font-medium transition-colors"
        >
          <span className="text-slate-400">Room:</span>
          <span className="font-mono font-bold text-discord-blurple tracking-wider">{roomId}</span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-discord-green" />
          ) : (
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-discord-darker/70 text-[11px]">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-discord-green animate-pulse' : 'bg-discord-red'
            }`}
          />
          <span className="text-slate-400 hidden sm:inline">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          className="p-2 rounded-lg bg-discord-lighter hover:bg-discord-light text-slate-300 hover:text-white transition-colors"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-discord-green" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {/* Leave Table */}
        <button
          onClick={onLeave}
          title="Leave table and return to lobby"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-discord-red/15 hover:bg-discord-red/25 text-red-400 hover:text-red-300 text-xs font-semibold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
};
