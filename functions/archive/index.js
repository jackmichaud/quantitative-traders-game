const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const {onDocumentCreated, onDocumentUpdated, onDocumentWritten} = require("firebase-functions/v2/firestore");
const {onMessagePublished} = require("firebase-functions/v2/pubsub");
const { getFunctions } = require("firebase-admin/functions");

const { createHash } = require('crypto');
const functions = require('firebase-functions/v1');
const logger = require("firebase-functions/logger");

// The Firebase Admin SDK to access Firestore.
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const { FieldValue } = require('firebase-admin/firestore');
const { title } = require("process");
  

initializeApp();


/**
 * Sets up a user document in Firestore when a new user is created in Firebase Authentication.
 * The document contains the user's email and an initial game state.
 *
 * @param {Object} user - The Firebase user object.
 * @return {Promise<void>} A promise that resolves when the user document is created.
 */
exports.setupUser = functions.auth.user().onCreate((user) => {
    const email = user.email; // The email of the user.
    const uid = user.uid; // The UID of the user.

    // Create the user document in Firestore
    getFirestore().collection('users').doc(uid).set({
        email: email,
        game: {type: "none", gameID: null, teamName: null}
    });

    logger.info("User created:", user.uid);
});

/**
 * Sets up a game for a user when they join a game.
 *
 * @param {Object} request - The request object containing the user's UID and game ID.
 * @param {Object} response - The response object.
 * @return {Promise<void>} A promise that resolves when the user document is created.
 */
exports.joinGame = onCall(async (request, response) => {
    if (!request.auth) {
        // Throwing an HttpsError so that the client gets the error details.
        throw new HttpsError("failed-precondition", "The function must be " +
                "called while authenticated.");
    }

    const gameID = request.data.game_id;
    const teamName = request.data.team_name;
    const uid = request.auth.uid;

    let collectionName = 'games';

    // Fetch the game document
    let gameDoc = await getFirestore().collection(collectionName).doc(gameID).get();

    if (!gameDoc.exists) {
        collectionName = 'unofficial_games';
        gameDoc = await getFirestore().collection(collectionName).doc(gameID).get();
    }

    // Check if the game exists
    if(!gameDoc.exists) {
        throw new HttpsError("not-found", "Game not found.");
    }

    const gameData = gameDoc.data();

    // Check if the game has already started
    if(gameData.status !== "waiting") {
        throw new HttpsError("deadline-exceeded", "Game already started.");
    }

    // Fetch the user document
    const userDoc = await getFirestore().collection('users').doc(uid).get();
    const userData = userDoc.data();

    const email = userData.email;

    // Find the team or create a new one
    const teams = gameData.teams || [];
    const teamIndex = teams.findIndex(team => team.name === teamName);

    if (teamIndex >= 0) {
        // Add user to the existing team
        teams[teamIndex].players = [...teams[teamIndex].players, {uid: uid, email: email}];
    } else {
        // Create a new team with the user
        teams.push({ name: teamName, balance: 0, players: [{uid: uid, email: email}] });
    }

    const news = gameData.news || [];
    news.push({
        title: "Player joined " + teamName,
        content: "",
        timestamp: Timestamp.now()
    })

    // Update the game document with the new teams array
    await getFirestore().collection(collectionName).doc(gameID).update({ teams: teams, news: news });

    // Add the gameID and teamName to the user document
    userData.game = {type: gameData.game_type, gameID: gameID, teamName: teamName, official: collectionName === 'games' ? true : false}
    await getFirestore().collection('users').doc(uid).update({ game: userData.game });

    return "Game joined successfully";
});

/**
 * Removes the user from their current game and updates their game info in Firestore.
 * 
 * @param {Object} request - The request object containing the user's authentication token and game info.
 * @param {Object} response - The response object.
 * @returns {Promise<String>} - A promise that resolves to a success message.
 * @throws {HttpsError} - If the user is not authenticated, if the game does not exist, or if the game has already started.
 */
exports.leaveGame = onCall(async (request, response) => {
    if (!request.auth) {       
        // Throwing an HttpsError so that the client gets the error details.    
        throw new HttpsError("failed-precondition", "The function must be " + 
            "called while authenticated");
    }

    const uid = request.auth.uid;

    // Fetch the user document
    const userDoc = await getFirestore().collection('users').doc(uid).get();
    const userData = userDoc.data();

    // Get gameID and teamName from the user document
    const gameID = userData.game.gameID
    const teamName = userData.game.teamName;
    const collectionName = userData.game.official ? 'games' : 'unofficial_games';

    // Fetch the game document
    const gameDoc = await getFirestore().collection(collectionName).doc(gameID).get();

    // Check if the game exists
    if(!gameDoc.exists) {
        throw new HttpsError("not-found", "Game not found.");
    }

    const gameData = gameDoc.data();

    // Check if the game has already started
    if(gameData.status === "active") {
        throw new HttpsError("deadline-exceeded", "Game already started.");
    }

    // Find the team
    const teams = gameData.teams || [];
    const teamIndex = teams.findIndex(team => team.name === teamName);

    // Check if team exists
    if (teamIndex < 0) {
        throw new HttpsError("not-found", "Team not found.");
    }

    // Remove the player's uid from the team
    teams[teamIndex].players = teams[teamIndex].players.filter(player => player.uid !== uid);

    // Check if the team is empty
    if (teams[teamIndex].players.length === 0) {
        // Remove the team from the game
        teams.splice(teamIndex, 1);
    }
    
    // Update the game document with the new teams array
    await getFirestore().collection(collectionName).doc(gameID).update({ teams: teams });

    // Remove the gameID and teamName from the user document
    userData.game = {type: "none", gameID: null, teamName: null};
    await getFirestore().collection('users').doc(uid).update({ game: userData.game });

    return "Game left successfully";
});

/**
 * Places an order for a user in a game.
 *
 * @param {Object} request - The request object containing the user's authentication token and order details.
 * @param {Object} response - The response object.
 * @returns {Promise<Object>} - A promise that resolves to the response data.
 * @throws {HttpsError} - If the user is not authenticated or if the game does not exist.
 */
exports.placeOrder = onCall(async (request, response) => {
    try {
        if (!request.auth) {       
            throw new HttpsError("failed-precondition", "The function must be called while authenticated");
        }

        let order = request.data;
        const uid = request.auth.uid;
        const market_name = order.market;

        // Create a unique order ID
        order.uuid = createHash('sha256').update(new TextEncoder().encode(JSON.stringify(order)) + uid + Math.random()).digest('hex');
        order.user = uid;

        // Fetch the user document and game ID
        const userDoc = await getFirestore().collection('users').doc(uid).get();
        const userData = userDoc.data();
        const gameID = userData.game.gameID;
        const teamName = userData.game.teamName;  // The user's team
        const official = userData.game.official
        const collectionName = official ? 'games' : 'unofficial_games';

        // Check that the game is active
        const gameDoc = await getFirestore().collection(collectionName).doc(gameID).get();
        const gameData = gameDoc.data();
        if (gameData.status !== "active") {
            throw new HttpsError("failed-precondition", "Game is not active");
        }

        // Fetch the market data
        const market = await getFirestore().collection(collectionName).doc(gameID).collection('markets').doc(market_name).get();

        if (!market.exists) {
            throw new Error(`Market ${market_name} does not exist.`);
        }
        const marketData = market.data();

        const buyOrders = marketData.buyOrders || [];
        const sellOrders = marketData.sellOrders || [];
        const filledOrders = marketData.filledOrders || [];
        const meanPrice = marketData.meanPrice || [];

        // Add the order to the appropriate order list
        if (order.direction === "buy") {
            buyOrders.push(order);
            buyOrders.sort((a, b) => b.price - a.price);
        } else if (order.direction === "sell") {
            sellOrders.push(order);
            sellOrders.sort((a, b) => a.price - b.price);
        }

        // Match orders
        const selfTradeOrders = [];

        let buyIndex = 0;
        let sellIndex = 0;

        while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
            const topBuy = buyOrders[buyIndex];
            const topSell = sellOrders[sellIndex];

            if (topBuy.teamName === topSell.teamName) {
                logger.log(`Skipping self-trade for ${topBuy.teamName}`);
                selfTradeOrders.push(topBuy);
                buyIndex++;
                continue;
            }

            if (topBuy.price >= topSell.price) {
                const shares = Math.min(topBuy.shares, topSell.shares);
                const price = (topBuy.price + topSell.price) / 2;

                logger.log(`Matched: ${shares} ${market_name} at ${price} between ${topBuy.teamName} and ${topSell.teamName}`);

                topBuy.shares -= shares;
                topSell.shares -= shares;

                // Push only the filled portion to `filledOrders`
                filledOrders.push({
                    ...buyOrders[buyIndex],
                    shares: shares,
                    price: price
                });

                if (topBuy.shares === 0) {
                    buyIndex++;
                }

                filledOrders.push({
                    ...sellOrders[sellIndex],
                    shares: shares,
                    price: price
                });

                if (topSell.shares === 0) {
                    sellIndex++;
                }
            } else {
                break;
            }
        }

        // Rebuild newBuyOrders and newSellOrders by excluding filled orders and re-inserting self-trade orders
        let newBuyOrders = buyOrders.filter(order => order.shares > 0 && !selfTradeOrders.includes(order));
        newBuyOrders.push(...selfTradeOrders);
        newBuyOrders.sort((a, b) => b.price - a.price);

        let newSellOrders = sellOrders.filter(order => order.shares > 0); 

        // Calculate the mean price
        let newMeanPrice = 0;
        if (newBuyOrders.length > 0 && newSellOrders.length > 0) {
            newMeanPrice = (newBuyOrders[0].price + newSellOrders[0].price)/2;
        } else if (newSellOrders.length > 0) {
            newMeanPrice = newSellOrders[0].price;
        } else if (newBuyOrders.length > 0) {
            newMeanPrice = newBuyOrders[0].price;
        }

        meanPrice.push({price: newMeanPrice, timestamp: Timestamp.now()});

        // Update the market document
        await getFirestore().collection(collectionName).doc(gameID).collection('markets').doc(market_name).update({
            buyOrders: newBuyOrders,
            sellOrders: newSellOrders,
            filledOrders: filledOrders,
            meanPrice: meanPrice
        });

        // The market order should only be deleted if no further orders can be filled and it is completely filled.
        return "Order placed successfully";

    } catch (error) {
        logger.error("Error placing order:", error);
        throw new HttpsError("internal", "Error Placing Order");
    }
});

/**
 * Transfers funds from one team to another in a game.
 *
 * @param {string} fromTeam - The name of the team to transfer funds from.
 * @param {string} toTeam - The name of the team to transfer funds to.
 * @param {number} amount - The amount of funds to transfer.
 * @return {Promise<void>} A promise that resolves when the transfer is complete.
 */
async function transferFunds(gameID, fromTeam, toTeam, amount) {
    // Fetch the game document
    const gameDoc = await getFirestore().collection('games').doc(gameID).get();
    const gameData = gameDoc.data();

    logger.log("Transferring funds from " + fromTeam + " to " + toTeam + ": " + amount + " from " + gameID);

    // Transfer funds
    const fromTeamIndex = gameData.teams.findIndex(team => team.name === fromTeam);
    const toTeamIndex = gameData.teams.findIndex(team => team.name === toTeam);

    logger.log("Indexes:" + fromTeamIndex + " " + toTeamIndex);

    if (fromTeamIndex < 0 || toTeamIndex < 0) {
        throw new HttpsError("not-found", "Team not found");
    }
    logger.log("HELLO0")

    let balance = gameData.teams[fromTeam].balance;
    logger.log("HELLO1")
    gameData.teams[fromTeamIndex] = { ...team, balance: balance - amount };

    logger.log("HELLO2")
    logger.log("Team data after transfer: " + gameData.teams);

    balance = gameData.teams[toTeam].balance;
    gameData.teams[toTeamIndex] = { ...team, balance: balance + amount };

    logger.log("Team data after transfer: " + gameData.teams);

    // Update the game document
    await getFirestore().collection('games').doc(gameID).update({ teams: gameData.teams });
}

/**
 * Cancels an order for a user in a game.
 *
 * @param {Object} request - The request object containing the user's authentication token and order details.
 * @param {string} request.orderID - The ID of the order to cancel.
 * @param {string} request.teamName - The name of the team that placed the order.
 * @return {Promise<Object>} A promise that resolves when the order is cancelled.
 * @throws {HttpsError} - If the user is not authenticated or if the game does not exist.
 */
exports.cancelOrder = onCall(async (request, response) => {
    try {
        if (!request.auth) {       
            // Throwing an HttpsError so that the client gets the error details.    
            throw new HttpsError("failed-precondition", "The function must be " + 
                "called while authenticated");
        }

        const uid = request.auth.uid;

        // Fetch the user document
        const userDoc = await getFirestore().collection('users').doc(uid).get();
        const userData = userDoc.data();

        // Get gameID and teamName from the user document
        const gameID = userData.game.gameID
        const teamName = userData.game.teamName;

        // Get the order to cancel
        const order = request.data.order;

        const official = userData.game.official

        logger.log("Cancelling order:", order);
        logger.log("Official?:", official);

        // Check that the game is active
        const collectionName = official ? 'games' : 'unofficial_games';

        logger.log("Collection name:", collectionName);

        const gameDoc = await getFirestore().collection(collectionName).doc(gameID).get();
        const gameData = gameDoc.data();
        if(gameData.status !== "active") {
            throw new HttpsError("failed-precondition", "Game is not active");
        }

        // Check if the user owns the order
        if(teamName !== order.teamName) {
            throw new HttpsError("failed-precondition", "Cannot cancel order that is not yours");
        }

        if(order.direction === "buy") {
            // Delete the order from the market
            await getFirestore().collection(collectionName).doc(gameID).collection('markets').doc(order.market).update({ buyOrders: FieldValue.arrayRemove(order) });
        } else {
            // Delete the order from the market
            await getFirestore().collection(collectionName).doc(gameID).collection('markets').doc(order.market).update({ sellOrders: FieldValue.arrayRemove(order) });
        }

    } catch (error) {
        logger.error("Error canceling order:", error);
        throw new HttpsError("internal", "Internal firebase error");
    }
})

exports.closeGameManual = onCall(async (request, response) => {
    if (!request.auth) {
        // Throwing an HttpsError so that the client gets the error details.
        throw new HttpsError("failed-precondition", "The function must be " + 
            "called while authenticated");
    }

    const uid = request.auth.uid;

    // Fetch the user document
    const userDoc = await getFirestore().collection('users').doc(uid).get();
    const userData = userDoc.data();

    // Get gameID and teamName from the user document
    const gameID = userData.game.gameID
    const official = userData.game.official
    const game_type = userData.game.type
    const collectionName = official ? 'games' : 'unofficial_games';

    if(gameID === null) {
        throw new HttpsError("failed-precondition", "User is not in game");
    }

    // Update the game status
    await getFirestore().collection(collectionName).doc(gameID).update({ status: "closed" });
    logger.log("Game closed!")
    
    // Calculate final prices
    const gameDoc = await getFirestore().collection(collectionName).doc(gameID).get();
    const gameData = gameDoc.data();

    const leaderboardType = gameData.season;

    let market_names = []
    let market_prices = []
    if (game_type == "dice") {
        market_names = ["SUM", "PRODUCT", "RANGE", "EVENS", "ODDS"];

        market_prices[0] = gameData.rolls.reduce((acc, curr) => acc + curr, 0);
        market_prices[1] = gameData.rolls.reduce((acc, curr) => acc * curr, 1);
        market_prices[2] = Math.max(...gameData.rolls) - Math.min(...gameData.rolls);
        market_prices[3] = gameData.rolls.filter(x => x % 2 === 0).reduce((acc, curr) => acc + curr, 0) ** 2;
        market_prices[4] = gameData.rolls.filter(x => x % 2 === 1).reduce((acc, curr) => acc + curr, 0) ** 2;
    } else if (game_type == "cards") {
        market_names = ["2s", "3s", "4s", "5s", "6s"];
        market_prices = Array(market_names.length).fill(0);

        // Calculate the final prices for each card market
        remainingCards = [1,2,3,4,5,6,7,8,9,10].filter(x => !gameData.rolls.includes(x))
        market_prices[0] = Math.pow(
            remainingCards.filter(x => x % 2 === 0).reduce((acc, curr) => acc + curr, 0),
            2
        );
        
        // 3's Market: Sum of multiples of 3 cubed
        market_prices[1] = Math.pow(
            remainingCards.filter(x => x % 3 === 0).reduce((acc, curr) => acc + curr, 0),
            3
        );
        
        // 4's Market: Product of all numbers greater than 4
        let greaterThan4 = remainingCards.filter(x => x > 4);
        market_prices[2] = greaterThan4.length > 0 ? greaterThan4.reduce((acc, curr) => acc * curr, 1) : 0;
        
        // 5's Market: Minimum of numbers 5 or below to the power of 5
        let belowOrEqual5 = remainingCards.filter(x => x <= 5);
        market_prices[3] = belowOrEqual5.length > 0 ? Math.pow(Math.min(...belowOrEqual5), 5) : 0;
        
        // 6's Market: Sum of numbers 6 or above multiplied by 6
        market_prices[4] = remainingCards.filter(x => x >= 6).reduce((acc, curr) => acc + curr, 0) * 6;
    } else {
        throw new HttpsError("failed-precondition", "Game type not supported");
    }

    //Update the market documents with the final prices
    for (const market of market_names) {
        const index = market_names.indexOf(market);
        logger.log(market_names, market_prices, index, game_type, market_prices[index]);
        await getFirestore().collection(collectionName).doc(gameID).collection('markets').doc(market).update({ price: market_prices[index] });
    }

    //Now calculate the leaderboard for teams and for players
    let leaderboard = gameData.teams

    for (const team of leaderboard) {
        let newPlayers = [];
        
        // Iterate through each player UID in the team's player list
        for (const player of team.players) {   
            
            // Push the transformed player data into newPlayers array
            newPlayers.push({
                uid: player.uid,
                email: player.email,
                balance: 0  
            });
        }
        
        // Update the team's players array
        team.players = newPlayers;
    }

    logger.log(JSON.stringify(leaderboard))

    for(const market of market_names) {
        const index = market_names.indexOf(market);
        const marketDoc = await getFirestore().collection(collectionName).doc(gameID).collection('markets').doc(market).get();
        const marketData = marketDoc.data();
        for(order of marketData.filledOrders) {
            let orderUser = order.user;
            let orderTeam = order.teamName;
            let orderPrice = order.price;
            let deltaPrice = 0;

            // if order price is too high round down
            if(orderPrice > 1000000000) {
                orderPrice = 1000000000
            } 

            if(orderPrice < 0) {
                orderPrice = 0
            }

            deltaPrice = (market_prices[index] - orderPrice);

            if(order.direction === "sell") {
                deltaPrice = -deltaPrice;
            }
            let profit = order.shares * deltaPrice;

            // get the team from the leaderboard
            // Update team balance
            const teamEntry = leaderboard.find(x => x.name === orderTeam);
            if (teamEntry) {
                teamEntry.balance += profit;
            }

            // Update player balance
            const userEntry = leaderboard.find(x => x.name === orderTeam)?.players.find(x => x.uid === orderUser);
            if (userEntry) {
                userEntry.balance += profit;
            } else {
                logger.log(`Player with UID ${orderUser} not found in team ${orderTeam}`);
            }

            // Update player document
            await getFirestore().collection('users').doc(orderUser).update({ balance: FieldValue.increment(profit) });
        }
    }

    logger.log("Updating LEADERBOARD", JSON.stringify(leaderboard[0]))

    // Update the leaderboard
    await getFirestore().collection(collectionName).doc(gameID).update({ leaderboard: leaderboard });

    //TODO: Update the global leaderboard with the values if the game is an official game

    if (official) {
        logger.log("Official game, updating global leaderboard");
        //Get the leaderboard section
        const leaderboardDoc = await getFirestore().collection('global_leaderboards').get();

        // add leaderboard to the global leaderboard
        const globalLeaderboardDoc = await getFirestore().collection('global_leaderboards').doc(leaderboardType).get();
        const globalLeaderboardData = globalLeaderboardDoc.data();

        if (!globalLeaderboardData) {
            throw new HttpsError("not-found", "Global leaderboard not found");
        }

        // Update global leaderboard teams
        for (const team of leaderboard) {
            const globalTeamIndex = globalLeaderboardData.teams.findIndex(t => t.name === team.name);
            if (globalTeamIndex >= 0) {
                globalLeaderboardData.teams[globalTeamIndex].balance += team.balance;
            } else {
                globalLeaderboardData.teams.push({ name: team.name, balance: team.balance });
            }
        }

        // Update global leaderboard players
        for (const team of leaderboard) {
            for (const player of team.players) {
                const globalPlayerIndex = globalLeaderboardData.players.findIndex(p => p.uid === player.uid);
                if (globalPlayerIndex >= 0) {
                    globalLeaderboardData.players[globalPlayerIndex].balance += player.balance;
                } else {
                    globalLeaderboardData.players.push({ uid: player.uid, email: player.email, balance: player.balance });
                }
            }
        }

        // Save the updated global leaderboard
        await getFirestore().collection('global_leaderboards').doc(leaderboardType).set(globalLeaderboardData);
        logger.log("Global leaderboard officially updated!");

    }
})

/**
 * Starts a game manually.
 */
exports.startGameManual  = onCall(async (request, response) => {
    try {
        if (!request.auth) {       
            // Throwing an HttpsError so that the client gets the error details.    
            throw new HttpsError("failed-precondition", "The function must be " + 
                "called while authenticated");
        }  

        const uid = request.auth.uid;

        // Fetch the user document
        const userDoc = await getFirestore().collection('users').doc(uid).get();
        const userData = userDoc.data();

        // Get gameID and teamName from the user document
        const gameID = userData.game.gameID
        const official = userData.game.official

        const collectionName = official ? 'games' : 'unofficial_games';

        // Check that the game is waiting
        const gameDoc = await getFirestore().collection(collectionName).doc(gameID).get();
        const gameData = gameDoc.data();
        if(gameData.status !== "waiting") {
            throw new HttpsError("failed-precondition", "Game is not alreadt active or done");
        }

        await getFirestore().collection(collectionName).doc(gameID).update({ status: "active", start_time: Timestamp.now(), news: [{title: "First update in 60 seconds!", content: "Get ready!", timestamp: Timestamp.now()}]});
        
    } catch (error) {
        logger.error("Error starting game:", error);
        throw new HttpsError("internal", "Internal firebase error");
    }
})

/**
 * Starts a game manually.
 */
exports.rollDiceManual = onCall(async (request, response) => {
    try {
        if (!request.auth) {       
            // Throwing an HttpsError so that the client gets the error details.    
            throw new HttpsError("failed-precondition", "The function must be " + 
                "called while authenticated");
        }  

        const uid = request.auth.uid;

        // Fetch the user document
        const userDoc = await getFirestore().collection('users').doc(uid).get();
        const userData = userDoc.data();

        // Get gameID and teamName from the user document
        const gameID = userData.game.gameID
        
        // Get the game doc
        const gameDoc = await getFirestore().collection('games').doc(gameID).get();
        const gameData = gameDoc.data();

        // Check that the game is active
        if(gameData.status !== "active") {
            throw new HttpsError("failed-precondition", "Game is not active");
        }

        const roll = (Math.floor(Math.random() * 30) + 1)

        const rollNews = {title: "New Dice Roll!", content: "[" + roll + "]", timestamp: Timestamp.now()};

        await getFirestore().collection('games').doc(gameID).update({ news: FieldValue.arrayUnion(rollNews)});
        await getFirestore().collection('games').doc(gameID).update({ rolls: FieldValue.arrayUnion(roll) });
        

    } catch (error) {
        logger.error("Error starting game:", error);
        throw new HttpsError("internal", "Internal firebase error");
    }
})

exports.updateMarket = onCall(async (request, response) => {
    try {
        if (!request.auth) {       
            // Throwing an HttpsError so that the client gets the error details.    
            throw new HttpsError("failed-precondition", "The function must be " + 
                "called while authenticated");
        }  

        const uid = request.auth.uid;

        // Fetch the user document
        const userDoc = await getFirestore().collection('users').doc(uid).get();
        const userData = userDoc.data();

        // Get gameID and teamName from the user document
        const gameID = userData.game.gameID
        const official = userData.game.official
        const collectionName = official ? 'games' : 'unofficial_games';
        
        // Get the game doc
        const gameDoc = await getFirestore().collection(collectionName).doc(gameID).get();
        const gameData = gameDoc.data();

        // Check that the game is active
        if(gameData.status !== "active") {
            throw new HttpsError("failed-precondition", "Game is not active");
        }

        // Different functionality for different games
        switch(gameData.game_type) {
            case "dice":
                const roll = (Math.floor(Math.random() * 30) + 1)
                const rollNews = {title: "New Dice Roll!", content: "[" + roll + "]", timestamp: Timestamp.now()};

                await getFirestore().collection(collectionName).doc(gameID).update({ news: FieldValue.arrayUnion(rollNews) });
                await getFirestore().collection(collectionName).doc(gameID).update({ rolls: FieldValue.arrayUnion(roll) });

                break;

            case "cards":
                let cards = gameData.rolls;
                let card;
                
                // select a card that we have not selected yet
                do {
                    card = (Math.floor(Math.random() * 10) + 1)
                } while (cards.includes(card))
                
                const cardNews = {title: "New Card Selected!", content: "[" + card + "]", timestamp: Timestamp.now()};

                await getFirestore().collection(collectionName).doc(gameID).update({ news: FieldValue.arrayUnion(cardNews) });
                await getFirestore().collection(collectionName).doc(gameID).update({ rolls: FieldValue.arrayUnion(card) });

                break;
        }
    } catch (error) {
        logger.error("Error updating market:", error);  
        throw new HttpsError("internal", "Internal firebase error");
    }
})

/**
 * Ends a game manually.
 */
exports.endGameManual = onCall(async (request, response) => {
    try {
        if (!request.auth) {       
            // Throwing an HttpsError so that the client gets the error details.    
            throw new HttpsError("failed-precondition", "The function must be " + 
                "called while authenticated");
        }  

        const uid = request.auth.uid;

        // Fetch the user document
        const userDoc = await getFirestore().collection('users').doc(uid).get();
        const userData = userDoc.data();

        // Get gameID and teamName from the user document
        const gameID = userData.game.gameID
        const official = userData.game.official
        const collectionName = official ? 'games' : 'unofficial_games';

        // Update the game status
        await getFirestore().collection(collectionName).doc(gameID).update({ status: "done" });
        logger.log("Game over!")

        const gameDoc = await getFirestore().collection(collectionName).doc(gameID).get();
        const gameData = gameDoc.data();

        // For each team, iterate through each player and update their document
        for (const team of gameData.teams) {
            for (const player of team.players) {
                await getFirestore().collection('users').doc(player.uid).update({ game: {type: "none", gameID: null, teamName: null} });
            }
        }

    } catch (error) {
        logger.error("Error ending game:", error);
        throw new HttpsError("internal", "Internal firebase error");
    }
})

/**
 * Creates a game manually.
 */
exports.createGameManual = onCall(async (request, response) => {
    try {
        if (!request.auth) {       
            // Throwing an HttpsError so that the client gets the error details.    
            throw new HttpsError("failed-precondition", "The function must be " + 
                "called while authenticated");
        }  

        const words = [
            'apple', 'banana', 'carrot', 'donut', 'eggplant', 'fig', 'grape', 'honey', 'ice-cream', 'jelly',
            'kiwi', 'lemon', 'mango', 'noodles', 'orange', 'papaya', 'quinoa', 'raspberry', 'spinach', 'tomato',
            'avocado', 'broccoli', 'cauliflower', 'dumplings', 'edamame', 'fish', 'garlic', 'hummus', 'lettuce', 'jackfruit',
            'kale', 'lime', 'mozzarella', 'nachos', 'oatmeal', 'pasta', 'quiche', 'radish', 'salmon', 'taco',
            'almond', 'blueberry', 'cheese', 'dates', 'egg', 'fries', 'granola', 'hazelnut', 'curry', 'juice',
            'ketchup', 'lasagna', 'muffin', 'nuts', 'omelette', 'pineapple', 'quinoa salad', 'ravioli', 'soup', 'toast',
            'bacon', 'cherry', 'dragonfruit', 'enchiladas', 'falafel', 'guacamole', 'hamburger', 'ice', 'jam', 'kebab',
            'lobster', 'mashed-potatoes', 'nectarine', 'oyster', 'pickles', 'quesadilla', 'rice', 'salsa', 'turkey', 'udon',
            'basil', 'cucumber', 'dumpling', 'eggroll', 'fennel', 'ginger', 'hotdog', 'ramen', 'jalapeño', 'kimchi',
            'lentils', 'meatballs', 'wings', 'okra', 'pizza', 'quail', 'rhubarb', 'steak', 'tortilla', 'vodka', 'squid', 'tacos',
            'milk', 'lemonade', 'eggnog', 'waffle', 'popcorn', 'pretzel', 'sushi', 'tuna', 'wheat', 'yogurt', 'zucchini',
            'skittles', 'mayo', 'salt', 'jalapeno', 'chips', 'olive', 'ham', 'couscous', 'shiitake', 'artichoke',
            'snickers', 'soda', 'pumpkin', 'cabbage', 'grits', 'kielbasa', 'tahini', 'whey', 'duck', 'octopus', 'caviar'
        ];
    
        let randomString = '';
        let docRef;

        let collectionName = "games";
        if (request.data.official == false) {
            collectionName = "unofficial_games";
        }

        do {
            const randomWord1 = words[Math.floor(Math.random() * words.length)];
            const randomWord2 = words[Math.floor(Math.random() * words.length)];
            randomString = `${randomWord1}-${randomWord2}-${Math.floor(Math.random() * 1000)}`;
            docRef = getFirestore().collection(collectionName).doc(randomString);
        } while (docRef.exists);

        await docRef.set({
            game_type: request.data.type,
            official: request.data.official,
            season: request.data.season,
            status: "waiting",
            teams: [],
            start_time: null,
            rolls: [],
            news: [{ title: "New game created", content: "", timestamp: Timestamp.now() }],
            leaderboard: []
        });

        // Use docRef directly to get the ID and log it
        const gameID = docRef.id;
        logger.log("Created game: " + gameID);

        // Now you can add sub-collections to docRef

        let markets;
        if(request.data.type == "dice") {
            markets = ["SUM", "PRODUCT", "RANGE", "EVENS", "ODDS"];
        } else if (request.data.type == "cards") {
            markets = ["2s", "3s", "4s", "5s", "6s"];
        }   

        // Add more game type markets here

        for(const market of markets) {
            await docRef.collection('markets').doc(market).set({
                buyOrders: [],
                sellOrders: [],
                filledOrders: [],
                meanPrice: [],
                price: null
            })
        }

        return gameID
    } catch (error) {
        logger.error("Error creating game:", error);
        throw new HttpsError("internal", "Internal firebase error");
    }
})


// TODO: Work on making game loop serverside


exports.endGame = onCall(async (request, response) => {
    try {
        if (!request.auth) {       
            // Throwing an HttpsError so that the client gets the error details.    
            throw new HttpsError("failed-precondition", "The function must be " + 
                "called while authenticated");
        }  

        const gameID = request.data.game_id;

        // Update the game status
        await getFirestore().collection('games').doc(gameID).update({ status: "done" });
        logger.log("Game over!")

    } catch (error) {
        logger.error("Error ending game:", error);
        throw new HttpsError("internal", "Internal firebase error");
    }
})

// ADMIN FUNCTIONS

exports.flushUserGames = onCall(async (request, response) => {
    try {
        if (!request.auth) {       
            // Throwing an HttpsError so that the client gets the error details.    
            throw new HttpsError("failed-precondition", "The function must be " + 
                "called while authenticated");
        }  

        const uid = request.auth.uid;
        if (uid !== "66Q8I5XwY0TChOmSUWoYM5nEaB32") {
            throw new HttpsError("failed-precondition", "Only the admin can flush user games");
        }

        const users = await getFirestore().collection('users').get();

        // For each user, set their game to {type: "none", gameID: null, teamName: null}
        for (const user of users.docs) {
            await getFirestore().collection('users').doc(user.id).update({ game: {type: "none", gameID: null, teamName: null} });
        }

    } catch (error) {
        logger.error("Error flushing user data:", error);
        throw new HttpsError("internal", "Error flushing user data");
    }
})

exports.closeGame = onCall(async (request) => {
    try {
      // Authentication check
      if (!request.auth) {
        throw new HttpsError(
          'failed-precondition',
          'The function must be called while authenticated'
        );
      }
  
      const uid = request.auth.uid;
      const firestore = getFirestore();
  
      // Fetch the user document
      const userDoc = await firestore.collection('users').doc(uid).get();
      const userData = userDoc.data();
  
      if (!userData || !userData.game) {
        throw new HttpsError('not-found', 'User or game data not found');
      }
  
      // Get gameID and other info from user document
      const gameID = userData.game.gameID;
      const official = userData.game.official;
      const game_type = userData.game.type;
  
      if (!gameID) {
        throw new HttpsError('failed-precondition', 'User is not in a game');
      }
  
      const collectionName = official ? 'games' : 'unofficial_games';
  
      // Update the game status
      await firestore.collection(collectionName).doc(gameID).update({ status: 'closed' });
      logger.log('Game closed!');
  
      // Fetch the game document
      const gameDoc = await firestore.collection(collectionName).doc(gameID).get();
      const gameData = gameDoc.data();
  
      if (!gameData) {
        throw new HttpsError('not-found', 'Game data not found');
      }

      const leaderboardType = gameData.season;
  
      let market_names = [];
      let market_prices = [];
  
      if (game_type === 'dice') {
        // Calculate market prices for dice game
        market_names = ['SUM', 'PRODUCT', 'RANGE', 'EVENS', 'ODDS'];
  
        const rolls = gameData.rolls;
        if (!rolls || !Array.isArray(rolls)) {
          throw new HttpsError(
            'failed-precondition',
            'Game data is invalid or rolls are missing'
          );
        }
  
        market_prices[0] = rolls.reduce((acc, curr) => acc + curr, 0); // SUM
        market_prices[1] = rolls.reduce((acc, curr) => acc * curr, 1); // PRODUCT
        market_prices[2] = Math.max(...rolls) - Math.min(...rolls); // RANGE
        const sumEvens = rolls.filter((x) => x % 2 === 0).reduce((acc, curr) => acc + curr, 0);
        const sumOdds = rolls.filter((x) => x % 2 === 1).reduce((acc, curr) => acc + curr, 0);
        market_prices[3] = sumEvens ** 2; // EVENS
        market_prices[4] = sumOdds ** 2; // ODDS
      } else if (game_type === 'cards') {
        // Calculate market prices for cards game
        market_names = ['2s', '3s', '4s', '5s', '6s'];
  
        const rolls = gameData.rolls;
        if (!rolls || !Array.isArray(rolls)) {
          throw new HttpsError(
            'failed-precondition',
            'Game data is invalid or rolls are missing'
          );
        }
  
        const allCards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const remainingCards = allCards.filter((x) => !rolls.includes(x));
  
        const sumEvens = remainingCards
          .filter((x) => x % 2 === 0)
          .reduce((acc, curr) => acc + curr, 0);
        market_prices[0] = sumEvens ** 2; // 2s Market
  
        const sumMultiplesOf3 = remainingCards
          .filter((x) => x % 3 === 0)
          .reduce((acc, curr) => acc + curr, 0);
        market_prices[1] = sumMultiplesOf3 ** 3; // 3s Market
  
        const greaterThan4 = remainingCards.filter((x) => x > 4);
        market_prices[2] =
          greaterThan4.length > 0 ? greaterThan4.reduce((acc, curr) => acc * curr, 1) : 0; // 4's Market
  
        const belowOrEqual5 = remainingCards.filter((x) => x <= 5);
        market_prices[3] =
          belowOrEqual5.length > 0 ? Math.pow(Math.min(...belowOrEqual5), 5) : 0; // 5's Market
  
        const sum6OrAbove = remainingCards
          .filter((x) => x >= 6)
          .reduce((acc, curr) => acc + curr, 0);
        market_prices[4] = sum6OrAbove * 6; // 6's Market
        } else {
        throw new HttpsError('failed-precondition', 'Game type not supported');
        }

        // Update the market documents with final prices
        const marketRefs = market_names.map((market) =>
        firestore.collection(collectionName).doc(gameID).collection('markets').doc(market)
        );

        const marketDocs = await firestore.getAll(...marketRefs);

        // Prepare batch update for market prices
        const batch = firestore.batch();

        for (let i = 0; i < marketRefs.length; i++) {
        const marketRef = marketRefs[i];
        const price = market_prices[i];
        batch.update(marketRef, { price: price });
        }

        await batch.commit();
  
        // Collect all filled orders from all markets
        const filledOrders = [];

        for (let i = 0; i < marketDocs.length; i++) {
        const marketDoc = marketDocs[i];
        const marketData = marketDoc.data();
        if (marketData && Array.isArray(marketData.filledOrders)) {
            for (let order of marketData.filledOrders) {
            order.marketIndex = i; // Keep track of the market index
            filledOrders.push(order);
            }
        } else {
            logger.warn(`No filled orders in market: ${market_names[i]}`);
        }
        }
  
        // Collect all unique user UIDs and team names
        const userUIDs = new Set();
        const teamNames = new Set();

        for (let order of filledOrders) {
        userUIDs.add(order.user);
        teamNames.add(order.teamName);
        }
  
        // Batch get user documents
        const userRefs = Array.from(userUIDs).map((uid) => firestore.collection('users').doc(uid));

        let userDocs = [];
        if (userRefs.length === 0) {
        logger.warn('No user documents to fetch');
        } else {
        userDocs = await firestore.getAll(...userRefs);
        }

        // Create a map of user data
        const userMap = {};
        for (let i = 0; i < userDocs.length; i++) {
        const uid = userRefs[i].id;
        userMap[uid] = userDocs[i].data();
        }
  
        // Prepare leaderboard
        const leaderboard = gameData.teams || [];

        // Create a map of teams in leaderboard
        const teamMap = {};
        for (let team of leaderboard) {
            teamMap[team.name] = team;
            // Initialize team balance if not present
            if (typeof team.balance !== 'number') {
                team.balance = 0;
            }
            // Fetch player data
            const newPlayers = [];
            for (let player of team.players) {
                const playerData = userMap[player.uid];
                if (playerData) {
                newPlayers.push({
                    uid: player.uid,
                    email: playerData.email,
                    balance: 0, // Initialize balance
                });
                } else {
                logger.warn(`Player data not found for UID: ${player.uid}`);
                }
            }
            team.players = newPlayers;
            // Create a map for players in the team
            team.playerMap = {};
            for (let player of team.players) {
                team.playerMap[player.uid] = player;
            }
        }
  
      // Process orders and calculate profits
      const userProfits = {}; // Map of user UID to profit
      const batchUserUpdates = firestore.batch();
  
      for (let order of filledOrders) {
        const orderUser = order.user;
        const orderTeam = order.teamName;
        let orderPrice = order.price;
        const orderShares = order.shares;
        const orderDirection = order.direction;
  
        const marketIndex = order.marketIndex;
        const finalPrice = market_prices[marketIndex];
  
        // Adjust orderPrice if needed
        orderPrice = Math.min(Math.max(orderPrice, 0), 1e9);
  
        // Calculate deltaPrice
        let deltaPrice = finalPrice - orderPrice;
        if (orderDirection === 'sell') {
          deltaPrice = -deltaPrice;
        }
  
        const profit = orderShares * deltaPrice;
  
        // Update team balance
        const teamEntry = teamMap[orderTeam];
        if (teamEntry) {
          teamEntry.balance += profit;
        } else {
          logger.warn(`Team not found: ${orderTeam}`);
        }
  
        // Update player balance
        const playerEntry = teamEntry?.playerMap[orderUser];
        if (playerEntry) {
          playerEntry.balance += profit;
        } else {
          logger.warn(`Player with UID ${orderUser} not found in team ${orderTeam}`);

          // TEMP FIX - Create new player entry
          const newPlayer = {
            uid: orderUser,
            email: userMap[orderUser].email,
            balance: profit, // Initialize balance
          };
          teamEntry.players.push(newPlayer);
          teamEntry.playerMap[orderUser] = newPlayer;
        }
  
        // Accumulate user profit
        userProfits[orderUser] = (userProfits[orderUser] || 0) + profit;
      }
  
      // Batch update user balances
      for (let uid of Object.keys(userProfits)) {
        const profit = userProfits[uid];
        const userRef = firestore.collection('users').doc(uid);
        batchUserUpdates.update(userRef, { balance: FieldValue.increment(profit) });
      }
  
      await batchUserUpdates.commit();
  
      // Remove playerMap from team entries
      for (let team of leaderboard) {
        delete team.playerMap;
      }
  
      // Update the leaderboard in the game document
      await firestore.collection(collectionName).doc(gameID).update({ leaderboard: leaderboard });
  
      logger.log('Game closed and leaderboard updated successfully!');

      if (official) {
            logger.log("Official game, updating global leaderboard");
            //Get the leaderboard section
            const leaderboardDoc = await getFirestore().collection('global_leaderboards').get();

            // add leaderboard to the global leaderboard
            const globalLeaderboardDoc = await getFirestore().collection('global_leaderboards').doc(leaderboardType).get();
            const globalLeaderboardData = globalLeaderboardDoc.data();

            if (!globalLeaderboardData) {
                throw new HttpsError("not-found", "Global leaderboard not found");
            }
            
            if (!globalLeaderboardData.teams) {
                globalLeaderboardData.teams = [];
            }
            
            if (!globalLeaderboardData.players) {
                globalLeaderboardData.players = [];
            }

            // Update global leaderboard teams
            for (const team of leaderboard) {
                const globalTeamIndex = globalLeaderboardData.teams.findIndex(t => t.name === team.name);
                if (globalTeamIndex >= 0) {
                    globalLeaderboardData.teams[globalTeamIndex].balance += team.balance;
                } else {
                    globalLeaderboardData.teams.push({ name: team.name, balance: team.balance });
                }
            }

            // Update global leaderboard players
            for (const team of leaderboard) {
                for (const player of team.players) {
                    const globalPlayerIndex = globalLeaderboardData.players.findIndex(p => p.uid === player.uid);
                    if (globalPlayerIndex >= 0) {
                        globalLeaderboardData.players[globalPlayerIndex].balance += player.balance;
                    } else {
                        globalLeaderboardData.players.push({ uid: player.uid, email: player.email, balance: player.balance });
                    }
                }
            }

            // Save the updated global leaderboard
            await getFirestore().collection('global_leaderboards').doc(leaderboardType).set(globalLeaderboardData);
            logger.log("Global leaderboard officially updated!");

        }
    } catch (error) {
      logger.error('Error closing game:', error);
      throw new HttpsError('internal', 'Internal server error');
    }
  });