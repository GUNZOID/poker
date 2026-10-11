import crypto from 'crypto';
import { Card, Rank, Suit } from '../../shared/types.js';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({
          suit,
          rank,
          id: `${rank}-${suit}`,
        });
      }
    }
  }

  public shuffle(): void {
    // Fisher-Yates shuffle using crypto.randomInt
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      const temp = this.cards[i];
      this.cards[i] = this.cards[j];
      this.cards[j] = temp;
    }
  }

  public deal(count: number = 1): Card[] {
    if (this.cards.length < count) {
      throw new Error(`Cannot deal ${count} cards, only ${this.cards.length} left`);
    }
    return this.cards.splice(0, count);
  }

  public remaining(): number {
    return this.cards.length;
  }
}
