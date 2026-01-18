

import { tickGame, closeGame } from "./cloud_functions";

export async function hostGame(gameId, numIterations) {

    for(let i = 0; i < numIterations; i++) {  
      await new Promise(resolve => setTimeout(resolve, 60000));

      console.log("Ticking game", gameId);

      await tickGame({gameId: gameId}).catch((error) => alert(error.message))
    }

    console.log("Closing game", gameId);

    await closeGame({gameId: gameId}).catch((error) => alert(error.message))

}
