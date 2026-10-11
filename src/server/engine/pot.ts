import { HandWinner, Pot } from '../../shared/types.js';
import { compareScores, evaluateBestHand } from './evaluator.js';
import { Card } from '../../shared/types.js';

export interface PlayerHandContribution {
  id: string;
  name: string;
  seatIndex: number;
  totalBet: number;
  hasFolded: boolean;
  holeCards: Card[];
}

export interface SplitResult {
  pots: Pot[];
  refunds: { playerId: string; amount: number }[];
}

/**
 * Calculates side pots from player contributions.
 * Also identifies uncalled bets that should be refunded.
 */
export function calculatePots(contributions: PlayerHandContribution[]): SplitResult {
  const refunds: { playerId: string; amount: number }[] = [];
  const pots: Pot[] = [];

  // Filter players who contributed more than 0
  const activeBets = contributions
    .filter((p) => p.totalBet > 0)
    .map((p) => ({ ...p }));

  if (activeBets.length === 0) {
    return { pots, refunds };
  }

  // Check for uncalled bet:
  // If the highest bet is strictly greater than the second highest bet,
  // the excess amount cannot be called by anyone and must be refunded.
  const sortedByBetDesc = [...activeBets].sort((a, b) => b.totalBet - a.totalBet);
  if (sortedByBetDesc.length > 1) {
    const highest = sortedByBetDesc[0];
    const secondHighest = sortedByBetDesc[1];
    if (highest.totalBet > secondHighest.totalBet) {
      const excess = highest.totalBet - secondHighest.totalBet;
      refunds.push({ playerId: highest.id, amount: excess });
      // Reduce the highest bettor's effective bet
      const target = activeBets.find((p) => p.id === highest.id);
      if (target) {
        target.totalBet -= excess;
      }
    }
  } else if (sortedByBetDesc.length === 1) {
    // Only one player bet, refund the whole bet
    refunds.push({ playerId: sortedByBetDesc[0].id, amount: sortedByBetDesc[0].totalBet });
    return { pots, refunds };
  }

  // Work with remaining contributions
  let remainingPlayers = activeBets.filter((p) => p.totalBet > 0);

  while (remainingPlayers.length > 0) {
    // Find the smallest non-zero bet among remaining players
    const minBet = Math.min(...remainingPlayers.map((p) => p.totalBet));
    if (minBet <= 0) break;

    let potAmount = 0;
    const eligiblePlayerIds: string[] = [];

    for (const p of remainingPlayers) {
      potAmount += minBet;
      p.totalBet -= minBet;
      if (!p.hasFolded) {
        eligiblePlayerIds.push(p.id);
      }
    }

    if (potAmount > 0) {
      if (eligiblePlayerIds.length > 0) {
        // If the pot has active players, add it as a playable pot
        // Merge with previous pot if eligible players are identical
        const prevPot = pots[pots.length - 1];
        if (
          prevPot &&
          prevPot.eligiblePlayerIds.length === eligiblePlayerIds.length &&
          prevPot.eligiblePlayerIds.every((id) => eligiblePlayerIds.includes(id))
        ) {
          prevPot.amount += potAmount;
        } else {
          pots.push({
            amount: potAmount,
            eligiblePlayerIds,
          });
        }
      } else {
        // Everyone eligible folded - give back or add to last pot
        if (pots.length > 0) {
          pots[pots.length - 1].amount += potAmount;
        }
      }
    }

    remainingPlayers = remainingPlayers.filter((p) => p.totalBet > 0);
  }

  return { pots, refunds };
}

/**
 * Determines winners and distributes pots among players.
 * Returns array of HandWinner.
 */
export function resolvePots(
  pots: Pot[],
  contributions: PlayerHandContribution[],
  communityCards: Card[],
  dealerSeat: number
): HandWinner[] {
  const winnersMap: Map<string, HandWinner> = new Map();

  // Evaluate best hands for non-folded players
  const playerEvaluations = new Map<
    string,
    { eval: ReturnType<typeof evaluateBestHand>; player: PlayerHandContribution }
  >();

  for (const p of contributions) {
    if (!p.hasFolded && p.holeCards.length === 2) {
      const fullHand = [...p.holeCards, ...communityCards];
      if (fullHand.length >= 5) {
        const handEval = evaluateBestHand(fullHand);
        playerEvaluations.set(p.id, { eval: handEval, player: p });
      }
    }
  }

  // Process each pot in order (main pot first, then side pots)
  for (const pot of pots) {
    if (pot.amount <= 0 || pot.eligiblePlayerIds.length === 0) continue;

    // Filter eligible players who did not fold
    const eligibleContenders = pot.eligiblePlayerIds
      .map((id) => playerEvaluations.get(id))
      .filter((item): item is NonNullable<typeof item> => item !== undefined);

    if (eligibleContenders.length === 0) {
      // If nobody evaluated (e.g. all remaining folded except one earlier), find the last non-folded eligible
      const nonFolded = contributions.find(
        (p) => !p.hasFolded && pot.eligiblePlayerIds.includes(p.id)
      );
      if (nonFolded) {
        const existing = winnersMap.get(nonFolded.id);
        if (existing) {
          existing.amount += pot.amount;
        } else {
          winnersMap.set(nonFolded.id, {
            playerId: nonFolded.id,
            name: nonFolded.name,
            amount: pot.amount,
            handName: 'Won by default',
            cards: nonFolded.holeCards,
            seatIndex: nonFolded.seatIndex,
          });
        }
      }
      continue;
    }

    // If only one eligible contender, they win the pot
    if (eligibleContenders.length === 1) {
      const single = eligibleContenders[0];
      const existing = winnersMap.get(single.player.id);
      if (existing) {
        existing.amount += pot.amount;
      } else {
        winnersMap.set(single.player.id, {
          playerId: single.player.id,
          name: single.player.name,
          amount: pot.amount,
          handName: single.eval.rankName,
          cards: single.eval.bestFiveCards,
          seatIndex: single.player.seatIndex,
        });
      }
      continue;
    }

    // Find the best hand among contenders
    let winningContenders: typeof eligibleContenders = [eligibleContenders[0]];
    for (let i = 1; i < eligibleContenders.length; i++) {
      const candidate = eligibleContenders[i];
      const comp = compareScores(candidate.eval.score, winningContenders[0].eval.score);
      if (comp > 0) {
        winningContenders = [candidate];
      } else if (comp === 0) {
        winningContenders.push(candidate);
      }
    }

    // Split pot among winning contenders
    const splitAmount = Math.floor(pot.amount / winningContenders.length);
    let remainder = pot.amount % winningContenders.length;

    // Order tied contenders clockwise starting after dealer seat to award remainder odd chips
    winningContenders.sort((a, b) => {
      const distA = (a.player.seatIndex - dealerSeat + 8) % 8;
      const distB = (b.player.seatIndex - dealerSeat + 8) % 8;
      return distA - distB;
    });

    for (const winner of winningContenders) {
      let winForPlayer = splitAmount;
      if (remainder > 0) {
        winForPlayer += 1;
        remainder--;
      }

      const existing = winnersMap.get(winner.player.id);
      if (existing) {
        existing.amount += winForPlayer;
      } else {
        winnersMap.set(winner.player.id, {
          playerId: winner.player.id,
          name: winner.player.name,
          amount: winForPlayer,
          handName: winner.eval.rankName,
          cards: winner.eval.bestFiveCards,
          seatIndex: winner.player.seatIndex,
        });
      }
    }
  }

  return Array.from(winnersMap.values());
}
