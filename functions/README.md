# Firestore structure

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

⸻

1) File layout