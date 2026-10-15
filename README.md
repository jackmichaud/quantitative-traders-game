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

- Node.js (v16+)
- npm or yarn
- Firebase CLI (if deploying)

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
├── public/            # Static assets
└── functions/         # Firebase Cloud Functions
```

## 📬 Contact

For any questions or feedback, please open an issue or contact the maintainers.

---

Built with ❤️ by QTV Team
