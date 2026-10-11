import { describe, it, expect } from 'vitest';
import { PokerTable } from '../src/server/engine/table.js';

describe('PokerTable Betting and Game Flow', () => {
  it('initializes table, adds players and starts game with blinds', () => {
    const table = new PokerTable('ROOM1', {
      startingChips: 1000,
      smallBlind: 10,
      bigBlind: 20,
    });

    table.addPlayer('p1', 'Alice', '#5865F2', 0);
    table.addPlayer('p2', 'Bob', '#23a55a', 1);

    expect(table.getPlayerCount()).toBe(2);

    const startResult = table.startGame();
    expect(startResult.success).toBe(true);
    expect(table.stage).toBe('preflop');

    const p1 = table.getPlayerById('p1')!;
    const p2 = table.getPlayerById('p2')!;

    // 2 players: one posted small blind (10), one posted big blind (20)
    expect(p1.chips + p2.chips).toBe(1970);
    expect(table.currentHighBet).toBe(20);

    // Each active player should have 2 hole cards
    expect(p1.holeCards).toHaveLength(2);
    expect(p2.holeCards).toHaveLength(2);
  });

  it('enforces turn order and allows call and check to advance to flop', () => {
    const table = new PokerTable('ROOM2', {
      startingChips: 1000,
      smallBlind: 10,
      bigBlind: 20,
    });

    table.addPlayer('p1', 'Alice', '#5865F2', 0);
    table.addPlayer('p2', 'Bob', '#23a55a', 1);
    table.startGame();

    // Turn seat should be valid
    expect(table.currentTurnSeat).not.toBeNull();
    const firstPlayerSeat = table.currentTurnSeat!;
    const firstPlayer = table.players[firstPlayerSeat]!;
    const otherPlayer = table.players[firstPlayerSeat === 0 ? 1 : 0]!;

    // First player cannot check because they owe toCall (10 chips)
    const actions = table.getAvailableActions(firstPlayer.id);
    expect(actions.canCheck).toBe(false);
    expect(actions.canCall).toBe(true);

    // First player calls
    const callRes = table.executeAction(firstPlayer.id, 'call');
    expect(callRes.success).toBe(true);

    // Now turn is on big blind player
    expect(table.currentTurnSeat).toBe(otherPlayer.seatIndex);
    const bbActions = table.getAvailableActions(otherPlayer.id);
    expect(bbActions.canCheck).toBe(true); // Big blind has option to check!

    // Big blind checks
    const checkRes = table.executeAction(otherPlayer.id, 'check');
    expect(checkRes.success).toBe(true);

    // Hand should advance to Flop!
    expect(table.stage).toBe('flop');
    expect(table.communityCards).toHaveLength(3);
  });

  it('handles fold and awards pot immediately without showdown', () => {
    const table = new PokerTable('ROOM3', {
      startingChips: 1000,
      smallBlind: 10,
      bigBlind: 20,
    });

    table.addPlayer('p1', 'Alice', '#5865F2', 0);
    table.addPlayer('p2', 'Bob', '#23a55a', 1);
    table.startGame();

    const currentTurn = table.currentTurnSeat!;
    const firstPlayer = table.players[currentTurn]!;
    const winner = table.players[currentTurn === 0 ? 1 : 0]!;

    const foldRes = table.executeAction(firstPlayer.id, 'fold');
    expect(foldRes.success).toBe(true);

    expect(table.stage).toBe('ended');
    expect(table.winners).not.toBeNull();
    expect(table.winners![0].playerId).toBe(winner.id);
    expect(winner.chips).toBe(1000 + 10); // Won the small blind
  });

  it('sanitizes public state so players only see their own hole cards during play', () => {
    const table = new PokerTable('ROOM4');
    table.addPlayer('p1', 'Alice', '#5865F2', 0);
    table.addPlayer('p2', 'Bob', '#23a55a', 1);
    table.startGame();

    // Alice views state
    const aliceState = table.getPublicState('p1');
    const p1InAliceView = aliceState.players.find((p) => p?.id === 'p1');
    const p2InAliceView = aliceState.players.find((p) => p?.id === 'p2');

    expect(p1InAliceView?.holeCards).toHaveLength(2);
    expect(p2InAliceView?.holeCards).toHaveLength(0); // Bob's cards are hidden!
  });
});
