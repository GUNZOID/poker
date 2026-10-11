import { Card, HandEvaluation, HandRank, Rank } from '../../shared/types.js';

const RANK_NAMES: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
  14: 'Ace',
};

const RANK_PLURALS: Record<number, string> = {
  2: 'Deuces',
  3: 'Threes',
  4: 'Fours',
  5: 'Fives',
  6: 'Sixes',
  7: 'Sevens',
  8: 'Eights',
  9: 'Nines',
  10: 'Tens',
  11: 'Jacks',
  12: 'Queens',
  13: 'Kings',
  14: 'Aces',
};

/**
 * Compare two score arrays lexicographically.
 * Returns >0 if a beats b, <0 if b beats a, 0 if tie.
 */
export function compareScores(scoreA: number[], scoreB: number[]): number {
  const len = Math.max(scoreA.length, scoreB.length);
  for (let i = 0; i < len; i++) {
    const valA = scoreA[i] ?? 0;
    const valB = scoreB[i] ?? 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }
  return 0;
}

/**
 * Evaluates an exact 5-card poker hand.
 */
export function evaluate5Cards(cards: Card[]): HandEvaluation {
  if (cards.length !== 5) {
    throw new Error('evaluate5Cards requires exactly 5 cards');
  }

  // Sort descending by rank
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight
  // Standard straight: ranks are r, r-1, r-2, r-3, r-4
  let isStraight = false;
  let straightHigh = 0;

  const isStandardStraight =
    ranks[0] - ranks[1] === 1 &&
    ranks[1] - ranks[2] === 1 &&
    ranks[2] - ranks[3] === 1 &&
    ranks[3] - ranks[4] === 1;

  if (isStandardStraight) {
    isStraight = true;
    straightHigh = ranks[0];
  } else if (
    ranks[0] === 14 &&
    ranks[1] === 5 &&
    ranks[2] === 4 &&
    ranks[3] === 3 &&
    ranks[4] === 2
  ) {
    // Wheel: A-2-3-4-5. The Ace acts as 1, so 5 is the high card!
    isStraight = true;
    straightHigh = 5;
  }

  // Count rank frequencies
  const counts: Record<number, number> = {};
  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
  }

  // Group by frequency descending, then rank descending
  const groups = Object.entries(counts)
    .map(([rankStr, count]) => ({ rank: Number(rankStr) as Rank, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

  // 1. Royal Flush / Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        handRank: 10,
        rankName: 'Royal Flush',
        score: [10, 14],
        bestFiveCards: sorted,
      };
    }
    return {
      handRank: 9,
      rankName: `Straight Flush, ${RANK_NAMES[straightHigh]} High`,
      score: [9, straightHigh],
      bestFiveCards: sorted,
    };
  }

  // 2. Four of a Kind
  if (groups[0].count === 4) {
    const quadRank = groups[0].rank;
    const kicker = groups[1].rank;
    return {
      handRank: 8,
      rankName: `Four of a Kind, ${RANK_PLURALS[quadRank]}`,
      score: [8, quadRank, kicker],
      bestFiveCards: sorted,
    };
  }

  // 3. Full House
  if (groups[0].count === 3 && groups[1].count === 2) {
    const tripRank = groups[0].rank;
    const pairRank = groups[1].rank;
    return {
      handRank: 7,
      rankName: `Full House, ${RANK_PLURALS[tripRank]} full of ${RANK_PLURALS[pairRank]}`,
      score: [7, tripRank, pairRank],
      bestFiveCards: sorted,
    };
  }

  // 4. Flush
  if (isFlush) {
    return {
      handRank: 6,
      rankName: `Flush, ${RANK_NAMES[ranks[0]]} High`,
      score: [6, ...ranks],
      bestFiveCards: sorted,
    };
  }

  // 5. Straight
  if (isStraight) {
    return {
      handRank: 5,
      rankName: `Straight, ${RANK_NAMES[straightHigh]} High`,
      score: [5, straightHigh],
      bestFiveCards: sorted,
    };
  }

  // 6. Three of a Kind
  if (groups[0].count === 3) {
    const tripRank = groups[0].rank;
    const kickers = groups.slice(1).map((g) => g.rank).sort((a, b) => b - a);
    return {
      handRank: 4,
      rankName: `Three of a Kind, ${RANK_PLURALS[tripRank]}`,
      score: [4, tripRank, ...kickers],
      bestFiveCards: sorted,
    };
  }

  // 7. Two Pair
  if (groups[0].count === 2 && groups[1].count === 2) {
    const highPair = Math.max(groups[0].rank, groups[1].rank);
    const lowPair = Math.min(groups[0].rank, groups[1].rank);
    const kicker = groups[2].rank;
    return {
      handRank: 3,
      rankName: `Two Pair, ${RANK_PLURALS[highPair]} and ${RANK_PLURALS[lowPair]}`,
      score: [3, highPair, lowPair, kicker],
      bestFiveCards: sorted,
    };
  }

  // 8. One Pair
  if (groups[0].count === 2) {
    const pairRank = groups[0].rank;
    const kickers = groups.slice(1).map((g) => g.rank).sort((a, b) => b - a);
    return {
      handRank: 2,
      rankName: `Pair of ${RANK_PLURALS[pairRank]}`,
      score: [2, pairRank, ...kickers],
      bestFiveCards: sorted,
    };
  }

  // 9. High Card
  return {
    handRank: 1,
    rankName: `${RANK_NAMES[ranks[0]]} High`,
    score: [1, ...ranks],
    bestFiveCards: sorted,
  };
}

/**
 * Generate all combinations of k items from array
 */
function getCombinations<T>(array: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (array.length < k) return [];
  const head = array[0];
  const tail = array.slice(1);
  const withHead = getCombinations(tail, k - 1).map((comb) => [head, ...comb]);
  const withoutHead = getCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

/**
 * Evaluates the best 5-card hand from a pool of 5 to 7 cards (e.g. 2 hole cards + community cards)
 */
export function evaluateBestHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate a hand');
  }

  if (cards.length === 5) {
    return evaluate5Cards(cards);
  }

  const combinations = getCombinations(cards, 5);
  let bestEval: HandEvaluation | null = null;

  for (const comb of combinations) {
    const currentEval = evaluate5Cards(comb);
    if (!bestEval || compareScores(currentEval.score, bestEval.score) > 0) {
      bestEval = currentEval;
    }
  }

  return bestEval!;
}
