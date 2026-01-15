import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

export const joinGame = httpsCallable(functions, 'joinGame');

export const leaveGame = httpsCallable(functions, 'leaveGame');

export const placeOrder = httpsCallable(functions, 'placeOrder');

export const cancelOrder = httpsCallable(functions, 'cancelOrder');

// Admin functions

export const createGame = httpsCallable(functions, 'createGame');

export const startGame = httpsCallable(functions, 'startGame');

export const tickGame = httpsCallable(functions, 'tickGame');

export const closeGame = httpsCallable(functions, 'closeGame');



// export const updateMarket = httpsCallable(functions, 'updateMarket');
// export const endGame = httpsCallable(functions, 'closeGame');

