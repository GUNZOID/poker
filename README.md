# Minimal Online Multiplayer Texas Hold'em Poker

A minimal, lightweight, real-time multiplayer Texas Hold'em poker web application designed for friends to play together via a public URL or local network. Inspired by **Discord's Poker Night activity**: minimal, friendly, dark, clean, and instant.

---

## Features

- **Discord-Inspired Design**:
  - Dark charcoal and muted slate background (`#111214`, `#1e1f22`, `#2b2d31`).
  - Subtle Discord blurple/indigo accents (`#5865F2`).
  - Muted green oval felt table with clean card slots and pot indicators.
  - Crisp, accessible CSS-rendered cards and poker chips without bulky image assets.
  - Subtle Framer Motion animations that never delay player actions.
  - Built-in procedural Web Audio API sound synthesizer (card deals, chip clinks, knocks, turn alerts, and victory chimes) with a one-click mute toggle.

- **Authoritative Server Engine**:
  - Full No-Limit Texas Hold'em logic implemented strictly on the server:
    - 2–8 players per table.
    - Rotating dealer button, small blind, and big blind.
    - Pre-flop, Flop, Turn, River, and Showdown phases.
    - Fold, Check, Call, Bet, Raise, and All-in actions with minimum raise enforcement.
    - Side pots for all-ins with unequal stacks.
    - Uncalled bet refunds.
    - Complete 5-card poker hand evaluation (Royal Flush through High Card) with kicker tie-breakers and split pots.
    - Automatic showdown reveal and progression to the next hand.
    - Server-side cryptographically secure Fisher-Yates deck shuffle.
    - Strict state sanitization: hole cards are sent only to the owner during play and revealed to opponents only at showdown.
    - Disconnection and reconnection handling (players retain their seat, chips, and cards via persistent session identity).

- **Lobby & Social Features**:
  - Quick room creation with 6-character room codes (e.g. `POKER7`).
  - One-click shareable invitation URL (`/?room=CODE`).
  - Configurable starting stacks (default 1,000 chips), blinds (default 10/20), and turn timers.
  - Real-time in-room text chat.
  - Table action feed / event history.
  - Mobile-responsive layout that adapts comfortably to phones and tablets.
  - Virtual chips only — pure casual social entertainment with friends.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript |
| **Styling** | Tailwind CSS |
| **Animations & Icons** | Framer Motion, Lucide React |
| **Audio** | Web Audio API procedural sound synthesizer |
| **Backend** | Node.js, Express |
| **Multiplayer** | Socket.IO (WebSocket with polling fallback) |
| **Testing** | Vitest (unit & end-to-end integration tests) |
| **Bundling** | Vite (Client) + esbuild (Server) |

---

## Project Structure

```text
├── src/
│   ├── client/                  # React Frontend
│   │   ├── components/
│   │   │   ├── ActionControls.tsx   # Betting controls & shortcuts (Check, Call, Raise, All-in)
│   │   │   ├── ChatAndLogs.tsx      # In-room chat & action history drawer
│   │   │   ├── Header.tsx           # Room code, sound toggle, leave button
│   │   │   ├── LandingPage.tsx      # Create & Join room forms
│   │   │   ├── Lobby.tsx            # Waiting room & seat selector
│   │   │   ├── PlayerSeat.tsx       # Player pod, avatar, cards, badges, turn indicator
│   │   │   ├── PlayingCard.tsx      # CSS-rendered playing card
│   │   │   ├── PokerChip.tsx        # CSS-rendered poker chip
│   │   │   ├── PokerTable.tsx       # Oval felt table, pot, community cards
│   │   │   └── WinnerOverlay.tsx    # Celebratory winning hand banner
│   │   ├── sound.ts             # Web Audio API sound generator
│   │   ├── socket.ts            # Socket.IO client & identity manager
│   │   ├── App.tsx              # Root application component
│   │   ├── index.css            # Tailwind directives & felt styling
│   │   └── main.tsx             # Client entry point
│   ├── server/                  # Node.js Server & Game Engine
│   │   ├── engine/
│   │   │   ├── deck.ts          # 52-card deck with Fisher-Yates shuffle
│   │   │   ├── evaluator.ts     # 5-card & 7-card poker hand evaluation
│   │   │   ├── pot.ts           # Side pots, uncalled bet refunds, split pots
│   │   │   └── table.ts         # Authoritative PokerTable state machine
│   │   ├── index.ts             # Express & Socket.IO server entry
│   │   ├── roomManager.ts       # Room lifecycle & session mapping
│   │   └── socketHandlers.ts    # Socket.IO events & sanitized state broadcasting
│   └── shared/
│       └── types.ts             # Shared TypeScript types and Socket events
├── tests/
│   ├── evaluator.test.ts        # Hand rankings, wheel straight, tie-breakers
│   ├── pot.test.ts              # Side pots, uncalled refunds, split pots
│   ├── table.test.ts            # Betting rounds, blinds, fold wins, state masking
│   └── multiplayer-e2e.test.ts  # End-to-end real-time 2-player game over WebSockets
├── Dockerfile                   # Multi-stage production container build
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node v20 and v24)
- npm 9+

### 1. Installation

Clone or enter the project directory:

```bash
git clone <repo-url>
cd magical-hawking
npm install
```

### 2. Running in Development Mode

Run the backend server and frontend Vite development server concurrently:

```bash
npm run dev
```

- **Frontend (Vite)**: [http://localhost:5173](http://localhost:5173) (automatically proxies `/socket.io` to the server).
- **Backend (Express + Socket.IO)**: [http://localhost:3001](http://localhost:3001).

You can also run them individually:
```bash
# Server only
npm run dev:server

# Client only
npm run dev:client
```

### 3. Running Automated Tests

Run the full Vitest suite (evaluator rankings, kicker rules, side pots, uncalled refunds, table turns, and multiplayer lifecycle):

```bash
npm test
```

For watch mode during development:
```bash
npm run test:watch
```

---

## Production Build & Self-Hosting

### Building for Production

Compile both the frontend (into `dist/client`) and server (into `dist/server/index.js`):

```bash
npm run build
```

### Running the Production Server

Start the production server:

```bash
npm start
```

The Express server serves the production SPA from `dist/client` and mounts the Socket.IO WebSocket server on the same port ([http://localhost:3001](http://localhost:3001) or whatever `PORT` is configured in environment variables).

---

## Public Deployment Guide

Because the application uses WebSocket connections for real-time multiplayer, choose a hosting provider that supports persistent connections.

### Option 1: Render (Web Service)

1. Connect your repository to [Render.com](https://render.com).
2. Choose **Web Service** with runtime **Node**.
3. Set the following settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `PORT=3001` (or Render's automatic port)
     - `NODE_ENV=production`
4. Render provisions a public HTTPS URL (e.g. `https://my-poker-game.onrender.com`). Share this URL with your friends to play!

### Option 2: Railway

1. Click **New Project** -> **Deploy from GitHub repo** on [Railway.app](https://railway.app).
2. Railway will detect the `package.json` or `Dockerfile`.
3. Railway automatically sets `PORT` and provides a public domain.

### Option 3: Fly.io

1. Install `flyctl` and run:
   ```bash
   fly launch
   fly deploy
   ```
2. The included multi-stage `Dockerfile` will automatically build the client and server and run tests during the build step.

### Option 4: Docker

Run anywhere using Docker:

```bash
# Build the image
docker build -t minimal-poker .

# Run the container on port 3001
docker run -p 3001:3001 minimal-poker
```

Access the game at `http://localhost:3001`.

---

## Rules and Game Flow Reference

1. **Pre-Flop**:
   - Dealer button rotates clockwise.
   - Small blind and big blind are automatically posted.
   - Two private hole cards are dealt to each active player.
   - Action begins with Under the Gun (or Small Blind in heads-up).
2. **Flop, Turn, River**:
   - 3 community cards dealt on Flop, 1 on Turn, 1 on River.
   - Players can Check (if no bet), Bet, Call, Raise, or Fold.
   - If an all-in occurs, side pots are calculated automatically.
   - Uncalled bets (e.g. a raise that exceeds all opponents' remaining stacks) are immediately refunded.
3. **Showdown**:
   - Non-folded hands are revealed and evaluated using standard 5-card Texas Hold'em rankings.
   - Pots and side pots are awarded to the winning hands.
   - Tied hands trigger an exact split pot (with odd chips awarded clockwise from dealer).
   - A 6-second celebration banner displays the winning hands before the next hand starts automatically.

---

## License

MIT. Built for friendly games among friends with virtual chips.
