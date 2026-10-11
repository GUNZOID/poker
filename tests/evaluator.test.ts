import { describe, it, expect } from 'vitest';
import { Card } from '../src/shared/types.js';
import { compareScores, evaluate5Cards, evaluateBestHand } from '../src/server/engine/evaluator.js';

describe('Poker Hand Evaluator', () => {
  const card = (rank: number, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'): Card => ({
    rank: rank as Card['rank'],
    suit,
    id: `${rank}-${suit}`,
  });

  it('correctly evaluates a Royal Flush', () => {
    const hand: Card[] = [
      card(10, 'spades'),
      card(11, 'spades'),
      card(12, 'spades'),
      card(13, 'spades'),
      card(14, 'spades'),
    ];
    const result = evaluate5Cards(hand);
    expect(result.handRank).toBe(10);
    expect(result.rankName).toBe('Royal Flush');
  });

  it('correctly evaluates a Straight Flush', () => {
    const hand: Card[] = [
      card(5, 'hearts'),
      card(6, 'hearts'),
      card(7, 'hearts'),
      card(8, 'hearts'),
      card(9, 'hearts'),
    ];
    const result = evaluate5Cards(hand);
    expect(result.handRank).toBe(9);
    expect(result.rankName).toBe('Straight Flush, 9 High');
  });

  it('correctly evaluates an Ace-low Straight Flush (Steel Wheel)', () => {
    const hand: Card[] = [
      card(14, 'clubs'),
      card(2, 'clubs'),
      card(3, 'clubs'),
      card(4, 'clubs'),
      card(5, 'clubs'),
    ];
    const result = evaluate5Cards(hand);
    expect(result.handRank).toBe(9);
    expect(result.score[1]).toBe(5); // 5 High
  });

  it('correctly evaluates Four of a Kind', () => {
    const hand: Card[] = [
      card(9, 'hearts'),
      card(9, 'diamonds'),
      card(9, 'clubs'),
      card(9, 'spades'),
      card(13, 'hearts'),
    ];
    const result = evaluate5Cards(hand);
    expect(result.handRank).toBe(8);
    expect(result.rankName).toContain('Four of a Kind');
    expect(result.score[1]).toBe(9);
    expect(result.score[2]).toBe(13); // Kicker King
  });

  it('correctly evaluates Full House', () => {
    const hand: Card[] = [
      card(14, 'hearts'),
      card(14, 'diamonds'),
      card(14, 'clubs'),
      card(8, 'spades'),
      card(8, 'hearts'),
    ];
    const result = evaluate5Cards(hand);
    expect(result.handRank).toBe(7);
    expect(result.rankName).toContain('Full House');
    expect(result.score[1]).toBe(14);
    expect(result.score[2]).toBe(8);
  });

  it('correctly evaluates Flush', () => {
    const hand: Card[] = [
      card(2, 'diamonds'),
      card(5, 'diamonds'),
      card(8, 'diamonds'),
      card(11, 'diamonds'),
      card(14, 'diamonds'),
    ];
    const result = evaluate5Cards(hand);
    expect(result.handRank).toBe(6);
    expect(result.rankName).toBe('Flush, Ace High');
  });

  it('correctly evaluates Straight (including Ace-low Wheel)', () => {
    const wheel: Card[] = [
      card(14, 'hearts'),
      card(2, 'diamonds'),
      card(3, 'clubs'),
      card(4, 'spades'),
      card(5, 'hearts'),
    ];
    const resultWheel = evaluate5Cards(wheel);
    expect(resultWheel.handRank).toBe(5);
    expect(resultWheel.score[1]).toBe(5);

    const broadway: Card[] = [
      card(10, 'hearts'),
      card(11, 'diamonds'),
      card(12, 'clubs'),
      card(13, 'spades'),
      card(14, 'hearts'),
    ];
    const resultBroadway = evaluate5Cards(broadway);
    expect(resultBroadway.handRank).toBe(5);
    expect(resultBroadway.score[1]).toBe(14);
  });

  it('correctly evaluates Three of a Kind', () => {
    const hand: Card[] = [
      card(7, 'hearts'),
      card(7, 'diamonds'),
      card(7, 'clubs'),
      card(12, 'spades'),
      card(4, 'hearts'),
    ];
    const result = evaluate5Cards(hand);
    expect(result.handRank).toBe(4);
    expect(result.score[1]).toBe(7);
    expect(result.score[2]).toBe(12);
  });

  it('correctly evaluates Two Pair', () => {
    const hand: Card[] = [
      card(13, 'hearts'),
      card(13, 'diamonds'),
      card(4, 'clubs'),
      card(4, 'spades'),
      card(14, 'hearts'),
    ];
    const result = evaluate5Cards(hand);
    expect(result.handRank).toBe(3);
    expect(result.score[1]).toBe(13);
    expect(result.score[2]).toBe(4);
    expect(result.score[3]).toBe(14); // Ace kicker
  });

  it('correctly evaluates One Pair', () => {
    const hand: Card[] = [
      card(10, 'hearts'),
      card(10, 'diamonds'),
      card(14, 'clubs'),
      card(8, 'spades'),
      card(3, 'hearts'),
    ];
    const result = evaluate5Cards(hand);
    expect(result.handRank).toBe(2);
    expect(result.score[1]).toBe(10);
  });

  it('correctly compares kicker tie-breakers', () => {
    // Both players have a Pair of Aces, but player A has King kicker, player B has Queen kicker
    const pairA: Card[] = [
      card(14, 'hearts'),
      card(14, 'diamonds'),
      card(13, 'clubs'),
      card(6, 'spades'),
      card(2, 'hearts'),
    ];
    const pairB: Card[] = [
      card(14, 'spades'),
      card(14, 'clubs'),
      card(12, 'hearts'),
      card(6, 'diamonds'),
      card(2, 'clubs'),
    ];

    const evalA = evaluate5Cards(pairA);
    const evalB = evaluate5Cards(pairB);
    expect(compareScores(evalA.score, evalB.score)).toBeGreaterThan(0);
  });

  it('picks the best 5-card hand out of 7 cards', () => {
    const holeCards: Card[] = [card(14, 'hearts'), card(13, 'hearts')];
    const community: Card[] = [
      card(12, 'hearts'),
      card(11, 'hearts'),
      card(10, 'hearts'),
      card(2, 'clubs'),
      card(3, 'spades'),
    ];
    const best = evaluateBestHand([...holeCards, ...community]);
    expect(best.handRank).toBe(10); // Royal Flush
    expect(best.rankName).toBe('Royal Flush');
  });
});
