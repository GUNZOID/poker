import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/server/roomManager.js';
import { setupSocketHandlers } from '../src/server/socketHandlers.js';
import {
  ClientToServerEvents,
  PublicTableState,
  ServerToClientEvents,
} from '../src/shared/types.js';

describe('Multiplayer Real-time Integration & Edge Cases', () => {
  let server: http.Server;
  let port: number;
  let roomManager: RoomManager;
  let ioServer: Server;

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    ioServer = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
      cors: { origin: '*' },
    });
    roomManager = new RoomManager();
    setupSocketHandlers(ioServer, roomManager);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    ioServer.close();
    server.close();
  });

  const createClient = (): Promise<ClientSocketType<ServerToClientEvents, ClientToServerEvents>> => {
    return new Promise((resolve) => {
      const client: ClientSocketType<ServerToClientEvents, ClientToServerEvents> = ClientSocket(
        `http://localhost:${port}`,
        { forceNew: true }
      );
      client.on('connect', () => {
        resolve(client);
      });
    });
  };

  it('runs a complete multiplayer game: room creation, joining, betting, hole-card privacy, and showdown', async () => {
    const clientA = await createClient();
    const clientB = await createClient();

    let stateForA: PublicTableState | null = null;
    let stateForB: PublicTableState | null = null;

    clientA.on('table:state', (st) => {
      stateForA = st;
    });
    clientB.on('table:state', (st) => {
      stateForB = st;
    });

    // 1. Client A creates room
    let roomId = '';
    let playerAId = '';
    await new Promise<void>((resolve) => {
      clientA.emit(
        'room:create',
        { playerName: 'Alice', settings: { startingChips: 1000, smallBlind: 10, bigBlind: 20 } },
        (res) => {
          expect(res.success).toBe(true);
          expect(res.roomId).toBeDefined();
          roomId = res.roomId!;
          playerAId = res.playerId!;
          resolve();
        }
      );
    });

    // 2. Client B joins room
    let playerBId = '';
    await new Promise<void>((resolve) => {
      clientB.emit('room:join', { roomId, playerName: 'Bob' }, (res) => {
        expect(res.success).toBe(true);
        playerBId = res.playerId!;
        resolve();
      });
    });

    // Wait for state propagation
    await new Promise((r) => setTimeout(r, 200));

    expect(stateForA).not.toBeNull();
    expect(stateForB).not.toBeNull();
    expect(stateForA!.stage).toBe('waiting');
    expect(stateForA!.players.filter((p) => p !== null)).toHaveLength(2);

    // 3. Client B (non-host) tries to start game -> must be rejected
    await new Promise<void>((resolve) => {
      clientB.emit('game:start', (res) => {
        expect(res.success).toBe(false);
        expect(res.error).toContain('host');
        resolve();
      });
    });

    // 4. Client A (host) starts game
    await new Promise<void>((resolve) => {
      clientA.emit('game:start', (res) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 200));
    expect(stateForA!.stage).toBe('preflop');

    // 5. Verify Hole-Card Privacy:
    // In stateForA: Alice's hole cards are revealed (length 2), Bob's are hidden (length 0)!
    const aliceInA = stateForA!.players.find((p) => p?.id === playerAId);
    const bobInA = stateForA!.players.find((p) => p?.id === playerBId);
    expect(aliceInA?.holeCards).toHaveLength(2);
    expect(bobInA?.holeCards).toHaveLength(0); // Secret!

    // In stateForB: Bob's hole cards are revealed, Alice's are hidden!
    const aliceInB = stateForB!.players.find((p) => p?.id === playerAId);
    const bobInB = stateForB!.players.find((p) => p?.id === playerBId);
    expect(bobInB?.holeCards).toHaveLength(2);
    expect(aliceInB?.holeCards).toHaveLength(0); // Secret!

    // 6. Verify illegal action rejection:
    // Whichever player is NOT on turn attempts to bet -> rejected!
    const currentTurnSeat = stateForA!.currentTurnSeat;
    const waitingClient = currentTurnSeat === aliceInA!.seatIndex ? clientB : clientA;
    await new Promise<void>((resolve) => {
      waitingClient.emit('game:action', { action: 'check' }, (res) => {
        expect(res.success).toBe(false);
        expect(res.error).toContain('Not your turn');
        resolve();
      });
    });

    // 7. The turn player folds -> hand immediately ends with other player winning!
    const activeClient = currentTurnSeat === aliceInA!.seatIndex ? clientA : clientB;
    const winnerId = currentTurnSeat === aliceInA!.seatIndex ? playerBId : playerAId;

    await new Promise<void>((resolve) => {
      activeClient.emit('game:action', { action: 'fold' }, (res) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 200));
    expect(stateForA!.stage).toBe('ended');
    expect(stateForA!.winners).not.toBeNull();
    expect(stateForA!.winners![0].playerId).toBe(winnerId);

    clientA.disconnect();
    clientB.disconnect();
  });

  it('handles player disconnect and reconnecting without losing seat or chips', async () => {
    const clientA = await createClient();

    let roomId = '';
    let playerAId = '';
    await new Promise<void>((resolve) => {
      clientA.emit(
        'room:create',
        { playerName: 'Maverick' },
        (res) => {
          roomId = res.roomId!;
          playerAId = res.playerId!;
          resolve();
        }
      );
    });

    // Client A disconnects
    clientA.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    // Client A reconnects with same player ID
    const reconnectClient = await createClient();
    await new Promise<void>((resolve) => {
      reconnectClient.emit(
        'room:join',
        { roomId, playerName: 'Maverick', playerId: playerAId },
        (res) => {
          expect(res.success).toBe(true);
          expect(res.playerId).toBe(playerAId);
          resolve();
        }
      );
    });

    const room = roomManager.getRoom(roomId);
    expect(room).toBeDefined();
    const player = room!.table.getPlayerById(playerAId);
    expect(player).toBeDefined();
    expect(player!.isConnected).toBe(true);

    reconnectClient.disconnect();
  });
});
