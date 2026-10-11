import {
  ActionType,
  AvailableActions,
  Card,
  GameStage,
  HandWinner,
  Player,
  PlayerAction,
  Pot,
  PublicTableState,
  TableSettings,
} from '../../shared/types.js';
import { Deck } from './deck.js';
import { calculatePots, PlayerHandContribution, resolvePots } from './pot.js';

export interface ActionLog {
  id: string;
  message: string;
  timestamp: number;
  type: 'action' | 'phase' | 'win' | 'system';
}

export class PokerTable {
  public roomId: string;
  public stage: GameStage = 'waiting';
  public players: (Player | null)[] = Array(8).fill(null);
  public communityCards: Card[] = [];
  public pots: Pot[] = [];
  public dealerSeat: number = 0;
  public smallBlindSeat: number = 0;
  public bigBlindSeat: number = 0;
  public currentTurnSeat: number | null = null;
  public minRaise: number = 20;
  public currentHighBet: number = 0;
  public settings: TableSettings;
  public handNumber: number = 0;
  public winners: HandWinner[] | null = null;
  public turnExpiresAt: number | null = null;
  public logs: ActionLog[] = [];

  private deck: Deck = new Deck();
  // Keeps track of whether player has acted in the current betting round
  private playerActed: boolean[] = Array(8).fill(false);
  private nextHandTimeout: NodeJS.Timeout | null = null;
  private turnTimeout: NodeJS.Timeout | null = null;
  private onStateChange?: () => void;
  private onLog?: (log: ActionLog) => void;

  constructor(
    roomId: string,
    settings?: Partial<TableSettings>,
    callbacks?: { onStateChange?: () => void; onLog?: (log: ActionLog) => void }
  ) {
    this.roomId = roomId;
    this.settings = {
      startingChips: settings?.startingChips ?? 1000,
      smallBlind: settings?.smallBlind ?? 10,
      bigBlind: settings?.bigBlind ?? 20,
      turnTimeLimit: settings?.turnTimeLimit ?? 30,
    };
    this.minRaise = this.settings.bigBlind;
    if (callbacks) {
      this.onStateChange = callbacks.onStateChange;
      this.onLog = callbacks.onLog;
    }
  }

  public setCallbacks(callbacks: { onStateChange?: () => void; onLog?: (log: ActionLog) => void }) {
    this.onStateChange = callbacks.onStateChange;
    this.onLog = callbacks.onLog;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  private addLog(message: string, type: ActionLog['type'] = 'action') {
    const entry: ActionLog = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      timestamp: Date.now(),
      type,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop();
    if (this.onLog) {
      this.onLog(entry);
    }
  }

  // --- Seat & Player Management ---

  public getPlayerCount(): number {
    return this.players.filter((p) => p !== null).length;
  }

  public getActivePlayerCount(): number {
    return this.players.filter((p) => p !== null && !p.hasFolded && p.status !== 'sitting-out').length;
  }

  public getPlayersWithChips(): Player[] {
    return this.players.filter((p): p is Player => p !== null && p.chips > 0);
  }

  public findFirstEmptySeat(): number {
    return this.players.findIndex((p) => p === null);
  }

  public getPlayerById(id: string): Player | null {
    return this.players.find((p) => p?.id === id) ?? null;
  }

  public addPlayer(
    id: string,
    name: string,
    avatarColor: string,
    requestedSeat?: number
  ): { success: boolean; seatIndex?: number; error?: string } {
    const existing = this.getPlayerById(id);
    if (existing) {
      existing.isConnected = true;
      existing.name = name;
      this.addLog(`${name} reconnected.`, 'system');
      this.notifyChange();
      return { success: true, seatIndex: existing.seatIndex };
    }

    let seat = requestedSeat;
    if (seat === undefined || seat < 0 || seat >= 8 || this.players[seat] !== null) {
      seat = this.findFirstEmptySeat();
    }

    if (seat === -1) {
      return { success: false, error: 'Table is full (8 players max).' };
    }

    const isHost = this.getPlayerCount() === 0;
    const newPlayer: Player = {
      id,
      name,
      avatarSeed: name,
      avatarColor,
      seatIndex: seat,
      chips: this.settings.startingChips,
      currentBet: 0,
      totalHandBet: 0,
      status: 'waiting',
      holeCards: [],
      hasFolded: false,
      isAllIn: false,
      isHost,
      isConnected: true,
    };

    this.players[seat] = newPlayer;
    this.addLog(`${name} joined the table at seat ${seat + 1}.`, 'system');
    this.notifyChange();
    return { success: true, seatIndex: seat };
  }

  public removePlayer(id: string): boolean {
    const index = this.players.findIndex((p) => p?.id === id);
    if (index === -1) return false;

    const player = this.players[index]!;
    this.addLog(`${player.name} left the table.`, 'system');

    // If game is active and this player is in the hand, fold them
    if (this.stage !== 'waiting' && this.stage !== 'ended' && !player.hasFolded) {
      this.handleFold(player);
    }

    const wasHost = player.isHost;
    this.players[index] = null;
    this.playerActed[index] = false;

    // Transfer host if needed
    if (wasHost) {
      const nextHost = this.players.find((p) => p !== null);
      if (nextHost) {
        nextHost.isHost = true;
        this.addLog(`${nextHost.name} is now the host.`, 'system');
      }
    }

    // Check if remaining players can continue
    if (this.stage !== 'waiting' && this.stage !== 'ended') {
      const activeContenders = this.players.filter((p) => p !== null && !p.hasFolded);
      if (activeContenders.length <= 1) {
        this.checkHandCompletion();
      } else if (this.currentTurnSeat === index) {
        this.advanceTurn();
      }
    }

    this.notifyChange();
    return true;
  }

  public setPlayerDisconnected(id: string) {
    const player = this.getPlayerById(id);
    if (player) {
      player.isConnected = false;
      this.addLog(`${player.name} disconnected.`, 'system');
      this.notifyChange();
    }
  }

  public updateSettings(newSettings: Partial<TableSettings>) {
    if (this.stage !== 'waiting') {
      return { success: false, error: 'Cannot change settings while a game is active.' };
    }
    if (newSettings.startingChips) this.settings.startingChips = Number(newSettings.startingChips);
    if (newSettings.smallBlind) this.settings.smallBlind = Number(newSettings.smallBlind);
    if (newSettings.bigBlind) this.settings.bigBlind = Number(newSettings.bigBlind);
    if (newSettings.turnTimeLimit) this.settings.turnTimeLimit = Number(newSettings.turnTimeLimit);
    this.minRaise = this.settings.bigBlind;
    this.notifyChange();
    return { success: true };
  }

  // --- Game Flow ---

  public startGame(): { success: boolean; error?: string } {
    const playersWithChips = this.getPlayersWithChips();
    if (playersWithChips.length < 2) {
      return { success: false, error: 'Need at least 2 players with chips to start.' };
    }

    if (this.nextHandTimeout) {
      clearTimeout(this.nextHandTimeout);
      this.nextHandTimeout = null;
    }

    this.startNewHand();
    return { success: true };
  }

  private startNewHand() {
    const playersWithChips = this.getPlayersWithChips();
    if (playersWithChips.length < 2) {
      this.stage = 'waiting';
      this.addLog('Not enough players with chips. Game paused.', 'system');
      this.notifyChange();
      return;
    }

    this.handNumber++;
    this.communityCards = [];
    this.pots = [];
    this.winners = null;
    this.deck.reset();
    this.deck.shuffle();
    this.playerActed.fill(false);

    // Reset player round states
    for (const player of this.players) {
      if (player) {
        player.currentBet = 0;
        player.totalHandBet = 0;
        player.holeCards = [];
        player.hasFolded = player.chips <= 0;
        player.isAllIn = false;
        player.lastAction = undefined;
        player.handResult = undefined;
        player.status = player.chips > 0 ? 'active' : 'sitting-out';
      }
    }

    // Rotate dealer button to next active player
    this.dealerSeat = this.getNextSeat(this.dealerSeat, true, false);

    const activeCount = playersWithChips.length;
    if (activeCount === 2) {
      // Heads-up: Dealer is Small Blind, other player is Big Blind
      this.smallBlindSeat = this.dealerSeat;
      this.bigBlindSeat = this.getNextSeat(this.dealerSeat, true, false);
    } else {
      // 3+ players: Small Blind is left of Dealer, Big Blind is left of Small Blind
      this.smallBlindSeat = this.getNextSeat(this.dealerSeat, true, false);
      this.bigBlindSeat = this.getNextSeat(this.smallBlindSeat, true, false);
    }

    // Post blinds
    this.postBlind(this.smallBlindSeat, this.settings.smallBlind, 'Small Blind');
    this.postBlind(this.bigBlindSeat, this.settings.bigBlind, 'Big Blind');

    this.currentHighBet = this.settings.bigBlind;
    this.minRaise = this.settings.bigBlind;

    // Deal 2 hole cards to each active player
    for (let i = 0; i < 2; i++) {
      for (const player of this.players) {
        if (player && player.status !== 'sitting-out') {
          player.holeCards.push(...this.deck.deal(1));
        }
      }
    }

    this.stage = 'preflop';
    this.addLog(`Hand #${this.handNumber} started. Blinds: ${this.settings.smallBlind}/${this.settings.bigBlind}.`, 'phase');

    // First to act preflop:
    // Heads-up: Dealer / Small Blind acts first
    // 3+ players: Under the Gun (UTG) - seat after Big Blind
    if (activeCount === 2) {
      this.currentTurnSeat = this.smallBlindSeat;
    } else {
      this.currentTurnSeat = this.getNextSeat(this.bigBlindSeat, true, false);
    }

    this.startTurnTimer();
    this.notifyChange();
  }

  private postBlind(seatIndex: number, blindAmount: number, label: string) {
    const player = this.players[seatIndex];
    if (!player) return;

    const actual = Math.min(player.chips, blindAmount);
    player.chips -= actual;
    player.currentBet = actual;
    player.totalHandBet = actual;
    if (player.chips === 0) {
      player.isAllIn = true;
      player.status = 'all-in';
    }
    this.addLog(`${player.name} posted ${label} of ${actual} chips.`, 'action');
  }

  // --- Turn Navigation & Timing ---

  private getNextSeat(fromSeat: number, requireChips: boolean = false, skipAllIn: boolean = true): number {
    let seat = (fromSeat + 1) % 8;
    for (let i = 0; i < 8; i++) {
      const p = this.players[seat];
      if (p !== null) {
        if (p.hasFolded) {
          // folded
        } else if (requireChips && p.chips <= 0 && (!skipAllIn ? !p.isAllIn : true)) {
          // not eligible
        } else if (skipAllIn && p.isAllIn) {
          // skip all-in players
        } else {
          return seat;
        }
      }
      seat = (seat + 1) % 8;
    }
    return fromSeat;
  }

  private startTurnTimer() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = null;
    }

    if (this.currentTurnSeat === null) {
      this.turnExpiresAt = null;
      return;
    }

    const duration = this.settings.turnTimeLimit * 1000;
    this.turnExpiresAt = Date.now() + duration;

    this.turnTimeout = setTimeout(() => {
      this.handleTurnTimeout();
    }, duration);
  }

  private handleTurnTimeout() {
    if (this.currentTurnSeat === null) return;
    const player = this.players[this.currentTurnSeat];
    if (!player) return;

    // On timeout: if player can check, check; otherwise, fold
    const actions = this.getAvailableActions(player.id);
    if (actions.canCheck) {
      this.executeAction(player.id, 'check');
    } else {
      this.executeAction(player.id, 'fold');
    }
  }

  // --- Available Actions Calculation ---

  public getAvailableActions(playerId: string): AvailableActions {
    const empty: AvailableActions = {
      canFold: false,
      canCheck: false,
      canCall: false,
      callAmount: 0,
      canBet: false,
      minBet: 0,
      maxBet: 0,
      canRaise: false,
      minRaise: 0,
      maxRaise: 0,
      canAllIn: false,
      allInAmount: 0,
    };

    const player = this.getPlayerById(playerId);
    if (!player) return empty;
    if (this.currentTurnSeat !== player.seatIndex) return empty;
    if (player.hasFolded || player.isAllIn || player.chips <= 0) return empty;

    const toCall = this.currentHighBet - player.currentBet;
    const canFold = true;
    const canCheck = toCall === 0;

    const canCall = toCall > 0 && player.chips >= toCall;
    const callAmount = Math.min(toCall, player.chips);

    const canAllIn = player.chips > 0;
    const allInAmount = player.chips + player.currentBet;

    let canBet = false;
    let minBet = 0;
    let maxBet = 0;

    let canRaise = false;
    let minRaise = 0;
    let maxRaise = 0;

    if (this.currentHighBet === 0) {
      // Opening bet round
      if (player.chips > 0) {
        canBet = true;
        minBet = Math.min(player.chips, this.settings.bigBlind);
        maxBet = player.chips;
      }
    } else {
      // Someone has bet, player can raise if they have enough chips
      const minRaiseTarget = this.currentHighBet + Math.max(this.minRaise, this.settings.bigBlind);
      if (allInAmount > this.currentHighBet) {
        canRaise = true;
        minRaise = Math.min(allInAmount, minRaiseTarget);
        maxRaise = allInAmount;
      }
    }

    return {
      canFold,
      canCheck,
      canCall,
      callAmount,
      canBet,
      minBet,
      maxBet,
      canRaise,
      minRaise,
      maxRaise,
      canAllIn,
      allInAmount,
    };
  }

  // --- Action Execution ---

  public executeAction(
    playerId: string,
    action: ActionType,
    amount?: number
  ): { success: boolean; error?: string } {
    const player = this.getPlayerById(playerId);
    if (!player) return { success: false, error: 'Player not found.' };
    if (this.currentTurnSeat !== player.seatIndex) {
      return { success: false, error: 'Not your turn.' };
    }

    const available = this.getAvailableActions(playerId);

    switch (action) {
      case 'fold': {
        this.handleFold(player);
        break;
      }

      case 'check': {
        if (!available.canCheck) return { success: false, error: 'Cannot check, bet required.' };
        player.lastAction = { type: 'check', timestamp: Date.now() };
        this.playerActed[player.seatIndex] = true;
        this.addLog(`${player.name} checked.`, 'action');
        break;
      }

      case 'call': {
        const toCall = this.currentHighBet - player.currentBet;
        const actualCall = Math.min(player.chips, toCall);
        player.chips -= actualCall;
        player.currentBet += actualCall;
        player.totalHandBet += actualCall;
        if (player.chips === 0) {
          player.isAllIn = true;
          player.status = 'all-in';
        }
        player.lastAction = { type: 'call', amount: actualCall, timestamp: Date.now() };
        this.playerActed[player.seatIndex] = true;
        this.addLog(`${player.name} called ${actualCall} chips.`, 'action');
        break;
      }

      case 'bet': {
        if (!available.canBet) return { success: false, error: 'Cannot bet at this time.' };
        const betAmount = Math.max(available.minBet, Math.min(amount ?? available.minBet, available.maxBet));
        player.chips -= betAmount;
        player.currentBet = betAmount;
        player.totalHandBet += betAmount;
        if (player.chips === 0) {
          player.isAllIn = true;
          player.status = 'all-in';
        }
        this.currentHighBet = betAmount;
        this.minRaise = betAmount;
        player.lastAction = { type: 'bet', amount: betAmount, timestamp: Date.now() };
        // Reset playerActed for all other active non-all-in players
        this.resetActedExcept(player.seatIndex);
        this.playerActed[player.seatIndex] = true;
        this.addLog(`${player.name} bet ${betAmount} chips.`, 'action');
        break;
      }

      case 'raise': {
        if (!available.canRaise) return { success: false, error: 'Cannot raise at this time.' };
        const targetTotalBet = Math.max(available.minRaise, Math.min(amount ?? available.minRaise, available.maxRaise));
        const needed = targetTotalBet - player.currentBet;
        player.chips -= needed;
        player.totalHandBet += needed;
        const raiseDifference = targetTotalBet - this.currentHighBet;
        if (raiseDifference >= this.minRaise) {
          this.minRaise = raiseDifference;
        }
        this.currentHighBet = targetTotalBet;
        player.currentBet = targetTotalBet;
        if (player.chips === 0) {
          player.isAllIn = true;
          player.status = 'all-in';
        }
        player.lastAction = { type: 'raise', amount: targetTotalBet, timestamp: Date.now() };
        this.resetActedExcept(player.seatIndex);
        this.playerActed[player.seatIndex] = true;
        this.addLog(`${player.name} raised to ${targetTotalBet} chips.`, 'action');
        break;
      }

      case 'all-in': {
        if (!available.canAllIn) return { success: false, error: 'Cannot go all-in.' };
        const allInTotal = player.chips + player.currentBet;
        const chipsPushed = player.chips;
        player.chips = 0;
        player.currentBet = allInTotal;
        player.totalHandBet += chipsPushed;
        player.isAllIn = true;
        player.status = 'all-in';

        if (allInTotal > this.currentHighBet) {
          const diff = allInTotal - this.currentHighBet;
          if (diff >= this.minRaise) {
            this.minRaise = diff;
          }
          this.currentHighBet = allInTotal;
          this.resetActedExcept(player.seatIndex);
        }
        player.lastAction = { type: 'all-in', amount: allInTotal, timestamp: Date.now() };
        this.playerActed[player.seatIndex] = true;
        this.addLog(`${player.name} went ALL-IN for ${allInTotal} chips!`, 'action');
        break;
      }

      default:
        return { success: false, error: 'Unknown action.' };
    }

    this.advanceTurn();
    this.notifyChange();
    return { success: true };
  }

  private handleFold(player: Player) {
    player.hasFolded = true;
    player.status = 'folded';
    player.lastAction = { type: 'fold', timestamp: Date.now() };
    this.playerActed[player.seatIndex] = true;
    this.addLog(`${player.name} folded.`, 'action');
  }

  private resetActedExcept(seatIndex: number) {
    for (let i = 0; i < 8; i++) {
      if (i !== seatIndex) {
        this.playerActed[i] = false;
      }
    }
  }

  // --- Turn Progression & Betting Round Completion ---

  private advanceTurn() {
    // 1. Check if only one non-folded player remains
    const activeNonFolded = this.players.filter((p): p is Player => p !== null && !p.hasFolded);
    if (activeNonFolded.length <= 1) {
      this.checkHandCompletion();
      return;
    }

    // 2. Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.advanceStage();
      return;
    }

    // 3. Move to next active player who can act (not folded, not all-in)
    const nextSeat = this.findNextSeatToAct(this.currentTurnSeat!);
    if (nextSeat === null) {
      // No one else can act (e.g. everyone is all-in)
      this.advanceStage();
      return;
    }

    this.currentTurnSeat = nextSeat;
    this.startTurnTimer();
  }

  private isBettingRoundComplete(): boolean {
    const playersToAct = this.players.filter(
      (p): p is Player => p !== null && !p.hasFolded && !p.isAllIn && p.chips > 0
    );

    // If 0 or 1 player has chips and everyone else is all-in or folded, round is done
    if (playersToAct.length <= 1) {
      // Check if the 1 player has at least called the currentHighBet or acted
      const needsToCall = playersToAct.some((p) => p.currentBet < this.currentHighBet);
      if (!needsToCall && playersToAct.every((p) => this.playerActed[p.seatIndex])) {
        return true;
      }
    }

    // All active non-all-in players must have acted AND matched currentHighBet
    return playersToAct.every(
      (p) => this.playerActed[p.seatIndex] && p.currentBet === this.currentHighBet
    );
  }

  private findNextSeatToAct(fromSeat: number): number | null {
    let seat = (fromSeat + 1) % 8;
    for (let i = 0; i < 8; i++) {
      const p = this.players[seat];
      if (p !== null && !p.hasFolded && !p.isAllIn && p.chips > 0) {
        // If they haven't acted yet, or they need to call a higher bet
        if (!this.playerActed[seat] || p.currentBet < this.currentHighBet) {
          return seat;
        }
      }
      seat = (seat + 1) % 8;
    }
    return null;
  }

  private advanceStage() {
    // Reset round bets
    for (const player of this.players) {
      if (player) {
        player.currentBet = 0;
      }
    }
    this.currentHighBet = 0;
    this.minRaise = this.settings.bigBlind;
    this.playerActed.fill(false);

    // Check if remaining active players are all-in or only one can bet
    const canBetPlayers = this.players.filter(
      (p): p is Player => p !== null && !p.hasFolded && !p.isAllIn && p.chips > 0
    );

    switch (this.stage) {
      case 'preflop':
        this.stage = 'flop';
        this.communityCards.push(...this.deck.deal(3));
        this.addLog('Dealing Flop: ' + this.communityCards.map((c) => `${c.rank}${c.suit[0]}`).join(' '), 'phase');
        break;

      case 'flop':
        this.stage = 'turn';
        this.communityCards.push(...this.deck.deal(1));
        this.addLog(`Dealing Turn: ${this.communityCards[3].rank}${this.communityCards[3].suit[0]}`, 'phase');
        break;

      case 'turn':
        this.stage = 'river';
        this.communityCards.push(...this.deck.deal(1));
        this.addLog(`Dealing River: ${this.communityCards[4].rank}${this.communityCards[4].suit[0]}`, 'phase');
        break;

      case 'river':
        this.stage = 'showdown';
        this.checkHandCompletion();
        return;
    }

    // If 0 or 1 player can take actions, deal remaining cards out automatically to showdown
    if (canBetPlayers.length <= 1) {
      this.currentTurnSeat = null;
      this.turnExpiresAt = null;
      if (this.turnTimeout) clearTimeout(this.turnTimeout);

      // Fast-forward to showdown with small delays or directly
      setTimeout(() => {
        if (this.stage === 'flop') {
          this.advanceStage();
        } else if (this.stage === 'turn') {
          this.advanceStage();
        } else if (this.stage === 'river') {
          this.advanceStage();
        }
      }, 1000);
      this.notifyChange();
      return;
    }

    // First player to act post-flop is closest clockwise from dealer button
    this.currentTurnSeat = this.findFirstToActPostFlop();
    this.startTurnTimer();
    this.notifyChange();
  }

  private findFirstToActPostFlop(): number | null {
    let seat = (this.dealerSeat + 1) % 8;
    for (let i = 0; i < 8; i++) {
      const p = this.players[seat];
      if (p !== null && !p.hasFolded && !p.isAllIn && p.chips > 0) {
        return seat;
      }
      seat = (seat + 1) % 8;
    }
    return null;
  }

  // --- Hand Completion & Pot Payout ---

  private checkHandCompletion() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = null;
    }
    this.currentTurnSeat = null;
    this.turnExpiresAt = null;

    const activeNonFolded = this.players.filter((p): p is Player => p !== null && !p.hasFolded);

    // Prepare contribution list
    const contributions: PlayerHandContribution[] = this.players
      .filter((p): p is Player => p !== null)
      .map((p) => ({
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex,
        totalBet: p.totalHandBet,
        hasFolded: p.hasFolded,
        holeCards: p.holeCards,
      }));

    const { pots, refunds } = calculatePots(contributions);
    this.pots = pots;

    // Apply refunds
    for (const ref of refunds) {
      const player = this.getPlayerById(ref.playerId);
      if (player && ref.amount > 0) {
        player.chips += ref.amount;
        this.addLog(`Uncalled bet of ${ref.amount} refunded to ${player.name}.`, 'system');
      }
    }

    // Scenario A: Everyone else folded, single winner
    if (activeNonFolded.length === 1) {
      const winner = activeNonFolded[0];
      const totalWon = pots.reduce((sum, pot) => sum + pot.amount, 0);
      winner.chips += totalWon;

      this.winners = [
        {
          playerId: winner.id,
          name: winner.name,
          amount: totalWon,
          handName: 'Everyone else folded',
          cards: winner.holeCards,
          seatIndex: winner.seatIndex,
        },
      ];

      this.addLog(`${winner.name} won ${totalWon} chips (all opponents folded).`, 'win');
    } else {
      // Scenario B: Showdown with 2+ players
      this.stage = 'showdown';
      const winners = resolvePots(pots, contributions, this.communityCards, this.dealerSeat);
      this.winners = winners;

      // Distribute chips to winners
      for (const w of winners) {
        const player = this.getPlayerById(w.playerId);
        if (player) {
          player.chips += w.amount;
          player.handResult = {
            rankName: w.handName,
            wonAmount: w.amount,
            cards: w.cards,
          };
          this.addLog(`${w.name} won ${w.amount} chips with ${w.handName}!`, 'win');
        }
      }
    }

    this.stage = 'ended';
    this.notifyChange();

    // Auto schedule next hand in 6 seconds
    this.nextHandTimeout = setTimeout(() => {
      this.startNewHand();
    }, 6000);
  }

  // --- Public State Sanitization ---

  public getPublicState(forPlayerId?: string): PublicTableState {
    const totalPot = this.pots.reduce((sum, p) => sum + p.amount, 0) +
      this.players.reduce((sum, p) => sum + (p?.currentBet ?? 0), 0);

    const isShowdownOrEnded = this.stage === 'showdown' || this.stage === 'ended';

    // Mask hole cards unless it belongs to the player or hand is at showdown
    const sanitizedPlayers = this.players.map((p) => {
      if (!p) return null;
      const isOwner = p.id === forPlayerId;
      const shouldReveal = isOwner || (isShowdownOrEnded && !p.hasFolded);

      return {
        ...p,
        holeCards: shouldReveal ? p.holeCards : [],
      };
    });

    return {
      roomId: this.roomId,
      stage: this.stage,
      players: sanitizedPlayers,
      communityCards: this.communityCards,
      pots: this.pots,
      totalPot,
      dealerSeat: this.dealerSeat,
      smallBlindSeat: this.smallBlindSeat,
      bigBlindSeat: this.bigBlindSeat,
      currentTurnSeat: this.currentTurnSeat,
      minRaise: this.minRaise,
      currentHighBet: this.currentHighBet,
      settings: this.settings,
      handNumber: this.handNumber,
      winners: this.winners,
      turnExpiresAt: this.turnExpiresAt,
      minPlayers: 2,
      maxPlayers: 8,
    };
  }
}
