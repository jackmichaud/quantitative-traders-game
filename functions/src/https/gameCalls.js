const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { requireAuth } = require("../utils/auth");
const { toHttpsError } = require("../utils/errors");
const { requireString } = require("../utils/validate");
const { db } = require("../admin");

const gameService = require("../services/gameService");
const settlementService = require("../services/settlementService");

exports.createGame = onCall(async (req) => {
  try {
    requireAuth(req);
    const type = requireString(req.data.type, "type");
    const season = req.data.season ?? null;
    const visibility = req.data.visibility ?? "unofficial";
    return await gameService.createGame({ type, season, visibility });
  } catch (e) {
    throw toHttpsError(e);
  }
});

exports.joinGame = onCall(async (req) => {
  try {
    const uid = requireAuth(req);
    const gameId = requireString(req.data.gameId, "gameId");
    const teamName = requireString(req.data.teamName, "teamName");

    const userSnap = await db.collection("users").doc(uid).get();
    const email = userSnap.data()?.email || req.auth?.token?.email || null;

    return await gameService.joinGame({ uid, gameId, teamName, userEmail: email });
  } catch (e) {
    throw toHttpsError(e);
  }
});

exports.leaveGame = onCall(async (req) => {
  try {
    const uid = requireAuth(req);
    return await gameService.leaveGame({ uid });
  } catch (e) {
    throw toHttpsError(e);
  }
});

exports.startGame = onCall(async (req) => {
  try {
    const uid = requireAuth(req);
    return await gameService.startGame({ uid });
  } catch (e) {
    throw toHttpsError(e);
  }
});

exports.tickGame = onCall(async (req) => {
  try {
    const uid = requireAuth(req);
    return await gameService.tickGame({ uid });
  } catch (e) {
    throw toHttpsError(e);
  }
});

exports.closeGame = onCall(async (req) => {
  try {
    const uid = requireAuth(req);
    return await settlementService.closeGame({ uid });
  } catch (e) {
    throw toHttpsError(e);
  }
});