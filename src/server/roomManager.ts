import crypto from 'crypto';
import { ChatMessage, TableSettings } from '../shared/types.js';
import { PokerTable } from './engine/table.js';

export interface RoomSession {
  table: PokerTable;
  chatMessages: ChatMessage[];
  playerSockets: Map<string, string>; // playerId -> socketId
  socketPlayers: Map<string, string>; // socketId -> playerId
  lastActivity: number;
}

export class RoomManager {
  private rooms: Map<string, RoomSession> = new Map();

  public generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(crypto.randomInt(0, chars.length));
    }
    // Ensure uniqueness
    if (this.rooms.has(code)) {
      return this.generateRoomId();
    }
    return code;
  }

  public createRoom(settings?: Partial<TableSettings>): string {
    const roomId = this.generateRoomId();
    const table = new PokerTable(roomId, settings);
    
    const session: RoomSession = {
      table,
      chatMessages: [
        {
          id: 'welcome',
          sender: 'System',
          text: 'Welcome to Texas Hold\'em! Share the room link to invite friends.',
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      playerSockets: new Map(),
      socketPlayers: new Map(),
      lastActivity: Date.now(),
    };

    this.rooms.set(roomId, session);
    return roomId;
  }

  public getRoom(roomId: string): RoomSession | undefined {
    const upperId = roomId.toUpperCase();
    return this.rooms.get(upperId);
  }

  public addChatMessage(roomId: string, sender: string, text: string, isSystem: boolean = false): ChatMessage | null {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const message: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender,
      text,
      timestamp: Date.now(),
      isSystem,
    };

    room.chatMessages.push(message);
    if (room.chatMessages.length > 100) {
      room.chatMessages.shift();
    }
    room.lastActivity = Date.now();
    return message;
  }

  public bindSocketToPlayer(roomId: string, socketId: string, playerId: string) {
    const room = this.getRoom(roomId);
    if (!room) return;
    room.playerSockets.set(playerId, socketId);
    room.socketPlayers.set(socketId, playerId);
    room.lastActivity = Date.now();
  }

  public handleSocketDisconnect(socketId: string): { roomId: string; playerId: string; playerLeft: boolean } | null {
    for (const [roomId, room] of this.rooms.entries()) {
      const playerId = room.socketPlayers.get(socketId);
      if (playerId) {
        room.socketPlayers.delete(socketId);
        room.playerSockets.delete(playerId);
        
        // Mark player disconnected in the table
        room.table.setPlayerDisconnected(playerId);
        room.lastActivity = Date.now();
        return { roomId, playerId, playerLeft: false };
      }
    }
    return null;
  }

  public removeEmptyRooms() {
    const now = Date.now();
    const ONE_HOUR = 3600 * 1000;
    for (const [roomId, room] of this.rooms.entries()) {
      const activePlayers = room.table.getPlayerCount();
      if (activePlayers === 0 && now - room.lastActivity > ONE_HOUR) {
        this.rooms.delete(roomId);
      }
    }
  }
}
