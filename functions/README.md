# QTV Firebase Backend (Cloud Functions + Firestore)

This directory contains the backend for QTV’s trading games, implemented with **Firebase Cloud Functions** (callable HTTPS functions) and **Cloud Firestore**.

- **Node:** 20
- **Functions region:** `us-east1`
- **Invocation model:** **Callable functions** (`httpsCallable`) — do not call function URLs with `fetch()`.

---

## Architecture Overview

### Key ideas

- Users join/leave games via callable endpoints.
- A user’s “in game” status is determined by `users/{uid}.currentGame` (the canonical source of truth).
- Game state is stored in Firestore and streamed to clients with `onSnapshot`.

### Firestore structure

users/{uid}
  • email
  • currentGame: { gameId, teamId } or null
  • balance (global)

games/{gameId}
  • type, status, visibility, season
  • createdAt, startAt, closedAt
  • rolls (or gameState object)
  • tick: { n, nextAt } (optional)
  • leaderboard (optional)

games/{gameId}/teams/{teamId}
  • name
  • balance

games/{gameId}/teams/{teamId}/players/{uid}
  • email
  • pnl

games/{gameId}/markets/{marketId}
  • name
  • bestBid, bestAsk, lastPrice, finalPrice

games/{gameId}/markets/{marketId}/orders/{orderId}
  • userId, teamId
  • side: “buy”|“sell”
  • price
  • sharesRemaining
  • status: “open”|“filled”|“cancelled”
  • createdAt

global_leaderboards/{season}
  • teams: array of team objects with pnl
  • players: array of player objects with pnl

### Notes on Scaling / Adding New Games

To add a new game type:

1. Add game type metadata (markets list, tick logic, final price logic).
2. Ensure createGame initializes the correct markets under games/{gameId}/markets.
3. Implement tickGame behavior for the new type.
4. Implement closeGame final price calculation for the new markets.
5. Keep the order/trade system generic so all games reuse it.

## Development

Test rigorously before deploying. Launch an emulator to test locally:

See [Firebase Emulators Documentation](https://firebase.google.com/docs/emulator-suite) for more information.

```bash
firebase emulators:start
```

After testing, deploy changes to Firebase:

See [Firebase Deployment Documentation](https://firebase.google.com/docs/cli#deploying) for more information.

```bash
firebase deploy
```

To deploy only functions:

```bash
firebase deploy --only functions
```

To deploy only hosting:

```bash
firebase deploy --only hosting
```

To deploy select functions:

```bash
firebase deploy --only functions:createGame,functions:joinGame
```

## TODO

- [ ] Add more games
- [ ] Test and bugfix
- [ ] Ensure leaderboard structure is correct