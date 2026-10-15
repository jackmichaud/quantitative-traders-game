# QTV Trading Platform

[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://qtav-4b519.web.app/)

A real-time, team-based trading simulation platform that combines elements of probability, risk management, and market dynamics through interactive games. The platform supports multiple game modes including dice and card games, where players make trading decisions based on market movements and probability outcomes.

## 🎲 Core Features

- **Multiple Game Modes**: Play different trading games including dice and card-based simulations
- **Team-Based Trading**: Collaborate with teammates in real-time trading scenarios
- **Real-Time Market Simulation**: Experience dynamic market movements based on game events
- **Seasonal Leaderboards**: Compete in seasonal trading competitions
- **Interactive Tutorials**: Learn trading concepts through hands-on experience

## 🎯 Game Mechanics

- **Dice Game**: Make trading decisions based on dice roll outcomes that affect market prices
- **Card Game**: Strategize using card-based market movements and events
- **Fruit Basket**: Update conditional probabilities as eight fruits are drawn without replacement from a known crate
- **Real-Time Updates**: Watch the market react to game events and player actions
- **Team Collaboration**: Work with your team to make optimal trading decisions
- **Risk Management**: Learn to manage positions and risk in a dynamic environment

## 🛠️ Tech Stack

- **Frontend**: SvelteKit
- **Styling**: Tailwind CSS
- **Backend**: Node.js
- **Infrastructure**: Firebase (Authentication, Database, Hosting, Cloud Functions)

## 🚀 Getting Started

### Prerequisites

- Node.js 22.17 or newer (the committed `.nvmrc` selects Node 22)
- npm or yarn
- Firebase access for the `qtav-4b519` project (the CLI is installed with the project)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jackmichaud/quantitative-traders-game.git                    
   cd quantitative-traders-game
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Update the environment variables in .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## 📂 Project Structure

```
qtav/
├── src/
│   ├── components/     # Reusable UI components
│   ├── lib/           # Utility functions and libraries
│   ├── routes/        # Application routes
│   └── styles/        # Global styles and Tailwind config
├── static/            # Static assets
└── functions/         # Firebase Cloud Functions
```

## Deploying

Use the committed Node version and lockfiles before deploying:

```bash
nvm install
nvm use
npm ci
npm --prefix functions ci
npm run deploy
```

Firebase runs the production web build and the Functions test suite as predeploy checks. Hosting is a static single-page app, while game mutations run through authenticated Cloud Functions.

The first deployment after the static-hosting migration replaces the old SvelteKit SSR rewrite. After verifying the live site, the legacy `ssrqtav4b519` function can be removed with `npm exec firebase -- functions:delete ssrqtav4b519 --region us-east1` to avoid retaining an unused function.

## 📬 Contact

For any questions or feedback, please open an issue or contact the maintainers.

---

Built with ❤️ by QTV Team
