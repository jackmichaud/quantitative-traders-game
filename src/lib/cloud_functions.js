import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

export const joinGame = httpsCallable(functions, 'joinGame');

export const leaveGame = httpsCallable(functions, 'leaveGame');

export const placeOrder = httpsCallable(functions, 'placeOrder');

export const cancelOrder = httpsCallable(functions, 'cancelOrder');

// Admin functions

export const startGame = httpsCallable(functions, 'startGameManual');

export const endGame = httpsCallable(functions, 'endGameManual');

export const rollDice = httpsCallable(functions, 'rollDiceManual');

export const createGame = httpsCallable(functions, 'createGameManual');

export const closeGame = httpsCallable(functions, 'closeGame');

export const updateMarket = httpsCallable(functions, 'updateMarket');

