import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/types.js';

// In both Vite dev (with proxy) and Express production, connecting to root origin works cleanly!
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
});

export function getStoredPlayerInfo(): { id: string; name: string } {
  let id = localStorage.getItem('poker_player_id');
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('poker_player_id', id);
  }
  const name = localStorage.getItem('poker_player_name') || '';
  return { id, name };
}

export function saveStoredPlayerName(name: string) {
  localStorage.setItem('poker_player_name', name);
}
