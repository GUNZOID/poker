export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "14-hearts"
}

export type HandRank = 
  | 1 // High Card
  | 2 // One Pair
  | 3 // Two Pair
  | 4 // Three of a Kind
  | 5 // Straight
  | 6 // Flush
  | 7 // Full House
  | 8 // Four of a Kind
  | 9 // Straight Flush
  | 10; // Royal Flush

export interface HandEvaluation {
  handRank: HandRank;
  rankName: string;
  score: number[]; // e.g. [7, 14, 13] for comparison
  bestFiveCards: Card[];
}

export type GameStage = 
  | 'waiting' 
  | 'preflop' 
  | 'flop' 
  | 'turn' 
  | 'river' 
  | 'showdown' 
  | 'ended';

export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'all-in' | 'sitting-out';

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface PlayerAction {
  type: ActionType;
  amount?: number;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  avatarSeed: string;
  avatarColor: string;
  seatIndex: number;
  chips: number;
  currentBet: number;
  totalHandBet: number;
  status: PlayerStatus;
  holeCards: Card[];
  hasFolded: boolean;
  isAllIn: boolean;
  lastAction?: PlayerAction;
  isHost: boolean;
  isConnected: boolean;
  handResult?: {
    rankName: string;
    wonAmount: number;
    cards: Card[];
  };
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
  winners?: {
    playerId: string;
    amount: number;
    handName?: string;
  }[];
}

export interface TableSettings {
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  turnTimeLimit: number; // in seconds
}

export interface HandWinner {
  playerId: string;
  name: string;
  amount: number;
  handName: string;
  cards: Card[];
  seatIndex: number;
}

export interface PublicTableState {
  roomId: string;
  stage: GameStage;
  players: (Player | null)[];
  communityCards: Card[];
  pots: Pot[];
  totalPot: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentTurnSeat: number | null;
  minRaise: number;
  currentHighBet: number;
  settings: TableSettings;
  handNumber: number;
  winners: HandWinner[] | null;
  turnExpiresAt: number | null;
  minPlayers: number;
  maxPlayers: number;
}

export interface AvailableActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canBet: boolean;
  minBet: number;
  maxBet: number;
  canRaise: boolean;
  minRaise: number;
  maxRaise: number;
  canAllIn: boolean;
  allInAmount: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface ActionLogEntry {
  id: string;
  message: string;
  timestamp: number;
  type: 'action' | 'phase' | 'win' | 'system';
}

// Socket Events
export interface ClientToServerEvents {
  'room:create': (data: { playerName: string; settings?: Partial<TableSettings> }, callback: (response: { success: boolean; roomId?: string; playerId?: string; error?: string }) => void) => void;
  'room:join': (data: { roomId: string; playerName: string; playerId?: string; seatIndex?: number }, callback: (response: { success: boolean; playerId?: string; error?: string }) => void) => void;
  'game:start': (callback: (response: { success: boolean; error?: string }) => void) => void;
  'game:action': (data: { action: ActionType; amount?: number }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'table:leave': (callback: (response: { success: boolean }) => void) => void;
  'table:sit': (data: { seatIndex: number }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'chat:send': (data: { text: string }) => void;
  'room:update-settings': (data: Partial<TableSettings>, callback: (response: { success: boolean; error?: string }) => void) => void;
}

export interface ServerToClientEvents {
  'table:state': (state: PublicTableState) => void;
  'player:private-cards': (cards: Card[]) => void;
  'chat:message': (message: ChatMessage) => void;
  'log:action': (entry: ActionLogEntry) => void;
  'game:alert': (message: string) => void;
  'error': (message: string) => void;
}
