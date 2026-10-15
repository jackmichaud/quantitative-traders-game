#!/usr/bin/env node
/**
 * season-leaderboard.js
 *
 * Generates a head-to-head matchup leaderboard for a given season.
 * Fetches all closed official games for the season, pairs up every team
 * (each pair matched at most once), and prints results + standings.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
 *     node season-leaderboard.js <season> [--project <projectId>]
 *
 * Auth:
 *   Set GOOGLE_APPLICATION_CREDENTIALS to your service account key file,
 *   or use Application Default Credentials if already configured via gcloud.
 */

"use strict";

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith("--")) {
  console.error("Usage: node season-leaderboard.js <season> [--project <projectId>]");
  process.exit(1);
}

const season = args[0];
let projectId;
const projectIdx = args.indexOf("--project");
if (projectIdx !== -1) {
  projectId = args[projectIdx + 1];
}

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------
initializeApp({
  credential: applicationDefault(),
  ...(projectId ? { projectId } : {}),
});
const db = getFirestore();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Canonical key for a team pair (order-independent). */
function pairKey(a, b) {
  return [a, b].sort().join("|||");
}

/** Format a score for display. */
function fmtScore(score) {
  if (!isFinite(score)) return "-Inf";
  return score.toFixed(2);
}

/** Left-pad a string to width. */
function pad(str, width) {
  return String(str).padEnd(width);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n=== Season: ${season} ===\n`);

  // 1. Fetch all closed official games for this season
  const gamesSnap = await db
    .collection("games")
    .where("visibility", "==", "official")
    .where("season", "==", season)
    .where("status", "==", "closed")
    .get();

  if (gamesSnap.empty) {
    console.log("No closed official games found for this season.");
    return;
  }

  // Sort games by startAt ascending
  const games = gamesSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const ta = a.startAt ? a.startAt.toMillis() : 0;
      const tb = b.startAt ? b.startAt.toMillis() : 0;
      return ta - tb;
    });

  console.log(`Found ${games.length} official closed game(s).\n`);

  // 2. Fetch teams for each game
  const gameTeams = {}; // gameId -> Map<teamName, balance>
  await Promise.all(
    games.map(async (game) => {
      const teamsSnap = await db
        .collection("games")
        .doc(game.id)
        .collection("teams")
        .get();
      const teamMap = new Map();
      for (const t of teamsSnap.docs) {
        const data = t.data();
        teamMap.set(data.name, data.balance ?? 0);
      }
      gameTeams[game.id] = teamMap;
    })
  );

  // 3. Collect all unique team names across the season
  const allTeams = new Set();
  for (const game of games) {
    for (const name of gameTeams[game.id].keys()) {
      allTeams.add(name);
    }
  }
  const teamList = Array.from(allTeams).sort();

  // 4. Generate matchups
  const seenPairs = new Set(); // pairKey -> true
  const standings = {}; // teamName -> { w, l, d }
  for (const name of teamList) {
    standings[name] = { w: 0, l: 0, d: 0 };
  }

  const gameResults = []; // array of { game, matchups[] }

  for (const game of games) {
    const teams = gameTeams[game.id];
    const closedAt = game.closedAt
      ? new Date(game.closedAt.toMillis()).toISOString().slice(0, 10)
      : "unknown";

    const matchups = [];
    const skipped = [];
    const newMatchupsThisGame = new Set();

    for (let i = 0; i < teamList.length; i++) {
      for (let j = i + 1; j < teamList.length; j++) {
        const nameA = teamList[i];
        const nameB = teamList[j];
        const key = pairKey(nameA, nameB);

        if (seenPairs.has(key)) {
          skipped.push(`${nameA} vs ${nameB}`);
          continue;
        }

        seenPairs.add(key);
        newMatchupsThisGame.add(key);

        const scoreA = teams.has(nameA) ? teams.get(nameA) : -Infinity;
        const scoreB = teams.has(nameB) ? teams.get(nameB) : -Infinity;

        let winner, outcome;
        if (scoreA > scoreB) {
          winner = nameA;
          outcome = "WIN";
          standings[nameA].w++;
          standings[nameB].l++;
        } else if (scoreB > scoreA) {
          winner = nameB;
          outcome = "WIN";
          standings[nameB].w++;
          standings[nameA].l++;
        } else {
          winner = null;
          outcome = "DRAW";
          standings[nameA].d++;
          standings[nameB].d++;
        }

        const notPlayedA = !teams.has(nameA);
        const notPlayedB = !teams.has(nameB);
        const note =
          notPlayedA && notPlayedB
            ? `[neither team played]`
            : notPlayedA
            ? `[${nameA} did not play]`
            : notPlayedB
            ? `[${nameB} did not play]`
            : "";

        matchups.push({ nameA, scoreA, nameB, scoreB, winner, outcome, note });
      }
    }

    gameResults.push({ game, closedAt, matchups, skipped });
  }

  // 5. Print per-game results
  for (const { game, closedAt, matchups, skipped } of gameResults) {
    console.log(`--- Game: ${game.id} (${game.type}, closed ${closedAt}) ---`);

    if (matchups.length === 0 && skipped.length === 0) {
      console.log("  (no teams found in this game)");
    } else if (matchups.length === 0) {
      console.log("  (no new matchups — all pairs already played)");
    } else {
      // Calculate column widths for alignment
      const maxNameLen = Math.max(...teamList.map((n) => n.length));
      const scoreWidth = 10;

      for (const { nameA, scoreA, nameB, scoreB, winner, outcome, note } of matchups) {
        const colA = `${pad(nameA, maxNameLen)} (${fmtScore(scoreA)})`;
        const colB = `${pad(nameB, maxNameLen)} (${fmtScore(scoreB)})`;
        const result =
          outcome === "DRAW"
            ? "DRAW"
            : `${winner} WINS`;
        const notePart = note ? `  ${note}` : "";
        console.log(`  ${colA}  vs  ${colB}  ->  ${result}${notePart}`);
      }
    }

    for (const pair of skipped) {
      console.log(`  [already matched: ${pair}]`);
    }

    console.log();
  }

  // 6. Print final standings
  const sorted = teamList.slice().sort((a, b) => {
    const sa = standings[a];
    const sb = standings[b];
    if (sb.w !== sa.w) return sb.w - sa.w;
    if (sa.l !== sb.l) return sa.l - sb.l;
    return a.localeCompare(b);
  });

  console.log("=== Final Standings ===\n");
  const nameWidth = Math.max(4, ...teamList.map((n) => n.length)) + 2;
  console.log(`${pad("Rank", 6)}${pad("Team", nameWidth)}${pad("W", 5)}${pad("L", 5)}${"D"}`);
  console.log("-".repeat(6 + nameWidth + 15));
  sorted.forEach((name, idx) => {
    const s = standings[name];
    console.log(
      `${pad(idx + 1, 6)}${pad(name, nameWidth)}${pad(s.w, 5)}${pad(s.l, 5)}${s.d}`
    );
  });
  console.log();
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
