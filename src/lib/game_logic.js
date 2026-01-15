

import { tickGame } from "./cloud_functions";

export async function hostGame(gameId, numIterations) {
    // TODO: implement

    for(let i = 0; i < numIterations; i++) {  
      await new Promise(resolve => setTimeout(resolve, 60000));

      await tickGame().catch((error) => alert(error.message))
    }
}
