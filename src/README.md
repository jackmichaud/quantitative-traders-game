# Quantitative Traders Game - Frontend

This directory contains the frontend source code for the Quantitative Traders Game, a web application built with SvelteKit, Firebase, and various modern web technologies.

## Project Structure

```
src/
├── components/         # Reusable UI components
├── lib/               # Library code and utilities
├── routes/            # Application routes and pages
├── stores/            # State management
├── app.css            # Global styles
└── app.html           # Main HTML template
```

## Tech Stack

- **Framework**: SvelteKit
- **UI**: Svelte components with TailwindCSS
- **State Management**: Svelte stores
- **Charts**: D3.js
- **Authentication & Database**: Firebase
- **Deployment**: Firebase Hosting

## Key Directories

### `/components`

Reusable UI components organized by feature:
- `Auth.svelte` - Authentication forms and logic
- `Leaderboard.svelte` - Displays player rankings
- `RealtimeTrader.svelte` - Main trading interface
- `ui/` - Base UI components (buttons, modals, etc.)
- `trader_components/` - Specialized trading components

### `/lib`

Core application logic and utilities:
- `cloud_functions.js` - Firebase Cloud Functions client
- `game_logic.js` - Core game mechanics
- `firebase/` - Firebase configuration and services

### `/routes`

Application routes using SvelteKit's file-based routing:
- `+layout.svelte` - Global layout wrapper
- `+page.svelte` - Home page
- `dashboard/` - Protected dashboard routes

### `/stores`

State management using Svelte stores:
- `authStore.js` - Authentication state
- `dataStore.js` - Application data state

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase CLI (for deployment)

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev
```

### Deployment

```bash
firebase deploy
```

## Dependencies

### Core

- Svelte 4.2+
- SvelteKit 2.0+
- Firebase 10.12+
- D3.js 7.9+
- TailwindCSS 3.4+

## TODO

- [ ] Add more games
- [ ] Test and bugfix
- [ ] Ensure leaderboard structure is correct
- [ ] Add informative tooltips to UI elements
- [ ] Clean up components directory
- [ ] Archive unused/unecessary files