import { describe, it, expect } from 'vitest';
import { Card } from '../src/shared/types.js';
import { calculatePots, PlayerHandContribution, resolvePots } from '../src/server/engine/pot.js';

describe('Pot, Side Pot, and Refund Logic', () => {
  const card = (rank: number, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'): Card => ({
    rank: rank as Card['rank'],
    suit,
    id: `${rank}-${suit}`,
  });

  it('refunds uncalled bet when one player bets higher than all opponents', () => {
    const contributions: PlayerHandContribution[] = [
      { id: 'p1', name: 'Alice', seatIndex: 0, totalBet: 500, hasFolded: false, holeCards: [] },
      { id: 'p2', name: 'Bob', seatIndex: 1, totalBet: 200, hasFolded: false, holeCards: [] },
    ];

    const result = calculatePots(contributions);
    expect(result.refunds).toHaveLength(1);
    expect(result.refunds[0].playerId).toBe('p1');
    expect(result.refunds[0].amount).toBe(300); // 500 - 200 = 300 refunded to Alice

    expect(result.pots).toHaveLength(1);
    expect(result.pots[0].amount).toBe(400); // 200 + 200 = 400 in main pot
  });

  it('calculates multiple side pots for unequal all-ins', () => {
    // Charlie is all-in for 50, Bob is all-in for 150, Alice calls 150
    const contributions: PlayerHandContribution[] = [
      { id: 'p1', name: 'Alice', seatIndex: 0, totalBet: 150, hasFolded: false, holeCards: [] },
      { id: 'p2', name: 'Bob', seatIndex: 1, totalBet: 150, hasFolded: false, holeCards: [] },
      { id: 'p3', name: 'Charlie', seatIndex: 2, totalBet: 50, hasFolded: false, holeCards: [] },
    ];

    const result = calculatePots(contributions);
    expect(result.refunds).toHaveLength(0);
    expect(result.pots).toHaveLength(2);

    // Main pot: 50 * 3 = 150 (Alice, Bob, Charlie eligible)
    expect(result.pots[0].amount).toBe(150);
    expect(result.pots[0].eligiblePlayerIds).toEqual(['p1', 'p2', 'p3']);

    // Side pot: (150 - 50) * 2 = 200 (Alice, Bob eligible)
    expect(result.pots[1].amount).toBe(200);
    expect(result.pots[1].eligiblePlayerIds).toEqual(['p1', 'p2']);
  });

  it('resolves side pots correctly when short-stack has best hand', () => {
    // Charlie (short-stack) has Royal Flush
    // Alice has Pair of Aces
    // Bob has Pair of Kings
    const community: Card[] = [
      card(10, 'hearts'),
      card(11, 'hearts'),
      card(12, 'hearts'),
      card(2, 'spades'),
      card(3, 'clubs'),
    ];

    const contributions: PlayerHandContribution[] = [
      {
        id: 'p1',
        name: 'Alice',
        seatIndex: 0,
        totalBet: 200,
        hasFolded: false,
        holeCards: [card(14, 'spades'), card(14, 'clubs')], // Pair Aces
      },
      {
        id: 'p2',
        name: 'Bob',
        seatIndex: 1,
        totalBet: 200,
        hasFolded: false,
        holeCards: [card(13, 'spades'), card(13, 'clubs')], // Pair Kings
      },
      {
        id: 'p3',
        name: 'Charlie',
        seatIndex: 2,
        totalBet: 50,
        hasFolded: false,
        holeCards: [card(13, 'hearts'), card(14, 'hearts')], // Royal Flush!
      },
    ];

    const { pots } = calculatePots(contributions);
    const winners = resolvePots(pots, contributions, community, 0);

    // Charlie wins main pot (150)
    const charlieWin = winners.find((w) => w.playerId === 'p3');
    expect(charlieWin).toBeDefined();
    expect(charlieWin!.amount).toBe(150);
    expect(charlieWin!.handName).toBe('Royal Flush');

    // Alice wins side pot (300) with Pair of Aces
    const aliceWin = winners.find((w) => w.playerId === 'p1');
    expect(aliceWin).toBeDefined();
    expect(aliceWin!.amount).toBe(300);
  });

  it('correctly splits pot in case of an exact tie', () => {
    const community: Card[] = [
      card(14, 'hearts'),
      card(13, 'diamonds'),
      card(12, 'clubs'),
      card(11, 'spades'),
      card(10, 'hearts'),
    ]; // Broadway straight on board

    const contributions: PlayerHandContribution[] = [
      {
        id: 'p1',
        name: 'Alice',
        seatIndex: 0,
        totalBet: 100,
        hasFolded: false,
        holeCards: [card(2, 'spades'), card(3, 'clubs')],
      },
      {
        id: 'p2',
        name: 'Bob',
        seatIndex: 1,
        totalBet: 100,
        hasFolded: false,
        holeCards: [card(4, 'hearts'), card(5, 'diamonds')],
      },
    ];

    const { pots } = calculatePots(contributions);
    const winners = resolvePots(pots, contributions, community, 0);

    expect(winners).toHaveLength(2);
    expect(winners[0].amount).toBe(100);
    expect(winners[1].amount).toBe(100);
  });
});
