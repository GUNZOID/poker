import { Server, Socket } from 'socket.io';
import {
  ActionType,
  ClientToServerEvents,
  ServerToClientEvents,
  TableSettings,
} from '../shared/types.js';
import { RoomManager } from './roomManager.js';

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
) {
  // Broadcast sanitized table state to each player in room
  function broadcastTableState(roomId: string) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const seatedSocketIds = new Set(room.playerSockets.values());
    const roomSockets = io.sockets.adapter.rooms.get(roomId);

    // 1. Send personalized sanitized state to each connected player socket
    for (const [playerId, socketId] of room.playerSockets.entries()) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('table:state', room.table.getPublicState(playerId));
      }
    }

    // 2. Send generic state only to spectators (sockets not tied to a player)
    if (roomSockets) {
      for (const socketId of roomSockets) {
        if (!seatedSocketIds.has(socketId)) {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('table:state', room.table.getPublicState());
          }
        }
      }
    }
  }

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    // 1. Create room
    socket.on('room:create', ({ playerName, settings }, callback) => {
      try {
        if (!playerName || !playerName.trim()) {
          return callback({ success: false, error: 'Player name is required.' });
        }

        const roomId = roomManager.createRoom(settings);
        const room = roomManager.getRoom(roomId)!;

        const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
        const avatarColors = ['#5865F2', '#23a55a', '#f23f43', '#f0b232', '#eb459e', '#00b0f4', '#faa81a'];
        const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

        // Hook table callbacks to notify socket room
        room.table.setCallbacks({
          onStateChange: () => broadcastTableState(roomId),
          onLog: (log) => io.to(roomId).emit('log:action', log),
        });

        const sitRes = room.table.addPlayer(playerId, playerName.trim(), avatarColor, 0);
        if (!sitRes.success) {
          return callback({ success: false, error: sitRes.error });
        }

        socket.join(roomId);
        currentRoomId = roomId;
        currentPlayerId = playerId;
        roomManager.bindSocketToPlayer(roomId, socket.id, playerId);

        callback({ success: true, roomId, playerId });
        broadcastTableState(roomId);
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Failed to create room.' });
      }
    });

    // 2. Join room (or reconnect)
    socket.on('room:join', ({ roomId, playerName, playerId: reqPlayerId, seatIndex }, callback) => {
      try {
        const upperRoomId = roomId?.toUpperCase()?.trim();
        const room = roomManager.getRoom(upperRoomId);
        if (!room) {
          return callback({ success: false, error: 'Room not found. Check the room code.' });
        }

        const effectivePlayerId = reqPlayerId || 'p_' + Math.random().toString(36).substring(2, 9);
        const avatarColors = ['#5865F2', '#23a55a', '#f23f43', '#f0b232', '#eb459e', '#00b0f4', '#faa81a'];
        const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

        // Hook table callbacks if not already hooked
        room.table.setCallbacks({
          onStateChange: () => broadcastTableState(upperRoomId),
          onLog: (log) => io.to(upperRoomId).emit('log:action', log),
        });

        const joinRes = room.table.addPlayer(effectivePlayerId, playerName.trim(), avatarColor, seatIndex);
        if (!joinRes.success) {
          return callback({ success: false, error: joinRes.error });
        }

        socket.join(upperRoomId);
        currentRoomId = upperRoomId;
        currentPlayerId = effectivePlayerId;
        roomManager.bindSocketToPlayer(upperRoomId, socket.id, effectivePlayerId);

        callback({ success: true, playerId: effectivePlayerId });

        // Send chat history
        for (const chat of room.chatMessages) {
          socket.emit('chat:message', chat);
        }

        broadcastTableState(upperRoomId);
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Failed to join room.' });
      }
    });

    // 3. Start game
    socket.on('game:start', (callback) => {
      if (!currentRoomId || !currentPlayerId) {
        return callback({ success: false, error: 'Not in a room.' });
      }
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return callback({ success: false, error: 'Room not found.' });

      const player = room.table.getPlayerById(currentPlayerId);
      if (!player?.isHost) {
        return callback({ success: false, error: 'Only the host can start the game.' });
      }

      const res = room.table.startGame();
      callback(res);
      if (res.success) {
        broadcastTableState(currentRoomId);
      }
    });

    // 4. Player Action
    socket.on('game:action', ({ action, amount }, callback) => {
      if (!currentRoomId || !currentPlayerId) {
        return callback({ success: false, error: 'Not in a room.' });
      }
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return callback({ success: false, error: 'Room not found.' });

      const res = room.table.executeAction(currentPlayerId, action, amount);
      callback(res);
      if (res.success) {
        broadcastTableState(currentRoomId);
      }
    });

    // 5. Leave table
    socket.on('table:leave', (callback) => {
      if (currentRoomId && currentPlayerId) {
        const room = roomManager.getRoom(currentRoomId);
        if (room) {
          room.table.removePlayer(currentPlayerId);
          broadcastTableState(currentRoomId);
        }
        socket.leave(currentRoomId);
        currentRoomId = null;
        currentPlayerId = null;
      }
      callback({ success: true });
    });

    // 6. Sit at seat
    socket.on('table:sit', ({ seatIndex }, callback) => {
      if (!currentRoomId || !currentPlayerId) {
        return callback({ success: false, error: 'Not in a room.' });
      }
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return callback({ success: false, error: 'Room not found.' });

      const player = room.table.getPlayerById(currentPlayerId);
      if (!player) return callback({ success: false, error: 'Player not found.' });

      if (room.table.stage !== 'waiting') {
        return callback({ success: false, error: 'Cannot change seats while hand is in progress.' });
      }

      if (room.table.players[seatIndex] !== null) {
        return callback({ success: false, error: 'Seat is already occupied.' });
      }

      room.table.players[player.seatIndex] = null;
      player.seatIndex = seatIndex;
      room.table.players[seatIndex] = player;

      broadcastTableState(currentRoomId);
      callback({ success: true });
    });

    // 7. In-room Chat
    socket.on('chat:send', ({ text }) => {
      if (!currentRoomId || !text?.trim()) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;

      const player = currentPlayerId ? room.table.getPlayerById(currentPlayerId) : null;
      const sender = player ? player.name : 'Spectator';

      const msg = roomManager.addChatMessage(currentRoomId, sender, text.trim());
      if (msg) {
        io.to(currentRoomId).emit('chat:message', msg);
      }
    });

    // 8. Update Table Settings
    socket.on('room:update-settings', (settings, callback) => {
      if (!currentRoomId || !currentPlayerId) {
        return callback({ success: false, error: 'Not in a room.' });
      }
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return callback({ success: false, error: 'Room not found.' });

      const player = room.table.getPlayerById(currentPlayerId);
      if (!player?.isHost) {
        return callback({ success: false, error: 'Only the host can modify settings.' });
      }

      const res = room.table.updateSettings(settings);
      callback(res);
      if (res.success) {
        broadcastTableState(currentRoomId);
      }
    });

    // 9. Disconnect
    socket.on('disconnect', () => {
      const info = roomManager.handleSocketDisconnect(socket.id);
      if (info) {
        broadcastTableState(info.roomId);
      }
    });
  });
}
